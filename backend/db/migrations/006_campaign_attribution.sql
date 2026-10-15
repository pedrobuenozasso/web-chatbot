-- Attribution is intentionally pseudonymous: conversation_key is already a SHA-256
-- fingerprint and this table never stores names, phones, message text or IP addresses.
CREATE TABLE IF NOT EXISTS chatbot_campaign_attribution (
    conversation_key char(64) PRIMARY KEY,
    utm_source varchar(80),
    utm_medium varchar(80),
    utm_campaign varchar(180),
    utm_content varchar(180),
    utm_term varchar(180),
    campaign_id varchar(48),
    adset_id varchar(48),
    ad_id varchar(48),
    fbclid varchar(255),
    landing_path varchar(320),
    referrer_host varchar(253),
    first_seen_at timestamptz NOT NULL DEFAULT now(),
    last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chatbot_campaign_attribution_campaign_idx
    ON chatbot_campaign_attribution (campaign_id, first_seen_at DESC);

CREATE INDEX IF NOT EXISTS chatbot_campaign_attribution_utm_idx
    ON chatbot_campaign_attribution (utm_campaign, first_seen_at DESC);

CREATE TABLE IF NOT EXISTS chatbot_campaign_events (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    conversation_key char(64) NOT NULL,
    event_name varchar(40) NOT NULL
        CHECK (event_name IN ('chatbot_opened', 'commercial_click')),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (conversation_key, event_name)
);

CREATE INDEX IF NOT EXISTS chatbot_campaign_events_name_created_idx
    ON chatbot_campaign_events (event_name, created_at DESC);
