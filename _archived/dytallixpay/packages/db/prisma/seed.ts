import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Seeding database...')

    const merchant = await prisma.merchant.create({
        data: {
            name: 'Acme Corp (Test)',
            webhookSecret: 'whsec_test_secret_123',
            apiKeys: {
                create: {
                    name: 'Default Test Key',
                    keyHash: 'hash_of_sk_test_12345',
                }
            },
            balances: {
                create: {
                    currency: 'DRT',
                    available: 1000000n, // Assuming base units, e.g., 1M DRT
                    pending: 0n,
                }
            }
        }
    })

    console.log('Created Merchant:', merchant.id)
    console.log('Seeding complete.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
