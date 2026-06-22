import { useState, useMemo } from "react";

const HORA_PRECIO = 3500;
const HORAS = Array.from({ length: 14 }, (_, i) => i + 8);
const CONSULTORIOS = ["Consultorio 1", "Consultorio 2", "Consultorio 3"];
const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const COLORES_PROF = [
  { bg: "linear-gradient(135deg,#667eea,#764ba2)", solid: "#764ba2", light: "#ede9fe", text: "#5b21b6" },
  { bg: "linear-gradient(135deg,#f093fb,#f5576c)", solid: "#f5576c", light: "#ffe4e6", text: "#be123c" },
  { bg: "linear-gradient(135deg,#4facfe,#00f2fe)", solid: "#00b4d8", light: "#e0f7fa", text: "#0077b6" },
  { bg: "linear-gradient(135deg,#43e97b,#38f9d7)", solid: "#38b2ac", light: "#e6fffa", text: "#2c7a7b" },
  { bg: "linear-gradient(135deg,#fa709a,#fee140)", solid: "#f59e0b", light: "#fef3c7", text: "#92400e" },
  { bg: "linear-gradient(135deg,#a18cd1,#fbc2eb)", solid: "#a78bfa", light: "#f5f3ff", text: "#6d28d9" },
  { bg: "linear-gradient(135deg,#fda085,#f6d365)", solid: "#f97316", light: "#fff7ed", text: "#c2410c" },
  { bg: "linear-gradient(135deg,#96fbc4,#f9f586)", solid: "#84cc16", light: "#f7fee7", text: "#3f6212" },
];

