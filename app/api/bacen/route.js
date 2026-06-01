// Proxy server-side para o BACEN (SGS). Evita CORS e centraliza os codigos de serie.
// Series de "Taxa media de juros das operacoes de credito" - Pessoas Fisicas (% a.a.).
export const dynamic = "force-dynamic";

const SERIES = {
  consignadoINSS:    25471, // Consignado INSS
  consignadoPrivado: 25469, // Consignado setor privado
  consignadoPublico: 25470, // Consignado setor publico
  consignadoTotal:   20714, // Consignado total
  veiculos:          25468, // Aquisicao de veiculos
};

// "yyyy-mm-dd" ou "dd/mm/aaaa" -> {d, m, y}
function parseDate(s) {
  if (!s) return null;
  let m;
  if ((m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s))) return { y: +m[1], m: +m[2], d: +m[3] };
  if ((m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s))) return { d: +m[1], m: +m[2], y: +m[3] };
  return null;
}
const fmt = (d, mo, y) => `${String(d).padStart(2, "0")}/${String(mo).padStart(2, "0")}/${y}`;
const lastDay = (mo, y) => new Date(y, mo, 0).getDate();

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("tipo") || "consignadoINSS";
  const code = SERIES[key];
  if (!code) return Response.json({ error: "Tipo invalido", tiposValidos: Object.keys(SERIES) }, { status: 400 });

  const base = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados`;
  const dataRef = parseDate(searchParams.get("data"));        // mes da contratacao
  const inicio = parseDate(searchParams.get("inicio"));       // serie historica (range)
  const fim = parseDate(searchParams.get("fim"));

  try {
    // 1) Serie historica completa do periodo do contrato
    if (inicio && fim) {
      const url = `${base}?formato=json&dataInicial=${fmt(1, inicio.m, inicio.y)}&dataFinal=${fmt(lastDay(fim.m, fim.y), fim.m, fim.y)}`;
      const r = await fetch(url, { next: { revalidate: 86400 } });
      if (!r.ok) throw new Error("BACEN HTTP " + r.status);
      const arr = await r.json();
      return Response.json({
        tipo: key, serie: code, fonte: "BACEN / SGS",
        serieHistorica: (arr || []).map((o) => ({ data: o.data, taxaAnualPct: Number(String(o.valor).replace(",", ".")) })),
      });
    }

    // 2) Taxa do mes da contratacao (janela de ate 4 meses terminando no mes pedido -> ultima disponivel)
    if (dataRef) {
      const di = new Date(dataRef.y, dataRef.m - 1 - 3, 1); // 3 meses antes
      const url = `${base}?formato=json&dataInicial=${fmt(1, di.getMonth() + 1, di.getFullYear())}&dataFinal=${fmt(lastDay(dataRef.m, dataRef.y), dataRef.m, dataRef.y)}`;
      const r = await fetch(url, { next: { revalidate: 86400 } });
      if (!r.ok) throw new Error("BACEN HTTP " + r.status);
      const arr = await r.json();
      const last = Array.isArray(arr) && arr.length ? arr[arr.length - 1] : null;
      if (!last) throw new Error("Sem dados para o periodo");
      return Response.json({
        tipo: key, serie: code, fonte: "BACEN / SGS",
        data: last.data, taxaAnualPct: Number(String(last.valor).replace(",", ".")),
        referencia: "data da contratacao",
      });
    }

    // 3) Default: ultima taxa disponivel
    const url = `${base}/ultimos/1?formato=json`;
    const r = await fetch(url, { next: { revalidate: 86400 } });
    if (!r.ok) throw new Error("BACEN HTTP " + r.status);
    const arr = await r.json();
    const last = Array.isArray(arr) && arr.length ? arr[arr.length - 1] : null;
    if (!last) throw new Error("Sem dados");
    return Response.json({
      tipo: key, serie: code, fonte: "BACEN / SGS",
      data: last.data, taxaAnualPct: Number(String(last.valor).replace(",", ".")),
      referencia: "mais recente",
    });
  } catch (e) {
    return Response.json({ error: "Falha ao consultar o BACEN", detalhe: String(e.message || e) }, { status: 502 });
  }
}
