import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const directory = mkdtempSync(join(tmpdir(), 'web-short-flow-'));
process.env.CONVERSATION_STATE_PATH = join(directory, 'state.json');
process.env.HANDOFF_OUTBOX_PATH = join(directory, 'outbox.jsonl');
const { processInboundMessage } = await import('../src/agent.mjs');
test.after(() => rmSync(directory, { recursive: true, force: true }));

for (const [segment, application] of [['Agro', 'Café'], ['Urbano', 'Calçadas e parques públicos']]) {
  test(`web ${segment}: três respostas, nome e aplicação no handoff`, async () => {
    let index = 0;
    const send = text => processInboundMessage({
      conversationId: `web:test-${segment}`, messageId: `${segment}-${index++}`,
      channel: 'web', language: 'pt-BR', text,
      eventType: index === 1 ? 'web_selection' : 'message',
      now: new Date('2026-09-19T12:00:00-03:00'),
    });
    const first = await send(segment);
    assert.equal(first.stage, 'region');
    assert.match(first.messages.join(' '), /3 perguntas rápidas/);
    assert.equal((await send('Campinas/SP')).stage, 'name');
    assert.equal((await send('Pedro')).stage, segment === 'Agro' ? 'agro_crop' : 'urban_profile');
    const done = await send(application);
    assert.equal(done.stage, 'completed');
    assert.equal(done.qualified, true);
    assert.match(done.messages[0], /Obrigado, Pedro!/);
    assert.match(done.messages.join(' '), /https:\/\/wa.me\//);
    assert.ok(decodeURIComponent(done.messages.join(' ')).includes(application));
    assert.doesNotMatch(done.messages.join(' '), /nameQuestion|ackName|hectares/);
  });
}

test('web em italiano mantém toda a triagem curta em italiano', async () => {
  let index = 0;
  const send = text => processInboundMessage({
    conversationId: 'web:test-it', messageId: `it-${index++}`,
    channel: 'web', language: 'it-IT', text,
    eventType: index === 1 ? 'web_selection' : 'message',
    now: new Date('2026-09-19T12:00:00-03:00'),
  });

  const first = await send('Agricoltura');
  assert.equal(first.language, 'it-IT');
  assert.equal(first.stage, 'region');
  assert.match(first.messages.join(' '), /domande rapide/i);
  assert.match(first.messages.join(' '), /città\/regione/i);
  assert.equal((await send('Milano')).stage, 'name');
  assert.equal((await send('Giulia')).stage, 'agro_crop');
  const done = await send('Vigneto');
  assert.equal(done.qualified, true);
  assert.match(done.messages[0], /Grazie, Giulia!/);
  assert.match(done.messages.join(' '), /team commerciale/i);
  assert.doesNotMatch(done.messages.join(' '), /Obrigado|Qual é o seu nome/i);
});

test('web troca uma conversa ainda inicial para o idioma detectado', async () => {
  const conversationId = 'web:test-language-switch';
  await processInboundMessage({
    conversationId, messageId: 'switch-pt', channel: 'web', language: 'pt-BR', text: 'Olá',
  });
  const switched = await processInboundMessage({
    conversationId, messageId: 'switch-it', channel: 'web', language: 'it-IT', text: 'Agricoltura', eventType: 'web_selection',
  });
  assert.equal(switched.language, 'it-IT');
  assert.equal(switched.stage, 'region');
  assert.match(switched.messages.join(' '), /città\/regione/i);
});
