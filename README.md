# Zasso Web Chat

Canal web de primeiro atendimento e qualificação comercial da Zasso, publicado
como aplicação Next.js na Vercel. A interface
reutiliza o chatbot existente como fonte única para RAG, idiomas, guardrails,
estado da conversa e handoff comercial.

Prévia: [web-chatbot-rouge.vercel.app](https://web-chatbot-rouge.vercel.app)

## Objetivo do MVP

- responder dúvidas com base somente no conteúdo público aprovado;
- identificar segmento, região e os campos específicos de agro ou urbano;
- manter o ritmo humano com mensagens sequenciais e indicador de digitação;
- concluir com um botão que abre o WhatsApp comercial com o resumo preenchido;
- funcionar em celular e desktop, sem exigir login do lead.

## Desenvolvimento

```bash
cp .env.example .env.local
npm install
npm run dev
```

Sem as variáveis do chatbot, a aplicação entra em modo de demonstração visual.
Com `CHATBOT_API_URL` e `CHATBOT_API_TOKEN`, a rota `/api/chat` encaminha a
mensagem para o backend real sem expor credenciais ao navegador.

## Validação

```bash
npm run lint
npm test
```

## Documentação

- [Produto](docs/PRODUCT.md)
- [Arquitetura](docs/ARCHITECTURE.md)
- [Fluxo de conversa](docs/CONVERSATION_FLOW.md)
- [Segurança e privacidade](docs/SECURITY.md)
- [Integração da API](docs/API_INTEGRATION.md)
- [Implantação](docs/DEPLOYMENT.md)

## WordPress

O site institucional continua no WordPress. A aplicação pode ser vinculada por
um botão para o subdomínio `atendimento.zasso.com` ou incorporada como widget. O
subdomínio é a opção recomendada para o primeiro lançamento porque mantém os
dois ambientes independentes e facilita rollback.
