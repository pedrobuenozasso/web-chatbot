import { cookies } from "next/headers";

export const runtime = "nodejs";

const sessionCookie = "zasso_chat_session";
const maximumMessageLength = 800;
const supportedLanguages = new Set(["pt-BR", "pt-PT", "en", "de", "fr", "es"]);

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

function detectedLanguage(text: string, fallback: string) {
  const words = new Set(text.normalize("NFKD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase().match(/\p{L}+/gu) || []);
  const signals: Record<string, string[]> = {
    "pt-BR": ["ola", "voce", "como", "qual", "preco", "capina", "eletrica", "obrigado"],
    en: ["hello", "hi", "what", "where", "how", "price", "weeding", "agriculture", "thanks"],
    de: ["hallo", "was", "wie", "preis", "unkraut", "landwirtschaft", "danke"],
    fr: ["bonjour", "salut", "comment", "prix", "desherbage", "agriculture", "merci"],
    es: ["hola", "como", "precio", "deshierbe", "agricultura", "gracias", "donde"],
  };
  const ranked = Object.entries(signals)
    .map(([language, entries]) => ({ language, score: entries.filter((entry) => words.has(entry)).length }))
    .sort((left, right) => right.score - left.score);
  return ranked[0]?.score && ranked[0].score > (ranked[1]?.score || 0) ? ranked[0].language : fallback;
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

function demoAnswer(text: string, language: string) {
  const normalized = text.normalize("NFKD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase();
  const topic = /preco|valor|custa|orcamento|price|cost|preis|prix|precio/.test(normalized)
    ? "price"
    : /capina|eletric|funciona|weeding|unkraut|desherbage|deshierbe/.test(normalized) ? "technology" : "generic";
  const answers: Record<string, Record<string, string[]>> = {
    "pt-BR": {
      price: ["O investimento varia conforme a aplicação, o porte da operação e a configuração necessária. Para orientar você melhor, preciso entender um pouco da sua necessidade.", "Você trabalha mais com agronegócio, área urbana ou outro segmento?"],
      technology: ["A tecnologia da Zasso utiliza eletricidade controlada para atuar na planta indesejada, sem a aplicação de herbicidas químicos.", "Para direcionar melhor, você trabalha com agronegócio, área urbana ou outro segmento?"],
      generic: ["Esta é uma prévia segura do atendimento web.", "Para começar a qualificação, você trabalha com agronegócio, área urbana ou outro segmento?"],
    },
    en: {
      price: ["The investment varies according to the application, operation size and required configuration. I need to understand your needs to guide you properly.", "Do you work mainly in agriculture, an urban area or another segment?"],
      technology: ["Zasso technology uses controlled electricity to act on unwanted plants, without chemical herbicides.", "To guide you properly, do you work in agriculture, an urban area or another segment?"],
      generic: ["This is a secure preview of the web assistance.", "To begin, do you work in agriculture, an urban area or another segment?"],
    },
    de: {
      price: ["Die Investition hängt von Anwendung, Betriebsgröße und erforderlicher Konfiguration ab. Für eine passende Beratung benötige ich einige Angaben.", "Arbeiten Sie in der Landwirtschaft, im städtischen Bereich oder in einem anderen Bereich?"],
      technology: ["Die Zasso-Technologie nutzt kontrollierte Elektrizität, um unerwünschte Pflanzen ohne chemische Herbizide zu behandeln.", "Arbeiten Sie in der Landwirtschaft, im städtischen Bereich oder in einem anderen Bereich?"],
      generic: ["Dies ist eine sichere Vorschau der Web-Beratung.", "Arbeiten Sie in der Landwirtschaft, im städtischen Bereich oder in einem anderen Bereich?"],
    },
    fr: {
      price: ["L’investissement dépend de l’application, de la taille de l’exploitation et de la configuration nécessaire. J’ai besoin de mieux comprendre votre besoin.", "Travaillez-vous dans l’agriculture, en zone urbaine ou dans un autre secteur ?"],
      technology: ["La technologie Zasso utilise une électricité contrôlée pour agir sur les plantes indésirables, sans herbicides chimiques.", "Travaillez-vous dans l’agriculture, en zone urbaine ou dans un autre secteur ?"],
      generic: ["Ceci est un aperçu sécurisé de l’assistance web.", "Travaillez-vous dans l’agriculture, en zone urbaine ou dans un autre secteur ?"],
    },
    es: {
      price: ["La inversión varía según la aplicación, el tamaño de la operación y la configuración necesaria. Necesito comprender mejor su necesidad.", "¿Trabaja en agricultura, en un área urbana o en otro segmento?"],
      technology: ["La tecnología Zasso utiliza electricidad controlada para actuar sobre las plantas no deseadas, sin herbicidas químicos.", "¿Trabaja en agricultura, en un área urbana o en otro segmento?"],
      generic: ["Esta es una vista previa segura de la atención web.", "¿Trabaja en agricultura, en un área urbana o en otro segmento?"],
    },
  };
  return (answers[language] || answers[language === "pt-PT" ? "pt-BR" : "pt-BR"])[topic];
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
  const language = detectedLanguage(text, normalizeLanguage(body.language));
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
      messages: demoAnswer(text, language),
      language,
      stage: "segment",
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
