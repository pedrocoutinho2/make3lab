# Cópia de segurança do Make3Lab

O plano grátis do Supabase não guarda backup. O Pro custa a partir de US$ 25 por mês, com 7 dias de backup diário.
No lugar dele, a Action `.github/workflows/backup.yml` faz a cópia de graça:

- **Todo dia, 03:17 de Brasília:** dump do banco (schemas `public`, `plataforma`, `auth` e `storage`), cifrado com AES-256.
- **Domingo:** também os arquivos do Storage (logos, personalizações, projetos 3MF), cifrados.
- Guardados como artefato privado do repositório por 30 dias (Actions > backup > execução > Artifacts).
- Rodar na hora: Actions > backup > Run workflow (marque "Storage" para levar os arquivos).

## Ligar (uma vez)

No GitHub, `make3lab` > Settings > Secrets and variables > Actions > New repository secret:

| Segredo | De onde vem |
|---|---|
| `SUPABASE_DB_URL` | Supabase > projeto Make3Lab > Connect > **Session pooler** > URI. Troque `[YOUR-PASSWORD]` pela senha do banco. |
| `SUPABASE_SERVICE_ROLE` | Supabase > Project Settings > API Keys > `service_role`. Só para baixar o Storage. |
| `BACKUP_SENHA` | Uma senha longa inventada por você. Guarde no gerenciador de senhas: sem ela a cópia não abre. |

Nenhum desses valores vai para o vault nem para o código.

## Restaurar

```bash
gpg --decrypt make3lab-banco-AAAA-MM-DD.dump.gpg > banco.dump
# conferir o conteúdo
pg_restore --list banco.dump | less
# restaurar uma tabela num banco de teste antes de mexer no de produção
pg_restore --no-owner --no-privileges -d "<URI do banco de teste>" -t vendas banco.dump
```

Restaurar em produção é operação destrutiva: sempre num banco de teste primeiro, e com o Pedro confirmando.
