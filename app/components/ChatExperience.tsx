"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

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
  } | null;
};

const initialMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    text: "Olá! Agradecemos seu contato com a Zasso. 🌱⚡\n\nSomos pioneiros em Capina Elétrica, uma tecnologia que controla plantas daninhas por meio de energia elétrica, sem o uso de herbicidas.\n\nPara direcionarmos você a um atendimento mais adequado, sobre qual segmento deseja receber informações?",
    time: "agora",
  },
];

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

export function ChatExperience() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [handoff, setHandoff] = useState<ChatResponse["handoff"]>(null);
  const [error, setError] = useState("");
  const [resetting, setResetting] = useState(false);
  const [showSegmentOptions, setShowSegmentOptions] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, typing, handoff]);

  async function sendMessage(text: string, eventType: "message" | "web_selection" = "message") {
    if (!text || typing || text.length > 800) return;

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
          language: navigator.language || "pt-BR",
        }),
      });

      const body = (await response.json()) as ChatResponse & { error?: string };
      if (!response.ok) throw new Error(body.error || "Não foi possível responder.");

      for (const reply of body.messages) {
        setTyping(true);
        await wait(typingDelay(reply));
        setMessages((current) => [...current, newMessage("assistant", reply)]);
      }
      setHandoff(body.handoff || null);
      setShowSegmentOptions(body.stage === "segment");
    } catch {
      if (eventType === "web_selection") setShowSegmentOptions(true);
      setError(
        "Não consegui concluir essa resposta agora. Aguarde um instante e tente novamente.",
      );
    } finally {
      setTyping(false);
    }
  }

  async function submitMessage(event?: FormEvent) {
    event?.preventDefault();
    const text = draft.trim();
    await sendMessage(text);
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submitMessage();
    }
  }

  async function resetConversation() {
    if (typing || resetting) return;
    setResetting(true);
    setError("");
    try {
      await fetch("/api/chat", { method: "DELETE" });
      setMessages(initialMessages);
      setHandoff(null);
      setDraft("");
      setShowSegmentOptions(true);
    } finally {
      setResetting(false);
    }
  }

  return (
    <main className="site-shell">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <section className="intro" aria-label="Apresentação">
        <div className="brand-lockup" aria-label="Zasso">
          <span className="brand-mark">zasso</span>
          <span className="brand-divider" />
          <span className="brand-copy">Tecnologia elétrica para o manejo de plantas</span>
        </div>
        <div className="intro-copy">
          <span className="eyebrow">Atendimento virtual</span>
          <h1>Vamos entender o que sua operação precisa.</h1>
          <p>
            Tire suas dúvidas sobre a tecnologia Zasso. Ao final, organizamos as
            informações para você continuar diretamente com nosso time comercial.
          </p>
        </div>
        <div className="trust-row" aria-label="Características do atendimento">
          <span><i /> Respostas baseadas em conteúdo aprovado</span>
          <span><i /> Atendimento em cinco idiomas</span>
        </div>
      </section>

      <section className="chat-card" aria-label="Chat de atendimento Zasso">
        <header className="chat-header">
          <div className="avatar" aria-hidden="true">zasso</div>
          <div className="chat-identity">
            <strong>Atendimento Zasso</strong>
            <span><i /> online</span>
          </div>
          <button
            className="reset-button"
            type="button"
            onClick={resetConversation}
            disabled={typing || resetting}
            aria-label="Reiniciar conversa"
            title="Reiniciar conversa"
          >
            Reiniciar
          </button>
        </header>

        <div className="privacy-note">
          <span aria-hidden="true">●</span>
          Atendimento seguro. Evite enviar dados pessoais sensíveis.
        </div>

        <div className="message-list" aria-live="polite" aria-busy={typing}>
          <div className="day-marker">Hoje</div>
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
            <div className="quick-replies" aria-label="Escolha seu segmento">
              <button type="button" onClick={() => void sendMessage("Agro", "web_selection")} disabled={typing}>
                <span aria-hidden="true">🌾</span> Agro
              </button>
              <button type="button" onClick={() => void sendMessage("Área urbana", "web_selection")} disabled={typing}>
                <span aria-hidden="true">🏙️</span> Área urbana
              </button>
            </div>
          ) : null}

          {typing ? (
            <div className="typing-bubble" aria-label="Atendimento está digitando">
              <span />
              <span />
              <span />
            </div>
          ) : null}

          {handoff?.url ? (
            <article className="handoff-card">
              <span className="handoff-kicker">Triagem concluída</span>
              <strong>Pronto para conversar com nosso time?</strong>
              <p>Seu resumo já está preparado para você não precisar repetir tudo.</p>
              <a href={handoff.url} target="_blank" rel="noreferrer">
                Continuar no WhatsApp <span aria-hidden="true">↗</span>
              </a>
              {handoff.protocol ? <small>Protocolo {handoff.protocol}</small> : null}
            </article>
          ) : null}

          {error ? <div className="error-message" role="alert">{error}</div> : null}
          <div ref={endRef} />
        </div>

        <form className="composer" onSubmit={submitMessage}>
          <textarea
            aria-label="Mensagem"
            placeholder="Digite sua mensagem..."
            value={draft}
            onChange={(event) => setDraft(event.target.value.slice(0, 800))}
            onKeyDown={handleComposerKeyDown}
            rows={1}
            disabled={typing}
          />
          <button
            type="submit"
            disabled={!draft.trim() || typing}
            aria-label="Enviar mensagem"
          >
            <span aria-hidden="true">→</span>
          </button>
        </form>
        <footer className="chat-footer">
          Ao continuar, você concorda com o uso dos dados para este atendimento.
        </footer>
      </section>
    </main>
  );
}
