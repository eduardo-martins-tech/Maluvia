# Rodar no seu computador (desenvolvimento e demonstração)

Tudo grátis, com o número de teste da Meta e dados fictícios. Tempo estimado: 1 a 2 horas na primeira vez.

## Pré-requisitos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (no Windows, com WSL 2) e Git
- Conta grátis no [ngrok](https://ngrok.com), para dar um endereço público ao Chatwoot
- Conta de desenvolvedor na [Meta](https://developers.facebook.com)
- Chave da API da Anthropic ([console.anthropic.com](https://console.anthropic.com))
- Uns 4 GB de RAM livres

## 1. Baixar o projeto e gerar as senhas
```bash
git clone https://github.com/eduardo-martins-tech/maluvia.git
cd maluvia
./infra/gerar-env.sh        # no Windows, rode pelo Git Bash ou WSL
```

## 2. Túnel público (ngrok)
1. No painel do ngrok, copie o **authtoken**.
2. Em **Domains**, pegue o domínio estático grátis (algo como `nome-aleatorio.ngrok-free.app`).
3. No `infra/.env`, preencha:
   ```
   NGROK_AUTHTOKEN=seu_token
   NGROK_DOMAIN=nome-aleatorio.ngrok-free.app
   FRONTEND_URL=https://nome-aleatorio.ngrok-free.app
   ```

## 3. Subir os serviços
```bash
cd infra
docker compose up -d postgres redis
docker compose run --rm rails bundle exec rails db:chatwoot_prepare   # só na primeira vez
docker compose --profile tunel up -d
docker compose ps
```
- Chatwoot: http://localhost:3000
- n8n: http://localhost:5678

## 4. Chatwoot
1. Abra http://localhost:3000 e crie a conta de administrador.
2. Crie o bot em http://localhost:3000/super_admin → **Agent Bots** → **New**:
   - Nome: `Malu`
   - Outgoing URL: `http://n8n:5678/webhook/maluvia-chatwoot`
3. Abra o bot criado e copie o **Access Token**.

## 5. WhatsApp (número de teste)
1. Em developers.facebook.com, crie um app do tipo **Business** e adicione o produto **WhatsApp**.
2. Em **WhatsApp > API Setup**, anote o **Phone number ID** e o **WhatsApp Business Account ID**. Em **To**, cadastre o seu WhatsApp (até 5 números).
3. Gere um token permanente: no Meta Business, **Usuários do sistema** → crie um usuário com permissão de WhatsApp → gere o token. O token temporário do painel vence em 24 horas.
4. No Chatwoot: **Configurações > Caixas de entrada > Adicionar > WhatsApp > WhatsApp Cloud**, com os dados acima.
5. O Chatwoot mostra a **URL do webhook** e o **token de verificação**. No painel da Meta, em **WhatsApp > Configuration > Webhook**, cole os dois e assine o campo `messages`.
6. Na caixa de entrada criada: **Configurações > Configuração do bot** → selecione `Malu`.

## 6. n8n
1. Abra http://localhost:5678 e crie a conta de dono.
2. **Workflows > Import from file** → `atendimento/workflow/maluvia-atendimento.json`.
3. Credenciais:
   - Nó **IA (Claude)**: nova credencial **Header Auth**, nome `x-api-key`, valor = sua chave da Anthropic.
   - Nós **Responder no Chatwoot**, **Nota interna** e **Passar conversa**: **Header Auth**, nome `api_access_token`, valor = token do bot.
   - Nós de e-mail: **SMTP** (um Gmail com senha de app funciona). Se não quiser agora, desative os dois.
4. **Ative o fluxo** (botão Active). A memória das conversas só funciona com ele ativo.

## 7. Testar
Com o Chatwoot aberto, mande do seu WhatsApp para o número de teste:

1. "Oi! Tenho busto 92 e cintura 74, que tamanho eu uso?" → a IA se apresenta e sugere M
2. "Qual o frete para Porto Alegre?" → prazo no carrinho e frete grátis acima de R$ 299
3. "Cadê meu pedido MLV-1002?" → status e rastreio
4. "Quero trocar por um tamanho maior" → explica a troca, lembrando do pedido
5. "A calça veio com defeito, que absurdo" → acolhe, nota interna e conversa **Aberta**
6. Responda pelo Chatwoot → chega no WhatsApp pelo número da loja
7. Resolva a conversa e escreva de novo → a IA volta a atender

Pedidos fictícios: MLV-1001 (aguardando postagem), MLV-1002 (enviado), MLV-1003 (entregue), MLV-1004 (aguardando boleto), MLV-1005 (atrasado → transfere).

**Formulário:** abra a URL de produção do nó **Formulário Fale Conosco**.

**Relatório:** http://localhost:5678/webhook/maluvia-relatorio?chave=VALOR_DE_MALUVIA_CHAVE_RELATORIO

## Problemas comuns
| Sintoma | Causa provável |
|---|---|
| A mensagem chega no Chatwoot, mas a IA não responde | Bot não ligado à caixa de entrada, fluxo inativo ou conversa já Aberta. Veja **Executions** no n8n. |
| O Chatwoot recusa a URL `http://n8n:5678/...` do bot | Algumas versões bloqueiam endereços internos. Exponha o n8n por um segundo túnel e use a URL pública. |
| Nada chega no Chatwoot | Webhook da Meta não verificado ou campo `messages` não assinado; confira se o túnel está no ar (`docker compose logs ngrok`). |
| Erro 401 no nó IA (Claude) | Credencial com nome diferente de `x-api-key` ou chave errada. |
| Mensagens param depois de um dia | Token temporário da Meta venceu; use o token do usuário do sistema. |

## Atualizar o fluxo
Edite os arquivos em `atendimento/src/` ou a base de conhecimento, depois:
```bash
python atendimento/scripts/montar_workflow.py
node atendimento/testes/simular.js
```
e importe de novo o JSON no n8n (substituindo o anterior).
