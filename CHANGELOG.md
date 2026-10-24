# Changelog

Mudanças relevantes de cada versão. Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e versões em [SemVer](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Alterado
- Nome da loja padronizado como Maluvia, sem acento.
- A Malu passa a atender como loja de moda feminina com roupas e semijoias: base de conhecimento com garantia, cuidados e medidas de semijoias.
- Alergia, irritação na pele e banho descascando ou escurecendo transferem direto para a equipe.

## [0.1.0] - 2026-10-23

### Adicionado
- Atendente virtual **Malu**: responde pelo WhatsApp (via Chatwoot) e pelo formulário Fale Conosco, com base de conhecimento e consulta de pedidos fictícios.
- Transferência para a equipe por decisão da IA, palavras-chave, tentativas sem resolver ou resposta fora do formato, com nota interna no Chatwoot.
- Relatório de atendimento protegido por chave: taxa de resolução, assuntos e motivos de transferência.
- Infraestrutura em Docker Compose: n8n, Chatwoot, Postgres, Redis, túnel ngrok e proxy Caddy com HTTPS.
- Código dos nós em `atendimento/src/`, gerador do fluxo e simulador com 12 cenários de conversa.
- CI no GitHub Actions: fluxo sincronizado com o código, testes e validação do Compose.
- Documentação: arquitetura, setup local, produção, custos, decisões e fluxo de trabalho.
