import { PrismaClient } from '@prisma/client'

// Instantiate a single global Prisma Client instance
export const prisma = new PrismaClient()
export * from '@prisma/client'
