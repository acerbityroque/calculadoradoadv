// Modalidades de crédito + ajuda para o usuário identificar a correta.
// "tipo" mapeia para a série do BACEN (app/api/bacen/route.js).
export const MODALIDADES = [
  { grupo: "Veículos", itens: [
    { tipo: "veiculos", nome: "Financiamento de veículo (CDC)", ajuda: "Compra de carro/moto com alienação fiduciária. CCB/CDC, parcelas fixas, tarifas de cadastro e avaliação comuns." },
  ]},
  { grupo: "Imobiliário", itens: [
    { tipo: "imobiliarioMercado", nome: "Financiamento imobiliário (taxas de mercado)", ajuda: "Compra de imóvel fora do SFH/regras reguladas (taxas livres). Prazos longos, garantia hipotecária/fiduciária." },
    { tipo: "__manual_imob_regulado", nome: "Imobiliário regulado (SFH/poupança)", ajuda: "Taxas reguladas (SFH, FGTS, poupança). Não há série única de mercado — informe a taxa de referência manualmente." },
  ]},
  { grupo: "Consignado", itens: [
    { tipo: "consignadoINSS", nome: "Consignado INSS", ajuda: "Desconto direto no benefício do INSS (aposentado/pensionista)." },
    { tipo: "consignadoPrivado", nome: "Consignado privado (CLT)", ajuda: "Desconto em folha de empregado de empresa privada." },
    { tipo: "consignadoPublico", nome: "Consignado público", ajuda: "Desconto em folha de servidor público." },
    { tipo: "consignadoTotal", nome: "Consignado (total)", ajuda: "Use quando não souber o órgão específico." },
  ]},
  { grupo: "Crédito pessoal e cartão", itens: [
    { tipo: "creditoPessoal", nome: "Crédito pessoal não consignado", ajuda: "Empréstimo pessoal sem desconto em folha." },
    { tipo: "cartaoRotativo", nome: "Cartão de crédito — rotativo", ajuda: "Saldo não pago da fatura que 'rola' para o mês seguinte. Juros altíssimos." },
    { tipo: "cartaoParcelado", nome: "Cartão de crédito — parcelado", ajuda: "Fatura parcelada com juros." },
    { tipo: "chequeEspecial", nome: "Cheque especial", ajuda: "Limite na conta corrente. Juros muito altos." },
  ]},
  { grupo: "Estudantil", itens: [
    { tipo: "__manual_estudantil", nome: "Crédito estudantil (FIES/privado)", ajuda: "FIES tem taxa regulada; crédito estudantil privado varia. Informe a taxa de referência manualmente." },
  ]},
];

export function modalidadeInfo(tipo) {
  for (const g of MODALIDADES) for (const i of g.itens) if (i.tipo === tipo) return { ...i, grupo: g.grupo };
  return null;
}
// modalidades que não têm série BACEN (exigem taxa manual)
export const isManual = (tipo) => tipo && tipo.startsWith("__manual");
