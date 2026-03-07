const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

function requiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function main() {
  const databaseUrl = requiredEnv('DATABASE_URL');
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });

  const defaultPasswordHash = await bcrypt.hash('QVcrm123', 10);

  const seedUsers = [
    {
      email: 'rick@dytallix.com',
      name: 'Rick Glenn',
      password_hash: defaultPasswordHash,
      role: 'admin',
      active: true,
    },
    {
      email: 'andrew@dytallix.com',
      name: 'Andrew',
      password_hash: defaultPasswordHash,
      role: 'admin',
      active: true,
    },
  ];

  await pool.query(
    `
      insert into public.users (email, name, password_hash, role, active)
      values
        ($1, $2, $3, $4, $5),
        ($6, $7, $8, $9, $10)
      on conflict (email) do update set
        name = excluded.name,
        password_hash = excluded.password_hash,
        role = excluded.role,
        active = excluded.active,
        updated_at = now()
    `,
    [
      seedUsers[0].email,
      seedUsers[0].name,
      seedUsers[0].password_hash,
      seedUsers[0].role,
      seedUsers[0].active,
      seedUsers[1].email,
      seedUsers[1].name,
      seedUsers[1].password_hash,
      seedUsers[1].role,
      seedUsers[1].active,
    ]
  );

  await pool.end();

  console.log('Seeded default QuantumVault CRM users:');
  console.log('  rick@dytallix.com / QVcrm123');
  console.log('  andrew@dytallix.com / QVcrm123');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});