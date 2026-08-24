-- CreateTable
CREATE TABLE "Credential" (
    "id" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "hint" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Credential_pkey" PRIMARY KEY ("id")
);
