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
