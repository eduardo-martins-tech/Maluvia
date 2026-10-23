# Colocar em produção

O fluxo, o Chatwoot e o n8n são os mesmos do ambiente local. Produção é questão de configuração.

## 1. Com a loja
- [ ] Regras reais na base de conhecimento (itens `[CONFIRMAR]` em `atendimento/base-conhecimento.md`)
- [ ] Número de WhatsApp da loja. Ele não pode estar ativo em nenhum app de WhatsApp na hora do cadastro.
- [ ] Acesso ao Meta Business da loja e verificação de empresa (pode levar alguns dias)
- [ ] E-mails das sócias para criar as contas de atendente
- [ ] Contas no nome da loja: VPS, Meta e Anthropic (o custo fica com elas; veja [custos.md](custos.md))

## 2. Servidor
1. VPS com 4 a 8 GB de RAM e Ubuntu (ex.: Hostinger KVM 2), com Docker instalado.
2. Domínio (ex.: registro.br) com dois registros A apontando para o IP da VPS:
   `chat.dominio.com.br` e `n8n.dominio.com.br`.
3. Clone o repositório na VPS e rode `./infra/gerar-env.sh`.
4. No `infra/.env`:
   ```
   CHATWOOT_DOMAIN=chat.dominio.com.br
   N8N_DOMAIN=n8n.dominio.com.br
   FRONTEND_URL=https://chat.dominio.com.br
   FORCE_SSL=true
   N8N_HOST=n8n.dominio.com.br
   N8N_PROTOCOL=https
   N8N_PUBLIC_URL=https://n8n.dominio.com.br/
   N8N_SECURE_COOKIE=true
   ```
5. Suba com o proxy HTTPS (sem o túnel):
   ```bash
   cd infra
   docker compose up -d postgres redis
   docker compose run --rm rails bundle exec rails db:chatwoot_prepare
   docker compose --profile producao up -d
   ```
6. Refaça os passos 4 e 6 do [setup local](setup-local.md) nos novos endereços.

## 3. Número da loja
1. No app da Meta, em **WhatsApp > API Setup**, adicione o número da loja e confirme pelo código (SMS ou ligação). Basta colocar o chip num celular uma vez.
2. No Chatwoot, crie a caixa de entrada **WhatsApp Cloud** com o número real e ligue o bot a ela.
3. Configure o webhook da Meta para o endereço do Chatwoot de produção.
4. Mande uma mensagem de teste e acompanhe em **Executions** no n8n.

## 4. Site
Coloque no site o link do formulário (URL de produção do nó **Formulário Fale Conosco**) e um botão de WhatsApp com o número da loja.

## 5. Depois de no ar
- [ ] Backup diário do banco:
  ```bash
  docker compose exec -T postgres pg_dumpall -U postgres | gzip > backup-$(date +%F).sql.gz
  ```
  (agende com `cron` e guarde uma cópia fora da VPS)
- [ ] Acompanhar o relatório semanalmente e ajustar a base de conhecimento com as perguntas que geraram transferência
- [ ] Trocar os pedidos fictícios pela consulta ao ERP/plataforma (nó **Montar contexto**)
- [ ] Atualizar imagens com cuidado: fixe a versão do Chatwoot e leia as notas de versão antes de subir
