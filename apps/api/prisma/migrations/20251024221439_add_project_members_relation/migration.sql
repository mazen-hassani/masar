/*
  Warnings:

  - You are about to drop the `_ProjectMembers` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ConstraintType" AS ENUM ('ASAP', 'ALAP', 'MUST_START_ON', 'MUST_FINISH_ON', 'START_NO_EARLIER', 'START_NO_LATER', 'FINISH_NO_EARLIER', 'FINISH_NO_LATER');

-- DropForeignKey
ALTER TABLE "_ProjectMembers" DROP CONSTRAINT "_ProjectMembers_A_fkey";

-- DropForeignKey
ALTER TABLE "_ProjectMembers" DROP CONSTRAINT "_ProjectMembers_B_fkey";

-- DropTable
DROP TABLE "_ProjectMembers";

-- CreateTable
CREATE TABLE "DateConstraint" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "constraintType" "ConstraintType" NOT NULL,
    "constraintDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DateConstraint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_projectMembers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "DateConstraint_itemId_idx" ON "DateConstraint"("itemId");

-- CreateIndex
CREATE INDEX "DateConstraint_itemType_idx" ON "DateConstraint"("itemType");

-- CreateIndex
CREATE UNIQUE INDEX "_projectMembers_AB_unique" ON "_projectMembers"("A", "B");

-- CreateIndex
CREATE INDEX "_projectMembers_B_index" ON "_projectMembers"("B");

-- AddForeignKey
ALTER TABLE "_projectMembers" ADD CONSTRAINT "_projectMembers_A_fkey" FOREIGN KEY ("A") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_projectMembers" ADD CONSTRAINT "_projectMembers_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
