import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const temporaryDirectory = mkdtempSync(join(tmpdir(), 'zasso-weekend-agent-'));
process.env.CONVERSATION_STATE_PATH = join(temporaryDirectory, 'conversations.json');
process.env.HANDOFF_OUTBOX_PATH = join(temporaryDirectory, 'handoffs.jsonl');
process.env.WEEKEND_HANDOFF_ENABLED = 'true';
process.env.WEEKEND_HANDOFF_RELEASE_HOUR = '15';

const { processInboundMessage } = await import('../src/agent.mjs');
const { getConversation, newConversation, restoreConversation } = await import('../src/conversation.mjs');

test.after(() => rmSync(temporaryDirectory, { recursive: true, force: true }));

function qualifiedAgroState() {
  const state = newConversation({ firstName: 'Lead', language: 'pt-BR' });
  state.stage = 'agro_area';
  state.entrySource = { type: 'ctwa_marker', detectedAt: '2026-08-14T12:00:00.000Z' };
  state.qualification = {
    segment: 'agro',
    region: 'Campinas/SP',
    crop: 'Café',
    area: null,
    areaHectares: null,
    urbanProfile: null,
  };
  return state;
}

function unmarkedQualifiedAgroState(language) {
  const state = qualifiedAgroState();
  state.language = language;
  state.entrySource = { type: 'unknown' };
  return state;
}

test('qualificação elegível entra na fila sem expor o CTA comercial', async () => {
  const conversationId = 'whatsapp:weekend:queued';
  restoreConversation(conversationId, qualifiedAgroState());
  const result = await processInboundMessage({
    conversationId,
    messageId: 'weekend-area',
    text: '20 hectares',
    channel: 'whatsapp',
    now: new Date('2026-08-15T16:00:00-03:00'),
  });
  assert.equal(result.qualified, true);
  assert.equal(result.handoffStatus, 'weekend_queued');
  assert.doesNotMatch(result.messages.join('\n'), /wa\.me|Falar com a equipe/i);
  assert.equal(result.messages.at(-1), 'Olá! 👋 Recebemos sua mensagem, mas nosso time comercial está fora do horário de atendimento.\nNosso time retornará no próximo dia útil. Você receberá uma mensagem com a opção “Retomar conversa”; basta clicar nela para continuar seu atendimento.\nAté breve!');
});

test('qualificação concluída na segunda não entra numa fila de domingo já encerrada', async () => {
  const conversationId = 'whatsapp:weekend:monday-qualification';
  restoreConversation(conversationId, qualifiedAgroState());
  const result = await processInboundMessage({
    conversationId,
    messageId: 'monday-area',
    text: '20 hectares',
    channel: 'whatsapp',
    now: new Date('2026-08-17T09:00:00-03:00'),
  });
  assert.equal(result.qualified, true);
  assert.equal(result.handoffStatus, 'queued');
  assert.match(result.messages.join('\n'), /wa\.me\/5519981727386/);
  assert.doesNotMatch(result.messages.join('\n'), /domingo/i);
});

test('fila antiga é recuperada quando o lead volta depois da janela de domingo', async () => {
  const conversationId = 'whatsapp:weekend:stale-queued';
  const state = qualifiedAgroState();
  state.stage = 'completed';
  state.handoffStatus = 'weekend_queued';
  state.handoffProtocol = 'ZAS-20260817-STALE1';
  state.qualification.area = '20 hectares';
  state.qualification.areaHectares = 20;
  state.weekendHandoff = {
    scheduledFor: '2026-08-16T21:00:00.000Z',
    freeEntryExpiresAt: '2026-08-17T12:00:00.000Z',
  };
  restoreConversation(conversationId, state);
  const result = await processInboundMessage({
    conversationId,
    messageId: 'monday-return',
    text: 'Quero continuar',
    channel: 'whatsapp',
    now: new Date('2026-08-17T09:00:00-03:00'),
  });
  assert.equal(result.weekendRecovered, true);
  assert.equal(getConversation(conversationId).handoffStatus, 'commercial_cta_sent');
  assert.match(result.messages[0], /wa\.me\/5519981727386/);
});

