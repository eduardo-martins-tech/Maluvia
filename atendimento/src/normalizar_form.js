// Converte o envio do formulário Fale Conosco no mesmo formato do WhatsApp.
const j = $input.first().json;
const pedido = (j['Número do pedido (opcional)'] || '').trim();
const texto = [
  j['Assunto'] ? `Assunto: ${j['Assunto']}` : '',
  pedido ? `Pedido: ${pedido}` : '',
  (j['Mensagem'] || '').trim(),
].filter(Boolean).join('\n');
const email = (j['E-mail'] || '').trim().toLowerCase();
return [{ json: {
  canal: 'formulario',
  id_conversa: 'form:' + email + ':' + Date.now(),
  telefone: (j['WhatsApp (opcional)'] || '').replace(/\D/g, '') || null,
  email,
  nome: (j['Nome'] || '').trim() || null,
  texto,
  recebida_em: j.submittedAt || new Date().toISOString(),
}}];
