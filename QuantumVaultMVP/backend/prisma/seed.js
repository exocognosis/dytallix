/* eslint-disable no-console */

const { PrismaClient, UserRole } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const adminPassword = await bcrypt.hash('QuantumVault2024!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@quantumvault.local' },
    update: {},
    create: {
      email: 'admin@quantumvault.local',
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });
  console.log('✅ Created admin user:', admin.email);

  const engineerPassword = await bcrypt.hash('Engineer2024!', 12);
  const engineer = await prisma.user.upsert({
    where: { email: 'engineer@quantumvault.local' },
    update: {},
    create: {
      email: 'engineer@quantumvault.local',
      passwordHash: engineerPassword,
      role: UserRole.SECURITY_ENGINEER,
      isActive: true,
    },
  });
  console.log('✅ Created security engineer user:', engineer.email);

  const viewerPassword = await bcrypt.hash('Viewer2024!', 12);
  const viewer = await prisma.user.upsert({
    where: { email: 'viewer@quantumvault.local' },
    update: {},
    create: {
      email: 'viewer@quantumvault.local',
      passwordHash: viewerPassword,
      role: UserRole.VIEWER,
      isActive: true,
    },
  });
  console.log('✅ Created viewer user:', viewer.email);

  const target = await prisma.target.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Google TLS Endpoint',
      type: 'TLS_ENDPOINT',
      host: 'google.com',
      port: 443,
      protocol: 'https',
      isActive: true,
      metadata: {
        description: 'Sample TLS endpoint for testing',
      },
    },
  });
  console.log('✅ Created sample scan target:', target.name);

  const policy = await prisma.policy.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'High Risk Asset Policy',
      description: 'Automatically wrap assets with HIGH or CRITICAL risk levels',
      ruleDefinition: {
        riskLevel: ['HIGH', 'CRITICAL'],
        status: ['DISCOVERED', 'ASSESSED'],
      },
      targetScope: {
        types: ['TLS_CERTIFICATE', 'ENCRYPTION_KEY'],
      },
      isActive: false,
      priority: 10,
    },
  });
  console.log('✅ Created sample policy:', policy.name);

  const snapshotId = '00000000-0000-0000-0000-000000000003';
  await prisma.orgSnapshot.upsert({
    where: { id: snapshotId },
    update: {
      metadata: {
        note: 'Initial baseline snapshot',
      },
    },
    create: {
      id: snapshotId,
      totalAssets: 0,
      discoveredAssets: 0,
      wrappedAssets: 0,
      attestedAssets: 0,
      criticalRiskAssets: 0,
      highRiskAssets: 0,
      mediumRiskAssets: 0,
      lowRiskAssets: 0,
      pqcCompliantPercent: 0,
      avgRiskScore: 0,
      metadata: {
        note: 'Initial baseline snapshot',
      },
    },
  });
  console.log('✅ Ensured initial snapshot');

  console.log('');
  console.log('🎉 Seed data created successfully!');
  console.log('');
  console.log('Login credentials:');
  console.log('  Admin:    admin@quantumvault.local / QuantumVault2024!');
  console.log('  Engineer: engineer@quantumvault.local / Engineer2024!');
  console.log('  Viewer:   viewer@quantumvault.local / Viewer2024!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
