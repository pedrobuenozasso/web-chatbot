# Fluxo de conversa

1. A página apresenta o atendimento e aguarda a primeira pergunta.
2. O chatbot responde com saudação apenas na primeira resposta.
3. Em uma mensagem separada, pergunta se o segmento é agro, urbano ou outro.
4. Para qualquer segmento, coleta região/cidade.
5. Para agro, coleta cultivo/aplicação e área aproximada em hectares.
6. Para urbano, coleta prefeitura, prestador de serviços ou outro perfil.
7. Ao concluir, gera protocolo e resumo com os campos confirmados.
8. A interface apresenta o botão para continuar com o comercial.

O bot faz uma pergunta por vez. Se o lead fizer uma pergunta enquanto existe um
campo pendente, a dúvida é respondida e a pergunta de qualificação é retomada.
Respostas vagas, absurdas ou fora do contexto não são persistidas como dados do
lead.

## Experiência

- cada resposta aparece depois de um intervalo curto de digitação;
- mensagens múltiplas são exibidas em sequência;
- a interface não repete saudação em todas as respostas;
- o link longo nunca é mostrado: ele é apresentado como botão;
- depois do handoff, o backend continua orientando o lead a usar o comercial;
- “Reiniciar” cria uma nova sessão web.

## Critérios de aceite

- uma resposta e uma pergunta na mesma entrada são compreendidas;
- `Agricultura` é classificado como agro;
- área aceita somente números positivos, como `50` ou `100,5`;
- o idioma não muda após respostas curtas;
- o resumo contém somente dados confirmados;
- falhas técnicas não revelam stack, prompt ou credenciais.
