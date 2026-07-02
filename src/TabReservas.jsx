import { useState, useMemo, useRef, useEffect, useCallback } from "react";

const HORA_PRECIO = 3500;
const HORAS = Array.from({ length: 14 }, (_, i) => i + 8);
const CONSULTORIOS = ["Consultorio 3", "Consultorio 4", "Consultorio 5"];
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
    const d = new Date(monday); d.setDate(monday.getDate() + i); return d;
  });
}

function dateKey(date) { return date.toISOString().slice(0, 10); }
function formatCurrency(n) { return "$" + n.toLocaleString("es-AR"); }

function calcularPagosProfesional(reservas, profesional, mesStr) {
  let totalMes = 0; const detalle = [];
  reservas.filter(r => r.profesional === profesional).forEach(r => {
    const horas = r.horaFin - r.horaInicio, montoBloque = horas * HORA_PRECIO;
    if (r.repeteSemanal) {
      const year = parseInt(mesStr.slice(0, 4)), month = parseInt(mesStr.slice(5, 7)) - 1;
      const diasEnMes = new Date(year, month + 1, 0).getDate();
      const fechaOrig = new Date(r.fecha + "T12:00:00"); let ocurrencias = 0;
      for (let d = 1; d <= diasEnMes; d++) {
        const dia = new Date(year, month, d);
        if (dia.getDay() === fechaOrig.getDay() && dia >= fechaOrig) ocurrencias++;
      }
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
  const rows = ["Profesional,Consultorio,Día,Horario,Tipo,Horas,Ocurrencias,Monto"];
  profesionales.forEach(prof => {
    const { detalle } = calcularPagosProfesional(reservas, prof, mesStr);
    detalle.forEach(d => {
      const dia = new Date(d.fecha + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long" });
      rows.push([prof, d.consultorio, `${dia} ${d.fecha}`, `${d.horaInicio}:00-${d.horaFin}:00`, d.tipo, d.horas, d.tipo === "Semanal" ? d.ocurrenciasMes : 1, d.montoMes].join(","));
    });
    rows.push([prof, "", "", "", "TOTAL", "", "", calcularPagosProfesional(reservas, prof, mesStr).totalMes].join(""), "");
  });
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href = url; a.download = `pagos_${mesStr}.csv`; a.click(); URL.revokeObjectURL(url);
}

// ── Hook pinch to zoom con detección de posición ───────────────────────────
function usePinchZoom(onZoom) {
  const ref = useRef(null);
  const lastDist = useRef(null);
  const centerRef = useRef(null);

  useEffect(() => {
    const el = ref.current; if (!el) return;
    function getDist(t) {
      const dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }
    function getCenter(t) {
      return {
        x: (t[0].clientX + t[1].clientX) / 2,
        y: (t[0].clientY + t[1].clientY) / 2
      };
    }
    function onStart(e) {
      if (e.touches.length === 2) {
        e.preventDefault();
        lastDist.current = getDist(e.touches);
        centerRef.current = getCenter(e.touches);
      }
    }
    function onMove(e) {
      if (e.touches.length !== 2 || lastDist.current === null) return;
      e.preventDefault();
      const dist = getDist(e.touches), delta = dist - lastDist.current;
      if (Math.abs(delta) > 25) {
        onZoom(delta > 0 ? "in" : "out", centerRef.current);
        lastDist.current = null;
      }
    }
    function onEnd() { lastDist.current = null; centerRef.current = null; }
    el.addEventListener("touchstart", onStart, { passive: false });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
    };
  }, [onZoom]);
  return ref;
}

function getHoraActualPct() {
  const now = new Date();
  const minutos = (now.getHours() - 8) * 60 + now.getMinutes();
  return Math.max(0, Math.min(minutos / (14 * 60), 1));
}

export default function TabReservas({ usuario, esAdmin, esPublico, t, reservas, agregarReserva, actualizarReserva, eliminarReserva, showToast, onLogin }) {
  const [zoom, setZoom] = useState(1);
  const [subVista, setSubVista] = useState("agenda"); // "agenda" | "misReservas"
  const [weekOffset, setWeekOffset] = useState(0);
  const [mesOffset, setMesOffset] = useState(0);
  // Índice global: lun_c3=0, lun_c4=1, lun_c5=2, mar_c3=3, ...
  const [viewIdx, setViewIdx] = useState(() => {
    const d = new Date().getDay();
    const diaIdx = d === 0 ? 0 : d - 1;
    return diaIdx * CONSULTORIOS.length; // empieza en C3 del día actual
  });
  const [seleccionadas, setSeleccionadas] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ profesional: "", horaInicio: 8, horaFin: 9, repeteSemanal: false });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [errorSolapamiento, setErrorSolapamiento] = useState("");
  const [horaActualPct, setHoraActualPct] = useState(getHoraActualPct());
  // Para swipe en zoom 3/4
  const swipeStartX = useRef(null);
  const swipeStartY = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => setHoraActualPct(getHoraActualPct()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const meta = document.querySelector("meta[name=viewport]");
    if (meta) meta.content = "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no";
    return () => { if (meta) meta.content = "width=device-width, initial-scale=1"; };
  }, []);

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const mesStr = useMemo(() => { const d = new Date(); d.setMonth(d.getMonth() + mesOffset); return d.toISOString().slice(0, 7); }, [mesOffset]);
  const mesLabel = useMemo(() => { const [y, m] = mesStr.split("-"); return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" }); }, [mesStr]);

  const colorMap = useMemo(() => {
    const map = {}; let idx = 0;
    reservas.forEach(r => { if (r.profesional && !map[r.profesional]) { map[r.profesional] = COLORES_PROF[idx % COLORES_PROF.length]; idx++; } });
    return map;
  }, [reservas]);

  const profesionales = useMemo(() => esAdmin ? Object.keys(colorMap) : usuario?.nombre ? [usuario.nombre] : [], [colorMap, esAdmin, usuario]);

  // Total de vistas en zoom 3: 6 días × 3 consultorios = 18
  // Total de vistas en zoom 4: mismo
  const TOTAL_VISTAS = weekDates.length * CONSULTORIOS.length;

  // Derivar diaIdx y consultorioIdx desde viewIdx
  const diaIdx = Math.floor(viewIdx / CONSULTORIOS.length);
  const consultorioIdx = viewIdx % CONSULTORIOS.length;
  const diaActual = weekDates[Math.min(diaIdx, weekDates.length - 1)];
  const consultorioActual = CONSULTORIOS[consultorioIdx];

  // Pinch zoom: detecta posición y navega al día/consultorio correcto
  const handlePinch = useCallback((dir, center) => {
    setZoom(prev => {
      const next = dir === "in" ? Math.min(prev + 1, 4) : Math.max(prev - 1, 1);
      // Si hacemos zoom in desde Z1/Z2, intentamos navegar al día más cercano al centro del gesto
      if (dir === "in" && prev <= 2 && next >= 3 && center) {
        // Estimamos qué columna tocó basándonos en X relativa a la pantalla
        const pct = center.x / window.innerWidth;
        const colTotal = weekDates.length * CONSULTORIOS.length;
        const estimatedIdx = Math.floor(pct * colTotal);
        setViewIdx(Math.max(0, Math.min(estimatedIdx, colTotal - 1)));
      }
      return next;
    });
  }, [weekDates.length]);

  const pinchRef = usePinchZoom(handlePinch);

  // Swipe para zoom 3 y 4: horizontal cambia consultorio primero, luego día
  function handleSwipeStart(e) {
    if (e.touches.length !== 1) return;
    swipeStartX.current = e.touches[0].clientX;
    swipeStartY.current = e.touches[0].clientY;
  }
  function handleSwipeEnd(e) {
    if (swipeStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - swipeStartX.current;
    const dy = e.changedTouches[0].clientY - swipeStartY.current;
    swipeStartX.current = null; swipeStartY.current = null;
    if (Math.abs(dx) < 40 && Math.abs(dy) < 40) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      // Swipe horizontal → avanza/retrocede en el array (consultorio primero, luego día)
      if (dx < -40) setViewIdx(i => Math.min(i + 1, TOTAL_VISTAS - 1));
      else if (dx > 40) setViewIdx(i => Math.max(i - 1, 0));
    }
  }

  function hayConflicto(consultorio, fecha, horaInicio, horaFin, excludeId = null) {
    const key = dateKey(fecha), dow = fecha.getDay();
    return reservas.some(r => {
      if (r.id === excludeId || r.consultorio !== consultorio) return false;
      const ok = r.fecha === key || (r.repeteSemanal && new Date(r.fecha + "T12:00:00").getDay() === dow && new Date(r.fecha + "T12:00:00") <= fecha);
      return ok && horaInicio < r.horaFin && horaFin > r.horaInicio;
    });
  }

  function puedeEditar(r) { return esAdmin || r.profesional === usuario?.nombre; }

  function toggleSeleccion(consultorio, fecha, hora) {
    if (esPublico) { onLogin(); return; }
    const key = `${consultorio}__${dateKey(fecha)}__${hora}`;
    setSeleccionadas(prev => {
      const existe = prev.find(s => `${s.consultorio}__${s.fechaKey}__${s.hora}` === key);
      if (existe) return prev.filter(s => `${s.consultorio}__${s.fechaKey}__${s.hora}` !== key);
      return [...prev, { consultorio, fechaKey: dateKey(fecha), fecha, hora }];
    });
  }

  function estaSeleccionada(consultorio, fecha, hora) {
    return seleccionadas.some(s => s.consultorio === consultorio && s.fechaKey === dateKey(fecha) && s.hora === hora);
  }

  function abrirModalMultiple() {
    if (seleccionadas.length === 0) return;
    const primera = seleccionadas[0];
    const horaMin = Math.min(...seleccionadas.filter(s => s.consultorio === primera.consultorio && s.fechaKey === primera.fechaKey).map(s => s.hora));
    const horaMax = Math.max(...seleccionadas.filter(s => s.consultorio === primera.consultorio && s.fechaKey === primera.fechaKey).map(s => s.hora)) + 1;
    setErrorSolapamiento("");
    setModal({ mode: "crear", consultorio: primera.consultorio, fecha: primera.fecha });
    setForm({ profesional: esAdmin ? "" : usuario?.nombre, horaInicio: horaMin, horaFin: horaMax, repeteSemanal: false });
  }

  function openEditar(r) {
    if (!puedeEditar(r)) return;
    setErrorSolapamiento("");
    setModal({ mode: "editar", consultorio: r.consultorio, fecha: new Date(r.fecha + "T12:00:00"), reservaId: r.id });
    setForm({ profesional: r.profesional, horaInicio: r.horaInicio, horaFin: r.horaFin, repeteSemanal: r.repeteSemanal });
  }

  function closeModal() { setModal(null); setErrorSolapamiento(""); setSeleccionadas([]); }

  async function guardarReserva() {
    if (!form.profesional.trim() || form.horaFin <= form.horaInicio) return;
    if (hayConflicto(modal.consultorio, modal.fecha, parseInt(form.horaInicio), parseInt(form.horaFin), modal.reservaId)) {
      setErrorSolapamiento("⚠️ Ese horario ya está ocupado. Elegí otro."); return;
    }
    const datos = { profesional: form.profesional.trim(), consultorio: modal.consultorio, fecha: dateKey(modal.fecha), horaInicio: parseInt(form.horaInicio), horaFin: parseInt(form.horaFin), repeteSemanal: form.repeteSemanal, creadoPor: usuario?.email };
    if (modal.mode === "crear") { await agregarReserva(datos); showToast("Reserva guardada ✓"); }
    else { await actualizarReserva(modal.reservaId, datos); showToast("Reserva actualizada ✓"); }
    closeModal();
  }

  async function borrarReserva(id) { await eliminarReserva(id); setConfirmDelete(null); showToast("Reserva eliminada", "warn"); }

  function getReservasBloque(consultorio, fecha, hora) {
    const key = dateKey(fecha), dow = fecha.getDay();
    return reservas.filter(r => {
      if (r.consultorio !== consultorio || hora < r.horaInicio || hora >= r.horaFin) return false;
      if (r.fecha === key) return true;
      if (r.repeteSemanal) { const o = new Date(r.fecha + "T12:00:00"); return o.getDay() === dow && o <= fecha; }
      return false;
    });
  }

  const todayKey = dateKey(new Date());
  const horaActual = new Date().getHours();
  const horasRange = Array.from({ length: 14 }, (_, i) => i + 8);

  const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(124,106,255,0.2)", fontSize: 13, marginBottom: 12, boxSizing: "border-box", outline: "none", background: "rgba(14,12,28,0.8)", color: "white" };
  const labelStyle = { display: "block", fontSize: 11, fontWeight: 700, color: "#a0a8c0", marginBottom: 4, textTransform: "uppercase", letterSpacing: .5 };

  // ── Celda ──────────────────────────────────────────────────────────────────
  function Celda({ consultorio, fecha, hora, showName, cellHeight = 26 }) {
    const bloques = getReservasBloque(consultorio, fecha, hora);
    const libre = bloques.length === 0;
    const sel = estaSeleccionada(consultorio, fecha, hora);
    return (
      <div onClick={() => libre && toggleSeleccion(consultorio, fecha, hora)}
        style={{ height: cellHeight, padding: 1, borderBottom: "1px solid rgba(255,255,255,0.05)", position: "relative", cursor: libre ? "pointer" : "default", background: sel ? "rgba(124,106,255,0.25)" : libre ? "transparent" : undefined, transition: "background 0.15s" }}>
        {bloques.map(r => {
          const col = colorMap[r.profesional] || COLORES_PROF[0];
          const esInicio = hora === r.horaInicio;
          return (
            <div key={r.id} style={{ height: "100%", background: col.bg, borderRadius: esInicio ? "4px 4px 1px 1px" : "1px", padding: "1px 3px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {esInicio && showName && <span style={{ fontSize: 8, fontWeight: 700, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "65%" }}>{r.profesional}</span>}
              {esInicio && showName && puedeEditar(r) && !esPublico && (
                <span style={{ display: "flex", gap: 1, flexShrink: 0 }}>
                  <button onClick={e => { e.stopPropagation(); openEditar(r); }} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", cursor: "pointer", borderRadius: 2, padding: "0 2px", fontSize: 7 }}>✎</button>
                  <button onClick={e => { e.stopPropagation(); setConfirmDelete(r.id); }} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", cursor: "pointer", borderRadius: 2, padding: "0 2px", fontSize: 7 }}>✕</button>
                </span>
              )}
            </div>
          );
        })}
        {sel && libre && <div style={{ position: "absolute", inset: 1, borderRadius: 3, border: "1px solid rgba(124,106,255,0.6)", pointerEvents: "none" }} />}
      </div>
    );
  }

  // ── Grilla Z1/Z2 con línea de hora ─────────────────────────────────────────
  function Grilla({ dias, showName, cellHeight = 22, colWidth = 38 }) {
    const totalHeight = cellHeight * HORAS.length;
    const lineaTop = horaActualPct * totalHeight;
    const hoyEnDias = dias.some(f => dateKey(f) === todayKey);
    return (
      <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "calc(100vh - 210px)", position: "relative" }}>
        <table style={{ borderCollapse: "collapse", minWidth: 36 + dias.length * 3 * colWidth }}>
          <thead>
            <tr>
              <th style={{ width: 36, minWidth: 36, background: "rgba(0,0,0,0.8)", position: "sticky", left: 0, zIndex: 5, borderBottom: "1px solid rgba(255,255,255,0.08)" }} />
              {dias.map(fecha => {
                const isToday = dateKey(fecha) === todayKey;
                return (
                  <th key={dateKey(fecha)} colSpan={3} style={{ background: isToday ? "rgba(124,106,255,0.18)" : "rgba(0,0,0,0.7)", color: isToday ? "#a78bfa" : "white", fontSize: 11, fontWeight: 800, padding: "7px 0", textAlign: "center", borderLeft: "2px solid rgba(255,255,255,0.08)", borderBottom: "1px solid rgba(255,255,255,0.08)", minWidth: colWidth * 3 }}>
                    <div style={{ fontSize: 9, color: isToday ? "#a78bfa" : "#a0a8c0", fontWeight: 600 }}>{DIAS_SEMANA[fecha.getDay()]}</div>
                    <div style={{ fontSize: 14 }}>{fecha.getDate()}</div>
                  </th>
                );
              })}
            </tr>
            <tr>
              <th style={{ width: 36, background: "rgba(0,0,0,0.8)", position: "sticky", left: 0, zIndex: 5, borderBottom: "1px solid rgba(255,255,255,0.06)" }} />
              {dias.map(fecha => CONSULTORIOS.map((c, ci) => (
                <th key={`${dateKey(fecha)}-${c}`} style={{ background: "rgba(0,0,0,0.6)", color: "#4a5270", fontSize: 8, fontWeight: 700, padding: "3px 1px", textAlign: "center", borderLeft: ci === 0 ? "2px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)", width: colWidth }}>
                  C{ci + 3}
                </th>
              )))}
            </tr>
          </thead>
          <tbody>
            {HORAS.map(hora => (
              <tr key={hora}>
                <td style={{ padding: "0 6px 0 0", textAlign: "right", fontSize: 9, color: "rgba(255,255,255,0.6)", fontWeight: 600, background: "rgba(0,0,0,0.7)", position: "sticky", left: 0, zIndex: 2, borderRight: "1px solid rgba(255,255,255,0.07)", verticalAlign: "middle", height: cellHeight }}>
                  {hora}h
                </td>
                {dias.map(fecha => CONSULTORIOS.map((c, ci) => (
                  <td key={`${dateKey(fecha)}-${c}-${hora}`} style={{ padding: 0, borderLeft: ci === 0 ? "2px solid rgba(255,255,255,0.07)" : "1px solid rgba(255,255,255,0.03)", width: colWidth }}>
                    <Celda consultorio={c} fecha={fecha} hora={hora} showName={showName} cellHeight={cellHeight} />
                  </td>
                )))}
              </tr>
            ))}
          </tbody>
        </table>
        {hoyEnDias && (
          <div style={{ position: "absolute", top: 70 + lineaTop, left: 0, right: 0, zIndex: 10, pointerEvents: "none", display: "flex", alignItems: "center" }}>
            <div style={{ width: 36, flexShrink: 0 }} />
            <div style={{ flex: 1, height: 1.5, background: "white", opacity: 0.7, boxShadow: "0 0 6px rgba(255,255,255,0.5)" }} />
          </div>
        )}
      </div>
    );
  }

  // ── Zoom 3: un día, 3 consultorios con swipe ───────────────────────────────
  function GrillaUnDia({ fecha, consultorioActivo }) {
    const totalHeight = 36 * HORAS.length;
    const lineaTop = horaActualPct * totalHeight;
    const isToday = dateKey(fecha) === todayKey;
    const ciActivo = CONSULTORIOS.indexOf(consultorioActivo);

    return (
      <div
        onTouchStart={handleSwipeStart} onTouchEnd={handleSwipeEnd}
        style={{ overflowY: "auto", maxHeight: "calc(100vh - 230px)", position: "relative" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ width: 42, background: "rgba(0,0,0,0.8)", borderBottom: "1px solid rgba(255,255,255,0.08)", position: "sticky", top: 0, zIndex: 3 }} />
              {CONSULTORIOS.map((c, ci) => {
                const isActive = ci === ciActivo;
                return (
                  <th key={c} onClick={() => setViewIdx(diaIdx * CONSULTORIOS.length + ci)}
                    style={{ background: isActive ? "rgba(124,106,255,0.18)" : "rgba(0,0,0,0.8)", color: isActive ? "#a78bfa" : "#a0a8c0", fontSize: 12, fontWeight: isActive ? 800 : 600, padding: "8px 4px", textAlign: "center", borderLeft: "1px solid rgba(255,255,255,0.07)", borderBottom: "1px solid rgba(255,255,255,0.08)", position: "sticky", top: 0, zIndex: 3, cursor: "pointer", transition: "all 0.2s" }}>
                    C{ci + 3}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {HORAS.map(hora => (
              <tr key={hora}>
                <td style={{ padding: "0 6px 0 0", textAlign: "right", fontSize: 10, color: "rgba(255,255,255,0.65)", fontWeight: 600, background: "rgba(0,0,0,0.7)", borderRight: "1px solid rgba(255,255,255,0.07)", verticalAlign: "middle", height: 36 }}>{hora}:00</td>
                {CONSULTORIOS.map((c, ci) => {
                  const isActive = ci === ciActivo;
                  return (
                    <td key={c} style={{ padding: 0, borderLeft: "1px solid rgba(255,255,255,0.05)", background: isActive ? "transparent" : "rgba(0,0,0,0.2)", opacity: isActive ? 1 : 0.4, transition: "all 0.2s" }}>
                      <Celda consultorio={c} fecha={fecha} hora={hora} showName={true} cellHeight={36} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {isToday && (
          <div style={{ position: "absolute", top: 37 + lineaTop, left: 0, right: 0, zIndex: 10, pointerEvents: "none", display: "flex", alignItems: "center" }}>
            <div style={{ width: 42, flexShrink: 0 }} />
            <div style={{ flex: 1, height: 2, background: "white", opacity: 0.8, boxShadow: "0 0 8px rgba(255,255,255,0.6)" }} />
          </div>
        )}
      </div>
    );
  }

  // ── Zoom 4: un día, un consultorio con swipe ───────────────────────────────
  function GrillaUnConsultorio({ fecha, consultorio }) {
    const isToday = dateKey(fecha) === todayKey;
    return (
      <div onTouchStart={handleSwipeStart} onTouchEnd={handleSwipeEnd}
        style={{ overflowY: "auto", maxHeight: "calc(100vh - 270px)", position: "relative" }}>
        {HORAS.map(hora => {
          const bloques = getReservasBloque(consultorio, fecha, hora);
          const libre = bloques.length === 0;
          const esInicio = bloques.length > 0 && bloques[0].horaInicio === hora;
          const sel = estaSeleccionada(consultorio, fecha, hora);
          return (
            <div key={hora} onClick={() => libre && toggleSeleccion(consultorio, fecha, hora)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 14px", height: 46, borderBottom: "1px solid rgba(255,255,255,0.05)", background: sel ? "rgba(124,106,255,0.2)" : "transparent", cursor: libre ? "pointer" : "default", transition: "background 0.15s", position: "relative" }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", fontWeight: 600, minWidth: 36, textAlign: "right" }}>{hora}:00</span>
              {bloques.length > 0 ? (
                <div style={{ flex: 1, height: 34, borderRadius: 10, background: (colorMap[bloques[0].profesional] || COLORES_PROF[0]).bg, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px" }}>
                  {esInicio && <>
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
                <div style={{ flex: 1, height: 34, borderRadius: 10, border: `1px dashed ${sel ? "rgba(124,106,255,0.5)" : "rgba(255,255,255,0.08)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {sel ? <span style={{ fontSize: 11, color: "#a78bfa" }}>✓ Seleccionado</span> : !esPublico && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>Tocá para seleccionar</span>}
                </div>
              )}
              {isToday && hora === horaActual && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "white", opacity: 0.7, pointerEvents: "none" }} />}
            </div>
          );
        })}
      </div>
    );
  }

  // ── Encabezado de contexto para zoom 3 y 4 ────────────────────────────────
  function EncabezadoContexto() {
    const isToday = dateKey(diaActual) === todayKey;
    const diaLabel = diaActual.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
    const cLabel = `C${consultorioIdx + 3} — ${consultorioActual}`;

    return (
      <div style={{ padding: "10px 14px 8px", background: "rgba(0,0,0,0.4)", borderBottom: "1px solid rgba(124,106,255,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "white" }}>{cLabel}</div>
          <div style={{ fontSize: 11, color: isToday ? "#a78bfa" : "#a0a8c0", marginTop: 2 }}>
            {isToday ? "Hoy · " : ""}{diaLabel}
          </div>
        </div>
        {/* Indicador de posición: C3 C4 C5 / días */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {CONSULTORIOS.map((_, ci) => (
              <div key={ci} style={{ width: ci === consultorioIdx ? 16 : 6, height: 4, borderRadius: 2, background: ci === consultorioIdx ? "#7c6aff" : "rgba(124,106,255,0.2)", transition: "all 0.2s" }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 3 }}>
            {weekDates.map((_, di) => (
              <div key={di} style={{ width: di === diaIdx ? 12 : 4, height: 3, borderRadius: 2, background: di === diaIdx ? "#a78bfa" : "rgba(124,106,255,0.15)", transition: "all 0.2s" }} />
            ))}
          </div>
          <span style={{ fontSize: 8, color: "#4a5270" }}>← swipe →</span>
        </div>
      </div>
    );
  }

  return (
    <div ref={pinchRef} style={{ height: "100vh", overflowY: "auto", background: "#000000" }} className="tab-content">

      {/* ══ STICKY BAR siempre visible ══ */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, background: "rgba(0,0,0,0.92)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderBottom: "1px solid rgba(124,106,255,0.15)", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: "white" }}>Reservas</span>
        {/* Instrucción breve */}
        <span style={{ fontSize: 10, color: "#4a5270", fontStyle: "italic" }}>
          {zoom <= 2 ? "pellizco para acercar" : "swipe para navegar"}
        </span>
      </div>

      {/* ══ HEADER ══ */}
      <div style={{ background: "linear-gradient(180deg,#0a0a14 0%,#000000 100%)", padding: "60px 14px 12px" }}>

        {/* SUB-TABS con coherencia visual de Lazos */}
        <div style={{ display: "flex", background: "rgba(14,12,28,0.8)", borderRadius: 12, padding: 3, border: "1px solid rgba(124,106,255,0.15)", marginBottom: 12 }}>
          {[["agenda", "📅 Agenda"], (!esPublico ? ["misReservas", "💰 Mis reservas"] : null)].filter(Boolean).map(([v, label]) => (
            <button key={v} onClick={() => setSubVista(v)} style={{ flex: 1, padding: "8px", borderRadius: 9, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 12, background: subVista === v ? "linear-gradient(135deg,#667eea,#764ba2)" : "transparent", color: subVista === v ? "white" : "#a0a8c0", transition: "all 0.2s" }}>{label}</button>
          ))}
        </div>

        {subVista === "agenda" && (
          <>
            {/* NAV SEMANA */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
              <button onClick={() => setWeekOffset(w => w - 1)} style={{ width: 32, height: 32, borderRadius: 9, border: "1px solid rgba(124,106,255,0.2)", background: "rgba(14,12,28,0.8)", cursor: "pointer", color: "white", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
              <span style={{ flex: 1, textAlign: "center", fontWeight: 700, fontSize: 11, color: "#a0a8c0" }}>
                {weekDates[0].toLocaleDateString("es-AR", { day: "numeric", month: "short" })} – {weekDates[5].toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
              </span>
              <button onClick={() => setWeekOffset(w => w + 1)} style={{ width: 32, height: 32, borderRadius: 9, border: "1px solid rgba(124,106,255,0.2)", background: "rgba(14,12,28,0.8)", cursor: "pointer", color: "white", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
              <button onClick={() => setWeekOffset(0)} style={{ padding: "0 10px", height: 32, borderRadius: 9, border: "1px solid rgba(124,106,255,0.2)", background: "rgba(14,12,28,0.8)", cursor: "pointer", color: "#a0a8c0", fontSize: 10, fontWeight: 600 }}>Hoy</button>
            </div>
          </>
        )}
      </div>

      {/* ══ AGENDA ══ */}
      {subVista === "agenda" && (
        <div style={{ padding: "0 6px 180px" }}>
          {zoom === 1 && <Grilla dias={weekDates} showName={false} cellHeight={22} colWidth={36} />}
          {zoom === 2 && <Grilla dias={weekDates} showName={true} cellHeight={26} colWidth={50} />}
          {zoom >= 3 && <EncabezadoContexto />}
          {zoom === 3 && <GrillaUnDia fecha={diaActual} consultorioActivo={consultorioActual} />}
          {zoom === 4 && <GrillaUnConsultorio fecha={diaActual} consultorio={consultorioActual} />}
        </div>
      )}

      {/* ══ MIS RESERVAS (pagos) ══ */}
      {subVista === "misReservas" && !esPublico && (
        <div style={{ padding: "16px 14px 180px" }}>
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
                {detalle.length === 0 ? <p style={{ padding: "12px 16px", color: "#4a5270", fontSize: 12, margin: 0 }}>Sin reservas este mes.</p> :
                  <div style={{ padding: 10 }}>
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

      {/* ══ BOTÓN FLOTANTE NUEVA RESERVA ══ */}
      {seleccionadas.length > 0 && !esPublico && (
        <button onClick={abrirModalMultiple} style={{ position: "fixed", bottom: 160, right: 20, zIndex: 100, width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg,#667eea,#764ba2)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(124,106,255,0.5)", animation: "popIn 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      )}
      {seleccionadas.length > 0 && !esPublico && (
        <div style={{ position: "fixed", bottom: 160, right: 86, zIndex: 100, background: "rgba(0,0,0,0.85)", border: "1px solid rgba(124,106,255,0.3)", borderRadius: 20, padding: "6px 14px", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "#a78bfa", fontWeight: 700 }}>{seleccionadas.length} hora{seleccionadas.length > 1 ? "s" : ""}</span>
          <button onClick={() => setSeleccionadas([])} style={{ background: "none", border: "none", color: "#4a5270", cursor: "pointer", fontSize: 13, padding: 0 }}>✕</button>
        </div>
      )}

      {/* ══ FOOTER estilo Lazos ══ */}
      {subVista === "agenda" && (
        <div style={{ position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)", zIndex: 60, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: "calc(100% - 32px)", maxWidth: 340 }}>

          {/* Fila superior: [←Zoom] [+] [Mis reservas] */}
          <div style={{ display: "flex", alignItems: "center", width: "100%", gap: 8, background: "rgba(10,10,20,0.92)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(124,106,255,0.2)", borderRadius: 22, padding: "8px 12px", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>

            {/* SLIDER DE ZOOM */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%", paddingBottom: 1 }}>
                {[1,2,3,4].map(z => (
                  <span key={z} style={{ fontSize: 8, color: zoom === z ? "#7c6aff" : "#3a3a5a", fontWeight: zoom === z ? 800 : 500, transition: "color 0.2s" }}>{z}</span>
                ))}
              </div>
              <input
                type="range" min={1} max={4} step={1} value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                style={{ width: "100%", height: 4, cursor: "pointer", accentColor: "#7c6aff", background: `linear-gradient(to right, #7c6aff ${(zoom-1)/3*100}%, rgba(124,106,255,0.2) ${(zoom-1)/3*100}%)`, borderRadius: 4, outline: "none", WebkitAppearance: "none" }}
              />
            </div>

            {/* BOTÓN + */}
            <button onClick={() => {
              if (esPublico) { onLogin(); return; }
              setModal({ mode: "crear", consultorio: consultorioActual, fecha: diaActual });
              setForm({ profesional: esAdmin ? "" : usuario?.nombre, horaInicio: Math.max(horaActual, 8), horaFin: Math.max(horaActual + 1, 9), repeteSemanal: false });
            }} style={{ width: 50, height: 50, borderRadius: "50%", border: "none", background: "linear-gradient(135deg,#667eea,#764ba2)", color: "white", fontSize: 28, fontWeight: 300, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 16px rgba(124,106,255,0.5)" }}>
              +
            </button>

            {/* MIS RESERVAS */}
            <button onClick={() => setSubVista("misReservas")} style={{ flex: 1, background: "transparent", border: "none", color: "#a0a8c0", fontSize: 9, fontWeight: 600, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "4px 0" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a0a8c0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
                <line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>
              </svg>
              Mis reservas
            </button>
          </div>
        </div>
      )}

      {/* Botón volver en mis reservas */}
      {subVista === "misReservas" && (
        <div style={{ position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)", zIndex: 60, width: "calc(100% - 32px)", maxWidth: 340 }}>
          <button onClick={() => setSubVista("agenda")} style={{ width: "100%", padding: "10px", borderRadius: 16, border: "1px solid rgba(124,106,255,0.25)", background: "rgba(14,12,28,0.9)", backdropFilter: "blur(16px)", color: "#7c6aff", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c6aff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Volver a la agenda
          </button>
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

      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: none; opacity: 1; } }
        @keyframes popIn { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: #7c6aff; cursor: pointer; box-shadow: 0 0 8px rgba(124,106,255,0.6); }
        input[type=range]::-webkit-slider-runnable-track { height: 4px; border-radius: 4px; }
      `}</style>
    </div>
  );
}
