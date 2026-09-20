# Make3Lab, sistema v3.8

19/09/2026. Endereço do sistema: `https://app.make3lab.com.br`. Site de venda: `make3lab.com.br`. Gestão de produção para impressão 3D: simulador de custo, catálogo, clientes, orçamento em PDF, vendas e financeiro, com login e dados isolados por organização.

## Estrutura

```
index.html                 o sistema inteiro, arquivo único (gerado)
favicon.svg, icon-*.png    ícones
manifest.webmanifest       instalar no celular
.htaccess                  HTTPS e cabeçalhos na Hostinger
src/make3lab-sistema.jsx   FONTE. Toda alteração é aqui
sql/007_base_multitenant.sql
sql/008_insumos_usuarios.sql
sql/009_filamentos.sql
sql/010_estoque_filamento.sql
sql/011_insumos_estoque_marcas.sql
sql/012_operacao_kits_consignacao.sql
sql/013_produto_canal.sql
ferramentas/               montar.sh gera o index.html a partir do src
logo/                      kit de logo em SVG
```

## Subir pela primeira vez

1. **Supabase.** Criar projeto novo, região São Paulo (`sa-east-1`), numa organização Make3Lab separada da do CNA. Não reaproveitar projeto.
2. **SQL.** SQL Editor: rodar `007` a `013`, nessa ordem. Os dois podem rodar de novo sem estragar nada.
3. **Auth.** Authentication > URL Configuration:
   - Site URL: `https://app.make3lab.com.br`
   - Redirect URLs: `https://app.make3lab.com.br/**`
   - Deixar a confirmação de e-mail ligada.
