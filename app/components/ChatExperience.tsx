"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { normalizeUiLanguage, UI_COPY, type UiLanguage } from "../lib/ui-i18n";
import { campaignAttributionFromBrowser, type CampaignAttribution } from "../lib/campaign-attribution";
import { trackMetaPixelEvent } from "../lib/meta-pixel";

type ChatMessage = {
  id: string;
  role: "assistant" | "user" | "system";
  text: string;
  time: string;
};

type ChatResponse = {
  messages: string[];
  language?: string;
  stage?: string;
  qualified?: boolean;
  handoff?: {
    url: string;
    protocol?: string | null;
    summary?: string | null;
  } | null;
};

function initialMessages(language: UiLanguage): ChatMessage[] {
  return [{
    id: "welcome",
    role: "assistant",
    text: UI_COPY[language].welcome,
    time: UI_COPY[language].now,
  }];
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function typingDelay(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.min(1750, Math.max(650, 420 + words * 28));
}

function currentTime() {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

function newMessage(role: ChatMessage["role"], text: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    text,
    time: currentTime(),
  };
}

type LeadSegment = "agro" | "comercial";

// Links de agenda por segmento. Configuráveis por variável de ambiente para
// evitar link fixo no código; o botão só aparece quando o link existir.
// TODO: mover para o backend (junto com o handoff do WhatsApp) quando a
// agenda (ex.: Odoo) estiver decidida, para não duplicar regra no frontend.
const MEETING_URL_BY_SEGMENT: Record<LeadSegment, string | undefined> = {
  agro: process.env.NEXT_PUBLIC_MEETING_URL_AGRO || process.env.NEXT_PUBLIC_MEETING_URL_COMERCIAL,
  comercial: process.env.NEXT_PUBLIC_MEETING_URL_COMERCIAL,
};

// Anexa o resumo da triagem (região, cultivo/hectares ou perfil urbano) como
// resposta pré-preenchida da primeira pergunta personalizada do Calendly, se
// o link tiver uma. Assim quem recebe a reunião já sabe como começar a
// conversa, sem precisar reconfigurar nada no backend. Se o Calendly não
// tiver essa pergunta configurada, o parâmetro é só ignorado — não quebra.
function withMeetingSummary(url: string | undefined, summary: string | null | undefined) {
  if (!url) return url;
  if (!summary) return url;
  try {
    const target = new URL(url);
    target.searchParams.set("a1", summary);
    return target.toString();
  } catch {
    return url;
  }
}

export function ChatExperience() {
  const [language, setLanguage] = useState<UiLanguage>("pt-BR");
  const copy = UI_COPY[language];
  const [messages, setMessages] = useState<ChatMessage[]>(() => initialMessages("pt-BR"));
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [handoff, setHandoff] = useState<ChatResponse["handoff"]>(null);
  const [error, setError] = useState("");
  const [showSegmentOptions, setShowSegmentOptions] = useState(true);
  const [segment, setSegment] = useState<LeadSegment | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const meetingUrl = withMeetingSummary(segment ? MEETING_URL_BY_SEGMENT[segment] : undefined, handoff?.summary);
  const attribution = useRef<CampaignAttribution | undefined>(undefined);
  const conversationStarted = useRef(false);

  useEffect(() => {
    attribution.current = campaignAttributionFromBrowser(window.location, document.referrer);
    void fetch("/api/attribution", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ eventName: "chatbot_opened", attribution: attribution.current }),
      keepalive: true,
    });
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, typing, handoff]);

  function trackConversationStarted(selectedSegment?: LeadSegment | null) {
    if (conversationStarted.current) return;
    conversationStarted.current = true;
    const parameters: Record<string, string> = {
      content_name: "Chatbot conversation started",
    };
    if (selectedSegment) parameters.segment = selectedSegment === "agro" ? "agro" : "urban";
    trackMetaPixelEvent("Contact", parameters);
  }

  async function sendMessage(
    text: string,
    eventType: "message" | "web_selection" = "message",
    selectedSegment: LeadSegment | null = segment,
  ) {
    if (!text || typing || text.length > 800) return;

    trackConversationStarted(selectedSegment);

    setDraft("");
    setError("");
    setShowSegmentOptions(false);
    setMessages((current) => [...current, newMessage("user", text)]);
    setTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text,
          eventType,
          messageId: crypto.randomUUID(),
          language,
          attribution: attribution.current,
        }),
      });

      const body = (await response.json()) as ChatResponse & { error?: string };
      if (!response.ok) throw new Error(body.error || "Não foi possível responder.");

      const responseLanguage = normalizeUiLanguage(body.language || language);
      setLanguage(responseLanguage);
      document.documentElement.lang = responseLanguage;
      setMessages((current) => current.map((message) => message.id === "welcome"
        ? { ...message, text: UI_COPY[responseLanguage].welcome, time: UI_COPY[responseLanguage].now }
        : message));

      for (const reply of body.messages) {
        setTyping(true);
        await wait(typingDelay(reply));
        setMessages((current) => [...current, newMessage("assistant", reply)]);
      }
      setHandoff(body.handoff || null);
      setShowSegmentOptions(body.stage === "segment");
    } catch {
      if (eventType === "web_selection") setShowSegmentOptions(true);
      setError(copy.error);
    } finally {
      setTyping(false);
    }
  }

  async function submitMessage(event?: FormEvent) {
    event?.preventDefault();
    const text = draft.trim();
    await sendMessage(text, "message", segment);
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submitMessage();
    }
  }

  return (
    <main className="site-shell">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <section className="intro" aria-label="Apresentação">
        <div className="intro-copy">
          <span className="eyebrow"><i /> {copy.introEyebrow}</span>
          <h1>{copy.introTitle}</h1>
          <p>{copy.introBody}</p>
        </div>
        <div className="trust-row" aria-label="Características do atendimento">
          <span>{copy.approvedContent}</span>
          <span>Português · English · Deutsch · Français · Español</span>
        </div>
      </section>

      <section className="chat-card" aria-label="Chat de atendimento Zasso">
        <header className="chat-header">
          <div className="avatar" aria-hidden="true">
            <Image src="/zasso-logo.png" alt="" width={46} height={44} priority />
          </div>
          <div className="chat-identity">
            <strong>{copy.supportName}</strong>
            <span><i /> {copy.available}</span>
          </div>
        </header>

        <div className="privacy-note">
          <span aria-hidden="true">●</span>
          {copy.privacy}
        </div>

        <div className="message-list" aria-live="polite" aria-busy={typing}>
          <div className="day-marker">{copy.today}</div>
          {messages.map((message) => (
            <article
              className={`message-bubble ${message.role}`}
              key={message.id}
            >
              <p>{message.text}</p>
              <time>{message.time}</time>
            </article>
          ))}

          {showSegmentOptions ? (
            <div className="quick-replies" aria-label={copy.segmentLabel}>
              <button
                type="button"
                onClick={() => {
                  setSegment("agro");
                  void sendMessage(copy.agro, "web_selection", "agro");
                }}
                disabled={typing}
              >
                <span aria-hidden="true">🌾</span> {copy.agro}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSegment("comercial");
                  void sendMessage(copy.urban, "web_selection", "comercial");
                }}
                disabled={typing}
              >
                <span aria-hidden="true">🏙️</span> {copy.urban}
              </button>
            </div>
          ) : null}

          {typing ? (
            <div className="typing-bubble" aria-label={copy.typing}>
              <span />
              <span />
              <span />
            </div>
          ) : null}

          {handoff?.url ? (
            <article className="handoff-card">
              <span className="handoff-kicker"><i /> {copy.handoffKicker}</span>
              <strong>{copy.handoffTitle}</strong>
              <p>{copy.handoffBody}</p>
              <a className="commercial-action" href={handoff.url} target="_blank" rel="noreferrer" aria-label={copy.commercialButton} onClick={() => {
                trackMetaPixelEvent("Lead", {
                  content_name: "Chatbot WhatsApp sales handoff",
                  destination: "whatsapp",
                  ...(segment ? { segment: segment === "agro" ? "agro" : "urban" } : {}),
                });
                void fetch("/api/attribution", {
                  method: "POST", headers: { "content-type": "application/json" },
                  body: JSON.stringify({ eventName: "commercial_click", attribution: attribution.current }), keepalive: true,
                });
              }}>
                <span className="whatsapp-action-copy">
                  <span className="whatsapp-mark" aria-hidden="true">
                    <Image src="/zasso-logo.png" alt="" width={38} height={38} />
                  </span>
                  <span><strong>{copy.commercialButton}</strong><small>{copy.openWhatsApp}</small></span>
                </span>
                <span className="action-arrow" aria-hidden="true">↗</span>
              </a>
              {meetingUrl ? (
                <a
                  className="commercial-action meeting-action"
                  href={meetingUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={copy.meetingButton}
                  onClick={() => {
                    trackMetaPixelEvent("Schedule", {
                      content_name: "Chatbot meeting scheduling",
                      ...(segment ? { segment: segment === "agro" ? "agro" : "urban" } : {}),
                    });
                  }}
                >
                  <span className="whatsapp-action-copy">
                    <span className="whatsapp-mark meeting-mark" aria-hidden="true">📅</span>
                    <span><strong>{copy.meetingButton}</strong><small>{copy.openMeeting}</small></span>
                  </span>
                  <span className="action-arrow" aria-hidden="true">↗</span>
                </a>
              ) : null}
              <p className="handoff-consent">
                {copy.handoffConsent}{" "}
                <a
                  href="https://zasso.com/politica-de-privacidade/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {copy.privacyPolicy}
                </a>.
              </p>
              {handoff.protocol ? <small>{copy.protocol} {handoff.protocol}</small> : null}
            </article>
          ) : null}

          {error ? <div className="error-message" role="alert">{error}</div> : null}
          <div ref={endRef} />
        </div>

        <form className="composer" onSubmit={submitMessage}>
          <textarea
            aria-label={copy.messageLabel}
            placeholder={copy.placeholder}
            value={draft}
            onChange={(event) => setDraft(event.target.value.slice(0, 800))}
            onKeyDown={handleComposerKeyDown}
            rows={1}
            disabled={typing}
          />
          <button
            type="submit"
            disabled={!draft.trim() || typing}
            aria-label={copy.send}
          >
            <span aria-hidden="true">→</span>
          </button>
        </form>
        <footer className="chat-footer">
          <span>{copy.consent}</span>{" "}
          <a
            href="https://zasso.com/politica-de-privacidade/"
            target="_blank"
            rel="noopener noreferrer"
          >
            {copy.privacyPolicy}
          </a>
        </footer>
      </section>
    </main>
  );
}
