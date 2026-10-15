import test from 'node:test';
import assert from 'node:assert/strict';
import {
  captureWeekendCampaignEntry,
  isWeekendEntrySource,
  matchesWeekendCampaignMessage,
  nextWeekendReleaseAt,
  shouldDeferCommercialHandoff,
  weekendQueueDecision,
} from '../src/weekend-pilot.mjs';
import { newConversation } from '../src/conversation.mjs';

test('reconhece somente variações inofensivas da mensagem configurada no anúncio', () => {
  assert.equal(matchesWeekendCampaignMessage('Olá! Posso ter mais informações sobre isso?'), true);
  assert.equal(matchesWeekendCampaignMessage('ola posso ter mais informacoes sobre isso'), true);
  assert.equal(matchesWeekendCampaignMessage('  OLÁ, posso ter mais informações sobre isso!!!  '), true);
  assert.equal(matchesWeekendCampaignMessage('Olá! Posso saber mais informações sobre isto?'), true);
  assert.equal(matchesWeekendCampaignMessage('¡Hola! Me gustaría conseguir más información sobre esto.'), true);
  assert.equal(matchesWeekendCampaignMessage('Olá! Quero saber o preço.'), false);
  assert.equal(matchesWeekendCampaignMessage('Posso ter informações?'), false);
});

test('bloqueia o CTA de sexta às 17h até domingo às 15h', () => {
  assert.equal(shouldDeferCommercialHandoff({
    channel: 'whatsapp',
    now: new Date('2026-08-14T16:59:59-03:00'),
    enabled: true,
  }), false);
  for (const now of [
    new Date('2026-08-14T17:00:00-03:00'),
    new Date('2026-08-15T16:30:00-03:00'),
    new Date('2026-08-16T14:59:59-03:00'),
  ]) {
    assert.equal(shouldDeferCommercialHandoff({ channel: 'whatsapp', now, enabled: true }), true);
  }
  assert.equal(shouldDeferCommercialHandoff({
    channel: 'web',
    now: new Date('2026-08-14T16:30:00-03:00'),
    enabled: true,
  }), false);
  assert.equal(shouldDeferCommercialHandoff({
    channel: 'whatsapp',
    now: new Date('2026-08-16T15:00:00-03:00'),
    enabled: true,
  }), false);
});

test('marca somente a primeira mensagem de WhatsApp dentro da janela do fim de semana', () => {
  const friday = new Date('2026-08-14T17:00:00-03:00');
  const fridayBeforeCutoff = new Date('2026-08-14T16:59:59-03:00');
  const saturday = new Date('2026-08-15T12:00:00-03:00');
  const thursday = new Date('2026-08-13T12:00:00-03:00');

  for (const now of [friday, saturday]) {
    const state = newConversation();
    assert.equal(captureWeekendCampaignEntry(state, {
      text: 'Olá! Posso ter mais informações sobre isso?',
      channel: 'whatsapp',
      now,
      enabled: true,
    }), true);
    assert.equal(state.entrySource.type, 'ctwa_marker');
  }

  const weekdayState = newConversation();
  assert.equal(captureWeekendCampaignEntry(weekdayState, {
    text: 'Olá! Posso ter mais informações sobre isso?',
    channel: 'whatsapp',
    now: thursday,
    enabled: true,
  }), false);

  const beforeCutoffState = newConversation();
  assert.equal(captureWeekendCampaignEntry(beforeCutoffState, {
    text: 'Olá! Posso ter mais informações sobre isso?',
    channel: 'whatsapp',
    now: fridayBeforeCutoff,
    enabled: true,
  }), false);

  const webState = newConversation();
  assert.equal(captureWeekendCampaignEntry(webState, {
    text: 'Olá! Posso ter mais informações sobre isso?',
    channel: 'web',
    now: friday,
    enabled: true,
  }), false);
});

test('não substitui uma origem já registrada', () => {
  const state = newConversation();
  state.entrySource = { type: 'ctwa_referral', detectedAt: '2026-08-14T10:00:00.000Z' };
  assert.equal(captureWeekendCampaignEntry(state, {
    text: 'Olá! Posso ter mais informações sobre isso?',
    channel: 'whatsapp',
    now: new Date('2026-08-14T12:00:00-03:00'),
    enabled: true,
  }), false);
  assert.equal(state.entrySource.type, 'ctwa_referral');
});

test('agenda a liberação recorrente de domingo às 15h dentro das 72 horas conservadoras', () => {
  const state = newConversation();
  state.entrySource = { type: 'ctwa_marker', detectedAt: '2026-08-14T03:00:00.000Z' };
  const eligible = weekendQueueDecision(state, {
    enabled: true,
    now: new Date('2026-08-15T12:00:00-03:00'),
  });
  assert.equal(eligible.eligible, true);
  assert.equal(eligible.sourceType, 'ctwa_marker');
  assert.equal(eligible.scheduledFor, '2026-08-16T18:00:00.000Z');

  const late = weekendQueueDecision(state, {
    enabled: true,
    releaseAt: '2026-08-17T01:00:00-03:00',
    now: new Date('2026-08-15T12:00:00-03:00'),
  });
  assert.equal(late.eligible, false);
  assert.equal(late.reason, 'outside_free_entry_window');

  const afterSunday = weekendQueueDecision(state, {
    enabled: true,
    now: new Date('2026-08-17T09:00:00-03:00'),
  });
  assert.equal(afterSunday.eligible, false);
  assert.equal(afterSunday.reason, 'outside_free_entry_window');
});

test('aceita handoff qualificado do webchat como origem segura da fila', () => {
  assert.equal(isWeekendEntrySource('webchat_handoff'), true);
  assert.equal(isWeekendEntrySource('unknown'), false);

  const state = newConversation();
  state.entrySource = { type: 'webchat_handoff', detectedAt: '2026-08-14T20:00:00.000Z' };
  const decision = weekendQueueDecision(state, {
    enabled: true,
    now: new Date('2026-08-15T12:00:00-03:00'),
  });
  assert.equal(decision.eligible, true);
  assert.equal(decision.sourceType, 'webchat_handoff');
});

test('calcula o domingo corrente antes das 15h e o próximo domingo depois das 15h', () => {
  assert.equal(
    nextWeekendReleaseAt(new Date('2026-08-16T10:00:00-03:00')).toISOString(),
    '2026-08-16T18:00:00.000Z',
  );
  assert.equal(
    nextWeekendReleaseAt(new Date('2026-08-16T16:00:00-03:00')).toISOString(),
    '2026-08-23T18:00:00.000Z',
  );
});

test('usa excepcionalmente a segunda-feira de feriado e volta ao domingo depois dela', () => {
  const holidayReleaseAt = '2026-09-07T15:00:00-03:00';
  assert.equal(
    nextWeekendReleaseAt(new Date('2026-09-04T17:00:00-03:00'), { holidayReleaseAt }).toISOString(),
    '2026-09-07T18:00:00.000Z',
  );
  assert.equal(
    nextWeekendReleaseAt(new Date('2026-09-07T15:01:00-03:00'), { holidayReleaseAt }).toISOString(),
    '2026-09-13T18:00:00.000Z',
  );
});
