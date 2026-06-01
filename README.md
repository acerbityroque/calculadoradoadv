# Carteira do Advogado — Calculadoras Revisionais

App em **Next.js** com calculadoras para análise de contratos bancários. Barra lateral
no estilo da ferramenta original, com as calculadoras agrupadas:

**Cartão consignado**
- **RMC** — Reserva de Margem Consignável (desconto fixo).
- **RMC Variável** — quando o desconto mudou de valor ao longo do tempo.
- **RCC** — Reserva de Cartão de Crédito / cartão benefício (desconto fixo).
- **RCC Variável** — RCC com descontos variáveis.

**Revisionais**
- **Revisional Consignado** — taxa de juros real (CET) e cobrança a maior vs. média BACEN.
- **Revisional de Automóveis** — financiamento + Tabela FIPE + média BACEN de veículos.
- **Empréstimo Quitado** — relatório do contrato (tabela Price completa) a partir da taxa informada.

**Descontos indevidos**
- **Descontos de Associações** / **Associações Variável** / **Descontos de Empréstimo** —
  somatório dos descontos e devolução simples ou **em dobro** (CDC, art. 42).

**Utilitários**
- **Calculadora de Meses** — competências entre duas datas.

## Recursos

- **Critério de abusividade ajustável** (topo da tela): 1,0× / 1,3× / **1,5× (STJ)** ou fator personalizado.
- **Quanto o cliente paga a mais**: toda análise mostra a diferença de parcela e o total cobrado a maior.
- **Série histórica**: ao informar a *data de início do contrato*, a comparação usa a **taxa média de
  mercado vigente naquele mês** (série histórica do BACEN/SGS) — referência correta segundo o STJ —, e não a taxa atual.
- **Descontos variáveis** resolvidos por fluxo de caixa (taxa interna de retorno).
- **Exportar PDF** em cada resultado: gera o demonstrativo (só o resultado) com **marca d'água** e **assinatura** do autor, pronto para anexar à peça.
- **Crédito do autor** fixo na barra lateral e flutuante: *Pablo Bandeira · Economista · CORECON/CE 3.521*.
- Taxas do **BACEN (SGS)** e valores da **Tabela FIPE** buscados automaticamente, com campo para
  digitar manualmente caso a API esteja indisponível.

---

## Como publicar no Vercel

### Opção A — site da Vercel
1. Crie conta em https://vercel.com (login com GitHub/Google).
2. Suba esta pasta para um repositório no GitHub.
3. **Add New… → Project → Import** o repositório. A Vercel detecta o Next.js sozinha. Clique **Deploy**.

### Opção B — linha de comando
```bash
npm i -g vercel
cd carteira-do-advogado
vercel          # preview
vercel --prod   # produção
```

### Rodar localmente
```bash
npm install
npm run dev     # http://localhost:3000
```

---

## Séries do BACEN (ajustáveis)
Em `app/api/bacen/route.js`, objeto `SERIES` (séries de “Taxa média de juros – PF”, SGS):

| Chave | Série | Modalidade |
|---|---|---|
| consignadoINSS | 25471 | Consignado INSS |
| consignadoPrivado | 25469 | Consignado privado |
| consignadoPublico | 25470 | Consignado público |
| consignadoTotal | 20714 | Consignado total |
| veiculos | 25468 | Aquisição de veículos |

O BACEN devolve a taxa em **% a.a.**; o app converte para mensal. Para a taxa de um mês específico,
o app envia a *data de início* e o proxy busca a observação vigente naquele período.

> **FIPE histórica:** a API pública retorna o valor **atual**. Para a data do contrato, use o campo
> “Valor FIPE na data do contrato” na calculadora de veículos (valor da época, do contrato ou da tabela FIPE histórica).

---

## Observação jurídica
Estimativas matemáticas (Tabela Price / CET) de apoio. O critério padrão de abusividade é a taxa
superior a 1,5× a média de mercado (STJ), ajustável na tela. Não substitui a análise do contrato.

## Estrutura
```
app/  layout.jsx · page.jsx · globals.css · api/bacen · api/fipe
components/  Settings (fator) · useBacen · RowsEditor · ui
  calculators/ RMC · RCC · CartaoVariavel · Consignado · Veiculos · EmprestimoQuitado · Descontos · Meses
lib/finance.js  (solver de taxa, IRR, Price, devolução em dobro, contagem de meses)
```
