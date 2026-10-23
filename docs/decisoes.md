# Decisões técnicas

Registro do porquê de cada escolha. Formato curto: contexto, decisão, consequência.

## 1. n8n para orquestrar o atendimento
- **Contexto:** o atendimento reage a cada mensagem em tempo real e integra WhatsApp, IA, e-mail e Chatwoot. Também foi avaliado o Saturn Studio (Rocketbot).
- **Decisão:** n8n auto-hospedado.
- **Consequência:** integrações prontas, sem limite de execuções e custo zero de licença. O Saturn fica para rotinas em lote da loja, como a conferência de recebimentos, onde RPA se destaca.

## 2. API oficial do WhatsApp, não bibliotecas não oficiais
- **Contexto:** existem soluções que simulam o WhatsApp Web, sem custo por mensagem.
- **Decisão:** WhatsApp Cloud API, da Meta.
- **Consequência:** sem risco de banimento do número da loja e sem celular ligado. Em troca, custo por resposta acima de 1.000 por mês e cadastro na Meta.

## 3. Chatwoot como caixa de entrada
- **Contexto:** com a API oficial, o número fica na nuvem; a equipe precisa de um lugar para responder pelo número da loja.
- **Decisão:** Chatwoot auto-hospedado, com a IA ligada como bot de agente.
- **Consequência:** a equipe atende pelo navegador ou app, vê o que a IA já respondeu, e o status da conversa decide quem atende. Não foi preciso construir uma tela de atendimento.

## 4. Claude Haiku como IA
- **Decisão:** o modelo mais barato da Anthropic, chamado por HTTP direto.
- **Consequência:** cerca de R$ 0,003 por resposta. A resposta vem em JSON (categoria, texto, transferir, resolvido), o que permite aplicar regras e medir resultados. O modelo é configurável por variável de ambiente.

## 5. IA restrita à base de conhecimento, com rede de segurança
- **Decisão:** a IA só responde com o que está na base e nos dados do pedido. Além do julgamento dela, palavras-chave e tentativas sem resolver forçam a transferência.
- **Consequência:** menos risco de a IA inventar prazos ou prometer reembolso. Algumas transferências podem ser desnecessárias; o relatório mostra quais, para ajustar.

## 6. Código dos nós fora do n8n
- **Contexto:** código escrito dentro do n8n não tem histórico nem testes.
- **Decisão:** o JavaScript de cada nó vive em `atendimento/src/`, um script gera o JSON e um simulador testa as conversas. O CI garante que JSON e código estão sincronizados.
- **Consequência:** revisão por diff no GitHub e testes automáticos. Editar direto no n8n não é o caminho; edita-se o `src/` e reimporta.

## 7. Memória no próprio n8n na primeira versão
- **Decisão:** histórico curto e registro ficam nos dados estáticos do fluxo.
- **Consequência:** zero infraestrutura extra. Limite: só funciona com o fluxo ativo e não serve para análises maiores. Migra para tabelas no Postgres junto com o app de gestão.

## 8. Dados fictícios para desenvolver sem depender da loja
- **Decisão:** regras, tabela de medidas e pedidos fictícios, marcados com `[CONFIRMAR]`, e o número de teste da Meta.
- **Consequência:** o projeto foi desenvolvido e demonstrado antes do acordo com a loja. Ir para produção é configuração, não desenvolvimento.
