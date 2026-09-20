import fs from 'node:fs';
const modelo = fs.readFileSync('modelo.html', 'utf8');
const bundle = fs.readFileSync('bundle.js', 'utf8').replace(/<\/script/gi, '<\\/script');
let html = modelo.replace('/*__BUNDLE__*/', () => bundle);
// mantém a configuração já preenchida no index publicado
const atual = fs.existsSync('../index.html') ? fs.readFileSync('../index.html', 'utf8') : '';
const cfg = atual.match(/window\.M3_CONFIG = \{[\s\S]*?\};/);
if (cfg) html = html.replace(/window\.M3_CONFIG = \{[\s\S]*?\};/, () => cfg[0]);
fs.writeFileSync('../index.html', html);
