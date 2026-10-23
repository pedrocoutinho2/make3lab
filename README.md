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

## Produtos, insumos e embalagem no orçamento e na venda

Em cima, Produtos: o campo busca só produto e kit. Embaixo, Insumos e embalagem, com busca própria. Insumo da ficha do produto já vem no custo dele; o da seção é o que vai a mais (caixa de presente, cartão) e a embalagem. Cada linha tem a chave Cobrar do cliente:

- **ligada:** preço pelo motor (custo do insumo, margem padrão, taxa do canal, sem arredondar para ,90), editável. Vai para o PDF e o WhatsApp.
- **desligada:** só custo do pedido. Não aparece para o cliente.

A embalagem é uma linha de insumo não cobrada. A padrão vem de Configurações > Custos e cálculo > Embalagem padrão: um insumo (baixa estoque) ou, sem insumo, o valor em reais. Insumo da categoria Embalagem entra como embalagem. Documento antigo com a embalagem no campo próprio vira linha ao abrir, com o mesmo custo. Tudo entra no custo e no lucro e baixa o estoque na venda; insumo não vira ordem de produção.

## Sinal

Orçamento e venda têm "Pedir sinal para validar o pedido", em % ou R$. No orçamento sai no PDF e no WhatsApp. Na venda, o banco (SQL 026) divide o a receber em dois lançamentos: o sinal, com vencimento na data da venda, e o restante, na entrega, numa data escolhida ou a definir. "Sinal pago" quita só o sinal (baixa parcial); "Pagamento já efetuado" quita o que estiver aberto. Sinal pago e salvo fica travado: desfazer é estorno no Financeiro.

## Financeiro

Dashboard, Entrada, Saída e Previsão. Entrada e Saída abrem em Todos e filtram por a receber/a pagar, recebidos/pagos e atrasados. Saída separa custo fixo e variável: toda saída nova pede o tipo, e a lista troca o tipo num clique. Compra de filamento e insumo entra como variável.

## Canais e taxas

Canal pode ter taxa por faixa de preço (Shopee e TikTok). O preço é calculado por divisão e cai na faixa certa. Taxas de referência de 09/2026; confira na central de cada plataforma. Elo7 não entrou: encerrou a operação em maio de 2026.

## Marcas de filamento

A lista de marcas e as logos são da base do sistema, iguais para todo mundo (tabela `marcas_filamento`). Para pôr uma logo: suba o arquivo no bucket público `marcas` pelo painel do Supabase e grave a URL pública em `marcas_filamento.logo_url`. Sem logo, aparece um monograma.

## Estoque de insumos

Insumo com "Controlar estoque" ligado baixa sozinho quando uma venda usa um produto que tem esse insumo na ficha, e volta se a venda for cancelada ou excluída. O aviso aparece no mínimo definido em cada insumo.

## Importação por planilha

Filamentos e Insumos têm o botão Importar planilha, com modelo para baixar. Três jeitos de trazer: arquivo CSV ou Excel, colar as células copiadas da planilha, ou link do Google Sheets. Colar funciona em qualquer lugar; o link depende de o navegador conseguir falar com o Google.

## Placas no cálculo

Desde 09/10/2026, tempo e gramas entram por placa, numa matriz em Impressão: uma linha por placa, uma coluna de gramas por cor declarada em Filamento. É o que o fatiador mostra no fim de cada placa. Filamento só declara as cores (bobina, R$/kg e perda); as gramas ficam nas placas. Cor que não vai numa placa fica em branco.

- **Origem é da placa.** Placa importada leva o selo "fatiador" e não soma perda. Mudar uma grama dela à mão a torna manual. Placa adicionada à mão é manual e soma a perda da cor.
- **Cor nas duas origens** vira duas linhas no motor (parte do fatiador sem perda, parte digitada com perda). O motor 019 e a `fn_precificar` não mudaram: a regra "fatiador não soma perda" continua no motor, linha a linha.
- **Placa vazia** não conta como placa (nem para o preparo da mesa) e a tela pede para preencher ou tirar.
- **Peças que saem** é o total das placas somadas. O custo por peça divide o total por esse número.
- **.3mf com várias placas:** "Todas as placas" traz uma linha por placa, com as gramas de cada cor naquela placa.
- **Ficha antiga** (sem `placasDet`) abre com o mesmo total: as gramas na placa 1 e o tempo como estava. Preço igual ao de antes.

Gravado na ficha: `placasDet` (`[{ h, m, origem, g: [gramas por cor, na ordem de fils] }]`). `fils[].gramas`, `fils[].gramas_fat`, `fils[].origem`, `horasPeca` e `placas` são recalculados a partir dela, então o resto do sistema (estoque, venda, catálogo) lê como antes.

Teste: `node ferramentas/teste-navegador/teste-placas.mjs`.

