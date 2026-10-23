"""Gera atendimento/workflow/maluvia-atendimento.json a partir do código em src/.

O código de cada nó vive em atendimento/src/*.js (fácil de ler, revisar e testar)
e este script monta o fluxo pronto para importar no n8n.

Uso: python atendimento/scripts/montar_workflow.py
"""
import json
import uuid
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SRC = RAIZ / "src"
SAIDA = RAIZ / "workflow" / "maluvia-atendimento.json"


def nid(nome: str) -> str:
    """ID estável por nome, para o arquivo gerado não mudar à toa entre commits."""
    return str(uuid.uuid5(uuid.NAMESPACE_URL, "maluvia/" + nome))


def js(arquivo: str) -> str:
    return (SRC / arquivo).read_text(encoding="utf-8")


def code(nome, arquivo, pos):
    return {"parameters": {"jsCode": js(arquivo)}, "id": nid(nome), "name": nome,
            "type": "n8n-nodes-base.code", "typeVersion": 2, "position": pos}


def condicao(nome, expr, tipo):
    op = {"verdadeiro": {"type": "boolean", "operation": "true", "singleValue": True},
          "existe": {"type": "object", "operation": "exists", "singleValue": True}}[tipo]
    return {"conditions": {"options": {"caseSensitive": True, "leftValue": "", "typeValidation": "loose"},
                           "conditions": [{"id": nid(nome + "/cond"), "leftValue": expr, "rightValue": "", "operator": op}],
                           "combinator": "and"}, "options": {}}


def se(nome, expr, tipo, pos):
    return {"parameters": condicao(nome, expr, tipo), "id": nid(nome), "name": nome,
            "type": "n8n-nodes-base.if", "typeVersion": 2, "position": pos}


def chatwoot(nome, ref, sufixo, corpo, pos):
    """Chamada à API do Chatwoot. `ref` é a expressão que aponta para os dados da conversa."""
    url = (f"={{{{ {ref}.config.chatwoot_url }}}}/api/v1/accounts/{{{{ {ref}.chatwoot.account_id }}}}"
           f"/conversations/{{{{ {ref}.chatwoot.conversation_id }}}}{sufixo}")
    return {"parameters": {"method": "POST", "url": url, "authentication": "genericCredentialType",
                           "genericAuthType": "httpHeaderAuth", "sendBody": True, "specifyBody": "json",
                           "jsonBody": corpo, "options": {}},
            "id": nid(nome), "name": nome, "type": "n8n-nodes-base.httpRequest", "typeVersion": 4.2,
            "position": pos, "retryOnFail": True, "maxTries": 2}


def email(nome, para, assunto, texto, pos):
    return {"parameters": {"fromEmail": "={{ $json.config.email_remetente }}", "toEmail": para,
                           "subject": assunto, "emailFormat": "text", "text": texto, "options": {}},
            "id": nid(nome), "name": nome, "type": "n8n-nodes-base.emailSend", "typeVersion": 2.1, "position": pos}


ASSUNTOS = ["Dúvida sobre produto", "Tamanho", "Pagamento", "Entrega e frete", "Meu pedido",
            "Troca ou devolução", "Reclamação", "Outro"]

LEIA_ME = """## Atendimento Malúvia com IA + Chatwoot
WhatsApp chega pelo Chatwoot (bot de agente); o formulário, pelo próprio n8n.

1. Credenciais: Header Auth `x-api-key` (IA), Header Auth `api_access_token` (token do bot do Chatwoot) e SMTP.
2. Ative o fluxo. No bot do Chatwoot, use a URL de produção do webhook **Chatwoot: nova mensagem**.
3. Configurações: variáveis MALUVIA_* do infra/.env.

Não edite os nós de código aqui: o original está em atendimento/src/ no GitHub."""

