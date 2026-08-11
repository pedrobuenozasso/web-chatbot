# Segurança e privacidade

## Controles implementados

- token do chatbot usado somente no servidor;
- cookie de sessão `HttpOnly`, `SameSite=Lax`, `Secure` em produção;
- corpo JSON obrigatório e mensagem limitada a 800 caracteres;
- IDs de conversa gerados aleatoriamente, sem usar IP ou telefone;
- respostas marcadas `no-store`;
- conteúdo exibido pelo React como texto, sem HTML arbitrário;
- erros internos substituídos por mensagens genéricas;
- timeout para chamadas ao backend;
- nova aba do WhatsApp aberta com `noreferrer`.

## Controles herdados do backend

- rate limit por conversa;
- serialização de mensagens simultâneas;
- idempotência por `messageId`;
- allowlist de conhecimento público;
- detecção de prompt injection;
- fallback seguro quando não existe evidência;
- retenção de mensagens e expiração de estado em 15 dias.

## Antes da produção

- aceitar somente `channel=web` vindo da rede privada/VPS;
- configurar HTTPS e cabeçalhos CSP no proxy;
- limitar requisições também por IP no proxy;
- cadastrar a URL da política de privacidade da Zasso;
- revisar textos de consentimento com o responsável por LGPD;
- não registrar conteúdo integral das mensagens em logs de aplicação;
- executar teste de abuso, XSS, prompt injection e repetição de requisições.

## Dados

O chat deve solicitar apenas dados comerciais necessários. O visitante é
orientado a não enviar documentos, senhas, dados financeiros, informações de
saúde ou outros dados pessoais sensíveis.
