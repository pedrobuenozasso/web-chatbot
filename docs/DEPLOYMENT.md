# Implantação

## Ambiente recomendado

- aplicação Next.js publicada na Vercel;
- HTTPS em um subdomínio, por exemplo `atendimento.zasso.com`;
- site institucional principal mantido no WordPress;
- ponte HTTPS autenticada entre a Vercel e o chatbot da VPS;
- nenhuma porta do chatbot central exposta diretamente à internet sem autenticação.

## Variáveis

```text
CHATBOT_API_URL=https://endpoint-seguro-da-zasso
CHATBOT_API_TOKEN=<segredo-longo-compartilhado-com-o-backend>

# Opcionais: botão "Marcar reunião" ao final da triagem.
NEXT_PUBLIC_MEETING_URL_AGRO=<link-de-agenda-do-time-agro>
NEXT_PUBLIC_MEETING_URL_COMERCIAL=<link-de-agenda-do-time-comercial>
```

O token não pode usar prefixo `NEXT_PUBLIC_`, aparecer em arquivos versionados
ou ser enviado ao navegador.

Os links de agenda são públicos (o link do calendário em si), por isso podem
usar `NEXT_PUBLIC_`. Sem eles configurados, o app funciona normalmente e só
não exibe o botão de reunião.

## Publicação segura

1. Executar lint e testes.
2. Publicar a versão na Vercel.
3. Configurar as variáveis privadas na Vercel.
4. Configurar HTTPS, CSP e limite por IP na ponte da VPS.
5. Validar `/`, `/api/chat` e a conectividade privada com o chatbot.
6. Testar todos os fluxos em cinco idiomas.
7. Liberar primeiro para um grupo interno e acompanhar gaps de conhecimento.

## Rollback

Manter a versão anterior na Vercel. Em caso de erro, promover novamente o deploy
anterior; o WordPress, o chatbot e o banco permanecem independentes da interface.
