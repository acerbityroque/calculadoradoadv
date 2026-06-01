"use client";
import { useEffect, useRef, useState } from "react";

function norm(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Combobox pesquisável: digite para filtrar as opções.
// options: [{ value, label }]
export default function Combobox({ label, options, value, onChange, placeholder = "Digite para buscar…", disabled, loading }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef(null);

  const selected = options.find((o) => String(o.value) === String(value));

  useEffect(() => {
    function onDoc(e) { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const q = norm(query);
  const filtered = q ? options.filter((o) => norm(o.label).includes(q)) : options;
  const shown = filtered.slice(0, 60);

  return (
    <div className="field" ref={boxRef}>
      <label>{label}</label>
      <div className="combo">
        <input
          type="text"
          className="combo-input"
          disabled={disabled}
          placeholder={loading ? "carregando…" : placeholder}
          value={open ? query : (selected ? selected.label : "")}
          onFocusCapture={() => { if (!disabled) { setOpen(true); setQuery(""); } }}
          onClick={() => { if (!disabled) { setOpen(true); setQuery(""); } }}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        />
        <span className="combo-caret">▾</span>
        {open && !disabled && (
          <div className="combo-list">
            {shown.length === 0 && <div className="combo-empty">Nenhum resultado</div>}
            {shown.map((o) => (
              <div
                key={o.value}
                className={"combo-opt" + (String(o.value) === String(value) ? " sel" : "")}
                onMouseDown={(e) => { e.preventDefault(); onChange(String(o.value)); setOpen(false); setQuery(""); }}
              >
                {o.label}
              </div>
            ))}
            {filtered.length > shown.length && <div className="combo-empty">…refine a busca ({filtered.length} resultados)</div>}
          </div>
        )}
      </div>
    </div>
  );
}