test('resposta ao template libera o CTA e um pedido de parada cancela a fila', async () => {
  const resumedId = 'whatsapp:weekend:resumed';
  const resumed = qualifiedAgroState();
  resumed.stage = 'completed';
  resumed.handoffStatus = 'weekend_template_sent';
  resumed.handoffProtocol = 'ZAS-20260814-ABC123';
  resumed.qualification.area = '20 hectares';
  resumed.qualification.areaHectares = 20;
  restoreConversation(resumedId, resumed);

  const result = await processInboundMessage({
    conversationId: resumedId,
    messageId: 'continue-button',
    text: 'Continuar atendimento',
    channel: 'whatsapp',
  });
  assert.equal(result.weekendResumed, true);
  assert.match(result.messages[0], /https:\/\/wa\.me\/5519981727386\?text=/);
  assert.equal(getConversation(resumedId).handoffStatus, 'commercial_cta_sent');

  const cancelledId = 'whatsapp:weekend:cancelled';
  const cancelled = qualifiedAgroState();
  cancelled.stage = 'completed';
  cancelled.handoffStatus = 'weekend_queued';
  cancelled.handoffProtocol = 'ZAS-20260814-DEF456';
  restoreConversation(cancelledId, cancelled);
  const stopped = await processInboundMessage({
    conversationId: cancelledId,
    messageId: 'stop-message',
    text: 'não quero mais',
    channel: 'whatsapp',
  });
  assert.equal(stopped.handoffStatus, 'weekend_cancelled');
  assert.match(stopped.messages[0], /Cancelei/i);
});

test('de sexta às 17h até domingo às 15h nunca expõe o CTA comercial nos cinco idiomas', async () => {
  for (const [index, language] of ['pt-BR', 'en-US', 'de-DE', 'fr-FR', 'es-ES'].entries()) {
    const conversationId = `whatsapp:weekend:deferred:${language}`;
    restoreConversation(conversationId, unmarkedQualifiedAgroState(language));
    const result = await processInboundMessage({
      conversationId,
      messageId: `deferred-${index}`,
      text: '20',
      language,
      channel: 'whatsapp',
      now: new Date(index % 3 === 0 ? '2026-08-16T10:33:00-03:00' : index % 2 ? '2026-08-15T16:33:00-03:00' : '2026-08-14T17:33:00-03:00'),
    });
    assert.equal(result.qualified, true);
    assert.equal(result.handoffStatus, 'weekend_deferred');
    assert.doesNotMatch(result.messages.join('\n'), /wa\.me\//i);
  }
});

test('lead sem marcador recebe o CTA somente quando volta após domingo às 15h', async () => {
  const conversationId = 'whatsapp:weekend:deferred-resumed';
  const state = unmarkedQualifiedAgroState('es-ES');
  state.stage = 'completed';
  state.handoffStatus = 'weekend_deferred';
  state.handoffProtocol = 'ZAS-20260814-SPANISH';
  state.qualification.area = '20 hectares';
  state.qualification.areaHectares = 20;
  restoreConversation(conversationId, state);

  const waiting = await processInboundMessage({
    conversationId,
    messageId: 'spanish-friday',
    text: 'Gracias',
    channel: 'whatsapp',
    now: new Date('2026-08-14T17:00:00-03:00'),
  });
  assert.equal(waiting.handoffStatus, 'weekend_deferred');
  assert.doesNotMatch(waiting.messages.join('\n'), /wa\.me\//i);

  const resumed = await processInboundMessage({
    conversationId,
    messageId: 'spanish-sunday',
    text: 'Quiero continuar',
    channel: 'whatsapp',
    now: new Date('2026-08-16T15:00:00-03:00'),
  });
  assert.equal(resumed.handoffStatus, 'commercial_cta_sent');
  assert.match(resumed.messages.join('\n'), /https:\/\/wa\.me\//i);
});
