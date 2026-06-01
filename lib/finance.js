// ============================================================
//  Motor financeiro - Carteira do Advogado
//  Funcoes puras, sem dependencias. Usadas no client.
// ============================================================

// Converte "1.234,56" ou "1234.56" ou number -> Number
export function parseNum(v) {
  if (typeof v === "number") return v;
  if (v == null) return NaN;
  let s = String(v).trim().replace(/\s|R\$/g, "");
  if (s === "") return NaN;
  // remove separador de milhar e normaliza decimal
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  }
  return Number(s);
}

export function formatBRL(n) {
  if (!isFinite(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatPct(n, dec = 2) {
  if (!isFinite(n)) return "—";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + "%";
}

// PMT da Tabela Price: parcela dado PV, taxa i (decimal/mes), n parcelas
export function pmtOf(pv, i, n) {
  if (i === 0) return pv / n;
  return (pv * i) / (1 - Math.pow(1 + i, -n));
}

// Resolve a taxa mensal i tal que PV = PMT * (1 - (1+i)^-n) / i  (bisseccao)
// Retorna decimal por mes (ex.: 0.0238). null se impossivel; 0 se nao ha juros.
export function solveMonthlyRate(pv, pmt, n) {
  if (!(pv > 0) || !(pmt > 0) || !(n > 0)) return null;
  if (pmt * n <= pv) return 0;
  const f = (i) => (pmt * (1 - Math.pow(1 + i, -n))) / i - pv;
  let lo = 1e-9, hi = 5; // ate 500%/mes
  let flo = f(lo), fhi = f(hi);
  if (flo * fhi > 0) return null;
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if (Math.abs(fm) < 1e-9) return mid;
    if (flo * fm < 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; }
  }
  return (lo + hi) / 2;
}

// taxa mensal (decimal) -> anual (decimal), juros compostos
export function monthlyToAnnual(im) {
  return Math.pow(1 + im, 12) - 1;
}
// anual (decimal) -> mensal (decimal)
export function annualToMonthly(ia) {
  return Math.pow(1 + ia, 1 / 12) - 1;
}

// Meses inteiros entre duas datas (yyyy-mm-dd). Conta competencias.
export function monthsBetween(d1, d2) {
  if (!d1 || !d2) return null;
  const a = new Date(d1 + "T00:00:00");
  const b = new Date(d2 + "T00:00:00");
  if (isNaN(a) || isNaN(b)) return null;
  let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) m -= 1;
  return m;
}

// Tabela Price completa (saldo, juros, amortizacao por parcela)
export function priceSchedule(pv, im, n) {
  const pmt = pmtOf(pv, im, n);
  let saldo = pv;
  const rows = [];
  for (let k = 1; k <= n; k++) {
    const juros = saldo * im;
    const amort = pmt - juros;
    saldo = Math.max(0, saldo - amort);
    rows.push({ k, pmt, juros, amort, saldo });
  }
  return { pmt, rows };
}

// Analise revisional: compara taxa do contrato com taxa media de mercado.
// pv: valor liberado/financiado; pmt: parcela cobrada; n: parcelas;
// avgMonthly: taxa media de mercado (decimal/mes), ex BACEN.
// fator: multiplicador do criterio de abusividade (1.5 = STJ; 1.0 = qualquer excesso)
export function revisional(pv, pmt, n, avgMonthly, fator = 1.5) {
  const iContract = solveMonthlyRate(pv, pmt, n);
  if (iContract == null) return null;
  const totalContract = pmt * n;
  let pmtFair = null, totalFair = null, diffMensal = null, diffTotal = null, abusivo = null, limite = null;
  if (avgMonthly != null && avgMonthly > 0) {
    pmtFair = pmtOf(pv, avgMonthly, n);
    totalFair = pmtFair * n;
    diffMensal = pmt - pmtFair;
    diffTotal = totalContract - totalFair;
    limite = avgMonthly * fator;            // taxa-teto considerada licita
    abusivo = iContract > limite;
  }
  return {
    iContractMonthly: iContract,
    iContractAnnual: monthlyToAnnual(iContract),
    avgMonthly,
    avgAnnual: avgMonthly != null ? monthlyToAnnual(avgMonthly) : null,
    totalContract,
    pmtFair, totalFair, diffMensal, diffTotal, abusivo, fator,
    limiteMonthly: limite,
    custoTotalCredito: totalContract - pv, // juros + encargos pagos
  };
}

// ============================================================
//  Fluxo de caixa irregular (pagamentos variáveis) — IRR
// ============================================================

// Valor presente líquido de um fluxo cfs (cfs[0] em t=0) a taxa mensal rate.
export function npv(rate, cfs) {
  let s = 0;
  for (let t = 0; t < cfs.length; t++) s += cfs[t] / Math.pow(1 + rate, t);
  return s;
}

// Taxa interna de retorno mensal (decimal). cfs deve ter troca de sinal.
export function solveIRR(cfs) {
  let lo = 1e-9, hi = 5;
  let flo = npv(lo, cfs), fhi = npv(hi, cfs);
  if (flo * fhi > 0) return null;
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    const fm = npv(mid, cfs);
    if (Math.abs(fm) < 1e-9) return mid;
    if (flo * fm < 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; }
  }
  return (lo + hi) / 2;
}

// Expande linhas [{valor, meses}] em um vetor mensal de valores.
export function expandRows(rows) {
  const out = [];
  for (const r of rows || []) {
    const v = parseNum(r.valor);
    const m = parseInt(r.meses, 10);
    if (v > 0 && m > 0) for (let k = 0; k < m; k++) out.push(v);
  }
  return out;
}

// Total e quantidade de meses de uma lista de descontos.
export function totalDescontos(rows) {
  const arr = expandRows(rows);
  const total = arr.reduce((a, b) => a + b, 0);
  return { total, meses: arr.length };
}

// Devolução de 