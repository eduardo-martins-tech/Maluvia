# Fluxo de trabalho no repositório

Como as mudanças entram no projeto. O objetivo é que o histórico conte a evolução do sistema: cada mudança com um motivo, revisada e testada.

## Branches
- `main` sempre funciona e é o que está (ou vai) para produção. Nada é commitado direto nela.
- Cada mudança nasce numa branch própria, com prefixo pelo tipo:
  - `feat/consulta-pedidos-erp`
  - `fix/nota-interna-sem-telefone`
  - `docs/prints-do-chatwoot`

```bash
git switch main && git pull
git switch -c feat/nome-da-mudanca
# ...trabalho, commits...
git push -u origin feat/nome-da-mudanca
```
Depois, abra um **pull request** no GitHub.

## Mensagens de commit
Padrão [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/), em português, no imperativo:

```
tipo: o que muda, em poucas palavras

Por que a mudança foi feita, se não for óbvio.
```

| Tipo | Quando usar | Exemplo |
|---|---|---|
| `feat` | Funcionalidade nova | `feat: consultar status do pedido no ERP` |
| `fix` | Correção | `fix: ignorar mensagens de áudio sem transcrição` |
| `docs` | Só documentação | `docs: adicionar prints do Chatwoot ao README` |
| `test` | Só testes | `test: cobrir pedido inexistente no formulário` |
| `refactor` | Melhora interna, sem mudar comportamento | `refactor: separar regras de transferência` |
| `chore` | Manutenção, dependências, CI | `chore: fixar versão do n8n no compose` |

Commits pequenos, um assunto cada. Se a mensagem precisa de "e", provavelmente são dois commits.

## Pull requests
- Use o modelo que aparece ao abrir o PR: o que mudou, por quê e como foi testado.
- O CI precisa passar.
- Mesmo trabalhando sozinho, revise o próprio diff no GitHub antes de juntar. É onde aparecem esquecimentos.
- Junte com **Squash and merge**: cada PR vira um commit limpo na `main`.

## Versões
- Versões seguem [SemVer](https://semver.org/lang/pt-BR/): `0.2.0` para funcionalidades novas, `0.1.1` para correções.
- Ao lançar uma versão: atualize o [CHANGELOG](../CHANGELOG.md), crie a tag e uma release no GitHub.
  ```bash
  git tag -a v0.2.0 -m "v0.2.0"
  git push origin v0.2.0
  ```

## Primeiras issues sugeridas
Crie no GitHub (aba **Issues**) para organizar os próximos passos:

1. **Rodar o ambiente local e registrar o que precisou de ajuste** (`fix`, `docs`)
2. **Adicionar prints e um GIF da demonstração ao README** (`docs`)
3. **Guardar conversas e registro numa tabela do Postgres em vez dos dados estáticos do n8n** (`feat`)
4. **Mostrar o relatório numa página simples, em vez de JSON** (`feat`)
5. **Consultar pedidos reais no ERP/plataforma da loja** (`feat`, depende da loja)
6. **Trocar a base de conhecimento pelas regras reais** (`docs`, depende da loja)
