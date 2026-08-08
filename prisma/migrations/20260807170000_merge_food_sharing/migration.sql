-- One switch for food instead of two. A calorie total you cannot attribute to
-- anything is not much use, and two switches allowed "you may see 1,900 kcal
-- but not that it was pizza", which is a distinction nobody asked for.
--
-- Anyone who had shared either keeps sharing: the merged flag is the OR of the
-- two, so this can only preserve an existing choice, never widen it.
UPDATE "User" SET "shareMeals" = true WHERE "shareCalories" = true;
ALTER TABLE "User" DROP COLUMN "shareCalories";
