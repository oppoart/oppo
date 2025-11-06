-- CreateTable
CREATE TABLE "query_template_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "query_template_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "query_templates" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "placeholders" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "query_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_query_templates" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_query_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_query_templates_userId_templateId_key" ON "user_query_templates"("userId", "templateId");

-- AddForeignKey
ALTER TABLE "query_templates" ADD CONSTRAINT "query_templates_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "query_template_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_query_templates" ADD CONSTRAINT "user_query_templates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_query_templates" ADD CONSTRAINT "user_query_templates_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "query_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
