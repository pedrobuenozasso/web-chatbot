# Rastreamento de campanhas — Zasso

O chatbot registra a atribuição na primeira abertura da sessão e não armazena nome, telefone, e-mail, IP ou texto da conversa como dado de marketing.

## Padrão obrigatório das URLs de anúncio

Na Meta, mantenha os parâmetros de URL dinâmicos apontando para a landing page:

```text
utm_source=meta
utm_medium=paid_social
utm_campaign={{campaign.id}}
utm_content={{ad.id}}
campaign_id={{campaign.id}}
adset_id={{adset.id}}
ad_id={{ad.id}}
```

Os nomes exibidos pelas variáveis dinâmicas podem variar no Gerenciador de Anúncios. Antes de publicar, use a prévia da Meta para conferir se o URL final contém os IDs reais, não os textos entre chaves.

## Preservar a origem da landing até o chatbot

O botão da landing que abre o chatbot precisa copiar a query string atual. Exemplo conceitual:

```js
const chatbot = new URL('https://web-chatbot-rouge.vercel.app/');
chatbot.search = window.location.search;
chatbot.searchParams.set('landing_path', window.location.pathname);
window.location.assign(chatbot);
```

Assim, `utm_*`, `campaign_id`, `adset_id`, `ad_id` e `fbclid` chegam ao chatbot. Se a landing não preservar esses parâmetros, o chatbot continuará atendendo normalmente, mas a campanha ficará como origem não identificada no painel.

## O que aparece no painel

Em **Campanhas Meta → Funil até o comercial**, a equipe verá por campanha/origem:

1. chatbot aberto;
2. chat iniciado;
3. lead qualificado;
4. encaminhamento ao comercial;
5. clique no botão comercial.

Os primeiros dados só aparecem após a publicação desta versão e a abertura do chatbot por uma URL rastreada.
