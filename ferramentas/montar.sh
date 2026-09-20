#!/usr/bin/env bash
# Gera o index.html de arquivo único a partir de src/make3lab-sistema.jsx.
# Uso: ./ferramentas/montar.sh   (precisa de Node 18+ e npm)
# Preserva o window.M3_CONFIG que já estiver no index.html atual.
set -euo pipefail
cd "$(dirname "$0")"
[ -d node_modules ] || npm install --silent react@18 react-dom@18 @supabase/supabase-js@2 esbuild
cp ../src/make3lab-sistema.jsx ./make3lab-sistema.jsx
npx esbuild entry.jsx --bundle --minify --loader:.jsx=jsx --jsx=automatic --target=es2019 \
  --define:process.env.NODE_ENV='"production"' --outfile=bundle.js --log-level=warning
node montar.mjs
rm -f make3lab-sistema.jsx bundle.js
echo "index.html gerado"
