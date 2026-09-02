# Tracking de campanhas — Zasso

Esta pasta concentra o contrato de rastreamento entre anúncios Meta, landing page, chatbot web e painel Zasso. Ela não contém segredos, dados pessoais, telefone, e-mail, IP ou conteúdo de conversas.

## Jornada medida

```text
Meta Ads → landing page → chatbot aberto → chat iniciado → lead qualificado → encaminhamento → clique comercial
```

O chatbot grava a primeira origem conhecida de cada sessão. Isso impede que uma navegação posterior substitua a atribuição original do lead.

## URL dos anúncios

No Gerenciador de Anúncios, a URL que aponta para a landing deve receber parâmetros dinâmicos equivalentes a:

```text
utm_source=meta
utm_medium=paid_social
utm_campaign={{campaign.id}}
utm_content={{ad.id}}
campaign_id={{campaign.id}}
adset_id={{adset.id}}
ad_id={{ad.id}}
```

Antes de publicar, validar na prévia da Meta que os parâmetros foram substituídos pelos IDs reais. A sintaxe dos campos dinâmicos pode variar no Gerenciador de Anúncios.

## Landing → chatbot

Use [`landing-forward-attribution.js`](./landing-forward-attribution.js) no clique do botão que abre o chatbot. Ele preserva apenas os parâmetros de mídia permitidos e informa o caminho da landing, sem transportar a URL inteira nem dados pessoais.

## Dados exibidos no painel

Em **Campanhas Meta → Funil até o comercial**, o painel mostra por campanha/origem:

1. chatbot aberto;
2. chat iniciado;
3. lead qualificado;
4. encaminhamento ao comercial;
5. clique no botão comercial.

Os dados começam a existir a partir da publicação desta versão e do primeiro acesso por uma URL rastreada.

## Arquivos de produção relacionados

- `app/lib/campaign-attribution.ts`: lê os parâmetros permitidos no navegador.
- `app/api/attribution/route.ts`: cria/recupera a sessão anônima e encaminha eventos ao backend privado.
- `app/api/chat/route.ts`: transmite a atribuição da sessão com cada mensagem.
- `app/components/ChatExperience.tsx`: registra abertura e clique no encaminhamento comercial.