4. **Chaves.** Project Settings > API. Copiar a Project URL e a chave `anon` (ou `publishable`) para o bloco `window.M3_CONFIG` dentro do `index.html`. **Nunca a `service_role` ou `secret`.** A anon é pública por desenho, quem protege os dados é o RLS.
5. **Hostinger.** Criar o subdomínio `app` em Domínios > Subdomínios. Gerenciador de arquivos, pasta do subdomínio (normalmente `public_html/app`). Enviar `index.html`, `.htaccess`, `favicon.svg`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` e `manifest.webmanifest`. Ligar o SSL no painel.
6. **Teste.** Abrir o domínio, criar conta, confirmar o e-mail, entrar. O rodapé do menu deve mostrar "tudo salvo".

Sem a URL e a chave preenchidas, o sistema abre em modo demonstração, com dados em memória.

## Deploy pelo Git da Hostinger

O repositório é `github.com/pedrocoutinho2/make3lab`. O Git do hPanel só copia arquivos, não roda build: o `index.html` gerado pelo `montar.sh` precisa estar commitado. Fluxo: editar o `src`, rodar `./ferramentas/montar.sh`, commitar `src` e `index.html` juntos, e dar push.

## Atualizar depois

Editar `src/make3lab-sistema.jsx` e rodar `./ferramentas/montar.sh` (Node 18+). O script regenera o `index.html` e mantém o `M3_CONFIG` que já estava preenchido. Subir só o `index.html` novo.

SQL novo vira arquivo numerado em `sql/` no mesmo ciclo: `008_...`, `009_...`.

## Usuários e convites

Em Minha conta, o dono convida por e-mail e escolhe o papel. O sistema não manda e-mail sozinho: ele gera a mensagem para você enviar pelo WhatsApp ou e-mail. A pessoa cria a conta com o e-mail convidado e entra direto na empresa. Se ela já tiver conta, o convite vale no próximo login e aparece a opção de trocar de empresa em Minha conta.

- **dono:** usa tudo, convida, troca papel e tira acesso
- **operador:** usa tudo, menos gerenciar usuários

## Insumos por planilha

Configurações > Insumos aceita CSV, Excel ou link do Google Sheets (compartilhado como "qualquer pessoa com o link"). O botão Baixar planilha modelo gera o modelo com as colunas Nome, Categoria, Unidade, Qtd no pacote, Preço do pacote e Fornecedor. O custo por unidade é preço do pacote ÷ quantidade, calculado no banco. Planilha com filamentos em cima e insumos embaixo funciona: o leitor procura o cabeçalho Nome, Item ou Insumo.

## Padrão de tela (vale para todo sistema da Crista Labs)

- Campo que escolhe algo cadastrado (cliente, produto, insumo) é texto com autocomplete. Se o que foi digitado não existe, a última opção da lista abre um modal de cadastro rápido, e o item novo já volta preenchido no campo.
- Formulário aberto esconde a lista. Sempre com o caminho de volta no topo ("← Orçamentos") e o botão Cancelar no rodapé.

## Menu

Início · Cadastros (Produtos, Clientes, Filamentos, Insumos) · Comercial (Simulador, Orçamentos, Vendas) · Gestão (Financeiro, Relatórios) · Sistema (Configurações). Minha conta fica no rodapé do menu.

## Estoque de filamento

Cada filamento guarda quantas gramas restam. Venda salva baixa o consumo dos produtos (gramas com perda, na base por peça) e guarda a baixa na própria venda; cancelar ou excluir a venda devolve. Orçamento e venda avisam quando o pedido deixa o filamento abaixo do limite de Configurações (padrão 250 g). Produto sem filamento cadastrado na ficha fica fora da conta e o aviso diz qual é.

## Fluxo do pedido

Funil de vendas (orçamentos em kanban, colunas editáveis) → Fechado cria a venda, o a receber e as ordens na Fila de produção → ordens prontas liberam a venda em Entregas → Entregue fecha. Tudo aparece no Calendário. Consignação cria a venda no acerto, com a comissão do ponto descontada.

## Canais e taxas

Canal pode ter taxa por faixa de preço (Shopee e TikTok). O preço é calculado por divisão e cai na faixa certa. Taxas de referência de 09/2026; confira na central de cada plataforma. Elo7 não entrou: encerrou a operação em maio de 2026.

## Marcas de filamento

A lista de marcas e as logos são da base do sistema, iguais para todo mundo (tabela `marcas_filamento`). Para pôr uma logo: suba o arquivo no bucket público `marcas` pelo painel do Supabase e grave a URL pública em `marcas_filamento.logo_url`. Sem logo, aparece um monograma.

## Estoque de insumos

Insumo com "Controlar estoque" ligado baixa sozinho quando uma venda usa um produto que tem esse insumo na ficha, e volta se a venda for cancelada ou excluída. O aviso aparece no mínimo definido em cada insumo.

## Importação por planilha

Filamentos e Insumos têm o botão Importar planilha, com modelo para baixar. Três jeitos de trazer: arquivo CSV ou Excel, colar as células copiadas da planilha, ou link do Google Sheets. Colar funciona em qualquer lugar; o link depende de o navegador conseguir falar com o Google.

## Placas no cálculo

Produção tem três dados: peças produzidas, placas e a base do tempo e das gramas (1 peça, 1 placa ou toda a produção). A preparação conta uma vez por placa. Na importação de .3mf com várias placas, dá para usar uma placa ou somar todas.

## Relatórios

Vendas, Orçamentos (conversão, perdidos e motivo de perda), Produtos (venda por produto e margem por hora de máquina), Clientes (venda por cliente, novos e concentração) e Financeiro (resultado das vendas, caixa por mês e atrasados). Todos com filtro de período e exportação em CSV. Orçamento recusado ou vencido pede o motivo da perda.

## Dar ou tirar acesso de um testador

Pelo Table Editor, tabela `organizacoes`, coluna `status`:

- `beta` ou `ativa`: lê e grava
- `trial`: grava até `acesso_ate`
- `vencida` ou `cancelada`: só lê

O usuário não consegue mudar o próprio status. Isso é bloqueado no banco.

## Regras que o código segue

- Dinheiro em `numeric(14,4)` no banco, taxa e perda com `CHECK`.
- Nada se apaga. Excluir na tela grava `ativo = false`.
- Cada item de orçamento e venda guarda `snap`, o custo e os parâmetros do momento.
- Lucro de documento tem uma definição só, `resultadoDoc`: total menos taxa do canal (percentual e fixa por peça), imposto, taxa da forma de pagamento e custo.
- Números em Archivo com algarismo tabular. Sem fonte mono (decisão de 19/09).
- Motor de 18/09: hora padrão R$ 25, refugo 8% sobre material, energia, máquina e setup; linha com origem `fatiador` não soma perda.

## Pendências

- `[CONFIRMAR]` `006_motor_e_hora_padrao.sql` e `motor-006.js` se perderam. O cálculo roda no front (`precificar`) e não em `fn_precificar_v2`. Dívida contra a regra do motor em SQL.
- `[CONFIRMAR]` Paridade com os casos P1 15,97 · P2 53,27 · P3 39,35 depende dos insumos exatos das três peças, que não estão aqui.
- Onda 0 ainda aberta: view única por métrica e estorno de lançamento.
- Sem service worker, de propósito, durante o teste.
- `[CONFIRMAR]` Termos de uso reais antes de cobrar. O aceite atual é da versão de teste (`beta-2026-09`).
- Convite não dispara e-mail: sem Edge Function, a mensagem é copiada e enviada à mão.
- Leitura de Excel carrega o leitor da SheetJS do CDN oficial só na hora de importar `.xlsx`.
