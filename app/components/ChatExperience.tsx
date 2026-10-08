"use client";

import { FormEvent, KeyboardEvent, MouseEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { detectUiLanguage, hasUiLanguage, normalizeUiLanguage, UI_COPY, type UiLanguage } from "../lib/ui-i18n";
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

function currentTime(language: UiLanguage) {
  return new Intl.DateTimeFormat(language, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

function newMessage(role: ChatMessage["role"], text: string, language: UiLanguage): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    text,
    time: currentTime(language),
  };
}

function browserLanguageInput() {
  if (typeof window === "undefined") return { languages: ["pt-BR"] };
  const parameters = new URLSearchParams(window.location.search);
  return {
    forcedLanguage: parameters.get("lang") || parameters.get("locale"),
    languages: navigator.languages?.length ? navigator.languages : [navigator.language],
  };
}

function initialUiLanguage(): UiLanguage {
  const input = browserLanguageInput();
  return detectUiLanguage(input);
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
  const [language, setLanguage] = useState<UiLanguage>(initialUiLanguage);
  const copy = UI_COPY[language];
  const [messages, setMessages] = useState<ChatMessage[]>(() => initialMessages(language));
  const [isPreparingChat, setIsPreparingChat] = useState(true);
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
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    const input = browserLanguageInput();
    const browserAlreadyIdentified = hasUiLanguage(input.forcedLanguage)
      || input.languages.some((candidate) => hasUiLanguage(candidate));
    const abortController = new AbortController();
    const abortTimer = window.setTimeout(() => abortController.abort(), 900);
    const startedAt = performance.now();
    let cancelled = false;

    async function prepareChat() {
      let country: string | undefined;
      if (!browserAlreadyIdentified) {
        try {
          const response = await fetch("/api/locale", { cache: "no-store", signal: abortController.signal });
          const payload = (await response.json()) as { country?: unknown };
          if (response.ok && typeof payload.country === "string") country = payload.country;
        } catch {
          // If geolocation is unavailable, Portuguese remains the safe fallback.
        }
      }

      const detectedLanguage = detectUiLanguage({ ...input, country });
      const remainingOpeningTime = Math.max(0, 520 - (performance.now() - startedAt));
      window.setTimeout(() => {
        if (cancelled) return;
        if (detectedLanguage !== language) {
          setLanguage(detectedLanguage);
          setMessages(initialMessages(detectedLanguage));
          document.documentElement.lang = detectedLanguage;
        }
        setIsPreparingChat(false);
      }, remainingOpeningTime);
    }

    void prepareChat();
    return () => {
      cancelled = true;
      window.clearTimeout(abortTimer);
      abortController.abort();
    };
  }, []);

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
    setMessages((current) => [...current, newMessage("user", text, language)]);
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
        setMessages((current) => [...current, newMessage("assistant", reply, responseLanguage)]);
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

  function handleCommercialClick(event: MouseEvent<HTMLAnchorElement>) {
    trackMetaPixelEvent("Lead", {
      content_name: "Chatbot WhatsApp sales handoff",
      destination: "whatsapp",
    });

    // Preserve the browser's native link behavior for modified clicks.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !handoff?.url) {
      void fetch("/api/attribution", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventName: "commercial_click", attribution: attribution.current }), keepalive: true,
      });
      return;
    }

    const whatsappWindow = window.open("about:blank", "_blank");
    if (!whatsappWindow) {
      event.preventDefault();
      const fallbackUrl = handoff.url;
      void fetch("/api/attribution/whatsapp", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ attribution: attribution.current }), keepalive: true, cache: "no-store",
      })
        .then(async (response) => {
          const payload = (await response.json().catch(() => ({}))) as { url?: unknown };
          return response.ok && typeof payload.url === "string" ? payload.url : fallbackUrl;
        })
        .catch(() => fallbackUrl)
        .then((url) => window.location.assign(url));
      return;
    }

    event.preventDefault();
    whatsappWindow.opener = null;
    const fallbackUrl = handoff.url;
    void fetch("/api/attribution/whatsapp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ attribution: attribution.current }),
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as { url?: unknown };
        return response.ok && typeof payload.url === "string" ? payload.url : fallbackUrl;
      })
      .catch(() => fallbackUrl)
      .then((url) => whatsappWindow.location.replace(url));
  }

  if (isPreparingChat) {
    return (
      <main className="chat-loading" aria-label="Zasso">
        <div className="chat-loading-mark">
          <Image src="/zasso-logo.png" alt="Zasso" width={144} height={144} priority />
        </div>
      </main>
    );
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
          <span>Português · English · Deutsch · Français · Español · Italiano</span>
        </div>
      </section>

      <section className="chat-card" aria-label="Chat de atendimento Zasso">
        <header className="chat-header">
          <div className="avatar" aria-hidden="true">
            <Image
              src="/zasso-logo.png"
              alt=""
              width={120}
              height={120}
              sizes="58px"
              priority
            />
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
              <time>
                {message.time}
                {message.role === "user" ? (
                  <span className="message-read-receipt" aria-label="Recebida pelo atendimento automático">
                    <svg viewBox="0 0 20 14" aria-hidden="true">
                      <path d="m1.5 7.5 3.3 3.3 6.2-6.7" />
                      <path d="m7.1 10.8 1.1 1.1 6.4-6.9" />
                    </svg>
                  </span>
                ) : null}
              </time>
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
                <span aria-hidden="true">🌱</span> {copy.agro}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSegment("comercial");
                  void sendMessage(copy.urban, "web_selection", "comercial");
                }}
                disabled={typing}
              >
                <span aria-hidden="true">🏙️</span> {language === "pt-BR" ? "Urbano" : copy.urban}
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
              <strong>{language === "pt-BR" ? "Como você prefere continuar?" : copy.handoffTitle}</strong>
              {language !== "pt-BR" ? <p>{copy.handoffBody}</p> : null}
              <a className="commercial-action" href={handoff.url} target="_blank" rel="noreferrer" aria-label={copy.commercialButton} onClick={handleCommercialClick}>
                <span className="whatsapp-action-copy">
                  <span className="whatsapp-mark" aria-hidden="true">
                    <Image src="/zasso-logo.png" alt="" width={38} height={38} />
                  </span>
                  <span><strong>{language === "pt-BR" ? "💬 Falar com um especialista no WhatsApp" : copy.commercialButton}</strong><small>{copy.openWhatsApp}</small></span>
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
                    void fetch("/api/attribution", {
                      method: "POST", headers: { "content-type": "application/json" },
                      body: JSON.stringify({ eventName: "meeting_click", attribution: attribution.current }), keepalive: true,
                    });
                  }}
                >
                  <span className="whatsapp-action-copy">
                    <span className="whatsapp-mark meeting-mark" aria-hidden="true">📅</span>
                    <span><strong>{language === "pt-BR" ? "Agendar uma conversa" : copy.meetingButton}</strong><small>{copy.openMeeting}</small></span>
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
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m3.4 4.2 16.2 6.8a1.1 1.1 0 0 1 0 2L3.4 19.8a.9.9 0 0 1-1.2-1.1l2-5.6a1 1 0 0 0 0-.7l-2-5.6a.9.9 0 0 1 1.2-1.1Z" />
              <path d="m4.5 12 8 .1" />
            </svg>
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
