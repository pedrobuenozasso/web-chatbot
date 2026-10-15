import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { config } from './config.mjs';
import { migrateConversationState } from './conversation.mjs';
import {
  closeDatabase,
  claimDueInactivityReminders,
  claimDueWeekendHandoffs,
  completeInactivityReminder,
  completeWeekendHandoff,
  databaseStatus,
  loadCampaignAttribution,
  loadConversationState,
  queueWeekendWebHandoff,
  recordCampaignAttribution,
  resumeWeekendWebHandoff,
  enforceRetentionPolicy,
  initializeDatabase,
  inactivityReminderStatus,
  weekendHandoffStatus,
} from './database.mjs';
import { commercialHandoff, commercialHandoffWithReference, secureHandoffStorage } from './handoff.mjs';
import { SUPPORTED_LANGUAGES, t } from './i18n.mjs';
import { identifierFingerprint, recordEvent } from './observability.mjs';
import { processInboundPersisted } from './persistence.mjs';
import { validateWeekendEncryptionKey } from './weekend-crypto.mjs';

const conversationsInFlight = new Map();
const requestsByConversation = new Map();
const maximumBodyBytes = 32 * 1024;

function json(response, status, body) {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  response.end(payload);
}

export function isValidBearerAuthorization(authorization, expected = config.chatbotApiToken) {
  const supplied = String(authorization || '').replace(/^Bearer\s+/i, '');
  if (!supplied || !expected) return false;
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  return suppliedBuffer.length === expectedBuffer.length && timingSafeEqual(suppliedBuffer, expectedBuffer);
}

function authorized(request) {
  return isValidBearerAuthorization(request.headers.authorization);
}

function withinRateLimit(conversationId) {
  const now = Date.now();
  const key = identifierFingerprint(conversationId);
  const recent = (requestsByConversation.get(key) || [])
    .filter((timestamp) => now - timestamp < config.chatbotApiRateLimitWindowMs);
  if (recent.length >= config.chatbotApiRateLimitMaxRequests) return false;
  recent.push(now);
  requestsByConversation.set(key, recent);
  return true;
}

async function readJsonBody(request) {
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maximumBodyBytes) {
      const error = new Error('request_body_too_large');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    const error = new Error('invalid_json');
    error.statusCode = 400;
    throw error;
  }
}

function cleanString(value, maximumLength) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maximumLength);
}

function decodeAttributionValue(value) {
  let decoded = String(value ?? '').trim();
  // Mantém a API robusta caso o evento venha de um navegador com uma camada
  // extra de encoding, ou de uma versão antiga do cliente web.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const candidate = decoded.replaceAll('+', ' ');
    if (!/[+]|%[0-9a-f]{2}/iu.test(candidate)) break;
    try {
      const next = decodeURIComponent(candidate);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }
  return decoded;
}

function cleanAttributionValue(value, maximumLength) {
  // Decodifique antes de aplicar o limite: assim uma URL codificada nunca é
  // cortada no meio e persistida como um valor impossível de relacionar.
  const cleaned = cleanString(decodeAttributionValue(value), maximumLength);
  return cleaned || undefined;
}

function cleanMetaId(value) {
  const id = cleanAttributionValue(value, 48);
  // IDs de campanha, conjunto e anúncio da Meta são numéricos e muito maiores
  // que um prefixo como "120". Descartar esse fragmento evita atribuição falsa.
  return /^\d{10,48}$/.test(id || '') ? id : undefined;
}

function cleanReferrerHost(value) {
  const candidate = cleanString(value, 253).toLowerCase();
  if (!candidate || !/^[a-z0-9.-]+$/.test(candidate) || candidate.startsWith('.') || candidate.endsWith('.')) return undefined;
  return candidate;
}

export function normalizeCampaignAttribution(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const source = value;
  const landingPath = cleanAttributionValue(source.landingPath, 320);
  const result = {
    utmSource: cleanAttributionValue(source.utmSource, 80),
    utmMedium: cleanAttributionValue(source.utmMedium, 80),
    utmCampaign: cleanAttributionValue(source.utmCampaign, 180),
    utmContent: cleanAttributionValue(source.utmContent, 180),
    utmTerm: cleanAttributionValue(source.utmTerm, 180),
    campaignId: cleanMetaId(source.campaignId),
    adsetId: cleanMetaId(source.adsetId),
    adId: cleanMetaId(source.adId),
    fbclid: cleanAttributionValue(source.fbclid, 255),
    landingPath: landingPath && landingPath.startsWith('/') ? landingPath : undefined,
    referrerHost: cleanReferrerHost(source.referrerHost),
  };
  return Object.values(result).some(Boolean) ? result : undefined;
}

