// Resumo dos atendimentos. Acesse a URL do webhook com ?chave=MALUVIA_CHAVE_RELATORIO
let CHAVE = '';
try { CHAVE = $env.MALUVIA_CHAVE_RELATORIO || ''; } catch (e) {}
if (!CHAVE) return [{ json: { erro: 'Defina MALUVIA_CHAVE_RELATORIO no infra/.env' } }];
if (($json.query?.chave || '') !== CHAVE) return [{ json: { erro: 'Chave inválida' } }];

const reg = $getWorkflowStaticData('global').registro || [];
const respondidas = reg.filter(r => r.categoria !== 'com_atendente');
const resolvidasIA = respondidas.filter(r => !r.transferido).length;
const porCategoria = {};
for (const r of respondidas) porCategoria[r.categoria] = (porCategoria[r.categoria] || 0) + 1;
const porMotivo = {};
for (const r of respondidas.filter(r => r.transferido)) porMotivo[r.motivo || 'pedido da IA'] = (porMotivo[r.motivo || 'pedido da IA'] || 0) + 1;

return [{ json: {
  total_mensagens: reg.length,
  respondidas_pela_ia: respondidas.length,
  resolvidas_sem_equipe: resolvidasIA,
  taxa_resolucao_ia: respondidas.length ? Math.round(100 * resolvidasIA / respondidas.length) + '%' : '-',
  por_categoria: porCategoria,
  motivos_de_transferencia: porMotivo,
  ultimas_20: reg.slice(-20).reverse(),
} }];
