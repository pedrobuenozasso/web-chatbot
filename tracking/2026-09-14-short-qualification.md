# Triagem curta e visual do webchat

## Escopo
- Webchat em português: segmento → cidade/estado → nome → cultivo (Agro) ou local de utilização (Urbano) → WhatsApp/agenda.
- Novas conversas usam três perguntas após o segmento. Conversas já iniciadas no fluxo anterior continuam nele.
- Outros idiomas e canais mantêm seu fluxo anterior.
- Papel de parede fornecido pelo usuário, em `public/chat-wallpaper.png`; bolhas do visitante em verde-claro `#d9fdd3`.

## Tracking preservado
Os handlers de Contact, Lead, Schedule e eventos internos de clique não foram alterados. A geração de referência de atribuição, protocolo e URLs comerciais continua no caminho existente.

## Publicação coordenada
A mudança envolve dois repositórios: frontend `web-chatbot` e backend `zasso-telegram-bot` (`web-qualification.mjs`, `agent.mjs`, `conversation.mjs`, `handoff.mjs`). Publicar somente o frontend não ativa as três perguntas. Validar os dois segmentos em nova sessão após ambos os deploys, sem enviar mensagens reais ao comercial durante testes automáticos.

## Publicação executada
- Vercel produção: `dpl_XkFcHJiwYrmX5qtFHHWdHKXobXfy`, alias `https://web-chatbot-rouge.vercel.app`.
- VPS: serviço `zasso-chatbot` reconstruído e reiniciado, sem recriar outros serviços ou volumes.
- Arquivos publicados no backend: `agent.mjs`, `handoff.mjs`, `web-qualification.mjs`. O `conversation.mjs` da VPS já tinha a etapa de nome e melhorias adicionais; foi preservado.
- Backup de código na VPS: `/docker/zasso-chatbot/backups/webflow-20260914/`; imagem anterior `zasso-chatbot-backup:webflow-20260914`.
- Saúde após deploy: container `healthy`, endpoint interno `status: ok`, persistência pronta sem erro.
- Verificação da imagem publicada: os dois segmentos foram exercitados em memória, sem mensagens reais ou registros de leads.
