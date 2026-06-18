import { useState, useMemo, useEffect, useCallback } from "react";
import { agregarReserva, actualizarReserva, eliminarReserva, suscribirReservas } from "./firebase";

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

export default function App() {
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [vista, setVista] = useState("agenda");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ profesional: "", horaInicio: 8, horaFin: 9, repeteSemanal: false });
  const [mesOffset, setMesOffset] = useState(0);
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    const unsub = suscribirReservas(data => {
      setReservas(data);
      setCargando(false);
    });
    return () => unsub();
  }, []);

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const mesStr = useMemo(() => { const d = new Date(); d.setMonth(d.getMonth() + mesOffset); return d.toISOString().slice(0, 7); }, [mesOffset]);
  const mesLabel = useMemo(() => { const [y, m] = mesStr.split("-"); return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" }); }, [mesStr]);
  const colorMap = useMemo(() => { const map = {}; let idx = 0; reservas.forEach(r => { if (r.profesional && !map[r.profesional]) { map[r.profesional] = COLORES_PROF[idx % COLORES_PROF.length]; idx++; } }); return map; }, [reservas]);
  const profesionales = useMemo(() => Object.keys(colorMap), [colorMap]);

  const showToast = useCallback((msg, tipo = "ok") => { setToast({ msg, tipo }); setTimeout(() => setToast(null), 2800); }, []);

  function openCrear(consultorio, fecha, hora) { setModal({ mode: "crear", consultorio, fecha }); setForm({ profesional: "", horaInicio: hora, horaFin: hora + 1, repeteSemanal: false }); }
  function openEditar(r) { setModal({ mode: "editar", consultorio: r.consultorio, fecha: new Date(r.fecha + "T12:00:00"), reservaId: r.id }); setForm({ profesional: r.profesional, horaInicio: r.horaInicio, horaFin: r.horaFin, repeteSemanal: r.repeteSemanal }); }
  function closeModal() { setModal(null); }

  async function guardarReserva() {
    if (!form.profesional.trim() || form.horaFin <= form.horaInicio) return;
    const datos = { profesional: form.profesional.trim(), consultorio: modal.consultorio, fecha: dateKey(modal.fecha), horaInicio: parseInt(form.horaInicio), horaFin: parseInt(form.horaFin), repeteSemanal: form.repeteSemanal };
    if (modal.mode === "crear") {
      await agregarReserva(datos);
      showToast("Reserva guardada ✓");
    } else {
      await actualizarReserva(modal.reservaId, datos);
      showToast("Reserva actualizada ✓");
    }
    closeModal();
  }

  async function borrarReserva(id) {
    await eliminarReserva(id);
    setConfirmDelete(null);
    showToast("Reserva eliminada", "warn");
  }

  function getReservasParaCelda(consultorio, fecha, hora) {
    const key = dateKey(fecha); const diaSemana = fecha.getDay();
    return reservas.filter(r => {
      if (r.consultorio !== consultorio || hora < r.horaInicio || hora >= r.horaFin) return false;
      if (r.fecha === key) return true;
      if (r.repeteSemanal) { const orig = new Date(r.fecha + "T12:00:00"); return orig.getDay() === diaSemana && orig <= fecha; }
      return false;
    });
  }

  const horasRange = Array.from({ length: 14 }, (_, i) => i + 8);
  const todayKey = dateKey(new Date());
  const navBtn = { padding: "6px 13px", borderRadius: 8, border: "1px solid #cbd5e0", background: "white", cursor: "pointer", fontWeight: 800, fontSize: 15, color: "#4a5568" };
  const thStyle = { padding: "7px 4px", background: "#f7fafc", color: "#4a5568", fontSize: 11, fontWeight: 700, borderBottom: "1px solid #e2e8f0", textAlign: "center" };
  const labelStyle = { display: "block", fontSize: 11, fontWeight: 700, color: "#4a5568", marginBottom: 4, textTransform: "uppercase", letterSpacing: .5 };
  const inputStyle = { width: "100%", padding: "9px 11px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, marginBottom: 14, boxSizing: "border-box", outline: "none" };

  if (cargando) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#000", flexDirection: "column", gap: 16 }}>
      <img src="/IMG_0050.jpeg" alt="GRINS" style={{ height: 60, objectFit: "contain", marginBottom: 8 }} />
      <div style={{ width: 40, height: 40, border: "3px solid #333", borderTop: "3px solid white", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", minHeight: "100vh", background: "#f0f4f8", color: "#1a202c", position: "relative" }}>
      {toast && <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999, background: toast.tipo === "warn" ? "#744210" : "#1a4731", color: "white", padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,0.25)" }}>{toast.msg}</div>}

      <div style={{ background: "#000000", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <img src="/IMG_0050.jpeg" alt="GRINS Consultorios" style={{ height: 52, objectFit: "contain" }} />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[["agenda", "📅 Agenda"], ["unificado", "🗓 Vista general"], ["pagos", "💰 Pagos"]].map(([v, label]) => (
            <button key={v} onClick={() => setVista(v)} style={{ padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 11, background: vista === v ? "#4299e1" : "rgba(255,255,255,0.15)", color: "white" }}>{label}</button>
          ))}
        </div>
      </div>

      {profesionales.length > 0 && (
        <div style={{ background: "white", borderBottom: "1px solid #e2e8f0", padding: "8px 16px", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#a0aec0", fontWeight: 600 }}>PROFESIONALES:</span>
          {profesionales.map(p => { const col = colorMap[p]; return <span key={p} style={{ background: col.light, color: col.text, border: `1px solid ${col.solid}`, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{p}</span>; })}
        </div>
      )}

      {vista === "agenda" && (
        <div style={{ padding: "16px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <button onClick={() => setWeekOffset(w => w - 1)} style={navBtn}>‹</button>
            <span style={{ fontWeight: 700, fontSize: 13, color: "#4a5568", minWidth: 180, textAlign: "center" }}>{weekDates[0].toLocaleDateString("es-AR", { day: "numeric", month: "short" })} – {weekDates[5].toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}</span>
            <button onClick={() => setWeekOffset(w => w + 1)} style={navBtn}>›</button>
            <button onClick={() => setWeekOffset(0)} style={{ ...navBtn, fontSize: 11, padding: "5px 10px", color: "#718096" }}>Hoy</button>
          </div>
          {CONSULTORIOS.map(consultorio => (
            <div key={consultorio} style={{ background: "white", borderRadius: 12, marginBottom: 18, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
              <div style={{ background: "#000", color: "white", padding: "9px 14px", fontWeight: 800, fontSize: 13 }}>🏢 {consultorio}</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 540 }}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, width: 44 }}>Hora</th>
                      {weekDates.map(fecha => { const isToday = dateKey(fecha) === todayKey; return <th key={dateKey(fecha)} style={{ ...thStyle, background: isToday ? "#ebf8ff" : "#f7fafc", color: isToday ? "#2b6cb0" : "#4a5568" }}><div style={{ fontSize: 10 }}>{DIAS_SEMANA[fecha.getDay()]}</div><div style={{ fontWeight: 800, fontSize: 14 }}>{fecha.getDate()}</div></th>; })}
                    </tr>
                  </thead>
                  <tbody>
                    {HORAS.map(hora => (
                      <tr key={hora}>
                        <td style={{ padding: "3px 4px", textAlign: "center", fontSize: 10, color: "#a0aec0", borderRight: "1px solid #edf2f7", borderBottom: "1px solid #edf2f7", background: "#f7fafc" }}>{hora}:00</td>
                        {weekDates.map(fecha => {
                          const isToday = dateKey(fecha) === todayKey;
                          const ocupadas = getReservasParaCelda(consultorio, fecha, hora);
                          const libre = ocupadas.length === 0;
                          return (
                            <td key={dateKey(fecha)} onClick={() => libre && openCrear(consultorio, fecha, hora)} style={{ padding: 2, borderBottom: "1px solid #edf2f7", borderRight: "1px solid #edf2f7", verticalAlign: "top", minWidth: 72, cursor: libre ? "pointer" : "default", background: isToday && libre ? "#f0f9ff" : libre ? "white" : undefined }}>
                              {ocupadas.map(r => { const col = colorMap[r.profesional] || COLORES_PROF[0]; const esInicio = hora === r.horaInicio; return (
                                <div key={r.id} style={{ background: col.bg, color: "white", borderRadius: esInicio ? "5px 5px 3px 3px" : "3px", padding: esInicio ? "3px 5px 2px" : "1px 5px", fontSize: 10, fontWeight: 700, marginBottom: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  {esInicio ? <><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 55 }}>{r.profesional}</span><span style={{ display: "flex", gap: 2 }}><button onClick={e => { e.stopPropagation(); openEditar(r); }} style={{ background: "rgba(255,255,255,0.25)", border: "none", color: "white", cursor: "pointer", borderRadius: 3, padding: "0 3px", fontSize: 9, lineHeight: "14px" }}>✎</button><button onClick={e => { e.stopPropagation(); setConfirmDelete(r.id); }} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", cursor: "pointer", borderRadius: 3, padding: "0 3px", fontSize: 9, lineHeight: "14px" }}>✕</button></span></> : <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 8 }}>│</span>}
                                </div>
                              ); })}
                              {libre && <div style={{ color: "#dde8f0", fontSize: 9, textAlign: "center", paddingTop: 5 }}>+</div>}
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
        </div>
      )}

      {vista === "unificado" && (
        <div style={{ padding: "16px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <button onClick={() => setWeekOffset(w => w - 1)} style={navBtn}>‹</button>
            <span style={{ fontWeight: 700, fontSize: 13, color: "#4a5568", minWidth: 180, textAlign: "center" }}>{weekDates[0].toLocaleDateString("es-AR", { day: "numeric", month: "short" })} – {weekDates[5].toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}</span>
            <button onClick={() => setWeekOffset(w => w + 1)} style={navBtn}>›</button>
            <button onClick={() => setWeekOffset(0)} style={{ ...navBtn, fontSize: 11, padding: "5px 10px", color: "#718096" }}>Hoy</button>
          </div>
          <div style={{ background: "white", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, width: 44 }}>Hora</th>
                    {weekDates.map(fecha => { const isToday = dateKey(fecha) === todayKey; return <th key={dateKey(fecha)} colSpan={3} style={{ ...thStyle, background: isToday ? "#ebf8ff" : "#f7fafc", color: isToday ? "#2b6cb0" : "#4a5568", borderLeft: "2px solid #e2e8f0" }}><div style={{ fontSize: 10 }}>{DIAS_SEMANA[fecha.getDay()]}</div><div style={{ fontWeight: 800, fontSize: 14 }}>{fecha.getDate()}</div></th>; })}
                  </tr>
                  <tr>
                    <th style={{ ...thStyle }}></th>
                    {weekDates.map(fecha => CONSULTORIOS.map((c, i) => (
                      <th key={`${dateKey(fecha)}-${c}`} style={{ ...thStyle, fontSize: 9, fontWeight: 700, color: "#718096", borderLeft: i === 0 ? "2px solid #e2e8f0" : "1px solid #edf2f7", padding: "3px 2px" }}>C{i + 1}</th>
                    )))}
                  </tr>
                </thead>
                <tbody>
                  {HORAS.map(hora => (
                    <tr key={hora}>
                      <td style={{ padding: "3px 4px", textAlign: "center", fontSize: 10, color: "#a0aec0", borderRight: "1px solid #edf2f7", borderBottom: "1px solid #edf2f7", background: "#f7fafc" }}>{hora}:00</td>
                      {weekDates.map(fecha => CONSULTORIOS.map((consultorio, i) => {
                        const isToday = dateKey(fecha) === todayKey;
                        const ocupadas = getReservasParaCelda(consultorio, fecha, hora);
                        const libre = ocupadas.length === 0;
                        return (
                          <td key={`${dateKey(fecha)}-${consultorio}`} onClick={() => libre && openCrear(consultorio, fecha, hora)} style={{ padding: 1, borderBottom: "1px solid #edf2f7", borderLeft: i === 0 ? "2px solid #e2e8f0" : "1px solid #edf2f7", verticalAlign: "top", minWidth: 48, cursor: libre ? "pointer" : "default", background: isToday && libre ? "#f0f9ff" : libre ? "white" : undefined }}>
                            {ocupadas.map(r => { const col = colorMap[r.profesional] || COLORES_PROF[0]; const esInicio = hora === r.horaInicio; return (
                              <div key={r.id} title={`${r.profesional} · ${consultorio}`} style={{ background: col.bg, color: "white", borderRadius: 3, padding: esInicio ? "2px 3px" : "1px 3px", fontSize: 9, fontWeight: 700, marginBottom: 1 }}>
                                {esInicio ? <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", maxWidth: 44 }}>{r.profesional}</span> : <span style={{ color: "rgba(255,255,255,0.4)" }}>│</span>}
                              </div>
                            ); })}
                            {libre && <div style={{ color: "#edf2f7", fontSize: 8, textAlign: "center", paddingTop: 4 }}>·</div>}
                          </td>
                        );
                      }))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: "10px 14px", borderTop: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: 11, color: "#718096", fontWeight: 600 }}>C1 = Consultorio 1 · C2 = Consultorio 2 · C3 = Consultorio 3</span>
            </div>
          </div>
        </div>
      )}

      {vista === "pagos" && (
        <div style={{ padding: "16px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <button onClick={() => setMesOffset(m => m - 1)} style={navBtn}>‹</button>
            <span style={{ fontWeight: 700, fontSize: 14, color: "#4a5568", textTransform: "capitalize", minWidth: 160, textAlign: "center" }}>{mesLabel}</span>
            <button onClick={() => setMesOffset(m => m + 1)} style={navBtn}>›</button>
            <button onClick={() => setMesOffset(0)} style={{ ...navBtn, fontSize: 11, padding: "5px 10px", color: "#718096" }}>Este mes</button>
            {profesionales.length > 0 && <button onClick={() => exportarCSV(profesionales, reservas, mesStr)} style={{ marginLeft: "auto", padding: "7px 14px", borderRadius: 8, border: "none", background: "#000", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>⬇ CSV</button>}
          </div>
          {profesionales.length === 0 && <div style={{ background: "white", borderRadius: 12, padding: 36, textAlign: "center", color: "#a0aec0" }}><div style={{ fontSize: 44, marginBottom: 10 }}>📋</div><p style={{ margin: 0 }}>Aún no hay reservas.</p></div>}
          {profesionales.length > 0 && (() => { const totalGlobal = profesionales.reduce((acc, p) => acc + calcularPagosProfesional(reservas, p, mesStr).totalMes, 0); return <div style={{ background: "#000", borderRadius: 12, padding: "14px 18px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ color: "#90cdf4", fontWeight: 700, fontSize: 13 }}>Total {mesLabel}</span><span style={{ color: "white", fontWeight: 900, fontSize: 22 }}>{formatCurrency(totalGlobal)}</span></div>; })()}
          {profesionales.map(prof => {
            const { totalMes, detalle } = calcularPagosProfesional(reservas, prof, mesStr);
            const col = colorMap[prof] || COLORES_PROF[0];
            return (
              <div key={prof} style={{ background: "white", borderRadius: 12, marginBottom: 14, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
                <div style={{ background: col.bg, padding: "11px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "white", fontWeight: 800, fontSize: 14 }}>👤 {prof}</span>
                  <span style={{ color: "white", fontWeight: 900, fontSize: 19 }}>{formatCurrency(totalMes)}</span>
                </div>
                {detalle.length === 0 ? <p style={{ padding: "12px 16px", color: "#a0aec0", fontSize: 12, margin: 0 }}>Sin reservas este mes.</p> : (
                  <div style={{ padding: 10 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                      <thead><tr style={{ color: "#718096" }}>{["Consultorio","Fecha","Horario","Tipo","Horas","Monto"].map(h => <th key={h} style={{ textAlign: h === "Monto" || h === "Horas" ? "right" : "left", padding: "4px 6px", fontWeight: 600 }}>{h}</th>)}</tr></thead>
                      <tbody>
                        {detalle.map(d => (
                          <tr key={d.id} style={{ borderTop: "1px solid #f0f4f8" }}>
                            <td style={{ padding: "5px 6px", color: "#4a5568" }}>{d.consultorio}</td>
                            <td style={{ padding: "5px 6px", color: "#718096" }}>{new Date(d.fecha + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })}</td>
                            <td style={{ padding: "5px 6px" }}>{d.horaInicio}:00–{d.horaFin}:00</td>
                            <td style={{ padding: "5px 6px" }}><span style={{ background: d.tipo === "Semanal" ? col.light : "#f0fff4", color: d.tipo === "Semanal" ? col.text : "#276749", borderRadius: 4, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>{d.tipo}</span></td>
                            <td style={{ padding: "5px 6px", textAlign: "right" }}>{d.horas}h{d.tipo === "Semanal" ? ` × ${d.ocurrenciasMes}` : ""}</td>
                            <td style={{ padding: "5px 6px", textAlign: "right", fontWeight: 800, color: "#2d3748" }}>{formatCurrency(d.montoMes)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ borderTop: "2px solid #e2e8f0", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 11, color: "#a0aec0" }}>Tarifa: {formatCurrency(HORA_PRECIO)}/hora</span>
                      <span style={{ fontWeight: 900, color: "#2d3748", fontSize: 14 }}>Total: {formatCurrency(totalMes)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "white", borderRadius: 18, padding: 24, width: "100%", maxWidth: 390, boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
            <h3 style={{ margin: "0 0 3px", fontSize: 17, fontWeight: 800, color: "#2d3748" }}>{modal.mode === "crear" ? "Nueva reserva" : "Editar reserva"}</h3>
            <p style={{ margin: "0 0 18px", fontSize: 12, color: "#718096" }}>{modal.consultorio} · {modal.fecha.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}</p>
            <label style={labelStyle}>Profesional</label>
            <input list="prof-list" value={form.profesional} onChange={e => setForm(f => ({ ...f, profesional: e.target.value }))} placeholder="Nombre del/la profesional" style={inputStyle} />
            <datalist id="prof-list">{profesionales.map(p => <option key={p} value={p} />)}</datalist>
            {modal.mode === "editar" && <><label style={labelStyle}>Consultorio</label><select value={modal.consultorio} onChange={e => setModal(m => ({ ...m, consultorio: e.target.value }))} style={inputStyle}>{CONSULTORIOS.map(c => <option key={c} value={c}>{c}</option>)}</select></>}
            <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}><label style={labelStyle}>Desde</label><select value={form.horaInicio} onChange={e => setForm(f => ({ ...f, horaInicio: parseInt(e.target.value), horaFin: Math.max(parseInt(e.target.value) + 1, f.horaFin) }))} style={inputStyle}>{horasRange.slice(0, -1).map(h => <option key={h} value={h}>{h}:00</option>)}</select></div>
              <div style={{ flex: 1 }}><label style={labelStyle}>Hasta</label><select value={form.horaFin} onChange={e => setForm(f => ({ ...f, horaFin: parseInt(e.target.value) }))} style={inputStyle}>{horasRange.filter(h => h > form.horaInicio).map(h => <option key={h} value={h}>{h}:00</option>)}</select></div>
            </div>
            <div style={{ background: "#f7fafc", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#718096" }}>
                <span>{form.horaFin - form.horaInicio} hora(s) × {formatCurrency(HORA_PRECIO)}</span>
                <span style={{ fontWeight: 800, color: "#2d3748", fontSize: 15 }}>{formatCurrency((form.horaFin - form.horaInicio) * HORA_PRECIO)}</span>
              </div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 20 }}>
              <input type="checkbox" checked={form.repeteSemanal} onChange={e => setForm(f => ({ ...f, repeteSemanal: e.target.checked }))} style={{ width: 16, height: 16 }} />
              <span style={{ fontSize: 13, color: "#4a5568" }}>Repetir semanalmente</span>
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={closeModal} style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #e2e8f0", background: "white", cursor: "pointer", fontSize: 13, color: "#718096", fontWeight: 600 }}>Cancelar</button>
              <button onClick={guardarReserva} disabled={!form.profesional.trim()} style={{ flex: 1, padding: 10, borderRadius: 8, border: "none", fontWeight: 800, fontSize: 13, cursor: form.profesional.trim() ? "pointer" : "not-allowed", color: "white", background: form.profesional.trim() ? "linear-gradient(135deg,#667eea,#764ba2)" : "#e2e8f0" }}>{modal.mode === "crear" ? "Guardar" : "Actualizar"}</button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1010, padding: 16 }}>
          <div style={{ background: "white", borderRadius: 16, padding: 24, maxWidth: 340, width: "100%", textAlign: "center", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🗑️</div>
            <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 800, color: "#2d3748" }}>¿Eliminar esta reserva?</h3>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#718096" }}>Esta acción no se puede deshacer.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #e2e8f0", background: "white", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#718096" }}>Cancelar</button>
              <button onClick={() => borrarReserva(confirmDelete)} style={{ flex: 1, padding: 10, borderRadius: 8, border: "none", background: "#fc8181", color: "white", cursor: "pointer", fontSize: 13, fontWeight: 800 }}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:none } }`}</style>
    </div>
  );
}

