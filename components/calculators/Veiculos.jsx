"use client";
import { useEffect, useState } from "react";
import { parseNum, annualToMonthly, monthlyToAnnual, solveMonthlyRate, pmtOf, revisional, analisarTarifas, tabelaParcelas, formatBRL } from "@/lib/finance";
import { Field, KPI, money, pct, Disclaimer, ExportButton } from "@/components/ui";
import { useBacen, useBacenSerie, fetchCached } from "@/components/useBacen";
import { useFator } from "@/components/Settings";
import { MODALIDADES, modalidadeInfo, isManual } from "@/components/modalidades";
import Combobox from "@/components/Combobox";
import { Semaforo } from "@/components/Semaforo";

function useFipeList(endpoint, enabled) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!enabled || !endpoint) { setList([]); return; }
    let alive = true; setLoading(true);
    fetchCached(`/api/fipe?endpoint=${encodeURIComponent(endpoint)}`, `fipe:${endpoint}`)
      .then((d) => { if (alive) setList(Array.isArray(d) ? d : (d && Array.isArray(d.modelos) ? d.modelos : [])); })
      .catch(() => { if (alive) setList([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [endpoint, enabled]);
  return { list, loading };
}

const hoje = () => new Date().toISOString().slice(0, 10);
const opt = (arr) => (arr || []).map((x) => ({ value: x.codigo, label: x.nome }));

export default function Veiculos() {
  // ---- FIPE ----
  const [tipo, setTipo] = useState("carros");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [ano, setAno] = useState("");
  const [fipe, setFipe] = useState(null);
  const marcas = useFipeList(`${tipo}/marcas`, true);
  const modelos = useFipeList(marca ? `${tipo}/marcas/${marca}/modelos` : "", !!marca);
  const anos = useFipeList(marca && modelo ? `${tipo}/marcas/${marca}/modelos/${modelo}/anos` : "", !!(marca && modelo));

  useEffect(() => {
    setFipe(null);
    if (!(marca && modelo && ano)) return;
    let alive = true;
    fetchCached(`/api/fipe?endpoint=${encodeURIComponent(`${tipo}/marcas/${marca}/modelos/${modelo}/anos/${ano}`)}`, `fipe:val:${tipo}:${marca}:${modelo}:${ano}`)
      .then((d) => { if (alive && d && d.Valor) setFipe(d); }).catch(() => {});
    return () => { alive = false; };
  }, [tipo, marca, modelo, ano]);

  // ---- Financiamento ----
  const [modalidade, setModalidade] = useState("veiculos");
  const [ajudaOpen, setAjudaOpen] = useState(false);
  const [pv, setPv] = useState("");
  const [parc, setParc] = useState("");
  const [n, setN] = useState("");
  const [iof, setIof] = useState("");
  const [entrada, setEntrada] = useState("");
  const [cadastro, setCadastro] = useState("");
  const [avaliacao, setAvaliacao] = useState("");
  const [registro, setRegistro] = useState("");
  const [seguro, setSeguro] = useState("");
  const [pagas, setPagas] = useState("");
  const [dataIni, setDataIni] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [fipeManual, setFipeManual] = useState("");
  const [manual, setManual] = useState("");
  const [res, setRes] = useState(null);
  const [err, setErr] = useState("");
  const { fator } = useFator();

  const manualMod = isManual(modalidade);
  const bacen = useBacen(manualMod ? "veiculos" : modalidade, dataIni || undefined);
  const serieHook = useBacenSerie(manualMod ? "veiculos" : modalidade, dataIni || undefined, (dataIni && (dataFim || hoje())) || undefined);
  const info = modalidadeInfo(modalidade);

  function fipeValorNum() {
    const m = parseNum(fipeManual);
    if (isFinite(m) && m > 0) return m;
    if (!fipe || !fipe.Valor) return null;
    return parseNum(fipe.Valor);
  }

  // preview ao vivo
  const pPV = parseNum(pv), pParc = parseNum(parc), pN = parseInt(n, 10);
  const totalPagar = (isFinite(pParc) && isFinite(pN)) ? pParc * pN : null;
  const custoCred = (totalPagar != null && isFinite(pPV)) ? totalPagar - pPV : null;
  const tarPrev = analisarTarifas({ cadastro, avaliacao, registro, seguro });

  function calc() {
    setErr("");
    const PV = parseNum(pv), PMT = parseNum(parc), N = parseInt(n, 10);
    if (!(PV > 0) || !(PMT > 0) || !(N > 0)) { setErr("Informe valor financiado, valor da parcela e número de parcelas."); setRes(null); return; }
    let avgM = null;
    const man = parseNum(manual);
    if (isFinite(man) && man > 0) avgM = man / 100;
    else if (!manualMod && bacen.data) avgM = annualToMonthly(bacen.data.taxaAnualPct / 100);
    const r = revisional(PV, PMT, N, avgM, fator);
    if (!r) { setErr("Não foi possível calcular a taxa com esses dados."); setRes(null); return; }
    const fv = fipeValorNum();
    const tar = analisarTarifas({ cadastro, avaliacao, registro, seguro });
    const np = parseInt(pagas, 10);
    const parcelaJusta = avgM != null ? pmtOf(PV, avgM, N) : null;
    const tabela = (serieHook.serie && dataIni) ? tabelaParcelas({
      dataPrimeiroVenc: dataIni, nParcelas: N, parcela: PMT, parcelaJusta, serie: serieHook.serie, fator,
      parcelasPagas: isFinite(np) ? np : null,
    }) : null;
    const totalPagoAteAgora = (isFinite(np) ? np : 0) * PMT;
    const saldoRestante = (N - (isFinite(np) ? np : 0)) * PMT;
    setRes({
      ...r, fipe: fv, razaoFinFipe: fv ? PV / fv : null,
      iof: parseNum(iof), entrada: parseNum(entrada),
      tarifas: tar, parcelaJusta, tabela,
      pagas: isFinite(np) ? np : null, totalPagoAteAgora, saldoRestante,
      modalidadeNome: info ? info.nome : modalidade,
      refData: bacen.data ? bacen.data.data : null,
      jurosTotais: r.totalContract - PV,
    });
  }

  const ajudaTxt = manualMod ? "Modalidade com taxa regulada — informe a taxa de referência manualmente." : (bacen.loading ? "Buscando taxa…" : bacen.data ? `BACEN ${bacen.data.data}: ${bacen.data.taxaAnualPct.toLocaleString("pt-BR")}% a.a.` : "BACEN indisponível — informe manualmente.");

  return (
    <>
      {/* ---------- FIPE ---------- */}
      <div className="card">
        <h3>Tabela FIPE — Veículo</h3>
        <p className="hint">Digite para buscar marca/modelo (não precisa rolar a lista). O valor FIPE atual é buscado automaticamente.</p>
        <div className="grid">
          <Field label="Tipo">
            <select value={tipo} onChange={(e) => { setTipo(e.target.value); setMarca(""); setModelo(""); setAno(""); }}>
              <option value="carros">Carros</option>
              <option value="motos">Motos</option>
              <option value="caminhoes">Caminhões</option>
            </select>
          </Field>
          <Combobox label="Marca" options={opt(marcas.list)} value={marca} loading={marcas.loading}
            onChange={(v) => { setMarca(v); setModelo(""); setAno(""); }} />
          <Combobox label="Modelo" options={opt(modelos.list)} value={modelo} loading={modelos.loading} disabled={!marca}
            onChange={(v) => { setModelo(v); setAno(""); }} />
          <Combobox label="Ano / combustível" options={opt(anos.list)} value={ano} loading={anos.loading} disabled={!modelo}
            onChange={(v) => setAno(v)} />
        </div>
        {fipe && fipe.Valor && (
          <div className="kpis" style={{ marginTop: 6 }}>
            <KPI big label={`FIPE atual — ${fipe.Modelo || ""}`} value={fipe.Valor} />
            <KPI label="Referência" value={fipe.MesReferencia || "—"} />
          </div>
        )}
      </div>

      {/* ---------- Financiamento + Preview ---------- */}
      <div className="with-preview">
        <div className="card" style={{ flex: 1 }}>
          <h3>Dados do Financiamento</h3>
          <p className="hint">Apura a taxa real e compara com a média BACEN da modalidade, vigente na data da contratação.</p>

          <Field label="Modalidade do contrato" help={info ? info.ajuda : ""}>
            <select value={modalidade} onChange={(e) => setModalidade(e.target.value)}>
              {MODALIDADES.map((g) => (
                <optgroup key={g.grupo} label={g.grupo}>
                  {g.itens.map((i) => <option key={i.tipo} value={i.tipo}>{i.nome}</option>)}
                </optgroup>
              ))}
            </select>
          </Field>
          <button type="button" className="btn ghost small no-print" onClick={() => setAjudaOpen(!ajudaOpen)}>
            {ajudaOpen ? "Ocultar" : "Não sei qual é a minha modalidade →"}
          </button>
          {ajudaOpen && (
            <div className="ajuda-modal">
              {MODALIDADES.map((g) => (
                <div key={g.grupo} className="ajuda-grp">
                  <strong>{g.grupo}</strong>
                  {g.itens.map((i) => <div key={i.tipo} className="ajuda-item"><b>{i.nome}:</b> {i.ajuda}</div>)}
                </div>
              ))}
            </div>
          )}

          <div className="grid" style={{ marginTop: 12 }}>
            <Field label="Valor financiado (R$)" help="Total financiado, com tarifas e IOF (PV do contrato)."><input inputMode="decimal" placeholder="52.421,53" value={pv} onChange={(e) => setPv(e.target.value)} /></Field>
            <Field label="Valor da parcela (R$)"><input inputMode="decimal" placeholder="2.051,00" value={parc} onChange={(e) => setParc(e.target.value)} /></Field>
            <Field label="Número de parcelas"><input inputMode="numeric" placeholder="48" value={n} onChange={(e) => setN(e.target.value)} /></Field>
            <Field label="Parcelas já pagas (opcional)"><input inputMode="numeric" placeholder="13" value={pagas} onChange={(e) => setPagas(e.target.value)} /></Field>
            <Field label="Data do 1º vencimento / contratação"><input type="date" value={dataIni} onChange={(e) => setDataIni(e.target.value)} /></Field>
            <Field label="Data final / até hoje (simulação)" help="Define o período da série BACEN. Vazio = até hoje."><input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} /></Field>
            <Field label="Entrada (opcional)"><input inputMode="decimal" placeholder="10.000,00" value={entrada} onChange={(e) => setEntrada(e.target.value)} /></Field>
            <Field label="IOF financiado (R$)"><input inputMode="decimal" placeholder="1.679,28" value={iof} onChange={(e) => setIof(e.target.value)} /></Field>
            <Field label="Valor FIPE na data do contrato (R$)" help="Opcional. Usa este valor no lugar do FIPE atual."><input inputMode="decimal" placeholder="58.000,00" value={fipeManual} onChange={(e) => setFipeManual(e.target.value)} /></Field>
            <Field label="Taxa média — sobrescrever (% a.m.)" help={ajudaTxt}><input inputMode="decimal" placeholder={manualMod ? "informe a taxa" : "vazio = BACEN"} value={manual} onChange={(e) => setManual(e.target.value)} /></Field>
          </div>

          <div className="sub-sec">Tarifas e encargos questionáveis (opcional)</div>
          <div className="grid">
            <Field label="Tarifa de cadastro (R$)"><input inputMode="decimal" placeholder="1.299,00" value={cadastro} onChange={(e) => setCadastro(e.target.value)} /></Field>
            <Field label="Tarifa de avaliação (R$)"><input inputMode="decimal" placeholder="444,00" value={avaliacao} onChange={(e) => setAvaliacao(e.target.value)} /></Field>
            <Field label="Registro de contrato (R$)"><input inputMode="decimal" placeholder="518,55" value={registro} onChange={(e) => setRegistro(e.target.value)} /></Field>
            <Field label="Seguro vinculado / prêmio (R$)"><input inputMode="decimal" placeholder="480,70" value={seguro} onChange={(e) => setSeguro(e.target.value)} /></Field>
          </div>

          <div className="btn-row"><button className="btn" onClick={calc}>Calcular parecer</button></div>
          {err && <div className="alert err">{err}</div>}
        </div>

        {/* Preview lateral ao vivo */}
        <aside className="preview no-print">
          <div className="preview-title">Prévia</div>
          <div className="prev-row"><span>Valor financiado</span><b>{isFinite(pPV) ? money(pPV) : "—"}</b></div>
          <div className="prev-row"><span>Parcela × nº</span><b>{(isFinite(pParc) && isFinite(pN)) ? `${pN}× ${money(pParc)}` : "—"}</b></div>
          <div className="prev-row total"><span>Total a pagar</span><b>{totalPagar != null ? money(totalPagar) : "—"}</b></div>
          <div className="prev-row"><span>Custo do crédito</span><b>{custoCred != null ? money(custoCred) : "—"}</b></div>
          <div className="prev-row"><span>IOF</span><b>{isFinite(parseNum(iof)) ? money(parseNum(iof)) : "—"}</b></div>
          <div className="prev-row"><span>Tarifas questionáveis</span><b>{tarPrev.subtotal > 0 ? money(tarPrev.subtotal) : "—"}</b></div>
          {isFinite(parseInt(pagas, 10)) && isFinite(pParc) && (
            <div className="prev-row"><span>Já pago ({parseInt(pagas, 10)}×)</span><b>{money(parseInt(pagas, 10) * pParc)}</b></div>
          )}
          <div className="prev-foot">Atualiza enquanto você digita.</div>
        </aside>
      </div>

      {/* ---------- Parecer ---------- */}
      {res && (
        <div className="card result laudo">
          <ExportButton />
          <h3>Parecer — Análise de abusividade ({res.modalidadeNome})</h3>

          {res.avgMonthly != null && <Semaforo taxa={res.iContractMonthly} media={res.avgMonthly} fator={res.fator} />}

          <div className="sub-sec">Indicadores financeiros</div>
          <div className="kpis">
            <KPI big label="Taxa contratada (a.m.)" value={pct(res.iContractMonthly * 100)} />
            <KPI label="Taxa contratada (a.a.)" value={pct(res.iContractAnnual * 100)} />
            {res.avgMonthly != null && <KPI label={`Média BACEN${res.refData ? " (" + res.refData + ")" : ""}`} value={pct(res.avgMonthly * 100) + " a.m."} />}
            {res.avgMonthly != null && <KPI label={`Limiar ${res.fator}× (a.m.)`} value={pct(res.limiteMonthly * 100)} />}
          </div>
          <div className="kpis" style={{ marginTop: 12 }}>
            <KPI label="Total a pagar" value={money(res.totalContract)} />
            <KPI label="Total de juros" value={money(res.jurosTotais)} />
            {res.parcelaJusta != null && <KPI label="Parcela justa (média)" value={money(res.parcelaJusta)} />}
            {res.diffMensal != null && <KPI big label="Pago a mais / mês" value={money(res.diffMensal)} />}
          </div>
          {res.diffTotal != null && (
            <div className="kpis" style={{ marginTop: 12 }}>
              <KPI big label="Cobrado a maior (total do contrato)" value={money(res.diffTotal)} />
            </div>
          )}

          {res.fipe != null && (
            <div className="alert warn">Valor financiado equivale a {pct(res.razaoFinFipe * 100, 0)} do valor FIPE do bem ({formatBRL(res.fipe)}).{res.razaoFinFipe > 1 ? " Acima do valor de mercado — verifique tarifas e venda casada." : ""}</div>
          )}

          {res.tarifas.itens.length > 0 && (
            <>
              <div className="sub-sec">Composição das cobranças — tarifas questionáveis</div>
              <table className="sched">
                <thead><tr><th style={{ textAlign: "left" }}>Item</th><th>Valor</th><th style={{ textAlign: "left" }}>Fundamento (STJ/CDC)</th></tr></thead>
                <tbody>
                  {res.tarifas.itens.map((t, i) => (
                    <tr key={i}><td style={{ textAlign: "left" }}>{t.item}</td><td>{money(t.valor)}</td><td style={{ textAlign: "left", fontSize: 12 }}>{t.fundamento}</td></tr>
                  ))}
                  <tr><td style={{ textAlign: "left" }}><b>Subtotal tarifas questionáveis</b></td><td><b>{money(res.tarifas.subtotal)}</b></td><td></td></tr>
                </tbody>
              </table>
            </>
          )}

          {res.pagas != null && (
            <>
              <div className="sub-sec">Parcelas pagas</div>
              <div className="kpis">
                <KPI label="Parcelas pagas" value={`${res.pagas} de ${parseInt(n, 10)}`} />
                <KPI label="Total já pago" value={money(res.totalPagoAteAgora)} />
                <KPI label="Saldo restante (aprox.)" value={money(res.saldoRestante)} />
              </div>
            </>
          )}

          {res.tabela && (
            <details className="no-print-open">
              <summary style={{ cursor: "pointer", fontWeight: 700, marginTop: 14 }}>Ver tabela parcela a parcela (taxa BACEN por mês · limiar {res.fator}×)</summary>
              <table className="sched">
                <thead><tr><th>#</th><th>Competência</th><th>Parcela paga</th><th>Taxa BACEN (a.m.)</th><th>Limiar {res.fator}×</th><th>Parcela justa</th><th>A maior</th><th>Acumulado</th></tr></thead>
                <tbody>
                  {res.tabela.map((r) => (
                    <tr key={r.n} className={r.paga ? "rowpaga" : ""}>
                      <td>{r.n}</td><td>{r.competencia || "—"}</td><td>{r.paga ? "✓" : ""}</td>
                      <td>{r.taxaMesMensal != null ? pct(r.taxaMesMensal * 100) : "—"}</td>
                      <td>{r.limiarMensal != null ? pct(r.limiarMensal * 100) : "—"}</td>
                      <td>{r.parcelaJusta != null ? money(r.parcelaJusta) : "—"}</td>
                      <td>{r.aMaior != null ? money(r.aMaior) : "—"}</td>
                      <td>{r.acumulado != null ? money(r.acumulado) : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          )}

          {res.avgMonthly != null && (res.abusivo
            ? <span className="badge red">Taxa {(res.iContractMonthly / res.avgMonthly).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}× a média — acima do limiar de {res.fator}× (indício de abusividade, STJ Súmula 382)</span>
            : <span className="badge green">Taxa dentro do limiar de {res.fator}× a média de mercado</span>)}

          <Disclaimer />
        </div>
      )}
    </>
  );
}
