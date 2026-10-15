import { config } from './config.mjs';

const WEEKEND_ENTRY_SOURCES = new Set(['ctwa_marker', 'ctwa_referral', 'webchat_handoff']);

export function isWeekendEntrySource(value) {
  return WEEKEND_ENTRY_SOURCES.has(value);
}

export function canonicalCampaignMessage(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchesWeekendCampaignMessage(
  text,
  expected = config.weekendHandoffCampaignMessages,
) {
  const supplied = canonicalCampaignMessage(text);
  const markers = (Array.isArray(expected) ? expected : [expected])
    .map(canonicalCampaignMessage)
    .filter(Boolean);
  return Boolean(supplied && markers.includes(supplied));
}

export function localWeekday(now = new Date(), timezone = config.weekendHandoffTimezone) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: timezone })
    .format(now)
    .toLocaleLowerCase('en-US');
}

export function isCommercialWeekendWindow(
  now = new Date(),
  timezone = config.weekendHandoffTimezone,
) {
  const parts = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    hour: '2-digit',
    hourCycle: 'h23',
    timeZone: timezone,
  }).formatToParts(now);
  const weekday = parts.find((part) => part.type === 'weekday')?.value?.toLocaleLowerCase('en-US');
  const hour = Number(parts.find((part) => part.type === 'hour')?.value);
  const holidayReleaseAt = parseHolidayReleaseAt(config.weekendHandoffHolidayReleaseAt);
  const sameHolidayDate = holidayReleaseAt
    && localDateKey(now, timezone) === localDateKey(holidayReleaseAt, timezone);
  return weekday === 'sat'
    || (weekday === 'fri' && Number.isFinite(hour) && hour >= 17)
    || (weekday === 'sun' && Number.isFinite(hour) && hour < config.weekendHandoffReleaseHour)
    // No feriado, mantém a triagem protegida até o horário em que o template
    // abre a janela de atendimento do próximo dia útil.
    || Boolean(sameHolidayDate && new Date(now).getTime() < holidayReleaseAt.getTime());
}

function localDateParts(now, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    timeZone: timezone,
  }).formatToParts(now);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

function localDateKey(now, timezone) {
  const local = localDateParts(now, timezone);
  return `${local.year}-${local.month}-${local.day}`;
}

function parseHolidayReleaseAt(value) {
  const timestamp = Date.parse(String(value || ''));
  return Number.isFinite(timestamp) ? new Date(timestamp) : null;
}

function timezoneOffsetMilliseconds(instant, timezone) {
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'longOffset',
  }).formatToParts(instant);
  const value = formatted.find((part) => part.type === 'timeZoneName')?.value || 'GMT';
  const match = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(value);
  if (!match) return 0;
  const minutes = (Number(match[2]) * 60) + Number(match[3] || 0);
  return (match[1] === '+' ? 1 : -1) * minutes * 60 * 1000;
}

/**
 * Retorna o próximo domingo às `releaseHour` no fuso configurado. Durante o
 * próprio domingo antes desse horário, retorna o domingo corrente.
 */
export function nextWeekendReleaseAt(
  now = new Date(),
  {
    timezone = config.weekendHandoffTimezone,
    releaseHour = config.weekendHandoffReleaseHour,
    holidayReleaseAt = config.weekendHandoffHolidayReleaseAt,
  } = {},
) {
  const current = new Date(now);
  if (!Number.isFinite(current.getTime())) return null;
  const holidayRelease = parseHolidayReleaseAt(holidayReleaseAt);
  // A exceção é propositalmente de uso único: só prevalece antes do horário
  // configurado. Depois disso, a regra recorrente de domingo assume sozinha.
  if (holidayRelease && holidayRelease.getTime() > current.getTime()) return holidayRelease;
  const local = localDateParts(current, timezone);
  const currentWeekday = localWeekday(current, timezone);
  const weekdaysUntilSunday = { sun: 0, mon: 6, tue: 5, wed: 4, thu: 3, fri: 2, sat: 1 };
  let days = weekdaysUntilSunday[currentWeekday];
  if (!Number.isInteger(days)) return null;
  // Após o horário de retomada do próprio domingo, a próxima execução válida
  // será no domingo seguinte, não uma data já passada.
  if (currentWeekday === 'sun' && Number(local.hour) >= releaseHour) days = 7;
  const localTargetAsUtc = Date.UTC(
    Number(local.year), Number(local.month) - 1, Number(local.day) + days, releaseHour, 0, 0,
  );
  const offset = timezoneOffsetMilliseconds(new Date(localTargetAsUtc), timezone);
  return new Date(localTargetAsUtc - offset);
}

