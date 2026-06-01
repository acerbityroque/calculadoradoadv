"use client";

// Editor de linhas {valor, meses} para descontos/parcelas variáveis.
export default function RowsEditor({ rows, setRows, valorLabel = "Valor mensal (R$)" }) {
  function update(i, key, val) {
    const next = rows.map((r, idx) => (idx === i ? { ...r, [key]: val } : r));
    setRows(next);
  }
  function add() { setRows([...rows, { valor: "", meses: "" }]); }
  function remove(i) { setRows(rows.length > 1 ? rows.filter((_, idx) => idx !== i) : rows); }

  return (
    <div>
      <table className="sched" style={{ marginTop: 4 }}>
        <thead>
          <tr><th style={{ textAlign: "left" }}>{valorLabel}</th><th>Nº de meses</th><th></th></tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td style={{ textAlign: "left" }}>
                <input className="rowin" inputMode="decimal" placeholder="50,00" value={r.valor} onChange={(e) => update(i, "valor", e.target.value)} />
              </td>
              <td>
                <input className="rowin" inputMode="numeric" placeholder="12" value={r.meses} onChange={(e) => update(i, "meses", e.target.value)} />
              </td>
              <td><button type="button" className="btn ghost small" onClick={() => remove(i)}>✕</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="btn-row" style={{ marginTop: 10 }}>
        <button type="button" className="btn ghost small" onClick={add}>+ Adicionar período</button>
      </div>
    </div>
  );
}
