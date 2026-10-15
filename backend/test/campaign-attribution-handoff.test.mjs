import test from 'node:test';
import assert from 'node:assert/strict';
import { campaignAttributionSummary, campaignOriginLine } from '../src/campaign-attribution.mjs';

test('formata uma origem estável com o ID da campanha, sem expor outros IDs', () => {
  const attribution = campaignAttributionSummary({
    utm_source: 'facebook',
    utm_medium: 'paid_social',
    utm_campaign: '[CB] Urbano BOLT - 01',
    campaign_id: '120250083024600649',
    adset_id: '120250083024600650',
    ad_id: '120250083024600651',
    fbclid: 'fbclid-private-value',
  });

  assert.deepEqual(attribution, {
    utm_source: 'facebook', utm_medium: 'paid_social', utm_campaign: '[CB] Urbano BOLT - 01',
    utm_content: null, utm_term: null, campaign_id: '120250083024600649',
    adset_id: '120250083024600650', ad_id: '120250083024600651', fbclid: 'fbclid-private-value',
  });
  assert.equal(campaignOriginLine(attribution), 'Origem: facebook / paid_social / [CB] Urbano BOLT - 01 / 120250083024600649');
  assert.doesNotMatch(campaignOriginLine(attribution), /12025008302460065[01]|fbclid/i);
});

test('não cria linha Origem sem UTM visível', () => {
  const attribution = campaignAttributionSummary({ campaign_id: '120250083024600649', fbclid: 'private' });
  assert.equal(campaignOriginLine(attribution), null);
});

test('mantém o formato de três campos quando campaign_id não foi capturado', () => {
  const attribution = campaignAttributionSummary({
    utm_source: 'facebook', utm_medium: 'paid_social', utm_campaign: '[CB] Agro - 01',
  });
  assert.equal(campaignOriginLine(attribution), 'Origem: facebook / paid_social / [CB] Agro - 01');
});
