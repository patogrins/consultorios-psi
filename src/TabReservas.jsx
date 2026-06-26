import { useState, useMemo, useRef, useEffect, useCallback } from "react";

const HORA_PRECIO = 3500;
const HORAS = Array.from({ length: 14 }, (_, i) => i + 8);
const CONSULTORIOS = ["Consultorio 1", "Consultorio 2", "Consultorio 3"];
const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const COLORES_PROF = [
  { bg: "linear-gradient(135deg,#667eea,#764ba2)", solid: "#764ba2" },
  { bg: "linear-gradient(135deg,#f093fb,#f5576c)", solid: "#f5576c" },
  { bg: "linear-gradient(135deg,#4facfe,#00f2fe)", solid: "#00b4d8" },
  { bg: "linear-gradient(135deg,#43e97b,#38f9d7)", solid: "#38b2ac" },
  { bg: "linear-gradient(135deg,#fa709a,#fee140)", solid: "#f59e0b" },
  { bg: "linear-gradient(135deg,#a18cd1,#fbc2eb)", solid: "#a78bfa" },
  { bg: "linear-gradient(135deg,#fda085,#f6d365)", solid: "#f97316" },
  { bg: "linear-gradient(135deg,#96fbc4,#f9f586)", solid: "#84cc16" },
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
  let totalMes = 0; const detalle = [];
  reservas.filter(r => r.profesional === profesional).forEach(r => {
    const horas = r.horaFin - r.horaInicio;
    const montoBloque = horas * HORA_PRECIO;
    if (r.repeteSemanal) {
      const year = parseInt(mesStr.slice(0, 4)), month = parseInt(mesStr.slice(5, 7)) - 1;
      const diasEnMes = new Date(year, month + 1, 0).getDate();
      const fechaOrig = new Date(r.fecha + "T12:00:00");
      let ocurrencias = 0;
      for (let d = 1; d <= diasEnMes; d++) { const dia = new Date(year, month, d); if (dia.getDay() === fechaOrig.getDay() && dia >= fechaOrig) ocurrencias++; }
      const montoMes = ocurrencias * montoBloque; totalMes += montoMes;
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
    detalle.forEach(d => { const dia = new Date(d.fecha + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long" }); rows.push([prof, d.consultorio, `${dia} ${d.fecha}`, `${d.horaInicio}:00-${d.horaFin}:00`, d.tipo, d.horas, d.tipo === "Semanal" ? d.ocurrenciasMes : 1, d.montoMes].join(",")); });
    rows.push([prof, "", "", "", "TOTAL", "", "", calcularPagosProfesional(reservas, prof, mesStr).totalMes].join(""), "");
  });
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href = url; a.download = `pagos_${mesStr}.csv`; a.click(); URL.revokeObjectURL(url);
}

// ── Hook pinch to zoom ────────────────────────────────────────────────────────
function usePinchZoom(onZoomIn, onZoomOut) {
  const ref = useRef(null);
  const lastDist = useRef(null);

  useEffect(() => {
    const el = ref.current; if (!el) return;
    function getDist(touches) {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }
    function onTouchStart(e) { if (e.touches.length === 2) lastDist.current = getDist(e.touches); }
    function onTouchMove(e) {
      if (e.touches.length !== 2 || lastDist.current === null) return;
      const dist = getDist(e.touches);
      const delta = dist - lastDist.current;
      if (Math.abs(delta) > 30) {
        if (delta > 0) onZoomIn(); else onZoomOut();
        lastDist.current = null;
      }
    }
    function onTouchEnd() { lastDist.current = null; }
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd);
    return () => { el.removeEventListener("touchstart", onTouchStart); el.removeEventListener("touchmove", onTouchMove); el.removeEventListener("touchend", onTouchEnd); };
  }, [onZoomIn, onZoomOut]);
  return ref;
}

export default function TabReservas({ usuario, esAdmin, esPublico, t, reservas, agregarReserva, actualizarReserva, eliminarReserva, showToast, onLogin }) {
  const [zoom, setZoom] = useState(1);         // 1,2,3,4
  const [subVista, setSubVista] = useState("agenda");
  const [weekOffset, setWeekOffset] = useState(0);
  const [mesOffset, setMesOffset] = useState(0);
  const [diaSelIdx, setDiaSelIdx] = useState(() => { const d = new Date().getDay(); return d === 0 ? 0 : d - 1; });
  const [consultorioSel, setConsultorioSel] = useState(0);
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

  const profesionales = useMemo(() => esAdmin ? Object.keys(colorMap) : usuario?.nombre ? [usuario.nombre] : [], [colorMap, esAdmin, usuario]);

  const zoomIn = useCallback(() => setZoom(z => Math.min(z + 1, 4)), []);
  const zoomOut = useCallback(() => setZoom(z => Math.max(z - 1, 1)), []);
  const pinchRef = usePinchZoom(zoomIn, zoomOut);

  function hayConflicto(consultorio, fecha, horaInicio, horaFin, excludeId = null) {
    const key = dateKey(fecha); const diaSemana = fecha.getDay();
    return reservas.some(r => {
      if (r.id === excludeId || r.consultorio !== consultorio) return false;
      const ok = r.fecha === key || (r.repeteSemanal && new Date(r.fecha + "T12:00:00").getDay() === diaSemana && new Date(r.fecha + "T12:00:00") <= fecha);
      return ok && horaInicio < r.horaFin && horaFin > r.horaInicio;
    });
  }

  function puedeEditar(r) { return esAdmin || r.profesional === usuario?.nombre; }

  function openCrear(consultorio, fecha, hora) {
    if (esPublico) { onLogin(); return; }
    setErrorSolapamiento(""); setModal({ mode: "crear", consultorio, fecha });
    setForm({ profesional: esAdmin ? "" : usuario?.nombre, horaInicio: hora, horaFin: hora + 1, repeteSemanal: false });
  }

  function openEditar(r) {
    if (!puedeEditar(r)) return;
    setErrorSolapamiento(""); setModal({ mode: "editar", consultorio: r.consultorio, fecha: new Date(r.fecha + "T12:00:00"), reservaId: r.id });
    setForm({ profesional: r.profesional, horaInicio: r.horaInicio, horaFin: r.horaFin, repeteSemanal: r.repeteSemanal });
  }

  function closeModal() { setModal(null); setErrorSolapamiento(""); }

  async function guardarReserva() {
    if (!form.profesional.trim() || form.horaFin <= form.horaInicio) return;
    if (hayConflicto(modal.consultorio, modal.fecha, parseInt(form.horaInicio), parseInt(form.horaFin), modal.reservaId)) { setErrorSolapamiento("⚠️ Ese horario ya está ocupado. Elegí otro."); return; }
    const datos = { profesional: form.profesional.trim(), consultorio: modal.consultorio, fecha: dateKey(modal.fecha), horaInicio: parseInt(form.horaInicio), horaFin: parseInt(form.horaFin), repeteSemanal: form.repeteSemanal, creadoPor: usuario?.email };
    if (modal.mode === "crear") { await agregarReserva(datos); showToast("Reserva guardada ✓"); }
    else { await actualizarReserva(modal.reservaId, datos); showToast("Reserva actualizada ✓"); }
    closeModal();
  }

  async function borrarReserva(id) { await eliminarReserva(id); setConfirmDelete(null); showToast("Reserva eliminada", "warn"); }

  function getReservasBloque(consultorio, fecha, hora) {
    const key = dateKey(fecha); const dow = fecha.getDay();
    return reservas.filter(r => {
      if (r.consultorio !== consultorio || hora < r.horaInicio || hora >= r.horaFin) return false;
      if (r.fecha === key) return true;
      if (r.repeteSemanal) { const o = new Date(r.fecha + "T12:00:00"); return o.getDay() === dow && o <= fecha; }
      return false;
    });
  }

  const todayKey = dateKey(new Date());
  const horasRange = Array.from({ length: 14 }, (_, i) => i + 8);
  const stickyVisible = scrollY > 60 && zoom >= 3;

  const ZOOM_LABELS = ["Semana completa", "Media semana", "Un día · 3 consultorios", "Un día · Un consultorio"];

  // Días para cada zoom
  const diasZ1 = weekDates;                          // 6 días
  const diasZ2Groups = [weekDates.slice(0, 3), weekDates.slice(3)]; // Lun-Mié / Jue-Sáb
  const [z2group, setZ2group] = useState(0);
  const diasZ2 = diasZ2Groups[z2group];
  const diaZ34 = weekDates[Math.min(diaSelIdx, weekDates.length - 1)];

  const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(124,106,255,0.2)", fontSize: 13, marginBottom: 12, boxSizing: "border-box", outline: "none", background: "rgba(14,12,28,0.8)", color: "white" };
  const labelStyle = { display: "block", fontSize: 11, fontWeight: 700, color: "#a0a8c0", marginBottom: 4, textTransform: "uppercase", letterSpacing: .5 };

  // ── Render celdas ──────────────────────────────────────────────────────────
  function CeldaBloque({ consultorio, fecha, hora, showName, cellHeight = 28 }) {
    const bloques = getReservasBloque(consultorio, fecha, hora);
    const libre = bloques.length === 0;
    const isToday = dateKey(fecha) === todayKey;
    return (
      <div onClick={() => libre && openCrear(consultorio, fecha, hora)}
        style={{ height: cellHeight, padding: 1, borderBottom: "1px solid rgba(124,106,255,0.06)", cursor: libre ? "pointer" : "default", background: libre ? (isToday ? "rgba(124,106,255,0.04)" : "transparent") : undefined, position: "relative" }}>
        {bloques.map(r => {
          const col = colorMap[r.profesional] || COLORES_PROF[0];
          const esInicio = hora === r.horaInicio;
          return (
            <div key={r.id} style={{ height: "100%", background: col.bg, borderRadius: esInicio ? "4px 4px 1px 1px" : "1px", padding: "1px 3px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {esInicio && showName && <span style={{ fontSize: 8, fontWeight: 700, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>{r.profesional}</span>}
              {esInicio && showName && puedeEditar(r) && !esPublico && (
                <span style={{ display: "flex", gap: 1, flexShrink: 0 }}>
                  <button onClick={e => { e.stopPropagation(); openEditar(r); }} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", cursor: "pointer", borderRadius: 2, padding: "0 2px", fontSize: 7, lineHeight: "10px" }}>✎</button>
                  <button onClick={e => { e.stopPropagation(); setConfirmDelete(r.id); }} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", cursor: "pointer", borderRadius: 2, padding: "0 2px", fontSize: 7, lineHeight: "10px" }}>✕</button>
                </span>
              )}
              {!showName && esInicio && <div style={{ width: "100%", height: "100%", borderRadius: 3 }} />}
            </div>
          );
        })}
        {libre && !esPublico && <div style={{ color: "rgba(124,106,255,0.2)", fontSize: 7, textAlign: "center", paddingTop: cellHeight / 3 }}>+</div>}
      </div>
    );
  }

  // ── Grilla genérica ────────────────────────────────────────────────────────
  function Grilla({ dias, showName, cellHeight = 28, colWidth = 48 }) {
    const cols = dias.length * 3; // 3 consultorios por día
    return (
      <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "calc(100vh - 200px)" }}>
        <table style={{ borderCollapse: "collapse", minWidth: 40 + cols * colWidth }}>
          <thead>
            <tr>
              <th style={{ width: 36, minWidth: 36, background: "rgba(0,0,0,0.6)", position: "sticky", left: 0, zIndex: 3, borderBottom: "1px solid rgba(124,106,255,0.1)" }} />
              {dias.map(fecha => {
                const isToday = dateKey(fecha) === todayKey;
                return (
                  <th key={dateKey(fecha)} colSpan={3} style={{ background: isToday ? "rgba(124,106,255,0.15)" : "rgba(0,0,0,0.5)", color: isToday ? "#7c6aff" : "white", fontSize: 11, fontWeight: 700, padding: "6px 0", textAlign: "center", borderLeft: "2px solid rgba(124,106,255,0.15)", borderBottom: "1px solid rgba(124,106,255,0.1)", minWidth: colWidth * 3 }}>
                    <div style={{ fontSize: 9, color: isToday ? "#7c6aff" : "#a0a8c0" }}>{DIAS_SEMANA[fecha.getDay()]}</div>
                    <div style={{ fontSize: 13, fontWeight: 800 }}>{fecha.getDate()}</div>
                  </th>
                );
              })}
            </tr>
            <tr>
              <th style={{ width: 36, background: "rgba(0,0,0,0.6)", position: "sticky", left: 0, zIndex: 3, borderBottom: "1px solid rgba(124,106,255,0.1)" }} />
              {dias.map(fecha => CONSULTORIOS.map((c, ci) => (
                <th key={`${dateKey(fecha)}-${c}`} style={{ background: "rgba(0,0,0,0.4)", color: "#4a5270", fontSize: 8, fontWeight: 700, padding: "3px 1px", textAlign: "center", borderLeft: ci === 0 ? "2px solid rgba(124,106,255,0.15)" : "1px solid rgba(124,106,255,0.06)", borderBottom: "1px solid rgba(124,106,255,0.1)", width: colWidth }}>
                  C{ci + 1}
                </th>
              )))}
            </tr>
          </thead>
          <tbody>
            {HORAS.map(hora => (
              <tr key={hora}>
                <td style={{ padding: "0 4px", textAlign: "right", fontSize: 8, color: "#3a3a5a", background: "rgba(0,0,0,0.5)", position: "sticky", left: 0, zIndex: 2, verticalAlign: "middle", borderRight: "1px solid rgba(124,106,255,0.08)" }}>
                  {hora}h
                </td>
                {dias.map(fecha => CONSULTORIOS.map((c, ci) => (
                  <td key={`${dateKey(fecha)}-${c}-${hora}`} style={{ padding: 0, borderLeft: ci === 0 ? "2px solid rgba(124,106,255,0.1)" : "1px solid rgba(124,106,255,0.04)", width: colWidth }}>
                    <CeldaBloque consultorio={c} fecha={fecha} hora={hora} showName={showName} cellHeight={cellHeight} />
                  </td>
                )))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // ── Zoom 3: un día, 3 consultorios ────────────────────────────────────────
  function GrillaUnDia({ fecha }) {
    return (
      <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 220px)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ width: 40, background: "rgba(0,0,0,0.6)", borderBottom: "1px solid rgba(124,106,255,0.1)" }} />
              {CONSULTORIOS.map((c, ci) => (
                <th key={c} style={{ background: "rgba(14,12,28,0.9)", color: "white", fontSize: 12, fontWeight: 700, padding: "8px 4px", textAlign: "center", borderLeft: "1px solid rgba(124,106,255,0.1)", borderBottom: "1px solid rgba(124,106,255,0.1)" }}>
                  C{ci + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HORAS.map(hora => (
              <tr key={hora}>
                <td style={{ padding: "0 6px", textAlign: "right", fontSize: 9, color: "#a0a8c0", background: "rgba(0,0,0,0.5)", borderRight: "1px solid rgba(124,106,255,0.08)", verticalAlign: "middle" }}>{hora}:00</td>
                {CONSULTORIOS.map((c, ci) => (
                  <td key={c} style={{ padding: 0, borderLeft: "1px solid rgba(124,106,255,0.08)" }}>
                    <CeldaBloque consultorio={c} fecha={fecha} hora={hora} showName={true} cellHeight={36} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // ── Zoom 4: un día, un consultorio ────────────────────────────────────────
  function GrillaUnConsultorio({ fecha, consultorio }) {
    const reservasDia = reservas.filter(r => {
      if (r.consultorio !== consultorio) return false;
      const key = dateKey(fecha); const dow = fecha.getDay();
      if (r.fecha === key) return true;
      if (r.repeteSemanal) { const o = new Date(r.fecha + "T12:00:00"); return o.getDay() === dow && o <= fecha; }
      return false;
    }).sort((a, b) => a.horaInicio - b.horaInicio);

    return (
      <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 260px)" }}>
        {HORAS.map(hora => {
          const bloques = reservasDia.filter(r => hora >= r.horaInicio && hora < r.horaFin);
          const libre = bloques.length === 0;
          const isInicio = bloques.length > 0 && bloques[0].horaInicio === hora;
          return (
            <div key={hora} onClick={() => libre && openCrear(consultorio, fecha, hora)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 16px", height: 48, borderBottom: "1px solid rgba(124,106,255,0.08)", background: libre ? "transparent" : "rgba(124,106,255,0.03)", cursor: libre ? "pointer" : "default", transition: "background 0.15s" }}>
              <span style={{ fontSize: 11, color: "#4a5270", fontWeight: 600, minWidth: 36, textAlign: "right" }}>{hora}:00</span>
              {bloques.length > 0 ? (
                <div style={{ flex: 1, height: 36, borderRadius: 10, background: (colorMap[bloques[0].profesional] || COLORES_PROF[0]).bg, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px" }}>
                  {isInicio && <>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>{bloques[0].profesional}</span>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>{bloques[0].horaInicio}:00 – {bloques[0].horaFin}:00</span>
                    {puedeEditar(bloques[0]) && !esPublico && (
                      <span style={{ display: "flex", gap: 4 }}>
                        <button onClick={e => { e.stopPropagation(); openEditar(bloques[0]); }} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", cursor: "pointer", borderRadius: 6, padding: "3px 7px", fontSize: 11 }}>✎</button>
                        <button onClick={e => { e.stopPropagation(); setConfirmDelete(bloques[0].id); }} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", cursor: "pointer", borderRadius: 6, padding: "3px 7px", fontSize: 11 }}>✕</button>
                      </span>
                    )}
                  </>}
                </div>
              ) : (
                <div style={{ flex: 1, height: 36, borderRadius: 10, border: "1px dashed rgba(124,106,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {!esPublico && <span style={{ fontSize: 11, color: "rgba(124,106,255,0.4)" }}>+ Reservar</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div ref={el => { scrollRef.current = el; if (el) { pinchRef.current = el; } }}
      onScroll={e => setScrollY(e.currentTarget.scrollTop)}
      style={{ height: "100vh", overflowY: "auto", background: "#000000", touchAction: zoom <= 2 ? "pan-y" : "pan-y" }}
      className="tab-content">

      {/* ══ STICKY BAR (solo zoom 3 y 4) ══ */}
      {stickyVisible && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, background: "rgba(0,0,0,0.92)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderBottom: "1px solid rgba(124,106,255,0.15)", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: "white" }}>Reservas</span>
          <img src="/logohead.jpeg" alt="GRINS" style={{ height: 26, objectFit: "contain", opacity: 0.85 }} />
        </div>
      )}

      {/* ══ HEADER ══ */}
      <div style={{ background: "linear-gradient(180deg,#0a0a14 0%,#000000 100%)", padding: `${stickyVisible ? 64 : 54}px 16px 14px` }}>
        {zoom <= 2 && <img src="/logohead.jpeg" alt="GRINS" style={{ height: 32, objectFit: "contain", opacity: 0.85, marginBottom: 12, display: "block" }} />}

        {/* SUB-TABS */}
        <div style={{ display: "flex", background: "rgba(14,12,28,0.8)", borderRadius: 12, padding: 3, border: "1px solid rgba(124,106,255,0.15)", marginBottom: 12 }}>
          {[["agenda", "📅 Agenda"], ["pagos", "💰 Pagos"]].map(([v, label]) => (
            (!esPublico || v !== "pagos") && (
              <button key={v} onClick={() => setSubVista(v)} style={{ flex: 1, padding: "8px", borderRadius: 9, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 12, background: subVista === v ? "linear-gradient(135deg,#667eea,#764ba2)" : "transparent", color: subVista === v ? "white" : "#a0a8c0", transition: "all 0.2s" }}>{label}</button>
            )
          ))}
        </div>

        {subVista === "agenda" && (
          <>
            {/* INDICADOR DE ZOOM */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 4 }}>
                {[1, 2, 3, 4].map(z => (
                  <button key={z} onClick={() => setZoom(z)} style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: zoom === z ? "linear-gradient(135deg,#667eea,#764ba2)" : "rgba(124,106,255,0.1)", color: zoom === z ? "white" : "#7c6aff", fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}>{z}</button>
                ))}
              </div>
              <span style={{ fontSize: 10, color: "#4a5270", fontStyle: "italic" }}>
                {ZOOM_LABELS[zoom - 1]}
                {zoom >= 1 && zoom <= 2 && " · pellizcar para zoom"}
              </span>
            </div>

            {/* NAV SEMANA */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button onClick={() => setWeekOffset(w => w - 1)} style={{ width: 32, height: 32, borderRadius: 9, border: "1px solid rgba(124,106,255,0.2)", background: "rgba(14,12,28,0.8)", cursor: "pointer", color: "white", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
              <span style={{ flex: 1, textAlign: "center", fontWeight: 700, fontSize: 11, color: "#a0a8c0" }}>
                {weekDates[0].toLocaleDateString("es-AR", { day: "numeric", month: "short" })} – {weekDates[5].toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
              </span>
              <button onClick={() => setWeekOffset(w => w + 1)} style={{ width: 32, height: 32, borderRadius: 9, border: "1px solid rgba(124,106,255,0.2)", background: "rgba(14,12,28,0.8)", cursor: "pointer", color: "white", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
              <button onClick={() => setWeekOffset(0)} style={{ padding: "0 10px", height: 32, borderRadius: 9, border: "1px solid rgba(124,106,255,0.2)", background: "rgba(14,12,28,0.8)", cursor: "pointer", color: "#a0a8c0", fontSize: 10, fontWeight: 600 }}>Hoy</button>
            </div>

            {/* NAV DÍAS para zoom 3 y 4 */}
            {zoom >= 3 && (
              <div style={{ display: "flex", gap: 6, marginTop: 10, overflowX: "auto", paddingBottom: 2 }}>
                {weekDates.map((fecha, idx) => {
                  const isToday = dateKey(fecha) === todayKey;
                  const isSel = idx === diaSelIdx;
                  return (
                    <button key={idx} onClick={() => setDiaSelIdx(idx)} style={{ flexShrink: 0, padding: "6px 10px", borderRadius: 10, border: "none", background: isSel ? "linear-gradient(135deg,#667eea,#764ba2)" : isToday ? "rgba(124,106,255,0.15)" : "rgba(14,12,28,0.8)", color: isSel ? "white" : isToday ? "#7c6aff" : "#a0a8c0", fontWeight: isSel ? 700 : 500, fontSize: 11, cursor: "pointer", transition: "all 0.2s", textAlign: "center" }}>
                      <div style={{ fontSize: 9 }}>{DIAS_SEMANA[fecha.getDay()]}</div>
                      <div style={{ fontSize: 14, fontWeight: 800 }}>{fecha.getDate()}</div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* NAV CONSULTORIOS para zoom 4 */}
            {zoom === 4 && (
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                {CONSULTORIOS.map((c, ci) => (
                  <button key={c} onClick={() => setConsultorioSel(ci)} style={{ flex: 1, padding: "7px", borderRadius: 9, border: "none", background: consultorioSel === ci ? "linear-gradient(135deg,#667eea,#764ba2)" : "rgba(14,12,28,0.8)", color: consultorioSel === ci ? "white" : "#a0a8c0", fontWeight: 600, fontSize: 11, cursor: "pointer", transition: "all 0.2s" }}>C{ci + 1}</button>
                ))}
              </div>
            )}

            {/* NAV GRUPO para zoom 2 */}
            {zoom === 2 && (
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                <button onClick={() => setZ2group(0)} style={{ flex: 1, padding: "7px", borderRadius: 9, border: "none", background: z2group === 0 ? "linear-gradient(135deg,#667eea,#764ba2)" : "rgba(14,12,28,0.8)", color: z2group === 0 ? "white" : "#a0a8c0", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>‹ Lun · Mar · Mié</button>
                <button onClick={() => setZ2group(1)} style={{ flex: 1, padding: "7px", borderRadius: 9, border: "none", background: z2group === 1 ? "linear-gradient(135deg,#667eea,#764ba2)" : "rgba(14,12,28,0.8)", color: z2group === 1 ? "white" : "#a0a8c0", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>Jue · Vie · Sáb ›</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ══ CONTENIDO ══ */}
      {subVista === "agenda" && (
        <div style={{ padding: "8px 8px 100px" }}>
          {zoom === 1 && <Grilla dias={diasZ1} showName={false} cellHeight={22} colWidth={38} />}
          {zoom === 2 && <Grilla dias={diasZ2} showName={true} cellHeight={26} colWidth={52} />}
          {zoom === 3 && <GrillaUnDia fecha={diaZ34} />}
          {zoom === 4 && <GrillaUnConsultorio fecha={diaZ34} consultorio={CONSULTORIOS[consultorioSel]} />}
        </div>
      )}

      {/* ══ PAGOS ══ */}
      {subVista === "pagos" && !esPublico && (
        <div style={{ padding: "16px 14px 100px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <button onClick={() => setMesOffset(m => m - 1)} style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid rgba(124,106,255,0.2)", background: "rgba(14,12,28,0.8)", cursor: "pointer", color: "white", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
            <span style={{ flex: 1, textAlign: "center", fontWeight: 700, fontSize: 13, color: "white", textTransform: "capitalize" }}>{mesLabel}</span>
            <button onClick={() => setMesOffset(m => m + 1)} style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid rgba(124,106,255,0.2)", background: "rgba(14,12,28,0.8)", cursor: "pointer", color: "white", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
            <button onClick={() => setMesOffset(0)} style={{ padding: "0 10px", height: 34, borderRadius: 10, border: "1px solid rgba(124,106,255,0.2)", background: "rgba(14,12,28,0.8)", cursor: "pointer", color: "#a0a8c0", fontSize: 11 }}>Hoy</button>
            {esAdmin && <button onClick={() => exportarCSV(profesionales, reservas, mesStr)} style={{ padding: "0 12px", height: 34, borderRadius: 10, border: "none", background: "linear-gradient(135deg,#667eea,#764ba2)", color: "white", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>⬇ CSV</button>}
          </div>

          {esAdmin && profesionales.length > 0 && (() => {
            const total = profesionales.reduce((a, p) => a + calcularPagosProfesional(reservas, p, mesStr).totalMes, 0);
            return <div style={{ background: "rgba(14,12,28,0.9)", borderRadius: 14, padding: "14px 18px", marginBottom: 14, display: "flex", justifyContent: "space-between", border: "1px solid rgba(124,106,255,0.15)" }}><span style={{ color: "#a0a8c0", fontWeight: 700, fontSize: 12 }}>Total {mesLabel}</span><span style={{ color: "white", fontWeight: 900, fontSize: 20 }}>{formatCurrency(total)}</span></div>;
          })()}

          {profesionales.map(prof => {
            const { totalMes, detalle } = calcularPagosProfesional(reservas, prof, mesStr);
            const col = colorMap[prof] || COLORES_PROF[0];
            return (
              <div key={prof} style={{ background: "rgba(14,12,28,0.8)", borderRadius: 14, marginBottom: 12, overflow: "hidden", border: "1px solid rgba(124,106,255,0.1)" }}>
                <div style={{ background: col.bg, padding: "11px 16px", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "white", fontWeight: 800, fontSize: 14 }}>👤 {prof}</span>
                  <span style={{ color: "white", fontWeight: 900, fontSize: 18 }}>{formatCurrency(totalMes)}</span>
                </div>
                {detalle.length === 0
                  ? <p style={{ padding: "12px 16px", color: "#4a5270", fontSize: 12, margin: 0 }}>Sin reservas este mes.</p>
                  : <div style={{ padding: 10 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                      <thead><tr style={{ color: "#4a5270" }}>{["Consultorio", "Fecha", "Horario", "Tipo", "Horas", "Monto"].map(h => <th key={h} style={{ textAlign: h === "Monto" || h === "Horas" ? "right" : "left", padding: "4px 6px", fontWeight: 600 }}>{h}</th>)}</tr></thead>
                      <tbody>{detalle.map(d => (
                        <tr key={d.id} style={{ borderTop: "1px solid rgba(124,106,255,0.08)" }}>
                          <td style={{ padding: "5px 6px", color: "white" }}>{d.consultorio}</td>
                          <td style={{ padding: "5px 6px", color: "#a0a8c0" }}>{new Date(d.fecha + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })}</td>
                          <td style={{ padding: "5px 6px", color: "white" }}>{d.horaInicio}:00–{d.horaFin}:00</td>
                          <td style={{ padding: "5px 6px" }}><span style={{ background: "rgba(124,106,255,0.15)", color: "#7c6aff", borderRadius: 4, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>{d.tipo}</span></td>
                          <td style={{ padding: "5px 6px", textAlign: "right", color: "#a0a8c0" }}>{d.horas}h{d.tipo === "Semanal" ? ` × ${d.ocurrenciasMes}` : ""}</td>
                          <td style={{ padding: "5px 6px", textAlign: "right", fontWeight: 800, color: "white" }}>{formatCurrency(d.montoMes)}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                    <div style={{ borderTop: "1px solid rgba(124,106,255,0.1)", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 11, color: "#4a5270" }}>${HORA_PRECIO.toLocaleString("es-AR")}/hora</span>
                      <span style={{ fontWeight: 900, color: "white", fontSize: 13 }}>Total: {formatCurrency(totalMes)}</span>
                    </div>
                  </div>
                }
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
              <span style={{ fontSize: 13, color: "#a0a8c0" }}>{form.horaFin - form.horaInicio}h × ${HORA_PRECIO.toLocaleString("es-AR")}</span>
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
            <h3 style={{ margin: "0 0 8px", color: "white", fontSize: 16, fontWeight: 800 }}>¿Eliminar esta reserva?</h3>
            <p style={{ margin: "0 0 20px", color: "#a0a8c0", fontSize: 13 }}>Esta acción no se puede deshacer.</p>
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