export function shouldDeferCommercialHandoff({
  channel = 'whatsapp',
  now = new Date(),
  // O bloqueio após sexta às 17h e durante o sábado é uma regra de segurança operacional e não
  // depende da flag do piloto de template de domingo.
  enabled = true,
} = {}) {
  return enabled
    && channel === 'whatsapp'
    && isCommercialWeekendWindow(now);
}

export function captureWeekendCampaignEntry(state, {
  text,
  channel = 'whatsapp',
  now = new Date(),
  enabled = config.weekendHandoffEnabled,
} = {}) {
  if (!enabled || channel !== 'whatsapp' || state.stage !== 'new') return false;
  if (state.entrySource?.type && state.entrySource.type !== 'unknown') return false;
  if (!isCommercialWeekendWindow(now)) return false;
  if (!matchesWeekendCampaignMessage(text)) return false;

  state.entrySource = {
    type: 'ctwa_marker',
    detectedAt: now.toISOString(),
  };
  return true;
}

export function weekendQueueDecision(state, {
  enabled = config.weekendHandoffEnabled,
  releaseAt,
  releaseHour = config.weekendHandoffReleaseHour,
  timezone = config.weekendHandoffTimezone,
  now = new Date(),
} = {}) {
  if (!enabled || !isWeekendEntrySource(state.entrySource?.type)) {
    return { eligible: false, reason: 'source_not_eligible' };
  }

  const detectedAt = Date.parse(state.entrySource.detectedAt || '');
  const scheduledFor = releaseAt
    ? Date.parse(releaseAt)
    : nextWeekendReleaseAt(now, { timezone, releaseHour })?.getTime();
  const currentTime = new Date(now).getTime();
  if (!Number.isFinite(detectedAt) || !Number.isFinite(scheduledFor) || !Number.isFinite(currentTime)) {
    return { eligible: false, reason: 'invalid_schedule' };
  }

  const freeEntryExpiresAt = detectedAt + 72 * 60 * 60 * 1000;
  if (scheduledFor <= detectedAt || scheduledFor >= freeEntryExpiresAt) {
    return { eligible: false, reason: 'outside_free_entry_window' };
  }
  // Nunca reserve uma conversa para um domingo que já passou.
  if (currentTime >= scheduledFor) {
    return { eligible: false, reason: 'release_window_closed' };
  }

  return {
    eligible: true,
    reason: 'eligible',
    sourceType: state.entrySource.type,
    firstInboundAt: new Date(detectedAt).toISOString(),
    scheduledFor: new Date(scheduledFor).toISOString(),
    freeEntryExpiresAt: new Date(freeEntryExpiresAt).toISOString(),
  };
}

export function weekendDeliveryWindowOpen(state, { now = new Date() } = {}) {
  const scheduledFor = Date.parse(state?.weekendHandoff?.scheduledFor || '');
  const freeEntryExpiresAt = Date.parse(state?.weekendHandoff?.freeEntryExpiresAt || '');
  const currentTime = new Date(now).getTime();
  if (![scheduledFor, freeEntryExpiresAt, currentTime].every(Number.isFinite)) return false;
  // O template de domingo abre uma janela de atendimento de 24 horas, até
  // segunda às 15h. Também respeitamos a janela conservadora da conversa.
  return currentTime >= scheduledFor
    && currentTime < scheduledFor + (24 * 60 * 60 * 1000)
    && currentTime < freeEntryExpiresAt;
}
