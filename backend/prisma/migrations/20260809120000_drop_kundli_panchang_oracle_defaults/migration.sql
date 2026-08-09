-- Remove the Kundli reading/matching and Daily Panchang features (dropped
-- per product decision - platform is no longer offering these).
DROP TABLE IF EXISTS "KundliMatch";
DROP TABLE IF EXISTS "KundliReading";
DROP TABLE IF EXISTS "DailyPanchang";

-- Rebrand default Astrologer persona fields from "Aghori Tantra" wording to
-- the new "Shadow Tantra" / Oracle framing for any future rows that don't
-- explicitly set these fields.
ALTER TABLE "Astrologer" ALTER COLUMN "astrologyStyle" SET DEFAULT 'Shadow Tantra';
ALTER TABLE "Astrologer" ALTER COLUMN "systemInstructions" SET DEFAULT 'Give fearless, unflinching guidance rooted in shadow-tantra philosophy. Ask relevant follow-up questions and engage naturally with whatever the user brings up.';
