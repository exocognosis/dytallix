import { Injectable, Logger } from '@nestjs/common';
import * as tls from 'tls';
import { X509Certificate } from 'crypto';

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
            const x509 = new X509Certificate(certPEM);

            // Extract public key info (supports RSA + ECDSA certs)
            const keyObject = x509.publicKey;
            const keyType = keyObject.asymmetricKeyType || 'unknown';

            let publicKeyAlgorithm = 'Unknown';
            let publicKeySize = 0;

            if (keyType === 'rsa') {
              publicKeyAlgorithm = 'RSA';
              publicKeySize = (keyObject.asymmetricKeyDetails as any)?.modulusLength || 0;
            } else if (keyType === 'ec') {
              publicKeyAlgorithm = 'ECDSA';
              const namedCurve = (keyObject.asymmetricKeyDetails as any)?.namedCurve as
                | string
                | undefined;
              publicKeySize = this.ecCurveBits(namedCurve);
            } else {
              publicKeyAlgorithm = keyType.toUpperCase();
            }

            // Extract signature algorithm (Node exposes a string in modern versions)
            const signatureAlgorithm = (x509 as any).signatureAlgorithm || 'Unknown';

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
              commonName: certificate.subject?.CN || this.extractCommonName(x509.subject),
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

  private extractCommonName(subject: string): string {
    // subject example: 'CN=example.com\nO=...\nC=...'
    const match = subject.match(/CN=([^\n,]+)/);
    return match?.[1]?.trim() || '';
  }

  private ecCurveBits(namedCurve?: string): number {
    if (!namedCurve) return 0;
    const curve = namedCurve.toLowerCase();
    if (curve.includes('256')) return 256;
    if (curve.includes('384')) return 384;
    if (curve.includes('521')) return 521;
    return 0;
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
