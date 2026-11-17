# CRUD de lançamentos financeiros

Todas as rotas abaixo exigem `Authorization: Bearer <token>` obtido em `/auth/login`.

## Rotas

- `POST /transactions` cria um lançamento. Body: `categoryId`, `sourceDestinationId`, `type` (`income|expense`), `description`, `amount`, `transactionDate`; `dueDate` e `status` (`pending|paid|cancelled`) são opcionais.
- `GET /transactions` lista lançamentos do usuário com `page`, `limit` (máximo 100), `type`, `categoryId`, `sourceDestinationId`, `status`, `startDate`, `endDate`, `search`, `sortBy` (`transaction_date|amount|created_at`) e `sortOrder` (`ASC|DESC`).
- `GET /transactions/:id` consulta um lançamento.
- `PATCH /transactions/:id` atualiza parcialmente os campos permitidos pelo POST.
- `DELETE /transactions/:id` faz exclusão lógica e responde `204`.

Valores monetários são retornados como strings decimais. Categorias e fontes/destinos precisam pertencer ao usuário autenticado e a categoria precisa ter o mesmo tipo do lançamento. Lançamentos vinculados a faturas, parcelamentos ou parcelas não podem ser alterados ou excluídos por estas rotas.

## Exemplos cURL

```bash
curl -X POST http://localhost:3000/transactions \
  -H 'Authorization: Bearer SEU_TOKEN' -H 'Content-Type: application/json' \
  -d '{"categoryId":"UUID","sourceDestinationId":"UUID","type":"expense","description":"Supermercado","amount":250.50,"transactionDate":"2026-11-16"}'

curl 'http://localhost:3000/transactions?page=1&limit=10&type=expense&status=paid' \
  -H 'Authorization: Bearer SEU_TOKEN'

curl -X PATCH http://localhost:3000/transactions/UUID \
  -H 'Authorization: Bearer SEU_TOKEN' -H 'Content-Type: application/json' \
  -d '{"status":"paid","description":"Compra atualizada"}'

curl -X DELETE http://localhost:3000/transactions/UUID \
  -H 'Authorization: Bearer SEU_TOKEN'
```
