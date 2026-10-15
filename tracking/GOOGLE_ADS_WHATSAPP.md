# Google Ads: clique final no WhatsApp

## Definição do resultado

O lead qualificado desta campanha é o clique no botão do WhatsApp exibido ao
final da triagem. Abrir o chatbot, responder perguntas, gerar o encaminhamento
ou clicar em agendar reunião não dispara `whatsapp_click`.

A integração usa a propriedade existente Zasso Group, `G-2PEL52X12S`, confirmada
na conta Google Ads 332-262-4672. É possível substituir o ID com
`NEXT_PUBLIC_GOOGLE_ANALYTICS_ID`; uma string vazia desativa o Google Analytics.
Variáveis públicas são incorporadas na compilação: alterá-las exige novo build.

## O que a versão implementa

- Carrega o Google tag depois da hidratação, mantendo o atendimento responsivo.
- Emite `whatsapp_click` no manipulador do botão final, antes de abrir o destino.
- Conta uma vez por instância do atendimento, inclusive em cliques repetidos.
- Mantém os eventos e a atribuição existentes da Meta.
- Envia somente `segment` (`agro`, `urban` ou `unknown`) e `ui_language`, além
  dos parâmetros técnicos do Google. Não envia nome, telefone, resumo, protocolo
  ou conteúdo das mensagens ao evento.
- Preserva UTMs, GCLID, GBRAID e WBRAID na localização da página. Remove outros
  parâmetros e fragmentos, e reduz o referrer à origem.
- Mantém o clique no WhatsApp independente de bloqueios ou lentidão do Google
  tag. Eventos bloqueados pelo navegador não comprovam uma conversão recebida.

`lead_qualified` no painel interno continua representando a etapa de triagem
do backend. Ele não substitui `whatsapp_click` como conversão principal do Ads.

## Concluir após publicar a versão

1. Confirmar que a versão está em `atendimento.zasso.com` e o tag usa o ID certo.
2. Validar em GA4 DebugView/Tempo real: entrada e perguntas não emitem
   `whatsapp_click`; o botão final emite uma vez, nos segmentos Agro e Urbano.
3. Marcar somente `whatsapp_click` como evento principal no GA4 e vincular a
   propriedade correta ao Google Ads, revisando as opções de compartilhamento.
4. Importar esse evento como conversão no Ads, nomeá-lo
   `Lead qualificado - WhatsApp final`, definir contagem `Uma` e ação
   `Principal`. Confirmar que é usado pela campanha. Não duplicar com outra
   conversão direta do mesmo botão nem usar page_view como lead.
5. Conferir a codificação automática do Ads e que os parâmetros de campanha
   chegam ao chatbot. A atribuição de anúncio exige uma interação elegível;
   um teste direto da página não prova atribuição ou lead pago no Ads.
6. Verificar o recebimento no GA4 e o diagnóstico no Ads, respeitando o atraso
   de processamento. Só então avaliar custo por lead e taxa de conversão.

Sem a publicação e essas verificações, a configuração permanece pendente.
Esta alteração não muda o orçamento de mídia nem ativa novas campanhas.

Fontes: https://support.google.com/google-ads/answer/16560108 e
https://developers.google.com/tag-platform/gtagjs/configure
