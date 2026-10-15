import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { applyCommercialCta } from './apply-commercial-cta.mjs';
import { applyInactivitySupport } from './apply-inactivity-support.mjs';

function requiredNode(workflow, name) {
  const node = workflow.nodes.find((candidate) => candidate.name === name);
  if (!node) throw new Error(`Node obrigatório ausente: ${name}`);
  return node;
}

// Mantém o código de referência opaco do webchat até o chatbot. O backend
// confere a referência e o telefone antes de inserir na fila; este node apenas
// normaliza campos vindos do WhatsApp.
export function applyWeekendWebHandoff(workflow) {
  const updated = applyCommercialCta(applyInactivitySupport(workflow));
  const normalizer = requiredNode(updated, 'Normalizar e Filtrar Evento');
  const chatbot = requiredNode(updated, 'Consultar Chatbot Zasso');
  let code = String(normalizer.parameters.jsCode || '');

  if (!code.includes('const weekendProtocol =')) {
    const segmentLine = "const segmentAnswer = interactionId === 'zasso_segment:agro' ? 'Agro' : 'Área urbana';";
    if (!code.includes(segmentLine)) throw new Error('Normalizador sem contrato de botões esperado.');
    code = code.replace(
      segmentLine,
      `${segmentLine}\nconst weekendProtocol = /^weekend:(ZAS-[A-Z0-9-]{8,32})$/i.exec(interactionId)?.[1]?.toUpperCase() || '';`,
    );
    code = code.replace(
      'isInactivityAction ? interactionTitle : (',
      '(isInactivityAction || weekendProtocol) ? interactionTitle : (',
    );
    code = code.replace(
      '!isInactivityAction && !isSegmentAction',
      '!isInactivityAction && !isSegmentAction && !weekendProtocol',
    );
    code = code.replace(
      "eventType: isInactivityAction ? 'interactive' : 'message'",
      "eventType: isInactivityAction || weekendProtocol ? 'interactive' : 'message'",
    );
    const guard = 'if ((!text && !isInactivityAction && !isSegmentAction && !weekendProtocol) || !key.id) return [];';
    if (!code.includes(guard)) throw new Error('Normalizador sem guarda de mensagem esperada.');
    code = code.replace(
      guard,
      "const handoffReference = /\\[ref:([A-Z0-9]{8})\\]/i.exec(text)?.[1]?.toUpperCase() || '';\n" + guard,
    );
    code = code.replace(
      "...(isInactivityAction ? { interactionId } : {})",
      "...(isInactivityAction || weekendProtocol ? { interactionId } : {}),\n    ...(weekendProtocol ? { weekendProtocol } : {}),\n    ...(handoffReference ? { handoffReference } : {})",
    );
  }
  if (!code.includes('weekendProtocol') || !code.includes('handoffReference')) {
    throw new Error('Normalizador não preservou referência e botão de fim de semana.');
  }
  normalizer.parameters.jsCode = code;

  const body = String(chatbot.parameters.body || '');
  if (!body.includes('handoffReference: $json.handoffReference')) {
    const marker = 'interactionId: $json.interactionId, recipientNumber: $json.number';
    if (!body.includes(marker)) throw new Error('Contrato do node do chatbot não reconhecido.');
    chatbot.parameters.body = body.replace(
      marker,
      'interactionId: $json.interactionId, handoffReference: $json.handoffReference, weekendProtocol: $json.weekendProtocol, recipientNumber: $json.number',
    );
  }
  return updated;
}

async function main() {
  const source = readFileSync(0, 'utf8');
  const parsed = JSON.parse(source);
  const workflow = Array.isArray(parsed) ? parsed[0] : parsed;
  process.stdout.write(JSON.stringify(applyWeekendWebHandoff(workflow)));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
