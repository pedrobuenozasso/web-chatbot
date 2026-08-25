import { cookies } from "next/headers";

export const runtime = "nodejs";

const sessionCookie = "zasso_chat_session";
const maximumMessageLength = 800;
const supportedLanguages = new Set(["pt-BR", "en", "de", "fr", "es"]);

type ChatbotResponse = {
  messages?: unknown;
  language?: unknown;
  stage?: unknown;
  qualified?: unknown;
  handoffStatus?: unknown;
};

function response(body: object, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function clean(value: unknown, maximumLength: number) {
  return [...String(value ?? "")]
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127);
    })
    .join("")
    .trim()
    .slice(0, maximumLength);
}

function normalizeLanguage(value: unknown) {
  const language = clean(value, 16);
  if (supportedLanguages.has(language)) return language;
  const base = language.split("-")[0];
  return supportedLanguages.has(base) ? base : "pt-BR";
}

function extractHandoff(messages: string[]) {
  let url = "";
  let protocol: string | null = null;
  const cleanedMessages = messages
    .map((message) => {
      const match = message.match(/https:\/\/wa\.me\/[^\s]+/i);
      if (match) url = match[0];
      const protocolMatch = message.match(/ZAS-[A-Z0-9-]+/i);
      if (protocolMatch) protocol = protocolMatch[0];
      return message.replace(/https:\/\/wa\.me\/[^\s]+/gi, "").trim();
    })
    .filter(Boolean);

  return {
    messages: cleanedMessages,
    handoff: url ? { url, protocol } : null,
  };
}

function demoAnswer(text: string) {
  const normalized = text.toLocaleLowerCase("pt-BR");
  if (/pre[cç]o|valor|custa|or[cç]amento/.test(normalized)) {
    return [
      "O investimento varia conforme a aplicação, o porte da operação e a configuração necessária. Para orientar você melhor, preciso entender um pouco da sua necessidade.",
      "Você trabalha mais com agronegócio, área urbana ou outro segmento?",
    ];
  }
  if (/capina|el[eé]tric|como funciona/.test(normalized)) {
    return [
      "A tecnologia da Zasso utiliza eletricidade controlada para atuar na planta indesejada, sem a aplicação de herbicidas químicos. A recomendação depende do cultivo e das condições da área.",
      "Para direcionar melhor, você trabalha com agronegócio, área urbana ou outro segmento?",
    ];
  }
  return [
    "Esta é uma prévia segura do atendimento web. A conexão com a base de conhecimento será ativada no ambiente da Zasso.",
    "Para começar a qualificação, você trabalha com agronegócio, área urbana ou outro segmento?",
  ];
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLocaleLowerCase().startsWith("application/json")) {
    return response({ error: "content_type_must_be_json" }, 415);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return response({ error: "invalid_json" }, 400);
  }

  const text = clean(body.text, maximumMessageLength + 1);
  const messageId = clean(body.messageId, 220) || crypto.randomUUID();
  const language = normalizeLanguage(body.language);
  const eventType = body.eventType === "web_selection" ? "web_selection" : "message";
  if (!text) return response({ error: "message_required" }, 400);
  if (text.length > maximumMessageLength) {
    return response({ error: "message_too_long" }, 400);
  }

  const cookieStore = await cookies();
  let conversationId = cookieStore.get(sessionCookie)?.value;
  if (!conversationId || !/^[a-f0-9-]{36}$/i.test(conversationId)) {
    conversationId = crypto.randomUUID();
    cookieStore.set(sessionCookie, conversationId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 15,
    });
  }

  const apiUrl = process.env.CHATBOT_API_URL?.replace(/\/$/, "");
  const apiToken = process.env.CHATBOT_API_TOKEN;
  if (!apiUrl || !apiToken) {
    return response({
      messages: demoAnswer(text),
      language,
      stage: "demo",
      qualified: false,
      handoff: null,
      demo: true,
    });
  }

  try {
    const upstream = await fetch(`${apiUrl}/v1/messages`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        eventType,
        conversationId: `web:${conversationId}`,
        messageId,
        text,
        firstName: "",
        language,
        channel: "web",
      }),
      signal: AbortSignal.timeout(120_000),
      cache: "no-store",
    });

    const payload = (await upstream.json()) as ChatbotResponse;
    if (!upstream.ok) {
      return response({ error: "chatbot_unavailable" }, upstream.status >= 500 ? 502 : upstream.status);
    }

    const rawMessages = Array.isArray(payload.messages)
      ? payload.messages.map((message) => clean(message, 4_000)).filter(Boolean)
      : [];
    const { messages, handoff } = extractHandoff(rawMessages);
    return response({
      messages,
      language: clean(payload.language, 16) || language,
      stage: clean(payload.stage, 40),
      qualified: Boolean(payload.qualified),
      handoff,
    });
  } catch {
    return response({ error: "chatbot_unavailable" }, 502);
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookie);
  return response({ reset: true });
}
