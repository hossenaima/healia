-- Portion share and broth-left were manual toggles on the meal form. They asked
-- the user to do arithmetic the estimator can infer from their own description
-- ("a fifth of the fries", "left the broth"), so the controls are gone and the
-- columns with them. No meal ever used a non-default value.
ALTER TABLE "Meal" DROP COLUMN "portion";
ALTER TABLE "Meal" DROP COLUMN "brothLeft";
