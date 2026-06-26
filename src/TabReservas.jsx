import { useState, useMemo, useRef } from "react";

const HORA_PRECIO = 3500;
const HORAS = Array.from({ length: 14 }, (_, i) => i + 8);
const CONSULTORIOS = ["Consultorio 1", "Consultorio 2", "Consultorio 3"];
const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DIAS_GRUPOS = [
  ["Lun", "Mar", "Mié"],
  ["Jue", "Vie", "Sáb"],
];

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
  const [grupoIdx, setGrupoIdx] = useState(0); // 0 = Lun-Mié, 1 = Jue-Sáb
  const [expandido, setExpandido] = useState(null); // { consultorio, fechaKey }
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ profesional: "", horaInicio: 8, horaFin: 9, repeteSemanal: false });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [errorSolapamiento, setErrorSolapamiento] = useState("");
  const [scrollY, setScrollY] = useState(0);
  const scrollRef = useRef(null);

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

  // Días del grupo actual
  const diasGrupo = useMemo(() => {
    const grupo = DIAS_GRUPOS[grupoIdx]; // ["Lun","Mar","Mié"] o ["Jue","Vie","Sáb"]
    return weekDates.filter(f => grupo.includes(DIAS_SEMANA[f.getDay()]));
  }, [weekDates, grupoIdx]);

  function hayConflicto(consultorio, fecha, horaInicio, horaFin, excludeId = null) {
    const key = dateKey(fecha); const diaSemana = fecha.getDay();
    return reservas.some(r => {
      if (r.id === excludeId || r.consultorio !== consultorio) return false;
      const coincideFecha = r.fecha === key || (r.repeteSemanal && new Date(r.fecha + "T12:00:00").getDay() === diaSemana && new Date(r.fecha + "T12:00:00") <= fecha);
      if (!coincideFecha) return false;
      return horaInicio < r.horaFin && horaFin > r.horaInicio;
    });
  }

  function puedeEditar(r) { return esAdmin || r.profesional === usuario?.nombre; }

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

  function getReservasDia(consultorio, fecha) {
    const key = dateKey(fecha); const diaSemana = fecha.getDay();
    return reservas.filter(r => {
      if (r.consultorio !== consultorio) return false;
      if (r.fecha === key) return true;
      if (r.repeteSemanal) { const orig = new Date(r.fecha + "T12:00:00"); return orig.getDay() === diaSemana && orig <= fecha; }
      return false;
    }).sort((a, b) => a.horaInicio - b.horaInicio);
  }

  const todayKey = dateKey(new Date());
  const horasRange = Array.from({ length: 14 }, (_, i) => i + 8);
  const stickyVisible = scrollY > 60;

  const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(124,106,255,0.2)", fontSize: 13, marginBottom: 12, boxSizing: "border-box", outline: "none", background: "rgba(14,12,28,0.8)", color: "white" };
  const labelStyle = { display: "block", fontSize: 11, fontWeight: 700, color: "#a0a8c0", marginBottom: 4, textTransform: "uppercase", letterSpacing: .5 };

  return (
    <div ref={scrollRef} onScroll={e => setScrollY(e.currentTarget.scrollTop)}
      style={{ height: "100vh", overflowY: "auto", background: "#000000" }} className="tab-content">

      {/* ══ STICKY BAR ══ */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        background: stickyVisible ? "rgba(0,0,0,0.92)" : "transparent",
        backdropFilter: stickyVisible ? "blur(24px)" : "none",
        WebkitBackdropFilter: stickyVisible ? "blur(24px)" : "none",
        borderBottom: stickyVisible ? "1px solid rgba(124,106,255,0.15)" : "none",
        transition: "all 0.3s ease",
        padding: stickyVisible ? "10px 20px" : "0",
        height: stickyVisible ? "auto" : 0,
        overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: "white" }}>Reservas</span>
        <img src="/logohead.jpeg" alt="GRINS" style={{ height: 26, objectFit: "contain", opacity: 0.85 }} />
      </div>

      {/* ══ HEADER ══ */}
      <div style={{ background: "linear-gradient(180deg,#0a0a14 0%,#000000 100%)", padding: "54px 20px 16px" }}>
        <img src="/logohead.jpeg" alt="GRINS" style={{ height: 36, objectFit: "contain", opacity: 0.85, marginBottom: 16, display: "block" }} />

        {/* SUB-TABS */}
        <div style={{ display: "flex", background: "rgba(14,12,28,0.8)", borderRadius: 14, padding: 4, border: "1px solid rgba(124,106,255,0.15)" }}>
          {[["agenda", "📅 Agenda"], ["pagos", "💰 Pagos"]].map(([v, label]) => (
            (!esPublico || v !== "pagos") && (
              <button key={v} onClick={() => setSubVista(v)} style={{
                flex: 1, padding: "9px 6px", borderRadius: 10, border: "none", cursor: "pointer",
                fontWeight: 600, fontSize: 12,
                background: subVista === v ? "linear-gradient(135deg,#667eea,#764ba2)" : "transparent",
                color: subVista === v ? "white" : "#a0a8c0",
                transition: "all 0.2s"
              }}>{label}</button>
            )
          ))}
        </div>
      </div>

      {/* ══ AGENDA ══ */}
      {subVista === "agenda" && (
        <div style={{ padding: "14px 14px 100px" }}>

          {/* NAV SEMANA */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <button onClick={() => setWeekOffset(w => w - 1)} style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid rgba(124,106,255,0.2)", background: "rgba(14,12,28,0.8)", cursor: "pointer", color: "white", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
            <span style={{ flex: 1, textAlign: "center", fontWeight: 700, fontSize: 12, color: "#a0a8c0" }}>
              {weekDates[0].toLocaleDateString("es-AR", { day: "numeric", month: "short" })} – {weekDates[5].toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
            </span>
            <button onClick={() => setWeekOffset(w => w + 1)} style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid rgba(124,106,255,0.2)", background: "rgba(14,12,28,0.8)", cursor: "pointer", color: "white", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
            <button onClick={() => setWeekOffset(0)} style={{ padding: "0 12px", height: 34, borderRadius: 10, border: "1px solid rgba(124,106,255,0.2)", background: "rgba(14,12,28,0.8)", cursor: "pointer", color: "#a0a8c0", fontSize: 11, fontWeight: 600 }}>Hoy</button>
          </div>

          {/* SELECTOR GRUPO DÍAS */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 16 }}>
            <button onClick={() => setGrupoIdx(0)} style={{ padding: "6px 0", flex: 1, borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12, background: grupoIdx === 0 ? "linear-gradient(135deg,#667eea,#764ba2)" : "rgba(14,12,28,0.8)", color: grupoIdx === 0 ? "white" : "#a0a8c0", transition: "all 0.2s" }}>
              ‹ Lun · Mar · Mié
            </button>
            <button onClick={() => setGrupoIdx(1)} style={{ padding: "6px 0", flex: 1, borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12, background: grupoIdx === 1 ? "linear-gradient(135deg,#667eea,#764ba2)" : "rgba(14,12,28,0.8)", color: grupoIdx === 1 ? "white" : "#a0a8c0", transition: "all 0.2s" }}>
              Jue · Vie · Sáb ›
            </button>
          </div>

          {/* GRILLA POR CONSULTORIO */}
          {CONSULTORIOS.map(consultorio => (
            <div key={consultorio} style={{ background: "rgba(14,12,28,0.8)", borderRadius: 16, marginBottom: 14, overflow: "hidden", border: "1px solid rgba(124,106,255,0.12)" }}>

              {/* HEADER CONSULTORIO */}
              <div style={{ background: "rgba(0,0,0,0.4)", padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7c6aff" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M3 9h6M3 15h6"/></svg>
                <span style={{ fontWeight: 800, fontSize: 13, color: "white" }}>{consultorio}</span>
              </div>

              {/* COLUMNAS DE DÍAS */}
              <div style={{ display: "grid", gridTemplateColumns: `44px repeat(${diasGrupo.length}, 1fr)`, borderTop: "1px solid rgba(124,106,255,0.08)" }}>

                {/* HEADER DÍAS */}
                <div style={{ padding: "8px 4px", textAlign: "center", fontSize: 9, color: "#4a5270", borderRight: "1px solid rgba(124,106,255,0.08)", borderBottom: "1px solid rgba(124,106,255,0.08)" }} />
                {diasGrupo.map(fecha => {
                  const isToday = dateKey(fecha) === todayKey;
                  const expKey = `${consultorio}__${dateKey(fecha)}`;
                  const isExp = expandido === expKey;
                  return (
                    <div key={dateKey(fecha)}
                      onClick={() => setExpandido(isExp ? null : expKey)}
                      style={{ padding: "8px 4px", textAlign: "center", borderRight: "1px solid rgba(124,106,255,0.08)", borderBottom: "1px solid rgba(124,106,255,0.08)", cursor: "pointer", background: isToday ? "rgba(124,106,255,0.12)" : isExp ? "rgba(124,106,255,0.08)" : "transparent", transition: "background 0.2s" }}>
                      <div style={{ fontSize: 9, color: isToday ? "#7c6aff" : "#a0a8c0", fontWeight: 600 }}>{DIAS_SEMANA[fecha.getDay()]}</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: isToday ? "#7c6aff" : "white" }}>{fecha.getDate()}</div>
                      <div style={{ fontSize: 8, color: isExp ? "#7c6aff" : "#4a5270", marginTop: 2 }}>{isExp ? "▲" : "▼"}</div>
                    </div>
                  );
                })}

                {/* MODO COMPACTO — puntos de ocupación */}
                {!diasGrupo.some(f => expandido === `${consultorio}__${dateKey(f)}`) && (
                  <>
                    {/* fila de puntos resumen */}
                    <div style={{ padding: "6px 4px", borderRight: "1px solid rgba(124,106,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 8, color: "#4a5270" }}>hoy</span>
                    </div>
                    {diasGrupo.map(fecha => {
                      const isToday = dateKey(fecha) === todayKey;
                      const reservasDia = getReservasDia(consultorio, fecha);
                      const horasOcupadas = new Set();
                      reservasDia.forEach(r => { for (let h = r.horaInicio; h < r.horaFin; h++) horasOcupadas.add(h); });
                      const pct = Math.round((horasOcupadas.size / 14) * 100);
                      return (
                        <div key={dateKey(fecha)} style={{ padding: "8px 6px", borderRight: "1px solid rgba(124,106,255,0.08)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          {/* Barra de ocupación */}
                          <div style={{ width: "100%", height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: pct > 70 ? "#ef5350" : pct > 40 ? "#f59e0b" : "#667eea", borderRadius: 2, transition: "width 0.3s" }} />
                          </div>
                          {/* Puntos de reservas */}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 2, justifyContent: "center" }}>
                            {reservasDia.slice(0, 4).map(r => {
                              const col = colorMap[r.profesional] || COLORES_PROF[0];
                              return <div key={r.id} style={{ width: 6, height: 6, borderRadius: "50%", background: col.solid }} title={`${r.profesional} ${r.horaInicio}:00`} />;
                            })}
                            {reservasDia.length > 4 && <span style={{ fontSize: 7, color: "#4a5270" }}>+{reservasDia.length - 4}</span>}
                            {reservasDia.length === 0 && <span style={{ fontSize: 8, color: "#4a5270" }}>libre</span>}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}

                {/* MODO EXPANDIDO — vista día completo */}
                {diasGrupo.some(f => expandido === `${consultorio}__${dateKey(f)}`) && (
                  <>
                    {HORAS.map(hora => (
                      <>
                        {/* Etiqueta hora */}
                        <div key={`h${hora}`} style={{ padding: "0 4px", textAlign: "center", fontSize: 9, color: "#4a5270", borderRight: "1px solid rgba(124,106,255,0.08)", borderBottom: "1px solid rgba(124,106,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 36 }}>
                          {hora}:00
                        </div>
                        {diasGrupo.map(fecha => {
                          const expKey = `${consultorio}__${dateKey(fecha)}`;
                          const isExp = expandido === expKey;
                          const isToday = dateKey(fecha) === todayKey;
                          const ocupadas = getReservasParaCelda(consultorio, fecha, hora);
                          const libre = ocupadas.length === 0;
                          return (
                            <div key={`${dateKey(fecha)}-${hora}`}
                              onClick={() => { if (isExp && libre) openCrear(consultorio, fecha, hora); }}
                              style={{
                                borderRight: "1px solid rgba(124,106,255,0.08)",
                                borderBottom: "1px solid rgba(124,106,255,0.06)",
                                minHeight: 36, padding: 2,
                                background: !isExp ? "rgba(0,0,0,0.2)" : isToday && libre ? "rgba(124,106,255,0.06)" : libre ? "transparent" : undefined,
                                cursor: isExp && libre ? "pointer" : "default",
                                opacity: !isExp ? 0.3 : 1,
                                transition: "opacity 0.2s",
                              }}>
                              {isExp && ocupadas.map(r => {
                                const col = colorMap[r.profesional] || COLORES_PROF[0];
                                const esInicio = hora === r.horaInicio;
                                const puedeMod = puedeEditar(r);
                                return (
                                  <div key={r.id} style={{ background: col.bg, color: "white", borderRadius: esInicio ? "5px 5px 2px 2px" : "2px", padding: esInicio ? "3px 4px" : "1px 4px", fontSize: 9, fontWeight: 700, marginBottom: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    {esInicio ? <>
                                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 50 }}>{r.profesional}</span>
                                      {puedeMod && !esPublico && <span style={{ display: "flex", gap: 1 }}>
                                        <button onClick={e => { e.stopPropagation(); openEditar(r); }} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", cursor: "pointer", borderRadius: 2, padding: "0 2px", fontSize: 8 }}>✎</button>
                                        <button onClick={e => { e.stopPropagation(); setConfirmDelete(r.id); }} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", cursor: "pointer", borderRadius: 2, padding: "0 2px", fontSize: 8 }}>✕</button>
                                      </span>}
                                    </> : <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 7 }}>│</span>}
                                  </div>
                                );
                              })}
                              {isExp && libre && <div style={{ color: "rgba(124,106,255,0.3)", fontSize: 8, textAlign: "center", paddingTop: 10 }}>+</div>}
                            </div>
                          );
                        })}
                      </>
                    ))}
                  </>
                )}
              </div>

              {/* LEYENDA PROFESIONALES del consultorio */}
              {(() => {
                const profs = [...new Set(reservas.filter(r => r.consultorio === consultorio).map(r => r.profesional))];
                if (profs.length === 0) return null;
                return (
                  <div style={{ padding: "8px 12px", borderTop: "1px solid rgba(124,106,255,0.08)", display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {profs.map(p => { const col = colorMap[p] || COLORES_PROF[0]; return <span key={p} style={{ background: `${col.solid}22`, color: col.solid, border: `1px solid ${col.solid}44`, borderRadius: 20, padding: "1px 8px", fontSize: 9, fontWeight: 700 }}>{p}</span>; })}
                  </div>
                );
              })()}
            </div>
          ))}

          {/* TOQUE PARA EXPANDIR — hint */}
          <p style={{ textAlign: "center", fontSize: 11, color: "#3a3a5a", margin: "4px 0 0" }}>
            Tocá un día para ver y reservar horarios
          </p>
        </div>
      )}

      {/* ══ PAGOS ══ */}
      {subVista === "pagos" && !esPublico && (
        <div style={{ padding: "16px 14px 100px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <button onClick={() => setMesOffset(m => m - 1)} style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid rgba(124,106,255,0.2)", background: "rgba(14,12,28,0.8)", cursor: "pointer", color: "white", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
            <span style={{ flex: 1, textAlign: "center", fontWeight: 700, fontSize: 13, color: "white", textTransform: "capitalize" }}>{mesLabel}</span>
            <button onClick={() => setMesOffset(m => m + 1)} style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid rgba(124,106,255,0.2)", background: "rgba(14,12,28,0.8)", cursor: "pointer", color: "white", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
            <button onClick={() => setMesOffset(0)} style={{ padding: "0 10px", height: 34, borderRadius: 10, border: "1px solid rgba(124,106,255,0.2)", background: "rgba(14,12,28,0.8)", cursor: "pointer", color: "#a0a8c0", fontSize: 11, fontWeight: 600 }}>Hoy</button>
            {esAdmin && <button onClick={() => exportarCSV(profesionales, reservas, mesStr)} style={{ padding: "0 12px", height: 34, borderRadius: 10, border: "none", background: "linear-gradient(135deg,#667eea,#764ba2)", color: "white", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>⬇ CSV</button>}
          </div>

          {esAdmin && profesionales.length > 0 && (() => {
            const totalGlobal = profesionales.reduce((acc, p) => acc + calcularPagosProfesional(reservas, p, mesStr).totalMes, 0);
            return (
              <div style={{ background: "rgba(14,12,28,0.9)", borderRadius: 14, padding: "14px 18px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid rgba(124,106,255,0.15)" }}>
                <span style={{ color: "#a0a8c0", fontWeight: 700, fontSize: 12 }}>Total {mesLabel}</span>
                <span style={{ color: "white", fontWeight: 900, fontSize: 20 }}>{formatCurrency(totalGlobal)}</span>
              </div>
            );
          })()}

          {profesionales.length === 0 && (
            <div style={{ background: "rgba(14,12,28,0.6)", borderRadius: 12, padding: 36, textAlign: "center", border: "1px solid rgba(124,106,255,0.08)" }}>
              <div style={{ fontSize: 44, marginBottom: 10 }}>📋</div>
              <p style={{ margin: 0, color: "#4a5270" }}>Aún no hay reservas.</p>
            </div>
          )}

          {profesionales.map(prof => {
            const { totalMes, detalle } = calcularPagosProfesional(reservas, prof, mesStr);
            const col = colorMap[prof] || COLORES_PROF[0];
            return (
              <div key={prof} style={{ background: "rgba(14,12,28,0.8)", borderRadius: 14, marginBottom: 12, overflow: "hidden", border: "1px solid rgba(124,106,255,0.1)" }}>
                <div style={{ background: col.bg, padding: "11px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "white", fontWeight: 800, fontSize: 14 }}>👤 {prof}</span>
                  <span style={{ color: "white", fontWeight: 900, fontSize: 18 }}>{formatCurrency(totalMes)}</span>
                </div>
                {detalle.length === 0 ? <p style={{ padding: "12px 16px", color: "#4a5270", fontSize: 12, margin: 0 }}>Sin reservas este mes.</p> : (
                  <div style={{ padding: 10 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                      <thead><tr style={{ color: "#4a5270" }}>{["Consultorio", "Fecha", "Horario", "Tipo", "Horas", "Monto"].map(h => <th key={h} style={{ textAlign: h === "Monto" || h === "Horas" ? "right" : "left", padding: "4px 6px", fontWeight: 600 }}>{h}</th>)}</tr></thead>
                      <tbody>
                        {detalle.map(d => (
                          <tr key={d.id} style={{ borderTop: "1px solid rgba(124,106,255,0.08)" }}>
                            <td style={{ padding: "5px 6px", color: "white" }}>{d.consultorio}</td>
                            <td style={{ padding: "5px 6px", color: "#a0a8c0" }}>{new Date(d.fecha + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })}</td>
                            <td style={{ padding: "5px 6px", color: "white" }}>{d.horaInicio}:00–{d.horaFin}:00</td>
                            <td style={{ padding: "5px 6px" }}><span style={{ background: "rgba(124,106,255,0.15)", color: "#7c6aff", borderRadius: 4, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>{d.tipo}</span></td>
                            <td style={{ padding: "5px 6px", textAlign: "right", color: "#a0a8c0" }}>{d.horas}h{d.tipo === "Semanal" ? ` × ${d.ocurrenciasMes}` : ""}</td>
                            <td style={{ padding: "5px 6px", textAlign: "right", fontWeight: 800, color: "white" }}>{formatCurrency(d.montoMes)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ borderTop: "1px solid rgba(124,106,255,0.1)", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 11, color: "#4a5270" }}>${HORA_PRECIO.toLocaleString("es-AR")}/hora</span>
                      <span style={{ fontWeight: 900, color: "white", fontSize: 13 }}>Total: {formatCurrency(totalMes)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══ MODAL CREAR/EDITAR ══ */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 2000 }}>
          <div style={{ background: "#0a0a14", borderRadius: "24px 24px 0 0", padding: "20px 20px 44px", width: "100%", maxWidth: 500, border: "1px solid rgba(124,106,255,0.2)", animation: "slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.1)", margin: "0 auto 16px" }} />
            <h3 style={{ margin: "0 0 3px", fontSize: 17, fontWeight: 800, color: "white" }}>{modal.mode === "crear" ? "Nueva reserva" : "Editar reserva"}</h3>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "#a0a8c0" }}>{modal.consultorio} · {modal.fecha.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}</p>
            <label style={labelStyle}>Profesional</label>
            {esAdmin
              ? <input list="prof-list" value={form.profesional} onChange={e => setForm(f => ({ ...f, profesional: e.target.value }))} placeholder="Nombre del/la profesional" style={inputStyle} />
              : <div style={{ ...inputStyle, color: "#a0a8c0", cursor: "not-allowed" }}>{form.profesional}</div>
            }
            <datalist id="prof-list">{Object.keys(colorMap).map(p => <option key={p} value={p} />)}</datalist>
            {modal.mode === "editar" && esAdmin && (
              <><label style={labelStyle}>Consultorio</label>
              <select value={modal.consultorio} onChange={e => setModal(m => ({ ...m, consultorio: e.target.value }))} style={inputStyle}>
                {CONSULTORIOS.map(c => <option key={c} value={c}>{c}</option>)}
              </select></>
            )}
            <div style={{ display: "flex", gap: 10 }}>
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
            <div style={{ background: "rgba(124,106,255,0.08)", borderRadius: 10, padding: "10px 14px", marginBottom: 12, display: "flex", justifyContent: "space-between", border: "1px solid rgba(124,106,255,0.12)" }}>
              <span style={{ fontSize: 13, color: "#a0a8c0" }}>{form.horaFin - form.horaInicio} hora(s) × ${HORA_PRECIO.toLocaleString("es-AR")}</span>
              <span style={{ fontWeight: 800, color: "white" }}>${((form.horaFin - form.horaInicio) * HORA_PRECIO).toLocaleString("es-AR")}</span>
            </div>
            {errorSolapamiento && <div style={{ background: "rgba(239,83,80,0.1)", border: "1px solid rgba(239,83,80,0.3)", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "#ef5350", fontWeight: 600 }}>{errorSolapamiento}</div>}
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 18 }}>
              <input type="checkbox" checked={form.repeteSemanal} onChange={e => setForm(f => ({ ...f, repeteSemanal: e.target.checked }))} style={{ width: 16, height: 16 }} />
              <span style={{ fontSize: 13, color: "white" }}>Repetir semanalmente</span>
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={closeModal} style={{ flex: 1, padding: 12, borderRadius: 12, border: "1px solid rgba(124,106,255,0.2)", background: "transparent", cursor: "pointer", fontSize: 13, color: "#a0a8c0", fontWeight: 600 }}>Cancelar</button>
              <button onClick={guardarReserva} disabled={!form.profesional.trim()} style={{ flex: 2, padding: 12, borderRadius: 12, border: "none", fontWeight: 800, fontSize: 13, cursor: form.profesional.trim() ? "pointer" : "not-allowed", color: "white", background: form.profesional.trim() ? "linear-gradient(135deg,#667eea,#764ba2)" : "rgba(255,255,255,0.05)" }}>
                {modal.mode === "crear" ? "Guardar reserva" : "Actualizar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL ELIMINAR ══ */}
      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 2000 }}>
          <div style={{ background: "#0a0a14", borderRadius: "24px 24px 0 0", padding: "20px 20px 44px", width: "100%", maxWidth: 500, textAlign: "center", border: "1px solid rgba(124,106,255,0.2)" }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.1)", margin: "0 auto 16px" }} />
            <div style={{ fontSize: 36, marginBottom: 10 }}>🗑️</div>
            <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 800, color: "white" }}>¿Eliminar esta reserva?</h3>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#a0a8c0" }}>Esta acción no se puede deshacer.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: 12, borderRadius: 12, border: "1px solid rgba(124,106,255,0.2)", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#a0a8c0" }}>Cancelar</button>
              <button onClick={() => borrarReserva(confirmDelete)} style={{ flex: 1, padding: 12, borderRadius: 12, border: "none", background: "#ef4444", color: "white", cursor: "pointer", fontSize: 13, fontWeight: 800 }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: none; opacity: 1; } }`}</style>
    </div>
  );
}
