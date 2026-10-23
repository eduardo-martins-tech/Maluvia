// Lê a resposta da IA, aplica as regras de transferência e registra o atendimento.
const ctx = $('Montar contexto').first().json;
const CONFIG = ctx.config;
const bruto = $json.content?.[0]?.text ?? '';

let r;
try {
  r = JSON.parse(bruto.slice(bruto.indexOf('{'), bruto.lastIndexOf('}') + 1));
  if (!r.resposta) throw new Error('sem resposta');
} catch (e) {
  r = { categoria: 'outro', resposta: 'Desculpe, tive um problema para responder agora. Vou passar sua mensagem para a nossa equipe, que retorna em breve.', transferir: true, motivo_transferencia: 'Falha ao ler a resposta da IA', resolvido: false };
}

const dados = $getWorkflowStaticData('global');
dados.conversas = dados.conversas || {};
const conv = dados.conversas[ctx.id_conversa] || { historico: [], tentativas_sem_resolver: 0 };
dados.conversas[ctx.id_conversa] = conv;

let transferir = r.transferir === true;
let motivo = r.motivo_transferencia || '';
let resposta = String(r.resposta).trim();

if (r.resolvido === true) conv.tentativas_sem_resolver = 0;
else if (!transferir) conv.tentativas_sem_resolver = (conv.tentativas_sem_resolver || 0) + 1;

if (!transferir && ctx.gatilho_transferencia) { transferir = true; motivo = 'Palavra-chave de transferência na mensagem'; }
if (!transferir && conv.tentativas_sem_resolver >= CONFIG.limite_tentativas) { transferir = true; motivo = `${CONFIG.limite_tentativas} respostas sem resolver`; }
if (transferir && r.transferir !== true) {
  resposta += ctx.canal === 'whatsapp'
    ? '\n\nVou passar sua conversa para a nossa equipe, que continua o atendimento por aqui. 😊'
    : '\n\nEncaminhei sua mensagem para a nossa equipe, que vai responder em breve.';
}

conv.historico.push({ role: 'assistant', content: resposta });
conv.historico = conv.historico.slice(-CONFIG.max_historico);
if (transferir) { conv.com_atendente = true; conv.transferida_em = new Date().toISOString(); conv.tentativas_sem_resolver = 0; }

// Registro para acompanhar resultados (últimos 1000 atendimentos)
dados.registro = dados.registro || [];
dados.registro.push({
  quando: new Date().toISOString(), canal: ctx.canal, conversa: ctx.id_conversa, nome: ctx.nome,
  categoria: r.categoria || 'outro', transferido: transferir, motivo: motivo || null,
  pedido: ctx.pedido?.numero || null, mensagem: ctx.texto, resposta,
});
dados.registro = dados.registro.slice(-1000);

const contato = ctx.telefone ? '+' + ctx.telefone : ctx.email;
const aviso = transferir
  ? `🔔 Atendimento transferido pela IA\nCliente: ${ctx.nome || 'sem nome'} (${contato})\nCanal: ${ctx.canal}\nAssunto: ${r.categoria || 'outro'}\nMotivo: ${motivo || 'pedido da IA'}\nPedido: ${ctx.pedido?.numero || '-'}\nMensagem: "${ctx.texto}"`
  : null;

return [{ json: {
  canal: ctx.canal, telefone: ctx.telefone, email: ctx.email, nome: ctx.nome,
  categoria: r.categoria || 'outro', resposta, transferir, motivo, aviso_atendente: aviso,
  config: CONFIG, chatwoot: ctx.chatwoot || null,
}}];