## PDF com Pix (orçamento e venda)

Desde 16/10/2026. Orçamento e venda usam a mesma folha e o mesmo bloco "Pague com Pix". Mudam só o cabeçalho (Orçamento ou Pedido) e o card da direita (Validade no orçamento, Situação na venda). A venda tem o botão PDF da venda, no formulário e no ícone da lista.

- **Quando sai:** orçamento com Pix entre as formas oferecidas; venda com Pix escolhido, ou forma a definir com Pix entre as oferecidas.
- **O bloco:** QR code e, no lugar do copia e cola, a chave Pix em destaque (CNPJ formatado), para quem abre o PDF no celular copiar a chave.
- **Chave:** Configurações > Empresa > Chave PIX. Vazia, usa o CNPJ ou CPF da empresa. O campo mostra em qual chave o QR vai receber.
- **Valor no orçamento:** com sinal, o sinal; sem sinal, o total.
- **Valor na venda:** sinal em aberto cobra o sinal; sinal pago cobra o restante; sem sinal cobra o total. Venda paga ou cancelada sai sem o bloco.
- **Recebedor e cidade:** razão social (ou nome fantasia) e a cidade da empresa, sem acento, nos limites do padrão do Banco Central (25 e 15 caracteres), sem cortar palavra. Identificador: `ORC` ou `VENDA` + número.
- **Pix estático:** gerado no navegador (biblioteca `qrcode-generator`, empacotada no `index.html`), sem banco nem PSP. Não avisa o sistema que foi pago: a baixa continua manual. Baixa automática fica para a integração com o Asaas.
- **Venda paga:** o PDF vira recibo. Cabeçalho "Pedido pago", sem Condições e sem Pix, com o bloco Recibo de pagamento: quem pagou, valor com extenso, data e forma (sinal e restante separados quando foi em duas vezes).
- **Comprovante do cliente:** com sinal pago ou pagamento efetuado, a venda mostra "Anexar comprovante" (imagem ou PDF, até 10 MB). O arquivo vai para o bucket `personalizacoes` em `{org}/comprovantes/{venda}/` (regras do SQL 021) e a venda guarda só o caminho em `comprovantes`. Imagem sai no PDF da venda numa página de anexo própria (uma por página, com cabeçalho e rodapé), e a página 1 avisa que o comprovante está em anexo; PDF fica guardado e abre pelo Ver. Tirar da lista não apaga o arquivo.
- **Observações da venda:** campo próprio com a chave "Sair no PDF para o cliente". Venda nova começa desligada (anotação interna); venda que veio do orçamento começa ligada, porque o cliente já viu aquela observação; consignação começa desligada.
- Sem SQL novo: a chave já existia em `empresa.pix` e o bucket é o do SQL 021.

Teste: `node ferramentas/teste-navegador/teste-pix.mjs` (o payload do Pix fica em `data-pix` no QR; com `jsqr` e `pngjs` instalados, o teste também lê o QR impresso e confere).

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

## Celular (21/10/2026)

Abaixo de 640 px, toda tabela dentro de `.rolo` vira cartão empilhado: cada célula mostra o rótulo da coluna (atributo `data-rot`, posto por `rotularTabelas` a partir do `thead`, num MutationObserver). Quem precisar continuar rolando de lado usa `.rolo.lateral`. Campos com `span 2` ocupam a linha toda, modais e grades não passam da borda, e a barra de cima esconde os atalhos que não cabem (até 440 px ficam 2, até 380 px fica 1; os outros continuam no menu).

Auditoria: `node ferramentas/teste-navegador/auditoria-mobile.mjs [pasta]` percorre todas as telas e os formulários de Novo, mais venda e orçamento cheios, a 390 e 360 px, e lista o que passa da borda direita. `TODOS=1` tira print de todas as telas.

## Personalização e projeto no PDF (21/10/2026)

- **Para o cliente, só a descrição:** PDF e texto do WhatsApp mostram cada campo numa linha, abaixo do nome do produto e sem destaque (`Cor da caixa: vermelho`). Vale para qualquer produto personalizado: o rótulo é o do campo no cadastro do produto (cor, texto, escolha) e, por unidade, sai uma linha por peça.
- **Nome da cor para o cliente:** campo opcional do filamento (`dados.cor_cliente`, sem SQL novo). Vazio, sai o nome da cor. Tipo e marca nunca saem. Quando a cor é escolhida no item, o nome vai junto para o pedido (`personalizacao.cores_cliente`): renomear o filamento depois não muda orçamento nem venda já feitos. O anúncio de marketplace usa o mesmo nome. A logo vai em miniatura ao lado do rótulo, sem nome de arquivo. A observação do bloco é para a produção e não sai na folha. A fila de produção continua vendo o rótulo completo do filamento.
- **Projeto do item:** cada produto do orçamento e da venda tem "Anexar projeto para o cliente aprovar". Aceita PNG, JPG, WEBP ou o `.3mf` do Bambu Studio (sai a miniatura da placa). Cada imagem vira uma página de anexo logo depois da folha principal, antes do comprovante, e a folha 1 avisa "Projeto em anexo". O arquivo vai para o bucket `personalizacoes` (SQL 021) e o item guarda só o caminho em `projetos`. Passa do orçamento para a venda junto com o item. Sem SQL novo.
- Teste: `node ferramentas/teste-navegador/teste-pdf-personalizacao.mjs`.

