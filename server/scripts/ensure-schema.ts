import { prisma } from "../configs/prisma.js";

/**
 * AI Maker's existing Neon database was initialized before Prisma Migrate
 * history was established. Do not run `prisma migrate deploy` against it:
 * the initial migration would try to recreate the existing User and Project
 * tables. This script makes only the new, additive webhook-idempotency table
 * and index available. All statements are safe to re-run on every startup.
 */
async function main() {
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "ProcessedWebhookEvent" (
            "id" TEXT NOT NULL,
            "type" TEXT NOT NULL,
            "paymentAttemptId" TEXT,
            "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "ProcessedWebhookEvent_pkey" PRIMARY KEY ("id")
        )
    `);

    await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "ProcessedWebhookEvent_paymentAttemptId_key"
        ON "ProcessedWebhookEvent" ("paymentAttemptId")
    `);

    // Changes only the default for newly inserted accounts. Existing balances
    // are not modified.
    await prisma.$executeRawUnsafe(`
        ALTER TABLE "User" ALTER COLUMN "credits" SET DEFAULT 5
    `);

    console.log("AI Maker database preparation complete");
}

main()
    .catch((error) => {
        console.error("AI Maker database preparation failed:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
