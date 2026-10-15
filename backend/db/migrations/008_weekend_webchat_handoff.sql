-- Webchat handoffs are explicit commercial requests, but are distinct from
-- click-to-WhatsApp referrals. Keep the source truthful for auditability.
ALTER TABLE chatbot_weekend_handoffs
    DROP CONSTRAINT IF EXISTS chatbot_weekend_handoffs_source_type_check;

ALTER TABLE chatbot_weekend_handoffs
    ADD CONSTRAINT chatbot_weekend_handoffs_source_type_check
    CHECK (source_type IN ('ctwa_marker', 'ctwa_referral', 'webchat_handoff'));
