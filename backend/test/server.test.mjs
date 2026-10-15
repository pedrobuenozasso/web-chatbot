import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCampaignAttribution, validateApiPayload } from '../src/server.mjs';

test('aceita o canal web sem alterar o contrato de mensagens', () => {
  const payload = validateApiPayload({
    conversationId: 'web:9f9554cb-408e-49ef-b568-c34addbccb20',
    messageId: '5f8806ef-92e4-4ab7-8efc-16aff5456020',
    text: 'Como funciona a capina elétrica?',
    language: 'pt-BR',
    channel: 'web',
  });

  assert.equal(payload.channel, 'web');
  assert.equal(payload.eventType, 'message');
});

test('aceita a seleção inicial do canal web', () => {
  const payload = validateApiPayload({
    conversationId: 'web:9f9554cb-408e-49ef-b568-c34addbccb20',
    messageId: '7b8806ef-92e4-4ab7-8efc-16aff5456020',
    text: 'Agro',
    language: 'pt-BR',
    channel: 'web',
    eventType: 'web_selection',
  });

  assert.equal(payload.eventType, 'web_selection');
});

test('continua recusando canais não autorizados', () => {
  assert.throws(
    () => validateApiPayload({
      conversationId: 'visitor',
      messageId: 'message',
      text: 'teste',
      channel: 'browser-direct',
    }),
    /unsupported_channel/,
  );
});

test('aceita somente telefone internacional válido para agendamento', () => {
  const payload = validateApiPayload({
    conversationId: 'whatsapp:test:recipient',
    messageId: 'message-recipient',
    text: 'Olá',
    channel: 'whatsapp',
    recipientNumber: '+55 (11) 99999-9999',
  });
  assert.equal(payload.recipientNumber, '5511999999999');
  assert.throws(() => validateApiPayload({
    conversationId: 'whatsapp:test:recipient',
    messageId: 'message-recipient-2',
    text: 'Olá',
    channel: 'whatsapp',
    recipientNumber: '123',
  }), /invalid_recipient_number/);
});

test('preserva somente atribuição de campanha pseudônima no canal web', () => {
  const payload = validateApiPayload({
    conversationId: 'web:9f9554cb-408e-49ef-b568-c34addbccb20', messageId: 'track-1', text: 'Agro', channel: 'web',
    attribution: { utmSource: 'meta', utmCampaign: '120250083024600649', campaignId: '120250083024600649', landingPath: '/capina-eletrica', referrerHost: 'zasso.com' },
  });
  assert.deepEqual(payload.attribution, { utmSource: 'meta', utmMedium: undefined, utmCampaign: '120250083024600649', utmContent: undefined, utmTerm: undefined, campaignId: '120250083024600649', adsetId: undefined, adId: undefined, fbclid: undefined, landingPath: '/capina-eletrica', referrerHost: 'zasso.com' });
  assert.equal(normalizeCampaignAttribution({ landingPath: 'https://zasso.com/?phone=5519' }), undefined);
});

test('normaliza UTMs duplamente codificadas e descarta IDs Meta truncados', () => {
  const attribution = normalizeCampaignAttribution({
    utmCampaign: '%5BCB%5D+Urbano+BOLT+-+01',
    campaignId: '120',
    adsetId: '120250083024580649',
    adId: '120250083024590649',
  });
  assert.deepEqual(attribution, {
    utmSource: undefined,
    utmMedium: undefined,
    utmCampaign: '[CB] Urbano BOLT - 01',
    utmContent: undefined,
    utmTerm: undefined,
    campaignId: undefined,
    adsetId: '120250083024580649',
    adId: '120250083024590649',
    fbclid: undefined,
    landingPath: undefined,
    referrerHost: undefined,
  });
});