function getWeekDates(offset = 0) {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function dateKey(date) { return date.toISOString().slice(0, 10); }
function formatCurrency(n) { return "$" + n.toLocaleString("es-AR"); }

function calcularPagosProfesional(reservas, profesional, mesStr) {
  let totalMes = 0;
  const detalle = [];
  reservas.filter(r => r.profesional === profesional).forEach(r => {
    const horas = r.horaFin - r.horaInicio;
    const montoBloque = horas * HORA_PRECIO;
    if (r.repeteSemanal) {
      const year = parseInt(mesStr.slice(0, 4));
      const month = parseInt(mesStr.slice(5, 7)) - 1;
      const diasEnMes = new Date(year, month + 1, 0).getDate();
      const fechaOrig = new Date(r.fecha + "T12:00:00");
      let ocurrencias = 0;
      for (let d = 1; d <= diasEnMes; d++) {
        const dia = new Date(year, month, d);
        if (dia.getDay() === fechaOrig.getDay() && dia >= fechaOrig) ocurrencias++;
      }
      const montoMes = ocurrencias * montoBloque;
      totalMes += montoMes;
      detalle.push({ ...r, horas, montoBloque, ocurrenciasMes: ocurrencias, montoMes, tipo: "Semanal" });
    } else {
      if (r.fecha.startsWith(mesStr)) totalMes += montoBloque;
      detalle.push({ ...r, horas, montoBloque, montoMes: r.fecha.startsWith(mesStr) ? montoBloque : 0, tipo: "Única vez" });
    }
  });
  return { totalMes, detalle };
}

function exportarCSV(profesionales, reservas, mesStr) {
  const rows = ["Profesional,Consultorio,Día,Horario,Tipo,Horas,Ocurrencias mes,Monto mes"];
  profesionales.forEach(prof => {
    const { detalle } = calcularPagosProfesional(reservas, prof, mesStr);
    detalle.forEach(d => {
      const dia = new Date(d.fecha + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long" });
      rows.push([prof, d.consultorio, `${dia} ${d.fecha}`, `${d.horaInicio}:00-${d.horaFin}:00`, d.tipo, d.horas, d.tipo === "Semanal" ? d.ocurrenciasMes : 1, d.montoMes].join(","));
    });
    const { totalMes } = calcularPagosProfesional(reservas, prof, mesStr);
    rows.push([prof, "", "", "", "TOTAL", "", "", totalMes].join(","));
    rows.push("");
  });
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `pagos_consultorios_${mesStr}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export default function TabReservas({ usuario, esAdmin, esPublico, t, reservas, agregarReserva, actualizarReserva, eliminarReserva, showToast, onLogin }) {
  const [subVista, setSubVista] = useState("agenda");
  const [weekOffset, setWeekOffset] = useState(0);
  const [mesOffset, setMesOffset] = useState(0);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ profesional: "", horaInicio: 8, horaFin: 9, repeteSemanal: false });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [errorSolapamiento, setErrorSolapamiento] = useState("");

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const mesStr = useMemo(() => { const d = new Date(); d.setMonth(d.getMonth() + mesOffset); return d.toISOString().slice(0, 7); }, [mesOffset]);
  const mesLabel = useMemo(() => { const [y, m] = mesStr.split("-"); return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" }); }, [mesStr]);

  const colorMap = useMemo(() => {
    const map = {}; let idx = 0;
    reservas.forEach(r => { if (r.profesional && !map[r.profesional]) { map[r.profesional] = COLORES_PROF[idx % COLORES_PROF.length]; idx++; } });
    return map;
  }, [reservas]);

  const profesionales = useMemo(() => {
    if (esAdmin) return Object.keys(colorMap);
    if (usuario?.nombre) return [usuario.nombre];
    return [];
  }, [colorMap, esAdmin, usuario]);

  function hayConflicto(consultorio, fecha, horaInicio, horaFin, excludeId = null) {
    const key = dateKey(fecha); const diaSemana = fecha.getDay();
    return reservas.some(r => {
      if (r.id === excludeId) return false;
      if (r.consultorio !== consultorio) return false;
      const coincideFecha = r.fecha === key || (r.repeteSemanal && new Date(r.fecha + "T12:00:00").getDay() === diaSemana && new Date(r.fecha + "T12:00:00") <= fecha);
      if (!coincideFecha) return false;
      return horaInicio < r.horaFin && horaFin > r.horaInicio;
    });
  }

  function puedeEditar(r) {
    if (esAdmin) return true;
    return r.profesional === usuario?.nombre;
  }

  function openCrear(consultorio, fecha, hora) {
    if (esPublico) { onLogin(); return; }
    setErrorSolapamiento("");
    setModal({ mode: "crear", consultorio, fecha });
    setForm({ profesional: esAdmin ? "" : usuario?.nombre, horaInicio: hora, horaFin: hora + 1, repeteSemanal: false });
  }

  function openEditar(r) {
    if (!puedeEditar(r)) return;
    setErrorSolapamiento("");
    setModal({ mode: "editar", consultorio: r.consultorio, fecha: new Date(r.fecha + "T12:00:00"), reservaId: r.id });
    setForm({ profesional: r.profesional, horaInicio: r.horaInicio, horaFin: r.horaFin, repeteSemanal: r.repeteSemanal });
  }

  function closeModal() { setModal(null); setErrorSolapamiento(""); }

  async function guardarReserva() {
    if (!form.profesional.trim() || form.horaFin <= form.horaInicio) return;
    const conflicto = hayConflicto(modal.consultorio, modal.fecha, parseInt(form.horaInicio), parseInt(form.horaFin), modal.reservaId);
    if (conflicto) { setErrorSolapamiento("⚠️ Ese horario ya está ocupado. Elegí otro."); return; }
    const datos = { profesional: form.profesional.trim(), consultorio: modal.consultorio, fecha: dateKey(modal.fecha), horaInicio: parseInt(form.horaInicio), horaFin: parseInt(form.horaFin), repeteSemanal: form.repeteSemanal, creadoPor: usuario?.email };
    if (modal.mode === "crear") { await agregarReserva(datos); showToast("Reserva guardada ✓"); }
    else { await actualizarReserva(modal.reservaId, datos); showToast("Reserva actualizada ✓"); }
    closeModal();
  }

  async function borrarReserva(id) { await eliminarReserva(id); setConfirmDelete(null); showToast("Reserva eliminada", "warn"); }

  function getReservasParaCelda(consultorio, fecha, hora) {
    const key = dateKey(fecha); const diaSemana = fecha.getDay();
    return reservas.filter(r => {
      if (r.consultorio !== consultorio || hora < r.horaInicio || hora >= r.horaFin) return false;
      if (r.fecha === key) return true;
      if (r.repeteSemanal) { const orig = new Date(r.fecha + "T12:00:00"); return orig.getDay() === diaSemana && orig <= fecha; }
      return false;
    });
  }

  const todayKey = dateKey(new Date());
  const horasRange = Array.from({ length: 14 }, (_, i) => i + 8);
  const thStyle = { padding: "7px 4px", background: t.bgElevated, color: t.textoSuave, fontSize: 11, fontWeight: 700, borderBottom: `1px solid ${t.borde}`, textAlign: "center" };
  const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${t.borde}`, fontSize: 13, marginBottom: 14, boxSizing: "border-box", outline: "none", background: t.bgElevated, color: t.texto };
  const labelStyle = { display: "block", fontSize: 11, fontWeight: 700, color: t.textoSuave, marginBottom: 4, textTransform: "uppercase", letterSpacing: .5 };

  return (
    <div className="tab-content" style={{ minHeight: "100vh", background: t.bg }}>

      {/* HEADER */}
      <div style={{ padding: "56px 20px 0", background: t.header }}>
        <img src="/IMG_0050.jpeg" alt="GRINS" style={{ height: 28, objectFit: "contain", marginBottom: 16, opacity: 0.8 }} />

        {/* SUB-TABS */}
        <div style={{ display: "flex", gap: 6, marginBottom: 0, background: t.bgCard, borderRadius: 14, padding: 4, border: `1px solid ${t.borde}` }}>
          {[["agenda", "Por consultorio"], ["unificado", "Vista general"], ["pagos", "Pagos"]].map(([v, label]) => (
            (!esPublico || v !== "pagos") && (
              <button key={v} onClick={() => setSubVista(v)} style={{
                flex: 1, padding: "8px 6px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 11,
                background: subVista === v ? "linear-gradient(135deg,#667eea,#764ba2)" : "transparent",
                color: subVista === v ? "white" : t.textoSuave, transition: "all 0.2s"
              }}>{label}</button>
            )
          ))}
        </div>
      </div>

      {/* NAV SEMANA */}
      {(subVista === "agenda" || subVista === "unificado") && (
        <div style={{ padding: "14px 16px 0", display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => setWeekOffset(w => w - 1)} style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${t.borde}`, background: t.bgCard, cursor: "pointer", color: t.texto, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
          <span style={{ flex: 1, textAlign: "center", fontWeight: 700, fontSize: 12, color: t.textoSuave }}>
            {weekDates[0].toLocaleDateString("es-AR", { day: "numeric", month: "short" })} – {weekDates[5].toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
          </span>
          <button onClick={() => setWeekOffset(w => w + 1)} style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${t.borde}`, background: t.bgCard, cursor: "pointer", color: t.texto, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
          <button onClick={() => setWeekOffset(0)} style={{ padding: "0 12px", height: 34, borderRadius: 10, border: `1px solid ${t.borde}`, background: t.bgCard, cursor: "pointer", color: t.textoSuave, fontSize: 11, fontWeight: 600 }}>Hoy</button>
        </div>
      )}

      <div style={{ padding: "12px 12px 100px" }}>

        {/* AGENDA */}
        {subVista === "agenda" && CONSULTORIOS.map(consultorio => (
          <div key={consultorio} style={{ background: t.bgCard, borderRadius: 16, marginBottom: 16, overflow: "hidden", border: `1px solid ${t.borde}` }}>
            <div style={{ background: "#000", color: "white", padding: "10px 14px", fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M3 9h6M3 15h6"/></svg>
              {consultorio}
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, width: 40 }}>Hora</th>
                    {weekDates.map((fecha, idx) => {
                      const isToday = dateKey(fecha) === todayKey;
                      return <th key={dateKey(fecha)} style={{ ...thStyle, background: isToday ? t.hoy : t.bgElevated, color: isToday ? t.hoyTexto : t.textoSuave, borderLeft: `1px solid ${t.borde}` }}>
                        <div style={{ fontSize: 9 }}>{DIAS_SEMANA[fecha.getDay()]}</div>
                        <div style={{ fontWeight: 800, fontSize: 13 }}>{fecha.getDate()}</div>
                      </th>;
                    })}
                  </tr>
                </thead>
                <tbody>
                  {HORAS.map(hora => (
                    <tr key={hora}>
                      <td style={{ padding: "2px 4px", textAlign: "center", fontSize: 9, color: t.textoMuy, borderRight: `1px solid ${t.bordeTabla}`, borderBottom: `1px solid ${t.bordeTabla}`, background: t.bgElevated }}>{hora}:00</td>
                      {weekDates.map(fecha => {
                        const isToday = dateKey(fecha) === todayKey;
                        const ocupadas = getReservasParaCelda(consultorio, fecha, hora);
                        const libre = ocupadas.length === 0;
                        return (
                          <td key={dateKey(fecha)} onClick={() => libre && openCrear(consultorio, fecha, hora)}
                            style={{ padding: 2, borderBottom: `1px solid ${t.bordeTabla}`, borderLeft: `1px solid ${t.bordeTabla}`, verticalAlign: "top", minWidth: 64, cursor: libre && !esPublico ? "pointer" : "default", background: libre ? (isToday ? t.hoy : t.bgCard) : undefined }}>
                            {ocupadas.map(r => {
                              const col = colorMap[r.profesional] || COLORES_PROF[0];
                              const esInicio = hora === r.horaInicio;
                              const puedeMod = puedeEditar(r);
                              return (
                                <div key={r.id} style={{ background: col.bg, color: "white", borderRadius: esInicio ? "5px 5px 3px 3px" : "2px", padding: esInicio ? "3px 4px" : "1px 4px", fontSize: 9, fontWeight: 700, marginBottom: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  {esInicio ? <>
                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 44 }}>{r.profesional}</span>
                                    {puedeMod && !esPublico && <span style={{ display: "flex", gap: 1 }}>
                                      <button onClick={e => { e.stopPropagation(); openEditar(r); }} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", cursor: "pointer", borderRadius: 2, padding: "0 2px", fontSize: 8, lineHeight: "12px" }}>✎</button>
                                      <button onClick={e => { e.stopPropagation(); setConfirmDelete(r.id); }} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", cursor: "pointer", borderRadius: 2, padding: "0 2px", fontSize: 8, lineHeight: "12px" }}>✕</button>
                                    </span>}
                                  </> : <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 7 }}>│</span>}
                                </div>
                              );
                            })}
                            {libre && !esPublico && <div style={{ color: t.textoMuy, fontSize: 8, textAlign: "center", paddingTop: 4 }}>+</div>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* UNIFICADO */}
        {subVista === "unificado" && (
          <div style={{ background: t.bgCard, borderRadius: 16, overflow: "hidden", border: `1px solid ${t.borde}` }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, width: 40 }}>Hora</th>
                    {weekDates.map(fecha => { const isToday = dateKey(fecha) === todayKey; return <th key={dateKey(fecha)} colSpan={3} style={{ ...thStyle, background: isToday ? t.hoy : t.bgElevated, color: isToday ? t.hoyTexto : t.textoSuave, borderLeft: `2px solid ${t.borde}` }}><div style={{ fontSize: 9 }}>{DIAS_SEMANA[fecha.getDay()]}</div><div style={{ fontWeight: 800, fontSize: 13 }}>{fecha.getDate()}</div></th>; })}
                  </tr>
                  <tr>
                    <th style={{ ...thStyle }}></th>
                    {weekDates.map(fecha => CONSULTORIOS.map((c, i) => (
                      <th key={`${dateKey(fecha)}-${c}`} style={{ ...thStyle, fontSize: 8, color: t.textoMuy, borderLeft: i === 0 ? `2px solid ${t.borde}` : `1px solid ${t.bordeTabla}`, padding: "2px 1px" }}>C{i + 1}</th>
                    )))}
                  </tr>
                </thead>
                <tbody>
                  {HORAS.map(hora => (
                    <tr key={hora}>
                      <td style={{ padding: "2px 4px", textAlign: "center", fontSize: 9, color: t.textoMuy, borderRight: `1px solid ${t.bordeTabla}`, borderBottom: `1px solid ${t.bordeTabla}`, background: t.bgElevated }}>{hora}:00</td>
                      {weekDates.map(fecha => CONSULTORIOS.map((consultorio, i) => {
                        const isToday = dateKey(fecha) === todayKey;
                        const ocupadas = getReservasParaCelda(consultorio, fecha, hora);
                        const libre = ocupadas.length === 0;
                        return (
                          <td key={`${dateKey(fecha)}-${consultorio}`} onClick={() => libre && openCrear(consultorio, fecha, hora)}
                            style={{ padding: 1, borderBottom: `1px solid ${t.bordeTabla}`, borderLeft: i === 0 ? `2px solid ${t.borde}` : `1px solid ${t.bordeTabla}`, verticalAlign: "top", minWidth: 40, cursor: libre && !esPublico ? "pointer" : "default", background: libre ? (isToday ? t.hoy : t.bgCard) : undefined }}>
                            {ocupadas.map(r => { const col = colorMap[r.profesional] || COLORES_PROF[0]; const esInicio = hora === r.horaInicio; return (
                              <div key={r.id} style={{ background: col.bg, color: "white", borderRadius: 2, padding: "1px 2px", fontSize: 8, fontWeight: 700, marginBottom: 1 }}>
                                {esInicio ? <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", maxWidth: 36 }}>{r.profesional}</span> : <span style={{ color: "rgba(255,255,255,0.3)" }}>│</span>}
                              </div>
                            ); })}
                            {libre && <div style={{ color: t.bordeTabla, fontSize: 7, textAlign: "center", paddingTop: 3 }}>·</div>}
                          </td>
                        );
                      }))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: "8px 14px", borderTop: `1px solid ${t.borde}` }}>
              <span style={{ fontSize: 10, color: t.textoMuy }}>C1 = Consultorio 1 · C2 = Consultorio 2 · C3 = Consultorio 3</span>
            </div>
          </div>
        )}

        {/* PAGOS */}
        {subVista === "pagos" && !esPublico && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <button onClick={() => setMesOffset(m => m - 1)} style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${t.borde}`, background: t.bgCard, cursor: "pointer", color: t.texto, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
              <span style={{ flex: 1, textAlign: "center", fontWeight: 700, fontSize: 13, color: t.texto, textTransform: "capitalize" }}>{mesLabel}</span>
              <button onClick={() => setMesOffset(m => m + 1)} style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${t.borde}`, background: t.bgCard, cursor: "pointer", color: t.texto, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
              <button onClick={() => setMesOffset(0)} style={{ padding: "0 12px", height: 34, borderRadius: 10, border: `1px solid ${t.borde}`, background: t.bgCard, cursor: "pointer", color: t.textoSuave, fontSize: 11, fontWeight: 600 }}>Hoy</button>
              {esAdmin && <button onClick={() => exportarCSV(profesionales, reservas, mesStr)} style={{ padding: "0 12px", height: 34, borderRadius: 10, border: "none", background: t.acento, color: "white", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>⬇ CSV</button>}
            </div>
            {esAdmin && profesionales.length > 0 && (() => { const totalGlobal = profesionales.reduce((acc, p) => acc + calcularPagosProfesional(reservas, p, mesStr).totalMes, 0); return <div style={{ background: "#000", borderRadius: 14, padding: "14px 18px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", border: `1px solid ${t.borde}` }}><span style={{ color: t.textoSuave, fontWeight: 700, fontSize: 12 }}>Total {mesLabel}</span><span style={{ color: "white", fontWeight: 900, fontSize: 20 }}>{formatCurrency(totalGlobal)}</span></div>; })()}
            {profesionales.map(prof => {
              const { totalMes, detalle } = calcularPagosProfesional(reservas, prof, mesStr);
              const col = colorMap[prof] || COLORES_PROF[0];
              return (
                <div key={prof} style={{ background: t.bgCard, borderRadius: 14, marginBottom: 12, overflow: "hidden", border: `1px solid ${t.borde}` }}>
                  <div style={{ background: col.bg, padding: "11px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "white", fontWeight: 800, fontSize: 14 }}>👤 {prof}</span>
                    <span style={{ color: "white", fontWeight: 900, fontSize: 18 }}>{formatCurrency(totalMes)}</span>
                  </div>
                  {detalle.length === 0 ? <p style={{ padding: "12px 16px", color: t.textoMuy, fontSize: 12, margin: 0 }}>Sin reservas este mes.</p> : (
                    <div style={{ padding: 10 }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                        <thead><tr style={{ color: t.textoMuy }}>{["Consultorio","Fecha","Horario","Tipo","Horas","Monto"].map(h => <th key={h} style={{ textAlign: h === "Monto" || h === "Horas" ? "right" : "left", padding: "4px 6px", fontWeight: 600 }}>{h}</th>)}</tr></thead>
                        <tbody>
                          {detalle.map(d => (
                            <tr key={d.id} style={{ borderTop: `1px solid ${t.borde}` }}>
                              <td style={{ padding: "5px 6px", color: t.texto }}>{d.consultorio}</td>
                              <td style={{ padding: "5px 6px", color: t.textoSuave }}>{new Date(d.fecha + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })}</td>
                              <td style={{ padding: "5px 6px", color: t.texto }}>{d.horaInicio}:00–{d.horaFin}:00</td>
                              <td style={{ padding: "5px 6px" }}><span style={{ background: t.acentoSuave, color: t.acento, borderRadius: 4, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>{d.tipo}</span></td>
                              <td style={{ padding: "5px 6px", textAlign: "right", color: t.textoSuave }}>{d.horas}h{d.tipo === "Semanal" ? ` × ${d.ocurrenciasMes}` : ""}</td>
                              <td style={{ padding: "5px 6px", textAlign: "right", fontWeight: 800, color: t.texto }}>{formatCurrency(d.montoMes)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div style={{ borderTop: `1px solid ${t.borde}`, marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 11, color: t.textoMuy }}>${HORA_PRECIO.toLocaleString("es-AR")}/hora</span>
                        <span style={{ fontWeight: 900, color: t.texto, fontSize: 13 }}>Total: {formatCurrency(totalMes)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL CREAR/EDITAR */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 2000, padding: "0 0 0 0" }}>
          <div style={{ background: t.bgCard, borderRadius: "24px 24px 0 0", padding: "20px 20px 40px", width: "100%", maxWidth: 500, boxShadow: "0 -8px 40px rgba(0,0,0,0.6)", animation: "slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: t.borde, margin: "0 auto 16px" }} />
            <h3 style={{ margin: "0 0 3px", fontSize: 17, fontWeight: 800, color: t.texto }}>{modal.mode === "crear" ? "Nueva reserva" : "Editar reserva"}</h3>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: t.textoSuave }}>{modal.consultorio} · {modal.fecha.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}</p>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: t.textoSuave, marginBottom: 4, textTransform: "uppercase" }}>Profesional</label>
            {esAdmin
              ? <input list="prof-list" value={form.profesional} onChange={e => setForm(f => ({ ...f, profesional: e.target.value }))} placeholder="Nombre del/la profesional" style={inputStyle} />
              : <div style={{ ...inputStyle, color: t.textoSuave, cursor: "not-allowed" }}>{form.profesional}</div>
            }
            <datalist id="prof-list">{Object.keys(colorMap).map(p => <option key={p} value={p} />)}</datalist>
            {modal.mode === "editar" && esAdmin && (
              <><label style={labelStyle}>Consultorio</label>
              <select value={modal.consultorio} onChange={e => setModal(m => ({ ...m, consultorio: e.target.value }))} style={inputStyle}>
                {CONSULTORIOS.map(c => <option key={c} value={c}>{c}</option>)}
              </select></>
            )}
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Desde</label>
                <select value={form.horaInicio} onChange={e => { setForm(f => ({ ...f, horaInicio: parseInt(e.target.value), horaFin: Math.max(parseInt(e.target.value) + 1, f.horaFin) })); setErrorSolapamiento(""); }} style={inputStyle}>
                  {horasRange.slice(0, -1).map(h => <option key={h} value={h}>{h}:00</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Hasta</label>
                <select value={form.horaFin} onChange={e => { setForm(f => ({ ...f, horaFin: parseInt(e.target.value) })); setErrorSolapamiento(""); }} style={inputStyle}>
                  {horasRange.filter(h => h > form.horaInicio).map(h => <option key={h} value={h}>{h}:00</option>)}
                </select>
              </div>
            </div>
            <div style={{ background: t.bgElevated, borderRadius: 10, padding: "10px 14px", marginBottom: 14, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: t.textoSuave }}>{form.horaFin - form.horaInicio} hora(s) × ${HORA_PRECIO.toLocaleString("es-AR")}</span>
              <span style={{ fontWeight: 800, color: t.texto }}>${((form.horaFin - form.horaInicio) * HORA_PRECIO).toLocaleString("es-AR")}</span>
            </div>
            {errorSolapamiento && <div style={{ background: "#2d1010", border: "1px solid #fc8181", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "#fc8181", fontWeight: 600 }}>{errorSolapamiento}</div>}
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 18 }}>
              <input type="checkbox" checked={form.repeteSemanal} onChange={e => setForm(f => ({ ...f, repeteSemanal: e.target.checked }))} style={{ width: 16, height: 16 }} />
              <span style={{ fontSize: 13, color: t.texto }}>Repetir semanalmente</span>
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={closeModal} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${t.borde}`, background: "transparent", cursor: "pointer", fontSize: 13, color: t.textoSuave, fontWeight: 600 }}>Cancelar</button>
              <button onClick={guardarReserva} disabled={!form.profesional.trim()} style={{ flex: 2, padding: 12, borderRadius: 12, border: "none", fontWeight: 800, fontSize: 13, cursor: form.profesional.trim() ? "pointer" : "not-allowed", color: "white", background: form.profesional.trim() ? "linear-gradient(135deg,#667eea,#764ba2)" : "#2d2d3a" }}>
                {modal.mode === "crear" ? "Guardar reserva" : "Actualizar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ELIMINAR */}
      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 2000 }}>
          <div style={{ background: t.bgCard, borderRadius: "24px 24px 0 0", padding: "20px 20px 40px", width: "100%", maxWidth: 500, textAlign: "center" }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: t.borde, margin: "0 auto 16px" }} />
            <div style={{ fontSize: 36, marginBottom: 10 }}>🗑️</div>
            <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 800, color: t.texto }}>¿Eliminar esta reserva?</h3>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: t.textoSuave }}>Esta acción no se puede deshacer.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${t.borde}`, background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 600, color: t.textoSuave }}>Cancelar</button>
              <button onClick={() => borrarReserva(confirmDelete)} style={{ flex: 1, padding: 12, borderRadius: 12, border: "none", background: "#ef4444", color: "white", cursor: "pointer", fontSize: 13, fontWeight: 800 }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: none; opacity: 1; } }`}</style>
    </div>
  );
}
