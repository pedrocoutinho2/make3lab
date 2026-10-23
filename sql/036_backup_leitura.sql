-- 036_backup_leitura.sql
-- Make3Lab, 23/10/2026, projeto Supabase lvnavmtyselveozllcuy. Aplicado pelo SQL Editor (MCP).
-- Backup sem o plano Pro: a Action .github/workflows/backup.yml faz pg_dump com um usuário só de leitura.
-- As duas senhas nascem aqui dentro, aleatórias, e ficam só no Vault do Supabase (nunca no código nem no vault Obsidian):
--   backup_db_senha     senha do usuário backup_leitura
--   backup_cifra_senha  senha de cifra dos arquivos de backup
-- Para ler: select name, decrypted_secret from vault.decrypted_secrets where name like 'backup_%';
-- Rodar de novo troca a senha do usuário (e a do Vault junto). A de cifra não muda: backups antigos continuam abrindo.

do $$
declare senha text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  if not exists (select 1 from pg_roles where rolname = 'backup_leitura') then
    execute format('create role backup_leitura login bypassrls password %L', senha);
  else
    execute format('alter role backup_leitura login bypassrls password %L', senha);
  end if;
  if exists (select 1 from vault.secrets where name = 'backup_db_senha') then
    perform vault.update_secret((select id from vault.secrets where name = 'backup_db_senha'), senha);
  else
    perform vault.create_secret(senha, 'backup_db_senha', 'Senha do usuário backup_leitura (pg_dump da Action de backup)');
  end if;
  if not exists (select 1 from vault.secrets where name = 'backup_cifra_senha') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'base64'), 'backup_cifra_senha',
      'Senha de cifra (gpg AES-256) dos arquivos de backup da Action. Sem ela o backup não abre.');
  end if;
end $$;

-- só leitura: lê tudo, não grava nada
grant pg_read_all_data to backup_leitura;
grant usage on schema public, plataforma, auth, storage to backup_leitura;
grant select on all tables in schema public, plataforma, auth, storage to backup_leitura;
grant select on all sequences in schema public, plataforma to backup_leitura;