export function validateApiPayload(body) {
  const eventType = cleanString(body.eventType, 16) || 'message';
  const conversationId = cleanString(body.conversationId, 180);
  const messageId = cleanString(body.messageId, 220);
  const text = eventType === 'call'
    ? '[incoming_call]'
    : cleanString(body.text, config.maxQuestionChars + 1);
  const interactionId = cleanString(body.interactionId, 120);
  const firstName = cleanString(body.firstName, 80);
  const language = cleanString(body.language, 16) || 'pt-BR';
  const channel = cleanString(body.channel, 24) || 'whatsapp';
  const recipientNumber = cleanString(body.recipientNumber, 24).replace(/\D/g, '');
  const handoffReference = cleanString(body.handoffReference, 8).toUpperCase();
  const weekendProtocol = cleanString(body.weekendProtocol, 40).toUpperCase();
  const attribution = normalizeCampaignAttribution(body.attribution);

  if (!['message', 'call', 'interactive', 'web_selection'].includes(eventType)) {
    const error = new Error('unsupported_event_type');
    error.statusCode = 400;
    throw error;
  }
  if (!conversationId || !messageId || (eventType === 'interactive' ? !interactionId : !text)) {
    const error = new Error('missing_required_fields');
    error.statusCode = 400;
    throw error;
  }
  if (text.length > config.maxQuestionChars) {
    const error = new Error('message_too_long');
    error.statusCode = 400;
    throw error;
  }
  if (!['whatsapp', 'web', 'n8n-test'].includes(channel)) {
    const error = new Error('unsupported_channel');
    error.statusCode = 400;
    throw error;
  }
  if (recipientNumber && !/^\d{10,15}$/.test(recipientNumber)) {
    const error = new Error('invalid_recipient_number');
    error.statusCode = 400;
    throw error;
  }
  if (handoffReference && !/^[A-Z0-9]{8}$/.test(handoffReference)) {
    const error = new Error('invalid_handoff_reference');
    error.statusCode = 400;
    throw error;
  }
  if (weekendProtocol && !/^ZAS-[A-Z0-9-]{8,32}$/.test(weekendProtocol)) {
    const error = new Error('invalid_weekend_protocol');
    error.statusCode = 400;
    throw error;
  }
  return {
    conversationId,
    messageId,
    text,
    firstName,
    language,
    channel,
    eventType,
    ...(interactionId ? { interactionId } : {}),
    ...(recipientNumber ? { recipientNumber } : {}),
    ...(handoffReference ? { handoffReference } : {}),
    ...(weekendProtocol ? { weekendProtocol } : {}),
    ...(attribution ? { attribution } : {}),
  };
}

async function serialized(conversationId, task) {
  const previous = conversationsInFlight.get(conversationId) || Promise.resolve();
  const current = previous.catch(() => undefined).then(task);
  conversationsInFlight.set(conversationId, current);
  try {
    return await current;
  } finally {
    if (conversationsInFlight.get(conversationId) === current) conversationsInFlight.delete(conversationId);
  }
}

