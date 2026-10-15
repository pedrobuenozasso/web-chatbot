import { processInboundMessage } from './agent.mjs';
import { config } from './config.mjs';
import {
  conversationExpired,
  findConversation,
  getConversation,
  resetConversation,
  restoreConversation,
} from './conversation.mjs';
import {
  databaseStatus,
  acceptInactivityDecision,
  acceptLatestInactivityDecision,
  loadConversationState,
  persistConversationState,
  persistInteraction,
} from './database.mjs';
import { SUPPORTED_LANGUAGES, t } from './i18n.mjs';
import { recordEvent } from './observability.mjs';

function canonicalButtonLabel(value) {
  return String(value || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

export function textInactivityDecision(text) {
  const supplied = canonicalButtonLabel(text);
  if (!supplied) return null;
  for (const language of SUPPORTED_LANGUAGES) {
    if (supplied === canonicalButtonLabel(t(language, 'inactivityContinueButton'))) return 'continue';
    if (supplied === canonicalButtonLabel(t(language, 'inactivityCloseButton'))) return 'close';
  }
  return null;
}

function stateTimestamp(state) {
  const timestamp = Date.parse(state?.updatedAt || '');
  return Number.isFinite(timestamp) ? timestamp : 0;
}

async function withDatabaseFallback(task, eventKind) {
  try {
    return await task();
  } catch (error) {
    recordEvent(eventKind, { errorType: error?.name || 'Error' });
    if (config.databaseRequired) throw error;
    console.error(`Falha de persistência PostgreSQL; usando fallback local (${error?.name || 'Error'}).`);
    return null;
  }
}

async function reconcileConversation(payload) {
  if (!databaseStatus().ready) return;
  const remote = await withDatabaseFallback(
    () => loadConversationState(payload.conversationId),
    'database_read_error',
  );
  const local = findConversation(payload.conversationId, {
    firstName: payload.firstName,
    language: payload.language,
  });

  if (remote && conversationExpired(remote)) {
    // Não restaura um handoff ou uma qualificação antiga: a próxima mensagem
    // inicia uma nova triagem e sobrescreve o estado remoto já expirado.
    resetConversation(payload.conversationId);
    recordEvent('conversation_session_expired', { reason: 'inactivity' });
    return;
  }

  if (remote && (!local || stateTimestamp(remote) > stateTimestamp(local))) {
    restoreConversation(payload.conversationId, remote);
    return;
  }
  if (local && (!remote || stateTimestamp(local) > stateTimestamp(remote))) {
    await withDatabaseFallback(
      () => persistConversationState(payload.conversationId, local, payload.channel),
      'database_reconciliation_error',
    );
  }
}

export async function processInboundPersisted(payload) {
  await reconcileConversation(payload);
  let normalizedPayload = payload;
  let inactivityDecisionAccepted = false;
  if (payload.eventType === 'interactive') {
    const match = /^zasso_inactivity:(continue|close):(\d{1,19})$/.exec(payload.interactionId || '');
    if (match) {
      inactivityDecisionAccepted = Boolean(await withDatabaseFallback(
        () => acceptInactivityDecision({
          conversationId: payload.conversationId,
          decision: match[1],
          reminderId: match[2],
        }),
        'inactivity_decision_error',
      ));
    }
  } else if (payload.eventType === 'message') {
    const decision = textInactivityDecision(payload.text);
    if (decision) {
      const reminderId = await withDatabaseFallback(
        () => acceptLatestInactivityDecision({
          conversationId: payload.conversationId,
          decision,
        }),
        'inactivity_text_decision_error',
      );
      inactivityDecisionAccepted = Boolean(reminderId);
      // Algumas versões da Evolution preservam apenas o rótulo do botão. O
      // backend o converte numa interação segura somente quando há lembrete
      // aberto; se já estiver cancelado, o clique é tratado como obsoleto.
      normalizedPayload = {
        ...payload,
        eventType: 'interactive',
        interactionId: `zasso_inactivity:${decision}:${reminderId || '0'}`,
      };
    }
  }
  const result = await processInboundMessage({ ...normalizedPayload, inactivityDecisionAccepted });
  const state = getConversation(normalizedPayload.conversationId, {
    firstName: normalizedPayload.firstName,
    language: result.language,
  });
  await withDatabaseFallback(
    () => persistInteraction(normalizedPayload, result, state),
    'database_write_error',
  );
  return result;
}
