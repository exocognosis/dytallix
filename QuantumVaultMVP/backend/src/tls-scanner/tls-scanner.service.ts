import { Injectable, Logger } from '@nestjs/common';
import * as tls from 'tls';
import * as forge from 'node-forge';

export interface TlsScanResult {
  host: string;
  port: number;
  tlsVersion: string;
  cipherSuite: string;
  certificateChain: string;
  signatureAlgorithm: string;
  publicKeyAlgorithm: string;
  publicKeySize: number;
  validFrom: Date;
  validUntil: Date;
  subjectAltNames: string[];
  commonName: string;
  isPqcCompliant: boolean;
  discoveryDetails: any;
}

@Injectable()
export class TlsScannerService {
  private readonly logger = new Logger(TlsScannerService.name);

  async scanTarget(host: string, port: number = 443, timeout: number = 30000): Promise<TlsScanResult> {
    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        socket.destroy();
        reject(new Error(`TLS scan timeout after ${timeout}ms`));
      }, timeout);

      const socket = tls.connect(
        {
          host,
          port,
          rejectUnauthorized: false, // We want to scan even invalid certs
          servername: host,
        },
        () => {
          try {
            clearTimeout(timeoutHandle);
            
            const certificate = socket.getPeerCertificate(true);
            const cipher = socket.getCipher();
            const protocol = socket.getProtocol();

            if (!certificate || Object.keys(certificate).length === 0) {
              socket.destroy();
              reject(new Error('No certificate found'));
              return;
            }

            // Parse certificate chain
            const certPEM = this.formatCertificate(certificate.raw);
            const forgeCert = forge.pki.certificateFromPem(certPEM);

            // Extract public key info
            const publicKey = forgeCert.publicKey;
            let publicKeyAlgorithm = 'Unknown';
            let publicKeySize = 0;

            if ((publicKey as any).n) {
              // RSA key
              publicKeyAlgorithm = 'RSA';
              publicKeySize = (publicKey as any).n.bitLength();
            } else if ((publicKey as any).p) {
              // DSA/ECDSA key
              publicKeyAlgorithm = 'ECDSA';
              publicKeySize = (publicKey as any).p.bitLength();
            }

            // Extract signature algorithm
            const signatureAlgorithm = forgeCert.signatureAlgorithm;

            // Check for PQC compliance
            const isPqcCompliant = this.checkPqcCompliance(
              publicKeyAlgorithm,
              signatureAlgorithm,
              cipher.name,
            );

            // Build certificate chain
            const chainPEMs: string[] = [certPEM];
            let currentCert = certificate;
            while (currentCert.issuerCertificate && currentCert !== currentCert.issuerCertificate) {
              currentCert = currentCert.issuerCertificate;
              chainPEMs.push(this.formatCertificate(currentCert.raw));
            }

            const result: TlsScanResult = {
              host,
              port,
              tlsVersion: protocol || 'Unknown',
              cipherSuite: cipher.name,
              certificateChain: chainPEMs.join('\n'),
              signatureAlgorithm,
              publicKeyAlgorithm,
              publicKeySize,
              validFrom: new Date(certificate.valid_from),
              validUntil: new Date(certificate.valid_to),
              subjectAltNames: certificate.subjectaltname?.split(', ').map(s => s.replace('DNS:', '')) || [],
              commonName: certificate.subject?.CN || '',
              isPqcCompliant,
              discoveryDetails: {
                cipher: cipher,
                protocol: protocol,
                authorized: socket.authorized,
                authorizationError: socket.authorizationError,
              },
            };

            socket.destroy();
            resolve(result);
          } catch (error) {
            clearTimeout(timeoutHandle);
            socket.destroy();
            reject(error);
          }
        },
      );

      socket.on('error', (error) => {
        clearTimeout(timeoutHandle);
        this.logger.error(`TLS scan error for ${host}:${port}: ${error.message}`);
        reject(error);
      });
    });
  }

  private formatCertificate(raw: Buffer): string {
    const base64 = raw.toString('base64');
    const wrapped = base64.match(/.{1,64}/g)?.join('\n') || base64;
    return `-----BEGIN CERTIFICATE-----\n${wrapped}\n-----END CERTIFICATE-----`;
  }

  private checkPqcCompliance(
    publicKeyAlg: string,
    signatureAlg: string,
    cipherSuite: string,
  ): boolean {
    // Check if using post-quantum algorithms
    const pqcKeyAlgorithms = ['KYBER', 'DILITHIUM', 'FALCON', 'SPHINCS'];
    const pqcSignatureAlgorithms = ['DILITHIUM', 'FALCON', 'SPHINCS'];
    
    const isPqcKey = pqcKeyAlgorithms.some(alg => 
      publicKeyAlg.toUpperCase().includes(alg)
    );
    
    const isPqcSignature = pqcSignatureAlgorithms.some(alg => 
      signatureAlg.toUpperCase().includes(alg)
    );
    
    // For MVP, we consider it PQC compliant if it uses any PQC algorithm
    return isPqcKey || isPqcSignature;
  }
}
