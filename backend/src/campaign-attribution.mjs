const FIELDS = Object.freeze([
  ['utm_source', 'utmSource', 80],
  ['utm_medium', 'utmMedium', 80],
  ['utm_campaign', 'utmCampaign', 180],
  ['utm_content', 'utmContent', 180],
  ['utm_term', 'utmTerm', 180],
  ['campaign_id', 'campaignId', 48],
  ['adset_id', 'adsetId', 48],
  ['ad_id', 'adId', 48],
  ['fbclid', 'fbclid', 255],
]);

function safeValue(value, maximumLength) {
  const sanitized = String(value || '')
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maximumLength);
  return sanitized || null;
}

// Mantém os nomes em snake_case no JSON do banco, independentemente de a
// origem vir de uma linha PostgreSQL ou do payload camelCase do navegador.
export function campaignAttributionSummary(value) {
  if (!value || typeof value !== 'object') return null;
  const attribution = Object.fromEntries(FIELDS.map(([databaseKey, payloadKey, maximumLength]) => [
    databaseKey,
    safeValue(value[databaseKey] ?? value[payloadKey], maximumLength),
  ]));
  return Object.values(attribution).some(Boolean) ? attribution : null;
}

// Contrato visível e estável para o parser do Odoo. Somente o ID da campanha
// (quando existir) acompanha os UTMs; os demais IDs da Meta e o fbclid ficam
// exclusivamente em campaignAttribution.
export function campaignOriginLine(attribution) {
  if (!attribution) return null;
  const source = attribution.utm_source || null;
  const medium = attribution.utm_medium || null;
  const campaign = attribution.utm_campaign || null;
  const campaignId = attribution.campaign_id || null;
  if (!source && !medium && !campaign) return null;
  const values = [source || '-', medium || '-', campaign || '-'];
  if (campaignId) values.push(campaignId);
  return `Origem: ${values.join(' / ')}`;
}
