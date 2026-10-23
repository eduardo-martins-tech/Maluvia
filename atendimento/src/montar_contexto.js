// ================= CONFIGURAÇÕES =================
// Valores vêm das variáveis MALUVIA_* do infra/.env; o segundo valor é o padrão.
const env = (nome, padrao) => { try { return $env[nome] || padrao; } catch (e) { return padrao; } };
const CONFIG = {
  modelo_ia: env('MALUVIA_MODELO_IA', 'claude-haiku-5-5'),
  chatwoot_url: env('MALUVIA_CHATWOOT_URL', 'http://rails:3000'),   // endereço do Chatwoot visto pelo n8n
  email_remetente: env('MALUVIA_EMAIL_REMETENTE', 'atendimento@exemplo.com'),
  email_equipe: env('MALUVIA_EMAIL_EQUIPE', 'equipe@exemplo.com'),
  max_historico: 10,          // mensagens guardadas por conversa
  limite_tentativas: 2,       // respostas sem resolver antes de transferir
};

// ============ PEDIDOS FICTÍCIOS (depois virão do ERP/site) ============
const PEDIDOS = {
  'MLV-1001': { cliente: 'Ana Souza', status: 'Pagamento confirmado, aguardando postagem', itens: 'Vestido midi de linho (M)', valor: 'R$ 289,90', rastreio: null, previsao: 'Postagem em até 2 dias úteis' },
  'MLV-1002': { cliente: 'Beatriz Lima', status: 'Enviado pelos Correios (PAC)', itens: 'Calça pantalona (G), Blusa de tricô (G)', valor: 'R$ 349,80', rastreio: 'QB123456789BR', previsao: 'Entrega prevista em 3 dias úteis' },
  'MLV-1003': { cliente: 'Carla Mendes', status: 'Entregue em 15/10/2026', itens: 'Saia plissada (P)', valor: 'R$ 159,90', rastreio: 'QB987654321BR', previsao: null },
  'MLV-1004': { cliente: 'Daniela Rocha', status: 'Aguardando pagamento (boleto)', itens: 'Macacão alfaiataria (M)', valor: 'R$ 399,90', rastreio: null, previsao: 'Boleto vence em 2 dias' },
  'MLV-1005': { cliente: 'Elisa Prado', status: 'Enviado, entrega atrasada (previsão era 18/10/2026)', itens: 'Jaqueta jeans (GG)', valor: 'R$ 279,90', rastreio: 'QB555666777BR', previsao: 'Atrasada' },
};

const msg = { ...$json };
const base = msg.base_conhecimento || '';
delete msg.base_conhecimento;

// Memória das conversas (só é salva com o fluxo ATIVO, não em testes manuais)
const dados = $getWorkflowStaticData('global');
dados.conversas = dados.conversas || {};
const conv = dados.conversas[msg.id_conversa] || { historico: [], com_atendente: false, tentativas_sem_resolver: 0, criada_em: msg.recebida_em };
dados.conversas[msg.id_conversa] = conv;

// Quem decide se a IA responde é o status da conversa no Chatwoot.
// Se a conversa voltou para o bot depois de passar pela equipe, recomeça o histórico.
if (conv.com_atendente) { conv.com_atendente = false; conv.historico = []; conv.tentativas_sem_resolver = 0; }

conv.historico.push({ role: 'user', content: msg.texto || '(mensagem vazia)' });
conv.historico = conv.historico.slice(-CONFIG.max_historico);

// Pedido citado na mensagem (ou o último citado na conversa)
const achado = (msg.texto || '').match(/MLV[\s-]?(\d{4})/i);
const numero = achado ? `MLV-${achado[1]}` : (conv.ultimo_pedido || null);
let pedido = null;
if (numero) {
  pedido = PEDIDOS[numero] ? { numero, ...PEDIDOS[numero] } : { numero, nao_encontrado: true };
  if (PEDIDOS[numero]) conv.ultimo_pedido = numero;
}
const pedidoTexto = !pedido
  ? 'Nenhum número de pedido informado.'
  : pedido.nao_encontrado
    ? `A cliente citou o pedido ${pedido.numero}, mas ele não foi encontrado. Peça para conferir o número; se insistir, transfira.`
    : Object.entries(pedido).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('\n');

// Palavras que levam direto para a equipe, mesmo que a IA não perceba
const GATILHOS = /(atendente|humano|pessoa de verdade|falar com algu[eé]m|reclama|procon|reclame aqui|defeito|estorno|reembolso|devolver o dinheiro|cancelar|golpe|absurdo|p[eé]ssimo|horr[ií]vel)/i;
const gatilho = GATILHOS.test(msg.texto || '');

const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const ehWhats = msg.canal === 'whatsapp';

const system = `Você é a Malu, a assistente virtual da Malúvia, uma loja virtual de roupas. Você atende clientes pelo ${ehWhats ? 'WhatsApp' : 'formulário Fale Conosco do site (sua resposta será enviada por e-mail)'}.

REGRAS
- Responda somente com base na BASE DE CONHECIMENTO e nos DADOS DO PEDIDO abaixo. Se a resposta não estiver ali, não invente: diga que vai encaminhar para a equipe e marque "transferir": true.
- Nunca prometa reembolso, desconto, cupom, brinde ou prazo que não esteja na base.
- Reclamação, produto com defeito, cancelamento, pedido de reembolso ou estorno, entrega atrasada ou cliente irritada: acolha em uma frase, diga que a equipe vai assumir e marque "transferir": true.
- Se a cliente pedir para falar com uma pessoa, transfira.
- Dúvida sobre um pedido sem o número: peça o número no formato MLV-0000.
- Nunca peça senha, número de cartão ou CPF completo.
- ${conv.historico.length === 1 ? 'Esta é a primeira mensagem da conversa: apresente-se como Malu, a assistente virtual da Malúvia.' : 'A conversa já começou: não se apresente de novo.'}
- Tom: simpático e direto, em português do Brasil. ${ehWhats ? 'No WhatsApp, seja breve: até 3 frases curtas ou uma lista pequena. Para negrito use *uma estrela*, nunca **duas**. No máximo um emoji.' : 'No e-mail, comece com "Olá, ' + (msg.nome || 'tudo bem') + '!" e termine com "Equipe Malúvia".'}

BASE DE CONHECIMENTO
${base}

DADOS DO PEDIDO
${pedidoTexto}

AGORA: ${agora}

FORMATO DA RESPOSTA
Responda APENAS com um objeto JSON válido, sem nada antes ou depois:
{"categoria": "produto|tamanho|pagamento|envio_frete|status_pedido|troca|devolucao|defeito|reclamacao|outro", "resposta": "texto para a cliente", "transferir": true ou false, "motivo_transferencia": "texto curto, ou vazio", "resolvido": true ou false}`;

// A API exige mensagens alternadas começando pela cliente
const mensagens = [];
for (const h of conv.historico) {
  const ultima = mensagens[mensagens.length - 1];
  if (ultima && ultima.role === h.role) ultima.content += '\n' + h.content;
  else mensagens.push({ role: h.role, content: h.content });
}
while (mensagens.length && mensagens[0].role !== 'user') mensagens.shift();

return [{ json: {
  ...msg,
  config: CONFIG,
  pedido,
  gatilho_transferencia: gatilho,
  requisicao_ia: { model: CONFIG.modelo_ia, max_tokens: 700, system, messages: mensagens },
}}];
