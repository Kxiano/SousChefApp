-- Free trial: when it ends, and when the owner saw the mid-trial offer.
ALTER TABLE "restaurants" ADD COLUMN "trial_ends_at" TIMESTAMPTZ;
ALTER TABLE "restaurants" ADD COLUMN "trial_reminder_seen_at" TIMESTAMPTZ;

-- Kitchens already on the trial get a full 30 days from today, so nobody is
-- locked out the moment this ships.
UPDATE "restaurants"
SET "trial_ends_at" = now() + interval '30 days'
WHERE "trial_ends_at" IS NULL
  AND "stripe_subscription_id" IS NULL
  AND ("subscription_status" IS NULL OR "subscription_status" = 'trialing');