async function handle(request, response) {
  const url = new URL(request.url, 'http://localhost');
  if (request.method === 'GET' && url.pathname === '/healthz') {
    json(response, 200, {
      status: 'ok',
      service: 'zasso-chatbot',
      version: '0.7.0',
      languages: SUPPORTED_LANGUAGES,
      persistence: databaseStatus(),
    });
    return;
  }
  if (request.method === 'GET' && url.pathname === '/v1/weekend-handoffs/status') {
    if (!authorized(request)) {
      json(response, 401, { error: 'unauthorized' });
      return;
    }
    json(response, 200, await weekendHandoffStatus());
    return;
  }
  if (request.method === 'GET' && url.pathname === '/v1/inactivity-reminders/status') {
    if (!authorized(request)) {
      json(response, 401, { error: 'unauthorized' });
      return;
    }
    json(response, 200, await inactivityReminderStatus());
    return;
  }
  if (request.method === 'POST' && url.pathname === '/v1/inactivity-reminders/claim') {
    if (!authorized(request)) {
      json(response, 401, { error: 'unauthorized' });
      return;
    }
    if (!request.headers['content-type']?.toLocaleLowerCase().startsWith('application/json')) {
      json(response, 415, { error: 'content_type_must_be_json' });
      return;
    }
    const body = await readJsonBody(request);
    json(response, 200, { items: await claimDueInactivityReminders(body.limit) });
    return;
  }
  if (request.method === 'POST' && url.pathname === '/v1/inactivity-reminders/result') {
    if (!authorized(request)) {
      json(response, 401, { error: 'unauthorized' });
      return;
    }
    if (!request.headers['content-type']?.toLocaleLowerCase().startsWith('application/json')) {
      json(response, 415, { error: 'content_type_must_be_json' });
      return;
    }
    const body = await readJsonBody(request);
    const updated = await completeInactivityReminder({
      reminderId: cleanString(body.reminderId, 20),
      status: cleanString(body.status, 16),
      metaMessageId: cleanString(body.metaMessageId, 220),
      errorCode: cleanString(body.errorCode, 120),
    });
    json(response, updated ? 200 : 409, { updated });
    return;
  }
  if (request.method === 'POST' && url.pathname === '/v1/weekend-handoffs/claim') {
    if (!authorized(request)) {
      json(response, 401, { error: 'unauthorized' });
      return;
    }
    if (!request.headers['content-type']?.toLocaleLowerCase().startsWith('application/json')) {
      json(response, 415, { error: 'content_type_must_be_json' });
      return;
    }
    const body = await readJsonBody(request);
    const items = await claimDueWeekendHandoffs(body.limit);
    json(response, 200, { items });
    return;
  }
  if (request.method === 'POST' && url.pathname === '/v1/weekend-handoffs/result') {
    if (!authorized(request)) {
      json(response, 401, { error: 'unauthorized' });
      return;
    }
    if (!request.headers['content-type']?.toLocaleLowerCase().startsWith('application/json')) {
      json(response, 415, { error: 'content_type_must_be_json' });
      return;
    }
    const body = await readJsonBody(request);
    const updated = await completeWeekendHandoff({
      protocol: cleanString(body.protocol, 40),
      status: cleanString(body.status, 16),
      metaMessageId: cleanString(body.metaMessageId, 220),
      errorCode: cleanString(body.errorCode, 80),
    });
    json(response, updated ? 200 : 409, { updated });
    return;
  }
  if (request.method === 'POST' && url.pathname === '/v1/attribution') {
    if (!authorized(request)) {
      json(response, 401, { error: 'unauthorized' });
      return;
    }
    if (!request.headers['content-type']?.toLocaleLowerCase().startsWith('application/json')) {
      json(response, 415, { error: 'content_type_must_be_json' });
      return;
    }
    const body = await readJsonBody(request);
    const conversationId = cleanString(body.conversationId, 180);
    const eventName = cleanString(body.eventName, 40);
    if (!conversationId || !['chatbot_opened', 'commercial_click', 'meeting_click'].includes(eventName)) {
      json(response, 400, { error: 'invalid_attribution_event' });
      return;
    }
    const requestCommercialHandoff = body.requestCommercialHandoff === true;
    if (requestCommercialHandoff && eventName !== 'commercial_click') {
      json(response, 400, { error: 'commercial_handoff_requires_commercial_click' });
      return;
    }
    const result = await recordCampaignAttribution({
      conversationId,
      eventName,
      attribution: normalizeCampaignAttribution(body.attribution),
      allocateReferenceCode: requestCommercialHandoff,
    });
    if (!requestCommercialHandoff) {
      json(response, 202, { accepted: result.accepted });
      return;
    }
    const state = await loadConversationState(conversationId);
    if (!state?.handoffProtocol) {
      json(response, 409, { error: 'commercial_handoff_not_ready' });
      return;
    }
    const attribution = await loadCampaignAttribution(conversationId);
    const handoff = result.refCode
      ? commercialHandoffWithReference(state, result.refCode, attribution)
      : commercialHandoff(state, attribution);
    json(response, 200, { accepted: result.accepted, url: handoff.url });
    return;
  }
  if (request.method !== 'POST' || url.pathname !== '/v1/messages') {
    json(response, 404, { error: 'not_found' });
    return;
  }
  if (!authorized(request)) {
    recordEvent('api_access_denied');
    json(response, 401, { error: 'unauthorized' });
    return;
  }
  if (!request.headers['content-type']?.toLocaleLowerCase().startsWith('application/json')) {
    json(response, 415, { error: 'content_type_must_be_json' });
    return;
  }

  const payload = validateApiPayload(await readJsonBody(request));
  if (!withinRateLimit(payload.conversationId)) {
    recordEvent('api_rate_limited', {
      conversationFingerprint: identifierFingerprint(payload.conversationId),
    });
    json(response, 429, { error: 'rate_limited' });
    return;
  }

  if (payload.handoffReference && payload.recipientNumber) {
    const queued = await queueWeekendWebHandoff({
      refCode: payload.handoffReference,
      recipientNumber: payload.recipientNumber,
    });
    if (queued.handled) {
      json(response, 200, {
        duplicate: false,
        messages: [t(queued.language, 'weekendQueued')],
        language: queued.language,
        stage: 'completed',
        handoffStatus: queued.handoffStatus,
      });
      return;
    }
  }

  if (payload.weekendProtocol && payload.recipientNumber) {
    const resumed = await resumeWeekendWebHandoff({
      protocol: payload.weekendProtocol,
      recipientNumber: payload.recipientNumber,
    });
    if (resumed.handled) {
      const handoff = resumed.resumed ? commercialHandoff(resumed.state, resumed.attribution) : null;
      json(response, 200, {
        duplicate: false,
        messages: handoff ? [`${t(resumed.state.language, 'commercialCta')}\n\n${handoff.url}`] : [],
        language: resumed.state?.language || 'pt-BR',
        stage: 'completed',
        handoffStatus: resumed.resumed ? 'commercial_cta_sent' : 'weekend_template_sent',
      });
      return;
    }
  }

  const result = await serialized(payload.conversationId, () => processInboundPersisted(payload));
  json(response, 200, result);
}

