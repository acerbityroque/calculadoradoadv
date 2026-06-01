// Proxy server-side para a tabela FIPE (API publica parallelum).
// Uso: /api/fipe?endpoint=carros/marcas
//      /api/fipe?endpoint=carros/marcas/59/modelos
//      /api/fipe?endpoint=carros/marcas/59/modelos/5940/anos
//      /api/fipe?endpoint=carros/marcas/59/modelos/5940/anos/2014-3
export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get("endpoint") || "carros/marcas";
  // sanitiza: apenas letras, numeros, barra e hifen
  if (!/^[a-zA-Z0-9/\-]+$/.test(endpoint)) {
    return Response.json({ error: "endpoint invalido" }, { status: 400 });
  }
  const url = `https://parallelum.com.br/fipe/api/v1/${endpoint}`;
  try {
    const r = await fetch(url, { next: { revalidate: 3600 } });
    if (!r.ok) throw new Error("FIPE HTTP " + r.status);
    const data = await r.json();
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: "Falha ao consultar a FIPE", detalhe: String(e.message || e) }, { status: 502 });
  }
}
