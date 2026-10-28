-- Drop existing FK that sets goalId to NULL on goal deletion
ALTER TABLE "Todo" DROP CONSTRAINT "Todo_goalId_fkey";

-- Recreate FK so deleting a goal cascades to linked todos
ALTER TABLE "Todo" ADD CONSTRAINT "Todo_goalId_fkey"
FOREIGN KEY ("goalId") REFERENCES "Goal"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
