import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidade | Zasso",
  description:
    "Política de privacidade do atendimento virtual e comercial da Zasso.",
};

export default function PrivacyPage() {
  return (
    <main className="legal-shell">
      <article className="legal-card">
        <header className="legal-header">
          <Link className="legal-brand" href="/" aria-label="Voltar ao atendimento Zasso">
            ZASSO™
          </Link>
          <div>
            <span className="legal-kicker">Atendimento virtual</span>
            <h1>Política de Privacidade</h1>
            <p>Última atualização: 12 de agosto de 2026</p>
          </div>
        </header>

        <section>
          <h2>1. Sobre esta política</h2>
          <p>
            Esta política explica como a Zasso trata os dados pessoais fornecidos
            durante o atendimento virtual, a qualificação comercial e o posterior
            contato com nossa equipe. A Zasso Group AG, com sede em
            Grafenaustrasse 11, 6300 Zug, Suíça, é responsável por este canal.
          </p>
        </section>

        <section>
          <h2>2. Dados que podemos coletar</h2>
          <p>Podemos tratar os dados que você fornecer voluntariamente, incluindo:</p>
          <ul>
            <li>nome, telefone e idioma de atendimento;</li>
            <li>mensagens, dúvidas e informações enviadas durante a conversa;</li>
            <li>segmento de atuação, região e perfil comercial;</li>
            <li>no setor agrícola, cultivo e tamanho aproximado da área;</li>
            <li>no setor urbano, tipo de organização ou serviço prestado;</li>
            <li>dados técnicos mínimos necessários à segurança e ao funcionamento do canal.</li>
          </ul>
          <p>
            Não solicitamos senhas, dados bancários, documentos de identidade ou
            outras informações sensíveis pelo chatbot.
          </p>
        </section>

        <section>
          <h2>3. Como usamos os dados</h2>
          <p>Os dados são utilizados para:</p>
          <ul>
            <li>responder dúvidas sobre a Zasso e suas soluções;</li>
            <li>entender a necessidade apresentada e qualificar o atendimento;</li>
            <li>gerar um resumo para continuidade com a equipe comercial;</li>
            <li>proteger o canal contra abuso, fraude e incidentes de segurança;</li>
            <li>avaliar e melhorar a qualidade das respostas e da experiência.</li>
          </ul>
        </section>

        <section>
          <h2>4. Automação e inteligência artificial</h2>
          <p>
            O atendimento utiliza automação e inteligência artificial para localizar
            informações na base de conhecimento da Zasso, compreender mensagens e
            organizar os dados comerciais fornecidos. O chatbot não toma decisões
            com efeitos legais ou financeiros sobre o usuário. Assuntos comerciais
            específicos podem ser direcionados para análise humana.
          </p>
        </section>

        <section>
          <h2>5. Compartilhamento e operadores</h2>
          <p>
            Para operar este atendimento, os dados podem ser processados por
            fornecedores de hospedagem, banco de dados, automação, inteligência
            artificial e comunicação, incluindo Vercel, Google Cloud, n8n e Meta
            Platforms/WhatsApp. Cada fornecedor trata os dados conforme suas próprias
            obrigações de segurança e privacidade. Não vendemos dados pessoais.
          </p>
        </section>

        <section>
          <h2>6. Retenção e segurança</h2>
          <p>
            As conversas mantidas diretamente pelo chatbot são conservadas, em regra,
            por até 15 dias para suporte, segurança e melhoria do atendimento, e depois
            são eliminadas ou anonimizadas. Dados encaminhados à equipe comercial podem
            ser mantidos pelo período necessário ao atendimento, ao relacionamento
            comercial ou ao cumprimento de obrigações legais.
          </p>
          <p>
            Empregamos controles de acesso, conexões criptografadas, segregação de
            credenciais, registros de segurança e limitação de retenção. Nenhum sistema,
            entretanto, elimina completamente todos os riscos de segurança.
          </p>
        </section>

        <section>
          <h2>7. Cookies e identificação da conversa</h2>
          <p>
            Este canal pode utilizar um cookie estritamente necessário para identificar
            a sessão e manter a continuidade da conversa. Ele não é usado para publicidade.
          </p>
        </section>

        <section>
          <h2>8. Seus direitos</h2>
          <p>
            Conforme a legislação aplicável, você pode solicitar confirmação do
            tratamento, acesso, correção, exclusão, anonimização, informação sobre
            compartilhamento e revogação de consentimento, quando aplicável.
          </p>
          <p>
            Para exercer seus direitos, envie uma solicitação para{" "}
            <a href="mailto:info@zasso.com">info@zasso.com</a>. Consulte também nossas{" "}
            <Link href="/exclusao-de-dados">instruções de exclusão de dados</Link>.
          </p>
        </section>

        <section>
          <h2>9. Alterações</h2>
          <p>
            Esta política poderá ser atualizada para refletir mudanças no serviço ou
            nas exigências legais. A versão vigente estará sempre disponível nesta página.
          </p>
        </section>

        <footer className="legal-footer">
          <Link href="/">Voltar ao atendimento</Link>
          <span>Zasso Group AG · Zug, Suíça</span>
        </footer>
      </article>
    </main>
  );
}
