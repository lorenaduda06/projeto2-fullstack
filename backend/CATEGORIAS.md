# Rotas de categorias

As rotas de categorias exigem autenticação. Envie o token JWT no cabeçalho:

```http
Authorization: Bearer SEU_TOKEN
```

O token pode ser obtido pela rota `POST /auth/login`.

## Tipos aceitos

- `entrada` — categoria de receita
- `saida` — categoria de despesa

O backend converte esses valores para `income` e `expense` no banco de dados.

## Listar categorias

**GET** `/categorias`

Lista as categorias do usuário autenticado.

Resposta de exemplo:

```json
[
  {
    "id": "uuid-da-categoria",
    "nome": "Alimentação",
    "tipo": "saida",
    "isDefault": false
  }
]
```

## Criar categoria

**POST** `/categorias`

Corpo da requisição:

```json
{
  "nome": "Alimentação",
  "tipo": "saida"
}
```

**Resposta:** `201 Created`, com os dados da categoria criada.

O `nome` é obrigatório e não pode ficar vazio. O `tipo` deve ser `entrada` ou `saida`.

## Editar categoria

**PUT** `/categorias/:id`

Substitua `:id` pelo ID da categoria. Envie os campos que deseja atualizar:

```json
{
  "nome": "Mercado",
  "tipo": "saida"
}
```

**Resposta:** `200 OK`, com os dados atualizados.

## Excluir categoria

**DELETE** `/categorias/:id`

Substitua `:id` pelo ID da categoria.

**Resposta:** `204 No Content` quando a exclusão for concluída. A categoria é marcada como excluída no banco, não removida fisicamente.

## Erros esperados

- **400 Bad Request** — dados inválidos ou ID em formato incorreto.
- **401 Unauthorized** — token ausente ou inválido.
- **404 Not Found** — categoria não encontrada para o usuário autenticado.

> O backend usa o usuário do token para limitar o acesso às próprias categorias; não é preciso enviar `userId` na URL.

## Dados padrão criados no cadastro

Ao cadastrar um usuário, o backend cria estas categorias:

- Entrada: Salário
- Saídas: Mobilidade, Alimentação, Educação, Moradia, Saúde, Lazer e Outros

Também cria a fonte/destino padrão **Conta corrente**.