import { NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as fs from 'fs';
import * as path from 'path';

async function generateOpenAPI() {
  const app = await NestFactory.create(AppModule, new FastifyAdapter());

  const config = new DocumentBuilder()
    .setTitle('QuantumVault API')
    .setDescription('Post-Quantum Cryptography Asset Management Platform API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('scans', 'TLS scanning and target management')
    .addTag('assets', 'Asset management and metadata')
    .addTag('policies', 'Policy engine and evaluation')
    .addTag('anchors', 'PQC anchor key management')
    .addTag('wrapping', 'PQC envelope encryption')
    .addTag('attestation', 'Blockchain attestation')
    .addTag('dashboard', 'Analytics and KPIs')
    .addTag('blockchain', 'Blockchain integration status')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Write to dist directory
  const distDir = path.join(__dirname, '..', 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  const outputPath = path.join(distDir, 'openapi.json');
  fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));

  console.log(`✅ OpenAPI spec generated at: ${outputPath}`);
  
  await app.close();
}

generateOpenAPI()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Failed to generate OpenAPI spec:', error);
    process.exit(1);
  });
