// Baixa todos os arquivos dos buckets do Storage do Make3Lab para uma pasta, mantendo os caminhos.
// Uso (na Action de backup): SRK=<service_role> node baixar-storage.mjs <pasta>
import { createClient } from '@supabase/supabase-js';
import fs from 'fs'; import path from 'path';
const URL = 'https://lvnavmtyselveozllcuy.supabase.co';
const destino = process.argv[2] || './storage';
const sb = createClient(URL, process.env.SRK, { auth: { persistSession: false } });
async function listar(bucket, pasta = '') {
  const out = [];
  for (let off = 0; ; off += 1000) {
    const { data, error } = await sb.storage.from(bucket).list(pasta, { limit: 1000, offset: off });
    if (error) throw new Error(`${bucket}/${pasta}: ${error.message}`);
    for (const x of data) {
      const p = pasta ? `${pasta}/${x.name}` : x.name;
      if (x.id === null) out.push(...await listar(bucket, p)); else out.push(p);
    }
    if (data.length < 1000) break;
  }
  return out;
}
const { data: buckets, error } = await sb.storage.listBuckets();
if (error) throw error;
let n = 0, bytes = 0;
for (const b of buckets) {
  for (const arq of await listar(b.id)) {
    const { data, error: e } = await sb.storage.from(b.id).download(arq);
    if (e) { console.warn(`falhou ${b.id}/${arq}: ${e.message}`); continue; }
    const buf = Buffer.from(await data.arrayBuffer());
    const alvo = path.join(destino, b.id, arq);
    fs.mkdirSync(path.dirname(alvo), { recursive: true }); fs.writeFileSync(alvo, buf);
    n++; bytes += buf.length;
  }
}
console.log(`${n} arquivo(s), ${(bytes / 1048576).toFixed(1)} MB, de ${buckets.length} bucket(s)`);
