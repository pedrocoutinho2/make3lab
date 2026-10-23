# Cópia de segurança do Make3Lab

O plano grátis do Supabase não guarda backup. O Pro custa a partir de US$ 25 por mês, com 7 dias de backup diário.
No lugar dele, a Action `.github/workflows/backup.yml` faz a cópia de graça:

- **Todo dia, 03:17 de Brasília:** dump do banco (schemas `public`, `plataforma`, `auth` e `storage`), cifrado com AES-256.
- **Domingo:** também os arquivos do Storage (logos, personalizações, projetos 3MF), cifrados.
- Guardados como artefato privado do repositório por 30 dias (Actions > backup > execução > Artifacts).
- Rodar na hora: Actions > backup > Run workflow (marque "Storage" para levar os arquivos).

## Ligar (uma vez, 2 minutos)

O banco já tem o usuário `backup_leitura` (só leitura, criado no SQL 036) e as duas senhas estão no Vault do Supabase.

1. Supabase > projeto Make3Lab > SQL Editor, rode:
   `select name, decrypted_secret from vault.decrypted_secrets where name like 'backup_%';`
2. GitHub > `make3lab` > Settings > Secrets and variables > Actions > New repository secret, dois segredos:

| Segredo | Valor |
|---|---|
| `BACKUP_DB_SENHA` | `decrypted_secret` da linha `backup_db_senha` |
| `BACKUP_SENHA` | `decrypted_secret` da linha `backup_cifra_senha` |

3. Actions > backup > Run workflow. Em 2 a 3 minutos aparece o artefato `backup-…`.

Opcional, para levar também os arquivos do Storage aos domingos: `SUPABASE_SERVICE_ROLE` = Project Settings > API Keys > `service_role`.

O repositório é público: por isso o arquivo sai cifrado e o log não imprime dado. Nenhuma senha vai para o vault do Obsidian nem para o código.

## Restaurar

```bash
gpg --decrypt make3lab-banco-AAAA-MM-DD.dump.gpg > banco.dump   # pede a senha backup_cifra_senha do Vault
# conferir o conteúdo
pg_restore --list banco.dump | less
# restaurar uma tabela num banco de teste antes de mexer no de produção
pg_restore --no-owner --no-privileges -d "<URI do banco de teste>" -t vendas banco.dump
```

Restaurar em produção é operação destrutiva: sempre num banco de teste primeiro, e com o Pedro confirmando.
