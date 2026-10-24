// Simula conversas passando pelos nós de código, sem n8n, sem IA e sem WhatsApp.
// Uso: node atendimento/testes/simular.js
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');

const SRC = path.join(__dirname, '..', 'src');
let memoria = {};
const ENV = { MALUVIA_CHAVE_RELATORIO: 'teste', MALUVIA_CHATWOOT_URL: 'http://rails:3000' };

// Executa um nó de código como o n8n faria: $json, $input, $env, $getWorkflowStaticData e $('Nó')
async function no(arquivo, json, outrosNos = {}) {
  const codigo = fs.readFileSync(path.join(SRC, arquivo), 'utf8');
  const fn = new Function('$json', '$input', '$env', '$getWorkflowStaticData', '$',
    `return (async () => {\n${codigo}\n})();`);
  const saida = await fn(json, { all: () => [{ json }], first: () => ({ json }) }, ENV,
    () => memoria, (nome) => ({ first: () => outrosNos[nome] }));
  return saida.map((i) => i.json);
}

const evento = (conteudo, extra = {}) => ({ body: {
  event: 'message_created', message_type: 'incoming', content: conteudo, private: false,
  created_at: '2026-10-22T22:00:00Z', account: { id: 1 }, inbox: { id: 3 },
  conversation: { id: 42, status: 'pending' }, sender: { name: 'Bia', phone_number: '+5511988887777' }, ...extra,
} });

const respostaIA = (obj) => ({ content: [{ text: JSON.stringify(obj) }] });

// Fluxo completo de uma mensagem do Chatwoot; devolve [contexto, resultado]
async function mensagem(texto, ia, extra) {
  const [n] = await no('normalizar_chatwoot.js', evento(texto, extra));
  const [ctx] = await no('montar_contexto.js', { ...n, base_conhecimento: 'BASE' });
  const [r] = await no('aplicar_regras.js', respostaIA(ia), { 'Montar contexto': { json: ctx } });
  return [ctx, r];
}

const testes = [];
const teste = (nome, fn) => testes.push([nome, fn]);

teste('ignora mensagens enviadas pela loja, notas e conversas com a equipe', async () => {
  assert.equal((await no('normalizar_chatwoot.js', evento('oi', { message_type: 'outgoing' }))).length, 0);
  assert.equal((await no('normalizar_chatwoot.js', evento('oi', { private: true }))).length, 0);
  assert.equal((await no('normalizar_chatwoot.js', evento('oi', { conversation: { id: 1, status: 'open' } }))).length, 0);
  assert.equal((await no('normalizar_chatwoot.js', evento('oi', { event: 'conversation_updated' }))).length, 0);
});

teste('anexo sem texto vira descrição', async () => {
  const [n] = await no('normalizar_chatwoot.js', evento('', { attachments: [{ file_type: 'image' }] }));
  assert.match(n.texto, /imagem/);
});

teste('encontra o pedido citado e se apresenta na primeira mensagem', async () => {
  memoria = {};
  const [ctx, r] = await mensagem('Cadê meu pedido mlv 1002?',
    { categoria: 'status_pedido', resposta: 'Seu pedido foi enviado!', transferir: false, resolvido: true });
  assert.equal(ctx.pedido.numero, 'MLV-1002');
  assert.match(ctx.requisicao_ia.system, /QB123456789BR/);
  assert.match(ctx.requisicao_ia.system, /primeira mensagem/);
  assert.equal(r.transferir, false);
  assert.deepEqual(r.chatwoot, { account_id: 1, conversation_id: 42, inbox_id: 3 });
});

teste('lembra o pedido e o histórico na mensagem seguinte', async () => {
  const [ctx] = await mensagem('E quando chega?',
    { categoria: 'status_pedido', resposta: 'Em 3 dias úteis.', transferir: false, resolvido: true });
  assert.equal(ctx.pedido.numero, 'MLV-1002');
  assert.equal(ctx.requisicao_ia.messages.length, 3);
  assert.match(ctx.requisicao_ia.system, /não se apresente/);
});

