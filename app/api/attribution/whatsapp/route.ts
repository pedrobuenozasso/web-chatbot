import { cookies } from "next/headers";

export const runtime = "nodejs";

const sessionCookie = "zasso_chat_session";

function response(body: object, status = 200) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" },
  });
}

function isWhatsAppHandoffUrl(value: unknown): value is string {
  try {
    const url = new URL(String(value));
    return url.protocol === "https:" && url.hostname === "wa.me";
  } catch {
    return false;
  }
}

// This endpoint is deliberately separate from generic attribution events. It
// runs only after the user clicks the commercial CTA and returns the WhatsApp
// URL with the opaque [ref:XXXXXXXX] marker already attached by the private
// chatbot service. The browser never sends its message summary to this route.
export async function POST() {
  const cookieStore = await cookies();
  const conversationId = cookieStore.get(sessionCookie)?.value;
  if (!conversationId || !/^[a-f0-9-]{36}$/i.test(conversationId)) {
    return response({ error: "conversation_not_found" }, 409);
  }

  const apiUrl = process.env.CHATBOT_API_URL?.replace(/\/$/, "");
  const apiToken = process.env.CHATBOT_API_TOKEN;
  if (!apiUrl || !apiToken) return response({ error: "handoff_unavailable" }, 503);

  try {
    const upstream = await fetch(`${apiUrl}/v1/attribution`, {
      method: "POST",
      headers: { authorization: `Bearer ${apiToken}`, "content-type": "application/json" },
      body: JSON.stringify({
        conversationId: `web:${conversationId}`,
        eventName: "commercial_click",
        requestCommercialHandoff: true,
      }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    const payload = (await upstream.json().catch(() => ({}))) as { url?: unknown };
    if (!upstream.ok || !isWhatsAppHandoffUrl(payload.url)) {
      return response({ error: "handoff_unavailable" }, 503);
    }
    return response({ url: payload.url });
  } catch {
    return response({ error: "handoff_unavailable" }, 503);
  }
}
