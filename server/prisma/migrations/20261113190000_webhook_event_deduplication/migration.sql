-- Store Svix event IDs so webhook retries cannot apply side effects twice.
CREATE TABLE "ProcessedWebhookEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProcessedWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- Match the five-credit signup allowance used by the account bootstrap flow.
ALTER TABLE "User" ALTER COLUMN "credits" SET DEFAULT 5;
