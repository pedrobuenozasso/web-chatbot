import { cookies } from "next/headers";

export const runtime = "nodejs";

const sessionCookie = "zasso_chat_session";
const allowedEvents = new Set(["chatbot_opened", "commercial_click"]);

function response(body: object, status = 202) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" },
  });
}

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return response({ error: "content_type_must_be_json" }, 415);
  }
  let body: { eventName?: unknown; attribution?: unknown };
  try { body = await request.json(); } catch { return response({ error: "invalid_json" }, 400); }
  const eventName = String(body.eventName || "");
  if (!allowedEvents.has(eventName)) return response({ error: "invalid_attribution_event" }, 400);

  const cookieStore = await cookies();
  let conversationId = cookieStore.get(sessionCookie)?.value;
  if (!conversationId || !/^[a-f0-9-]{36}$/i.test(conversationId)) {
    conversationId = crypto.randomUUID();
    cookieStore.set(sessionCookie, conversationId, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 15,
    });
  }

  const apiUrl = process.env.CHATBOT_API_URL?.replace(/\/$/, "");
  const apiToken = process.env.CHATBOT_API_TOKEN;
  if (!apiUrl || !apiToken) return response({ accepted: true, demo: true });
  try {
    const upstream = await fetch(`${apiUrl}/v1/attribution`, {
      method: "POST",
      headers: { authorization: `Bearer ${apiToken}`, "content-type": "application/json" },
      body: JSON.stringify({ conversationId: `web:${conversationId}`, eventName, attribution: body.attribution }),
      signal: AbortSignal.timeout(10_000), cache: "no-store",
    });
    return response({ accepted: upstream.ok }, upstream.ok ? 202 : 502);
  } catch {
    return response({ accepted: false }, 502);
  }
}