export function createChatbotServer() {
  return createServer((request, response) => {
    handle(request, response).catch((error) => {
      const status = Number(error?.statusCode) || 500;
      if (status >= 500) {
        console.error(`Falha na API do chatbot (${error?.name || 'Error'}).`);
        recordEvent('api_response_error', { errorType: error?.name || 'Error' });
      }
      json(response, status, { error: status >= 500 ? 'internal_error' : error.message });
    });
  });
}

export async function startChatbotServer() {
  if (config.chatbotApiToken.length < 32) {
    throw new Error('CHATBOT_API_TOKEN ausente ou curto. Use um segredo aleatório com pelo menos 32 caracteres.');
  }
  if (config.weekendHandoffEnabled) {
    if (!config.databaseEnabled || !config.databaseRequired) {
      throw new Error('O piloto de fim de semana exige DATABASE_ENABLED=true e DATABASE_REQUIRED=true.');
    }
    validateWeekendEncryptionKey();
    if (!Number.isInteger(config.weekendHandoffReleaseHour)
      || config.weekendHandoffReleaseHour < 0 || config.weekendHandoffReleaseHour > 23) {
      throw new Error('WEEKEND_HANDOFF_RELEASE_HOUR ausente ou inválido.');
    }
    if (!/^[a-z0-9_]{3,120}$/.test(config.weekendHandoffTemplateName)) {
      throw new Error('WEEKEND_HANDOFF_TEMPLATE_NAME inválido.');
    }
  }
  if (config.inactivityReminderEnabled) {
    if (!config.databaseEnabled || !config.databaseRequired) {
      throw new Error('O lembrete de inatividade exige DATABASE_ENABLED=true e DATABASE_REQUIRED=true.');
    }
    validateWeekendEncryptionKey();
  }
  migrateConversationState();
  secureHandoffStorage();
  await initializeDatabase();
  const applyRetention = () => {
    enforceRetentionPolicy()
      .then(({ enabled, deletedMessages, expiredConversations }) => {
        if (enabled && (deletedMessages || expiredConversations)) {
          console.log(`Retenção aplicada: ${deletedMessages} mensagens removidas, ${expiredConversations} conversas expiradas.`);
        }
      })
      .catch((error) => {
        console.error(`Falha na retenção (${error?.name || 'Error'}).`);
        recordEvent('retention_policy_error', { errorType: error?.name || 'Error' });
      });
  };
  applyRetention();
  const retentionTimer = setInterval(applyRetention, config.retentionSweepIntervalHours * 60 * 60 * 1000);
  retentionTimer.unref();
  const server = createChatbotServer();
  server.requestTimeout = config.chatbotApiRequestTimeoutMs;
  server.headersTimeout = 15_000;
  server.listen(config.chatbotApiPort, config.chatbotApiHost, () => {
    console.log(`API do chatbot disponível em http://${config.chatbotApiHost}:${config.chatbotApiPort}`);
  });
  server.on('close', () => {
    clearInterval(retentionTimer);
    closeDatabase().catch(() => undefined);
  });
  return server;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    await startChatbotServer();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
