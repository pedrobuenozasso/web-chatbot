import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Exclusão de Dados | Zasso",
  description:
    "Instruções para solicitar acesso, correção ou exclusão de dados do atendimento virtual Zasso.",
};

export default function DataDeletionPage() {
  return (
    <main className="legal-shell">
      <article className="legal-card legal-card-short">
        <header className="legal-header">
          <Link className="legal-brand" href="/" aria-label="Voltar ao atendimento Zasso">
            ZASSO™
          </Link>
          <div>
            <span className="legal-kicker">Privacidade</span>
            <h1>Exclusão de dados</h1>
            <p>Como solicitar a exclusão dos seus dados do atendimento virtual.</p>
          </div>
        </header>

        <section>
          <h2>Como enviar a solicitação</h2>
          <p>
            Envie um e-mail para <a href="mailto:info@zasso.com">info@zasso.com</a>
            com o assunto <strong>“Exclusão de dados — Atendimento virtual”</strong>.
          </p>
          <p>Informe no corpo da mensagem:</p>
          <ul>
            <li>seu nome;</li>
            <li>o telefone ou outro identificador usado no atendimento;</li>
            <li>o pedido de acesso, correção ou exclusão desejado.</li>
          </ul>
        </section>

        <section>
          <h2>Validação e atendimento</h2>
          <p>
            Podemos solicitar informações adicionais apenas para confirmar que o pedido
            foi realizado pelo titular dos dados. Após a validação, a Zasso localizará e
            excluirá ou anonimizará os dados elegíveis nos sistemas sob seu controle,
            observados os prazos e as obrigações legais aplicáveis.
          </p>
          <p>
            As conversas mantidas diretamente pelo chatbot são eliminadas ou anonimizadas,
            em regra, em até 15 dias. Uma solicitação pode ser enviada antes desse prazo.
          </p>
        </section>

        <section>
          <h2>Dados em plataformas de terceiros</h2>
          <p>
            Mensagens enviadas pelo WhatsApp também podem permanecer na conta e nos
            dispositivos dos participantes conforme as configurações e políticas da Meta.
            A exclusão nesses ambientes poderá exigir uma ação adicional do próprio usuário.
          </p>
        </section>

        <footer className="legal-footer">
          <Link href="/privacidade">Ler a Política de Privacidade</Link>
          <Link href="/">Voltar ao atendimento</Link>
        </footer>
      </article>
    </main>
  );
}
