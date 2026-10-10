# demofirebird5 – CRUD de Clientes com Firebird 5.0 real

| Arquivo | Descrição |
|---|---|
| `banco.fdb` | Banco **Firebird 5.0 físico** (UTF8) com a tabela `CLIENTES` e **10 clientes** (nome, endereço, CNPJ, telefone, contato, e-mail) |
| `criar_banco.sql` | Script que recria o banco (`isql -user SYSDBA -password masterkey -i criar_banco.sql`) |
| `server.cjs` + `web/index.html` | CRUD web completo (listar, filtrar, inserir, alterar, excluir) sobre o `banco.fdb` |
| `testar_crud.mjs` | Teste automático GET/INSERT/UPDATE/DELETE (com o servidor ligado) |
| `lazarus/` | Projeto Lazarus + Zeos (`ClientesCrud.lpi`) com ZConnection, ZQuery, DataSource, DBGrid, DBNavigator e DBEdits |

## CRUD web
```
node demofirebird5/server.cjs      # abre em http://localhost:3055
node demofirebird5/testar_crud.mjs # valida o CRUD
```
Usa o `isql.exe` do Firebird 5.0 (padrão `C:\Program Files\Firebird\Firebird_5_0`). Variáveis opcionais: `FB_ISQL`, `FB_DB`, `FB_USER`, `FB_PASS`, `PORT`.

## CRUD no Lazarus
Instale o pacote **Zeos (zcomponent)**, abra `lazarus/ClientesCrud.lpi` e execute (F9). O `fbclient.dll` do Firebird 5.0 precisa estar acessível (32/64 bits conforme o executável).
Banco: `SYSDBA / masterkey`.
