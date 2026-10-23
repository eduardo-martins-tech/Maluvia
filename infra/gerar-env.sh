#!/usr/bin/env sh
# Cria o infra/.env a partir do .env.example, com senhas aleatórias.
set -e
cd "$(dirname "$0")"
if [ -f .env ]; then
  echo ".env já existe. Apague-o se quiser gerar de novo (as senhas antigas param de funcionar)."
  exit 1
fi
senha() { openssl rand -hex "$1"; }
sed \
  -e "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$(senha 16)/" \
  -e "s/^REDIS_PASSWORD=.*/REDIS_PASSWORD=$(senha 16)/" \
  -e "s/^SECRET_KEY_BASE=.*/SECRET_KEY_BASE=$(senha 32)/" \
  -e "s/^N8N_ENCRYPTION_KEY=.*/N8N_ENCRYPTION_KEY=$(senha 24)/" \
  -e "s/^MALUVIA_CHAVE_RELATORIO=.*/MALUVIA_CHAVE_RELATORIO=$(senha 8)/" \
  .env.example > .env
echo "infra/.env criado. Agora preencha FRONTEND_URL, NGROK_AUTHTOKEN e NGROK_DOMAIN."
