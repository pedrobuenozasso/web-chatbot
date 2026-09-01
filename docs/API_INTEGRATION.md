# Integração com o chatbot

## Requisição interna

`POST {CHATBOT_API_URL}/v1/messages`

```json
{
  "eventType": "message",
  "conversationId": "web:uuid-da-sessao",
  "messageId": "uuid-da-mensagem",
  "text": "Como funciona a capina elétrica?",
  "firstName": "",
  "language": "pt-BR",
  "channel": "web"
}
```

Autorização interna:

```text
Authorization: Bearer <CHATBOT_API_TOKEN>
```

## Resposta da aplicação web

```json
{
  "messages": [
    "A tecnologia utiliza eletricidade controlada...",
    "Você trabalha com agronegócio, área urbana ou outro segmento?"
  ],
  "language": "pt-BR",
  "stage": "segment",
  "qualified": false,
  "handoff": null
}
```

No encerramento:

```json
{
  "messages": ["Perfeito, organizei suas informações."],
  "qualified": true,
  "handoff": {
    "url": "https://wa.me/NUMERO?text=RESUMO",
    "protocol": "ZAS-AAAAMMDD-ABC123"
  }
}
```

A primeira versão extrai a URL da resposta atual do bot. A evolução recomendada
é o próprio backend retornar `handoff` como objeto estruturado.

## Botão "Marcar reunião"

Na primeira versão, o link de agenda por segmento (Agro/Comercial) vem de
variável de ambiente pública neste repositório
(`NEXT_PUBLIC_MEETING_URL_AGRO` / `NEXT_PUBLIC_MEETING_URL_COMERCIAL`), e o
segmento é o que o visitante clicou no início da conversa
(`app/components/ChatExperience.tsx`). Isso é uma solução temporária: se o
lead responder o segmento por texto livre em vez de clicar no botão, o
frontend não sabe distinguir Agro de Comercial e usa o link comercial como
padrão.

Evolução recomendada: o backend devolver o segmento junto da resposta (por
exemplo `segment: "agro" | "urban"`) e, futuramente, também o link de reunião
já resolvido, no mesmo padrão do `handoff.url` do WhatsApp — assim a regra de
qual agenda usar fica no backend, e não duplicada aqui.