teste('palavra-chave transfere mesmo se a IA não transferir', async () => {
  const [, r] = await mensagem('A calça veio com defeito, que absurdo',
    { categoria: 'defeito', resposta: 'Sinto muito!', transferir: false, resolvido: false });
  assert.equal(r.transferir, true);
  assert.match(r.resposta, /nossa equipe/);
  assert.match(r.aviso_atendente, /Atendimento transferido/);
});

teste('reação alérgica a semijoia transfere para a equipe', async () => {
  memoria = {};
  const [, r] = await mensagem('O brinco deu alergia na minha orelha',
    { categoria: 'produto', resposta: 'Que pena!', transferir: false, resolvido: false });
  assert.equal(r.transferir, true);
});

teste('conversa que volta para o bot recomeça o histórico', async () => {
  const [ctx] = await mensagem('Oi de novo',
    { categoria: 'outro', resposta: 'Olá!', transferir: false, resolvido: true });
  assert.equal(ctx.requisicao_ia.messages.length, 1);
});

teste('duas respostas sem resolver transferem', async () => {
  memoria = {};
  const ia = { categoria: 'outro', resposta: 'Não sei.', transferir: false, resolvido: false };
  const [, r1] = await mensagem('pergunta estranha 1', ia);
  const [, r2] = await mensagem('pergunta estranha 2', ia);
  assert.equal(r1.transferir, false);
  assert.equal(r2.transferir, true);
});

teste('resposta da IA fora do formato transfere com mensagem segura', async () => {
  memoria = {};
  const [n] = await no('normalizar_chatwoot.js', evento('Oi'));
  const [ctx] = await no('montar_contexto.js', { ...n, base_conhecimento: 'BASE' });
  const [r] = await no('aplicar_regras.js', { content: [{ text: 'texto solto' }] }, { 'Montar contexto': { json: ctx } });
  assert.equal(r.transferir, true);
  assert.match(r.resposta, /equipe/);
});

teste('pedido inexistente pede para conferir o número', async () => {
  memoria = {};
  const [ctx] = await mensagem('Meu pedido é MLV-9999',
    { categoria: 'status_pedido', resposta: 'Pode conferir?', transferir: false, resolvido: false });
  assert.equal(ctx.pedido.nao_encontrado, true);
});

teste('formulário vira mensagem com assunto e pedido', async () => {
  const [f] = await no('normalizar_form.js', { 'Nome': 'Ana', 'E-mail': 'Ana@X.com', 'Assunto': 'Troca ou devolução',
    'Número do pedido (opcional)': 'MLV-1003', 'Mensagem': 'quero trocar' });
  assert.equal(f.email, 'ana@x.com');
  assert.match(f.texto, /Assunto: Troca/);
  assert.match(f.texto, /MLV-1003/);
});

teste('relatório exige chave e calcula a taxa de resolução', async () => {
  const [negado] = await no('relatorio.js', { query: { chave: 'errada' } });
  assert.ok(negado.erro);
  memoria = {};
  await mensagem('Qual o frete?', { categoria: 'envio_frete', resposta: 'Grátis acima de R$ 299.', transferir: false, resolvido: true });
  await mensagem('quero reembolso', { categoria: 'devolucao', resposta: 'Vou chamar a equipe.', transferir: true, resolvido: false });
  const [rel] = await no('relatorio.js', { query: { chave: 'teste' } });
  assert.equal(rel.respondidas_pela_ia, 2);
  assert.equal(rel.taxa_resolucao_ia, '50%');
});

teste('o fluxo gerado contém o código atual de src/', async () => {
  const fluxo = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'workflow', 'maluvia-atendimento.json'), 'utf8'));
  for (const n of fluxo.nodes.filter((x) => x.type === 'n8n-nodes-base.code')) {
    const original = fs.readdirSync(SRC).map((f) => fs.readFileSync(path.join(SRC, f), 'utf8'));
    assert.ok(original.includes(n.parameters.jsCode), `nó "${n.name}" desatualizado: rode montar_workflow.py`);
  }
});

(async () => {
  let falhas = 0;
  for (const [nome, fn] of testes) {
    try { await fn(); console.log('✔', nome); } catch (e) { falhas++; console.log('✘', nome, '\n  ', e.message); }
  }
  console.log(`\n${testes.length - falhas}/${testes.length} testes passaram`);
  process.exit(falhas ? 1 : 0);
})();
