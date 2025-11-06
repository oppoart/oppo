/*
  Warnings:

  - You are about to drop the `user_query_templates` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "user_query_templates" DROP CONSTRAINT "user_query_templates_templateId_fkey";

-- DropForeignKey
ALTER TABLE "user_query_templates" DROP CONSTRAINT "user_query_templates_userId_fkey";

-- DropTable
DROP TABLE "user_query_templates";

-- CreateTable
CREATE TABLE "profile_query_templates" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_query_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profile_query_templates_profileId_templateId_key" ON "profile_query_templates"("profileId", "templateId");

-- AddForeignKey
ALTER TABLE "profile_query_templates" ADD CONSTRAINT "profile_query_templates_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "artist_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_query_templates" ADD CONSTRAINT "profile_query_templates_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "query_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
