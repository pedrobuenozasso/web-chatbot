# Implantação

## Ambiente recomendado

- container separado na VPS;
- HTTPS em um subdomínio, por exemplo `atendimento.zasso.com`;
- comunicação privada com `zasso-chatbot:3000` pela rede Docker;
- nenhuma porta do chatbot central exposta diretamente à internet.

## Variáveis

```text
CHATBOT_API_URL=http://zasso-chatbot:3000
CHATBOT_API_TOKEN=<segredo-longo-compartilhado-com-o-backend>
```

O token não pode usar prefixo `NEXT_PUBLIC_`, aparecer em arquivos versionados
ou ser enviado ao navegador.

## Publicação segura

1. Executar lint e testes.
2. Construir a imagem Docker.
3. Publicar em uma porta interna da VPS.
4. Configurar proxy reverso, certificado TLS, CSP e limite por IP.
5. Validar `/`, `/api/chat` e a conectividade privada com o chatbot.
6. Testar todos os fluxos em cinco idiomas.
7. Liberar primeiro para um grupo interno e acompanhar gaps de conhecimento.

## Rollback

Manter a imagem anterior identificada por versão. Em caso de erro, o proxy volta
para o container anterior; o chatbot e o banco permanecem independentes da
interface web.
