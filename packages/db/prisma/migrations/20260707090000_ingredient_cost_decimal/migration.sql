-- Widen Ingredient.costPerUnit from integer cents to decimal cents (sub-cent precision).
ALTER TABLE "Ingredient"
  ALTER COLUMN "costPerUnit" SET DATA TYPE DECIMAL(12,4);
