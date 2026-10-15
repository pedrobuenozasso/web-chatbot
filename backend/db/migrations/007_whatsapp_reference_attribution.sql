-- A short opaque reference joins the web chatbot session to the WhatsApp
-- conversation created after the commercial handoff. It never contains UTM
-- values, message text, a phone number or any other personal data.
ALTER TABLE chatbot_campaign_attribution
    ADD COLUMN IF NOT EXISTS ref_code char(8);

CREATE UNIQUE INDEX IF NOT EXISTS chatbot_campaign_attribution_ref_code_idx
    ON chatbot_campaign_attribution (ref_code)
    WHERE ref_code IS NOT NULL;

-- Migration 006 predates the meeting CTA. Recreate only the event-name check
-- so fresh installations accept the three events used by the web chatbot.
DO $$
DECLARE constraint_name text;
BEGIN
    FOR constraint_name IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'chatbot_campaign_events'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%event_name%'
    LOOP
        EXECUTE format('ALTER TABLE chatbot_campaign_events DROP CONSTRAINT %I', constraint_name);
    END LOOP;
END $$;

ALTER TABLE chatbot_campaign_events
    ADD CONSTRAINT chatbot_campaign_events_event_name_check
    CHECK (event_name IN ('chatbot_opened', 'commercial_click', 'meeting_click'));
