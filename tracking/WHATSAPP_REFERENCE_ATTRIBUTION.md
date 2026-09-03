# Referência de atribuição no WhatsApp

Quando alguém termina a triagem no chatbot e clica em **Falar com o time
comercial**, a conversa do WhatsApp é uma nova sessão. Para não perder a
origem da campanha, o clique normal cria uma referência curta e opaca, por
exemplo `[ref:A1B2C3D4]`, no fim da mensagem pré-preenchida.

## Contrato

1. O clique chama internamente o endpoint privado de atribuição.
2. O chatbot registra um `ref_code` de oito caracteres alfanuméricos em
   `chatbot_campaign_attribution`, ligado à `conversation_key` existente.
3. O WhatsApp abre com o marcador literal `[ref:XXXXXXXX]` no final do texto.
4. O CRM/Odoo extrai esse marcador da primeira mensagem e consulta a tabela por
   `ref_code` para recuperar UTM, IDs de campanha e `fbclid`.

O código não contém campanha, telefone, nome, texto de conversa ou outro dado
pessoal. Ele é apenas um ponteiro técnico.

## Resiliência

O rastreamento é *best-effort*: se o serviço privado ou o banco estiverem
indisponíveis, o botão abre o link comercial original, sem marcador. A pessoa
nunca fica impedida de falar com a Zasso por uma falha de atribuição.

O evento Meta `Lead` continua sendo disparado no clique. O painel interno
continua registrando `commercial_click`; a referência complementa esse dado
para a integração posterior no CRM.