## Projeto na venda, resumo na fila, .3mf guardado e logo do cliente (21/10/2026)

- **Projeto visível:** a imagem do projeto aparece em miniatura no item, na lista de vendas (ao lado do cliente), no card da fila de produção e no resumo da venda. Clicar na miniatura abre a imagem grande sem abrir a venda. Links assinados de 10 minutos, com cache de 9.
- **Resumo da venda na fila:** clicar no card da fila abre uma janela com cliente, entrega, situação, itens com etapa, personalização completa (como a produção precisa), projeto grande, .3mf para baixar e observações. "Abrir a venda completa" leva ao formulário.
- **.3mf do pedido:** cada item do orçamento e da venda tem "Guardar o .3mf deste pedido" (.3mf ou G-code, até 50 MB). O .3mf enviado em "Usar fatiamento deste pedido" ou em "Anexar projeto" também fica guardado. Bucket privado `impressao` (SQL 032); o item guarda o caminho em `arquivos_impressao`. Não vai para o cliente.
- **PDF sem página em branco:** na impressão a folha tem 296 mm. Com 297 mm o Safari arredondava para cima e abria uma página vazia depois de cada folha.
- **Logo do cliente num lugar só:** topo do cadastro. O arquivo original vai para a identidade da marca (produção e "Usar a marca do cliente") e a primeira imagem vira a foto do cliente. A Identidade da marca ficou com cores e observação.
- Teste: `node ferramentas/teste-navegador/teste-projeto-venda.mjs`.

## Frete no orçamento e na venda (23/10/2026)

Bloco Frete no orçamento, na venda e no card de Entregas, com quatro modos: Sem frete, Cobrar do cliente, Frete grátis e A calcular. Fica em `dados.frete` (`modo`, `valor`, `custo`, `modalidade`, `custo_pago`, `custo_pago_em`).

- **Repasse, não receita.** O valor cobrado soma no total depois do desconto e não passa pelo motor, pela margem, pelo refugo nem pela taxa do canal. O frete pago (custo real) entra no custo do pedido; vazio, vale o cobrado. Cobrado igual ao pago, o lucro não muda.
- **Taxa da forma de pagamento** incide sobre o total com frete e é custo do vendedor. Não há gross up do frete: no PDF ele aparece pelo valor real.
- **Sinal** incide só sobre produtos e insumos. O frete vai no restante, porque o envio é na entrega. O QR do Pix segue a regra de sempre (sinal aberto cobra o sinal, sinal pago cobra o restante com frete, sem sinal cobra o total).
- **PDF e WhatsApp:** linha "Frete (modalidade)" entre o subtotal e o total. Grátis sai como "grátis"; a calcular sai como "a calcular".
- **Marketplace:** canal Shopee, Mercado Livre, Amazon ou TikTok deixa o frete de fora (o marketplace cuida). Trocar o orçamento para um desses canais tira o frete. Consignação também não tem frete.
- **A venda herda** o frete do orçamento ao fechar, e a modalidade vira o "Como vai" da entrega.
- **Financeiro (SQL 033):** o frete pago vira um a pagar variável por venda (`dados.frete_venda_id`, origem `auto_frete`). O aberto acompanha a venda; "Frete já pago" quita. Pago não muda mais (estorno no Financeiro). Venda cancelada tira o aberto e mantém o pago, porque a etiqueta já foi paga. O a receber não mudou: ele já segue o total da venda.
- **Aviso de frete não definido** (sem escolha, a calcular ou cobrar sem valor) quando a venda fica pronta para entrega: confirmação ao marcar pronta (lista, formulário e Entregas), selo "Frete a definir" na lista e no card de Entregas, e alerta no sino. O frete se define no próprio card de Entregas. Pagamento efetuado com frete a calcular é bloqueado, para o recibo não sair sem ele.
- `[CONFIRMAR]` Imposto incide sobre o total com frete (frete cobrado na nota compõe a receita no Simples). Se o pedido sai sem nota, o imposto do frete sobra no cálculo; conferir com o contador.

Testes: `node ferramentas/teste-navegador/teste-frete.mjs` (34 casos, 1440 e 390 px) e `ferramentas/teste-033/casos.sql` (6 casos no banco, numa transação que termina em erro de propósito).
