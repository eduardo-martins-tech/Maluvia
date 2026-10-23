// Recebe o evento do Chatwoot (bot de agente) e converte no formato único.
// Só responde mensagens da cliente em conversas com status "pending" (com o bot).
// Conversas "open" estão com a equipe: a IA fica quieta e o Chatwoot avisa a atendente.
const b = $json.body ?? $json;
const tipo = b.message_type;
const conversa = b.conversation ?? {};
if (b.event !== 'message_created') return [];
if (!(tipo === 'incoming' || tipo === 0) || b.private) return [];
if (conversa.status && conversa.status !== 'pending') return [];

const remetente = b.sender ?? conversa.meta?.sender ?? {};
let texto = (b.content || '').trim();
if (!texto && (b.attachments || []).length) {
  const t = b.attachments[0].file_type;
  texto = t === 'image' ? '[A cliente enviou uma imagem]' : t === 'audio' ? '[A cliente enviou um áudio]' : '[A cliente enviou um arquivo]';
}
if (!texto) return [];

return [{ json: {
  canal: 'whatsapp',
  id_conversa: 'cw:' + conversa.id,
  telefone: (remetente.phone_number || '').replace(/\D/g, '') || null,
  email: remetente.email || null,
  nome: remetente.name || null,
  texto,
  recebida_em: b.created_at ? new Date(b.created_at).toISOString() : new Date().toISOString(),
  chatwoot: { account_id: b.account?.id, conversation_id: conversa.id, inbox_id: b.inbox?.id },
}}];