nos = [
    {"parameters": {"content": LEIA_ME, "height": 280, "width": 480}, "id": nid("Leia-me"), "name": "Leia-me",
     "type": "n8n-nodes-base.stickyNote", "typeVersion": 1, "position": [-60, -360]},
    {"parameters": {"httpMethod": "POST", "path": "maluvia-chatwoot", "options": {}}, "id": nid("Chatwoot: nova mensagem"),
     "name": "Chatwoot: nova mensagem", "type": "n8n-nodes-base.webhook", "typeVersion": 2, "position": [0, 0],
     "webhookId": nid("webhook/chatwoot")},
    {"parameters": {
        "formTitle": "Fale com a Malúvia",
        "formDescription": "Mande sua dúvida, pedido de troca ou sugestão. Respondemos por e-mail.",
        "formFields": {"values": [
            {"fieldLabel": "Nome", "requiredField": True},
            {"fieldLabel": "E-mail", "fieldType": "email", "requiredField": True},
            {"fieldLabel": "WhatsApp (opcional)", "placeholder": "(11) 99999-9999"},
            {"fieldLabel": "Número do pedido (opcional)", "placeholder": "MLV-0000"},
            {"fieldLabel": "Assunto", "fieldType": "dropdown",
             "fieldOptions": {"values": [{"option": a} for a in ASSUNTOS]}, "requiredField": True},
            {"fieldLabel": "Mensagem", "fieldType": "textarea", "requiredField": True}]},
        "responseMode": "onReceived",
        "options": {"formSubmittedText": "Recebemos sua mensagem! A resposta chega no seu e-mail em instantes."}},
     "id": nid("Formulário Fale Conosco"), "name": "Formulário Fale Conosco", "type": "n8n-nodes-base.formTrigger",
     "typeVersion": 2.2, "position": [0, 260], "webhookId": nid("webhook/formulario")},
    code("Normalizar Chatwoot", "normalizar_chatwoot.js", [240, 0]),
    code("Normalizar formulário", "normalizar_form.js", [240, 260]),
    {"parameters": {"mode": "manual", "assignments": {"assignments": [
        {"id": nid("base/campo"), "name": "base_conhecimento", "type": "string",
         "value": (RAIZ / "base-conhecimento.md").read_text(encoding="utf-8")}]},
        "includeOtherFields": True, "options": {}},
     "id": nid("Base de conhecimento"), "name": "Base de conhecimento", "type": "n8n-nodes-base.set",
     "typeVersion": 3.4, "position": [480, 130]},
    code("Montar contexto", "montar_contexto.js", [720, 130]),
    {"parameters": {"method": "POST", "url": "https://api.anthropic.com/v1/messages",
                    "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth",
                    "sendHeaders": True,
                    "headerParameters": {"parameters": [{"name": "anthropic-version", "value": "2023-06-01"}]},
                    "sendBody": True, "specifyBody": "json", "jsonBody": "={{ JSON.stringify($json.requisicao_ia) }}",
                    "options": {"timeout": 60000}},
     "id": nid("IA (Claude)"), "name": "IA (Claude)", "type": "n8n-nodes-base.httpRequest", "typeVersion": 4.2,
     "position": [960, 130], "retryOnFail": True, "maxTries": 2},
    code("Aplicar regras e registrar", "aplicar_regras.js", [1200, 130]),
    se("Veio do Chatwoot?", "={{ $json.chatwoot }}", "existe", [1440, 0]),
    chatwoot("Responder no Chatwoot", "$json", "/messages",
             "={{ JSON.stringify({ content: $json.resposta, message_type: 'outgoing', private: false }) }}", [1680, -80]),
    email("Responder por e-mail", "={{ $json.email }}", "Malúvia: resposta ao seu contato",
          "={{ $json.resposta }}", [1680, 80]),
    se("Transferir para a equipe?", "={{ $json.transferir }}", "verdadeiro", [1440, 300]),
    se("Transferência no Chatwoot?", "={{ $json.chatwoot }}", "existe", [1680, 300]),
    chatwoot("Nota interna para a equipe", "$json", "/messages",
             "={{ JSON.stringify({ content: $json.aviso_atendente, message_type: 'outgoing', private: true }) }}", [1920, 220]),
    chatwoot("Passar conversa para a equipe", "$('Transferência no Chatwoot?').item.json", "/toggle_status",
             "={{ JSON.stringify({ status: 'open' }) }}", [2160, 220]),
    email("Avisar equipe por e-mail", "={{ $json.config.email_equipe }}",
          "=Atendimento transferido: {{ $json.nome || $json.email }}",
          "={{ $json.aviso_atendente }}\n\nResponder para: {{ $json.email }}", [1920, 400]),
    {"parameters": {"path": "maluvia-relatorio", "responseMode": "lastNode", "options": {}},
     "id": nid("Relatório (link)"), "name": "Relatório (link)", "type": "n8n-nodes-base.webhook", "typeVersion": 2,
     "position": [0, 600], "webhookId": nid("webhook/relatorio")},
    code("Montar relatório", "relatorio.js", [240, 600]),
]


def liga(*saidas):
    return {"main": [[{"node": n, "type": "main", "index": 0} for n in s] for s in saidas]}


conexoes = {
    "Chatwoot: nova mensagem": liga(["Normalizar Chatwoot"]),
    "Formulário Fale Conosco": liga(["Normalizar formulário"]),
    "Normalizar Chatwoot": liga(["Base de conhecimento"]),
    "Normalizar formulário": liga(["Base de conhecimento"]),
    "Base de conhecimento": liga(["Montar contexto"]),
    "Montar contexto": liga(["IA (Claude)"]),
    "IA (Claude)": liga(["Aplicar regras e registrar"]),
    # A resposta à cliente (acima) roda antes da transferência (abaixo)
    "Aplicar regras e registrar": liga(["Veio do Chatwoot?", "Transferir para a equipe?"]),
    "Veio do Chatwoot?": liga(["Responder no Chatwoot"], ["Responder por e-mail"]),
    "Transferir para a equipe?": liga(["Transferência no Chatwoot?"], []),
    "Transferência no Chatwoot?": liga(["Nota interna para a equipe"], ["Avisar equipe por e-mail"]),
    "Nota interna para a equipe": liga(["Passar conversa para a equipe"]),
    "Relatório (link)": liga(["Montar relatório"]),
}

nomes = [n["name"] for n in nos]
assert len(nomes) == len(set(nomes)), "nomes de nós repetidos"
for origem, c in conexoes.items():
    assert origem in nomes, origem
    for saida in c["main"]:
        for destino in saida:
            assert destino["node"] in nomes, destino["node"]

fluxo = {"name": "Malúvia — Atendimento com IA", "nodes": nos, "connections": conexoes,
         "settings": {"executionOrder": "v1", "timezone": "America/Sao_Paulo"}, "pinData": {}, "active": False}
SAIDA.parent.mkdir(exist_ok=True)
SAIDA.write_text(json.dumps(fluxo, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Fluxo gerado: {SAIDA.relative_to(RAIZ.parent)} ({len(nos)} nós)")
