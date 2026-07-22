import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function getRuntimeDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) return databaseUrl

  const url = new URL(databaseUrl)
  if (url.hostname.endsWith('.pooler.supabase.com') && url.port === '6543') {
    url.searchParams.set('pgbouncer', 'true')
  }

  return url.toString()
}

const databaseUrl = getRuntimeDatabaseUrl()

export const prisma = globalForPrisma.prisma || new PrismaClient({
  ...(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : {}),
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export * from '@prisma/client'
