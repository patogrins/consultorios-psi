import { useState, useMemo, useRef, useEffect } from "react";

const HORA_PRECIO = 3500;
const HORAS = Array.from({ length: 14 }, (_, i) => i + 8);
const CONSULTORIOS = ["Consultorio 3", "Consultorio 4", "Consultorio 5"];
const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DIAS_CORTO = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];

const COLORES = [
  "linear-gradient(135deg,#667eea,#764ba2)",
  "linear-gradient(135deg,#f093fb,#f5576c)",
  "linear-gradient(135deg,#4facfe,#00f2fe)",
  "linear-gradient(135deg,#43e97b,#38f9d7)",
  "linear-gradient(135deg,#fa709a,#fee140)",
  "linear-gradient(135deg,#a18cd1,#fbc2eb)",
  "linear-gradient(135deg,#fda085,#f6d365)",
  "linear-gradient(135deg,#96fbc4,#f9f586)",
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
function fmt(n) { return "$" + n.toLocaleString("es-AR"); }

function calcPagos(reservas, prof, mes) {
  let total = 0; const det = [];
  reservas.filter(r => r.profesional === prof).forEach(r => {
    const h = r.horaFin - r.horaInicio, monto = h * HORA_PRECIO;
    if (r.repeteSemanal) {
      const [y, m] = mes.split("-").map(Number);
      const dias = new Date(y, m, 0).getDate();
      const orig = new Date(r.fecha + "T12:00:00"); let occ = 0;
      for (let d = 1; d <= dias; d++) { const x = new Date(y, m - 1, d); if (x.getDay() === orig.getDay() && x >= orig) occ++; }
      total += occ * monto;
      det.push({ ...r, h, monto, occ, total: occ * monto, tipo: "Semanal" });
    } else {
      if (r.fecha.startsWith(mes)) total += monto;
      det.push({ ...r, h, monto, occ: 1, total: r.fecha.startsWith(mes) ? monto : 0, tipo: "Única" });
    }
  });
  return { total, det };
}

function exportCSV(profs, reservas, mes) {
  const rows = ["Profesional,Consultorio,Fecha,Horario,Tipo,Horas,Ocurrencias,Monto"];
  profs.forEach(p => {
    const { det } = calcPagos(reservas, p, mes);
    det.forEach(d => rows.push([p, d.consultorio, d.fecha, `${d.horaInicio}:00-${d.horaFin}:00`, d.tipo, d.h, d.occ, d.total].join(",")));
    rows.push([p, "", "", "", "TOTAL", "", "", calcPagos(reservas, p, mes).total].join(""), "");
  });
  const b = new Blob([rows.join("\n")], { type: "text/csv" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(b);
  a.download = `pagos_${mes}.csv`; a.click();
}

function getLineaPct() {
  const n = new Date();
  return Math.max(0, Math.min(((n.getHours() - 8) * 60 + n.getMinutes()) / (14 * 60), 1));
}

export default function TabReservas({ usuario, esAdmin, esPublico, reservas = [], agregarReserva, actualizarReserva, eliminarReserva, showToast, onLogin }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [mesOffset, setMesOffset] = useState(0);
  const [vista, setVista] = useState("semana"); // semana | dia | pagos
  const [diaActivo, setDiaActivo] = useState(null);
  const [consultorioActivo, setConsultorioActivo] = useState(null);
  // Selección por arrastre
  const [selBloque, setSelBloque] = useState(null); // { consultorio, fechaKey, fecha, horas:[] }
  const arrastrandoDesde = useRef(null);
  // Modal
  const [modal, setModal] = useState(null); // null | "nueva" | "detalle" | "editar" | "pagos-detalle"
  const [reservaModal, setReservaModal] = useState(null);
  const [form, setForm] = useState({ profesional: "", horaInicio: 8, horaFin: 9, repeteSemanal: false });
  const [error, setError] = useState("");
  const [linea, setLinea] = useState(getLineaPct());
  // Pinch zoom para cambiar entre semana/día
  const pinchRef = useRef(null);
  const lastDist = useRef(null);

  useEffect(() => {
    const i = setInterval(() => setLinea(getLineaPct()), 60000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    const meta = document.querySelector("meta[name=viewport]");
    if (meta) meta.content = "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no";
    return () => { if (meta) meta.content = "width=device-width, initial-scale=1"; };
  }, []);

  // Pinch: acercar → vista día, alejar → vista semana
  useEffect(() => {
    const el = pinchRef.current; if (!el) return;
    function dist(t) { const dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY; return Math.sqrt(dx * dx + dy * dy); }
    function onStart(e) { if (e.touches.length === 2) { e.preventDefault(); lastDist.current = dist(e.touches); } }
    function onMove(e) {
      if (e.touches.length !== 2 || !lastDist.current) return;
      e.preventDefault();
      const d = dist(e.touches), delta = d - lastDist.current;
      if (Math.abs(delta) > 30) {
        if (delta > 0 && vista === "semana") {
          // Detectar en qué día/consultorio está el centro del gesto
          const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
          const el2 = document.elementFromPoint(cx, cy);
          const dKey = el2?.closest("[data-fecha]")?.dataset.fecha;
          const cIdx = el2?.closest("[data-ci]")?.dataset.ci;
          if (dKey) {
            const fecha = weekDates.find(f => dateKey(f) === dKey);
            if (fecha) { setDiaActivo(fecha); setConsultorioActivo(cIdx !== undefined ? parseInt(cIdx) : 0); setVista("dia"); }
          }
        } else if (delta < 0 && vista === "dia") {
          setVista("semana");
        }
        lastDist.current = null;
      }
    }
    function onEnd() { lastDist.current = null; }
    el.addEventListener("touchstart", onStart, { passive: false });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    return () => { el.removeEventListener("touchstart", onStart); el.removeEventListener("touchmove", onMove); el.removeEventListener("touchend", onEnd); };
  }, [vista]);

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const mesStr = useMemo(() => { const d = new Date(); d.setMonth(d.getMonth() + mesOffset); return d.toISOString().slice(0, 7); }, [mesOffset]);
  const mesLabel = useMemo(() => { const [y, m] = mesStr.split("-"); return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" }); }, [mesStr]);
  const todayKey = dateKey(new Date());
  const horaActual = new Date().getHours();

  const colorMap = useMemo(() => {
    const map = {}; let i = 0;
    reservas.forEach(r => { if (r.profesional && !map[r.profesional]) { map[r.profesional] = COLORES[i % COLORES.length]; i++; } });
    return map;
  }, [reservas]);

  const profs = useMemo(() => esAdmin ? Object.keys(colorMap) : usuario?.nombre ? [usuario.nombre] : [], [colorMap, esAdmin, usuario]);

  function getBloques(consultorio, fecha, hora) {
    const key = dateKey(fecha), dow = fecha.getDay();
    return reservas.filter(r => {
      if (r.consultorio !== consultorio || hora < r.horaInicio || hora >= r.horaFin) return false;
      return r.fecha === key || (r.repeteSemanal && new Date(r.fecha + "T12:00:00").getDay() === dow && new Date(r.fecha + "T12:00:00") <= fecha);
    });
  }

  function conflicto(consultorio, fecha, hi, hf, excId = null) {
    const key = dateKey(fecha), dow = fecha.getDay();
    return reservas.some(r => {
      if (r.id === excId || r.consultorio !== consultorio) return false;
      const ok = r.fecha === key || (r.repeteSemanal && new Date(r.fecha + "T12:00:00").getDay() === dow && new Date(r.fecha + "T12:00:00") <= fecha);
      return ok && hi < r.horaFin && hf > r.horaInicio;
    });
  }

  function puedeEditar(r) { return esAdmin || r.profesional === usuario?.nombre; }

  // Abrir modal nueva reserva
  function abrirNueva(fecha, consultorio, hora) {
    if (esPublico) { onLogin(); return; }
    setForm({ profesional: esAdmin ? "" : usuario?.nombre || "", horaInicio: hora, horaFin: hora + 1, repeteSemanal: false });
    setReservaModal({ fecha, consultorio });
    setError(""); setModal("nueva");
  }

  // Abrir desde bloque seleccionado por arrastre
  function abrirDesdeBloque() {
    if (!selBloque || selBloque.horas.length === 0) return;
    const hi = Math.min(...selBloque.horas), hf = Math.max(...selBloque.horas) + 1;
    setForm({ profesional: esAdmin ? "" : usuario?.nombre || "", horaInicio: hi, horaFin: hf, repeteSemanal: false });
    setReservaModal({ fecha: selBloque.fecha, consultorio: selBloque.consultorio });
    setError(""); setModal("nueva");
  }

  async function guardarNueva() {
    if (!form.profesional.trim()) { setError("Ingresá el nombre del profesional"); return; }
    if (form.horaFin <= form.horaInicio) { setError("El horario de fin debe ser posterior al de inicio"); return; }
    if (conflicto(reservaModal.consultorio, reservaModal.fecha, form.horaInicio, form.horaFin)) { setError("⚠️ Ese horario ya está ocupado"); return; }
    await agregarReserva({ profesional: form.profesional.trim(), consultorio: reservaModal.consultorio, fecha: dateKey(reservaModal.fecha), horaInicio: form.horaInicio, horaFin: form.horaFin, repeteSemanal: form.repeteSemanal, creadoPor: usuario?.email });
    showToast("Reserva guardada ✓");
    setModal(null); setSelBloque(null); setError("");
  }

  async function guardarEdicion() {
    const r = reservaModal;
    if (!form.profesional.trim()) { setError("Ingresá el nombre del profesional"); return; }
    if (conflicto(r.consultorio, new Date(r.fecha + "T12:00:00"), form.horaInicio, form.horaFin, r.id)) { setError("⚠️ Ese horario ya está ocupado"); return; }
    await actualizarReserva(r.id, { ...r, profesional: form.profesional.trim(), horaInicio: form.horaInicio, horaFin: form.horaFin, repeteSemanal: form.repeteSemanal });
    showToast("Reserva actualizada ✓"); setModal(null); setError("");
  }

  async function borrar(id) { await eliminarReserva(id); showToast("Eliminada", "warn"); setModal(null); }

  // Arrastre para seleccionar bloque
  function onCeldaPointerDown(e, consultorio, fecha, hora) {
    if (esPublico) { onLogin(); return; }
    const bloques = getBloques(consultorio, fecha, hora);
    if (bloques.length > 0) return; // celda ocupada
    e.currentTarget.setPointerCapture(e.pointerId);
    arrastrandoDesde.current = { consultorio, fechaKey: dateKey(fecha), fecha, horaInicio: hora };
    setSelBloque({ consultorio, fechaKey: dateKey(fecha), fecha, horas: [hora] });
  }

  function onCeldaPointerEnter(e, consultorio, fecha, hora) {
    if (!arrastrandoDesde.current) return;
    const a = arrastrandoDesde.current;
    if (a.consultorio !== consultorio || a.fechaKey !== dateKey(fecha)) return;
    const hi = Math.min(a.horaInicio, hora), hf = Math.max(a.horaInicio, hora);
    const horas = Array.from({ length: hf - hi + 1 }, (_, i) => hi + i).filter(h => getBloques(consultorio, fecha, h).length === 0);
    setSelBloque({ consultorio, fechaKey: dateKey(fecha), fecha, horas });
  }

  function onCeldaPointerUp(e, consultorio, fecha, hora) {
    if (!arrastrandoDesde.current) return;
    arrastrandoDesde.current = null;
    // Si seleccionó solo 1 celda → abrir modal directo
    if (selBloque && selBloque.horas.length === 1) {
      abrirNueva(selBloque.fecha, selBloque.consultorio, selBloque.horas[0]);
      setSelBloque(null);
    }
    // Si seleccionó más → mostrar footer con botón confirmar
  }

  function esSel(consultorio, fecha, hora) {
    return selBloque && selBloque.consultorio === consultorio && selBloque.fechaKey === dateKey(fecha) && selBloque.horas.includes(hora);
  }

  const inp = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(124,106,255,0.2)", fontSize: 13, marginBottom: 12, boxSizing: "border-box", outline: "none", background: "rgba(14,12,28,0.8)", color: "white" };
  const lbl = { display: "block", fontSize: 11, fontWeight: 700, color: "#a0a8c0", marginBottom: 4, textTransform: "uppercase", letterSpacing: .5 };

  // ── CELDA ────────────────────────────────────────────────────────────────────
  function Celda({ consultorio, fecha, hora, height = 36, showName = true }) {
    const bloques = getBloques(consultorio, fecha, hora);
    const ocupada = bloques.length > 0;
    const sel = esSel(consultorio, fecha, hora);
    const pasada = dateKey(fecha) === todayKey && hora < horaActual;

    return (
      <div
        data-fecha={dateKey(fecha)} data-ci={CONSULTORIOS.indexOf(consultorio)}
        onPointerDown={e => !ocupada && onCeldaPointerDown(e, consultorio, fecha, hora)}
        onPointerEnter={e => !ocupada && onCeldaPointerEnter(e, consultorio, fecha, hora)}
        onPointerUp={e => onCeldaPointerUp(e, consultorio, fecha, hora)}
        style={{ height, position: "relative", borderBottom: "1px solid rgba(255,255,255,0.04)", background: sel ? "rgba(124,106,255,0.22)" : pasada && !ocupada ? "rgba(255,255,255,0.01)" : "transparent", cursor: ocupada ? "default" : "pointer", userSelect: "none", touchAction: "none", transition: "background 0.1s" }}>
        {sel && !ocupada && <div style={{ position: "absolute", inset: 1, borderRadius: 3, border: "1.5px solid rgba(124,106,255,0.7)", pointerEvents: "none" }} />}
        {ocupada && bloques.map(r => {
          const esInicio = hora === r.horaInicio;
          const col = colorMap[r.profesional] || COLORES[0];
          return (
            <div key={r.id}
              onClick={e => { e.stopPropagation(); if (puedeEditar(r)) { setReservaModal(r); setForm({ profesional: r.profesional, horaInicio: r.horaInicio, horaFin: r.horaFin, repeteSemanal: r.repeteSemanal }); setError(""); setModal("detalle"); } }}
              style={{ position: "absolute", inset: "1px 0", background: col, borderRadius: esInicio ? "6px 6px 2px 2px" : "2px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 6px", cursor: "pointer", overflow: "hidden" }}>
              {esInicio && showName && <span style={{ fontSize: 9, fontWeight: 700, color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.profesional}</span>}
              {esInicio && showName && puedeEditar(r) && !esPublico && (
                <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                  <button onClick={e => { e.stopPropagation(); setReservaModal(r); setForm({ profesional: r.profesional, horaInicio: r.horaInicio, horaFin: r.horaFin, repeteSemanal: r.repeteSemanal }); setError(""); setModal("editar"); }} style={{ background: "rgba(255,255,255,0.25)", border: "none", color: "white", fontSize: 8, borderRadius: 3, padding: "1px 4px", cursor: "pointer" }}>✎</button>
                  <button onClick={e => { e.stopPropagation(); borrar(r.id); }} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", fontSize: 8, borderRadius: 3, padding: "1px 4px", cursor: "pointer" }}>✕</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ── VISTA SEMANA ─────────────────────────────────────────────────────────────
  function VistaSemana() {
    const COL_W = 56;
    const totalH = 36 * HORAS.length;
    const lineaTop = linea * totalH;
    return (
      <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "calc(100vh - 200px)", position: "relative" }}>
        <table style={{ borderCollapse: "collapse", minWidth: 44 + weekDates.length * COL_W }}>
          <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
            <tr>
              <th style={{ width: 44, background: "#000", borderBottom: "1px solid rgba(255,255,255,0.08)" }} />
              {weekDates.map(fecha => {
                const isToday = dateKey(fecha) === todayKey;
                return (
                  <th key={dateKey(fecha)}
                    onClick={() => { setDiaActivo(fecha); setConsultorioActivo(0); setVista("dia"); }}
                    style={{ width: COL_W, background: isToday ? "rgba(124,106,255,0.15)" : "#0a0a14", color: isToday ? "#a78bfa" : "white", fontSize: 11, fontWeight: 800, padding: "8px 0 6px", textAlign: "center", borderLeft: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.08)", cursor: "pointer" }}>
                    <div style={{ fontSize: 9, color: isToday ? "#a78bfa" : "#4a5270", fontWeight: 600 }}>{DIAS_CORTO[fecha.getDay()]}</div>
                    <div style={{ fontSize: 15 }}>{fecha.getDate()}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody style={{ position: "relative" }}>
            {HORAS.map(hora => (
              <tr key={hora} style={{ height: 36 }}>
                <td style={{ padding: "0 8px 0 0", textAlign: "right", fontSize: 9, color: "rgba(255,255,255,0.4)", fontWeight: 600, background: "#000", position: "sticky", left: 0, zIndex: 2, borderRight: "1px solid rgba(255,255,255,0.06)", verticalAlign: "middle", width: 44 }}>{hora}h</td>
                {weekDates.map(fecha => {
                  // Mostrar solo el consultorio más ocupado como representativo
                  const cons = CONSULTORIOS.map(c => ({ c, b: getBloques(c, fecha, hora) }));
                  const primero = cons.find(x => x.b.length > 0);
                  return (
                    <td key={dateKey(fecha)} data-fecha={dateKey(fecha)}
                      style={{ borderLeft: "1px solid rgba(255,255,255,0.04)", padding: 0, position: "relative" }}
                      onPointerDown={e => {
                        if (esPublico) { onLogin(); return; }
                        setDiaActivo(fecha); setConsultorioActivo(0); setVista("dia");
                      }}>
                      {primero ? (
                        <div style={{ height: 34, margin: "1px 0", borderRadius: 5, background: colorMap[primero.b[0].profesional] || COLORES[0], display: "flex", alignItems: "center", padding: "0 6px" }}>
                          {hora === primero.b[0].horaInicio && <span style={{ fontSize: 8, color: "white", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{primero.b[0].profesional}</span>}
                        </div>
                      ) : (
                        <div style={{ height: 34, margin: "1px 2px", borderRadius: 4, border: "1px dashed rgba(124,106,255,0.06)" }} />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {/* Línea hora actual */}
        {weekDates.some(f => dateKey(f) === todayKey) && (
          <div style={{ position: "absolute", top: 37 + linea * 36 * HORAS.length, left: 44, right: 0, height: 2, background: "white", opacity: 0.6, boxShadow: "0 0 6px rgba(255,255,255,0.5)", pointerEvents: "none", zIndex: 5 }} />
        )}
      </div>
    );
  }

  // ── VISTA DÍA ─────────────────────────────────────────────────────────────────
  function VistaDia({ fecha }) {
    const isToday = dateKey(fecha) === todayKey;
    const totalH = 48 * HORAS.length;
    return (
      <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 230px)", position: "relative" }}>
        {/* Tabs consultorios */}
        <div style={{ display: "flex", gap: 4, padding: "8px 12px", background: "rgba(0,0,0,0.6)", borderBottom: "1px solid rgba(124,106,255,0.1)", position: "sticky", top: 0, zIndex: 5 }}>
          {CONSULTORIOS.map((c, ci) => (
            <button key={c} onClick={() => setConsultorioActivo(ci)} style={{ flex: 1, padding: "7px 4px", borderRadius: 10, border: "none", background: consultorioActivo === ci ? "linear-gradient(135deg,#667eea,#764ba2)" : "rgba(14,12,28,0.8)", color: consultorioActivo === ci ? "white" : "#a0a8c0", fontWeight: 700, fontSize: 12, cursor: "pointer", transition: "all 0.2s" }}>
              C{ci + 3}
            </button>
          ))}
        </div>
        {/* Grilla del consultorio activo */}
        <div style={{ position: "relative" }}>
          {HORAS.map(hora => {
            const bloques = getBloques(CONSULTORIOS[consultorioActivo], fecha, hora);
            const libre = bloques.length === 0;
            const sel = esSel(CONSULTORIOS[consultorioActivo], fecha, hora);
            const esHoraActual = isToday && hora === horaActual;
            const pasada = isToday && hora < horaActual;
            return (
              <div key={hora}
                data-fecha={dateKey(fecha)} data-ci={consultorioActivo}
                onPointerDown={e => libre && onCeldaPointerDown(e, CONSULTORIOS[consultorioActivo], fecha, hora)}
                onPointerEnter={e => libre && onCeldaPointerEnter(e, CONSULTORIOS[consultorioActivo], fecha, hora)}
                onPointerUp={e => onCeldaPointerUp(e, CONSULTORIOS[consultorioActivo], fecha, hora)}
                style={{ display: "flex", alignItems: "stretch", borderBottom: "1px solid rgba(255,255,255,0.04)", height: 48, position: "relative", background: sel ? "rgba(124,106,255,0.15)" : esHoraActual ? "rgba(124,106,255,0.05)" : "transparent", cursor: libre ? "pointer" : "default", userSelect: "none", touchAction: "none" }}>
                <div style={{ width: 44, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 10, fontSize: 10, color: esHoraActual ? "#a78bfa" : "rgba(255,255,255,0.35)", fontWeight: esHoraActual ? 800 : 500, borderRight: "1px solid rgba(255,255,255,0.06)" }}>
                  {hora}:00
                </div>
                <div style={{ flex: 1, position: "relative", padding: "3px 10px 3px 6px" }}>
                  {sel && !bloques.length && (
                    <div style={{ position: "absolute", inset: "3px 10px 3px 6px", borderRadius: 10, border: "2px solid rgba(124,106,255,0.7)", background: "rgba(124,106,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                      <span style={{ fontSize: 11, color: "#a78bfa", fontWeight: 700 }}>✓ Seleccionado</span>
                    </div>
                  )}
                  {bloques.length > 0 ? bloques.map(r => {
                    const esInicio = hora === r.horaInicio;
                    const col = colorMap[r.profesional] || COLORES[0];
                    return (
                      <div key={r.id}
                        onClick={() => { if (puedeEditar(r)) { setReservaModal(r); setForm({ profesional: r.profesional, horaInicio: r.horaInicio, horaFin: r.horaFin, repeteSemanal: r.repeteSemanal }); setError(""); setModal("detalle"); } }}
                        style={{ position: "absolute", inset: "3px 10px 3px 6px", background: col, borderRadius: esInicio ? "10px 10px 4px 4px" : "4px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", cursor: "pointer", overflow: "hidden" }}>
                        {esInicio && (
                          <>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 800, color: "white" }}>{r.profesional}</div>
                              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)" }}>{r.horaInicio}:00 – {r.horaFin}:00 · {r.consultorio}</div>
                            </div>
                            {puedeEditar(r) && !esPublico && (
                              <div style={{ display: "flex", gap: 5 }}>
                                <button onClick={e => { e.stopPropagation(); setReservaModal(r); setForm({ profesional: r.profesional, horaInicio: r.horaInicio, horaFin: r.horaFin, repeteSemanal: r.repeteSemanal }); setError(""); setModal("editar"); }} style={{ background: "rgba(255,255,255,0.25)", border: "none", color: "white", borderRadius: 7, padding: "4px 9px", fontSize: 11, cursor: "pointer" }}>✎</button>
                                <button onClick={e => { e.stopPropagation(); borrar(r.id); }} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", borderRadius: 7, padding: "4px 9px", fontSize: 11, cursor: "pointer" }}>✕</button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  }) : !sel && (
                    <div style={{ height: "100%", display: "flex", alignItems: "center", paddingLeft: 8 }}>
                      {!pasada && <span style={{ fontSize: 10, color: "rgba(124,106,255,0.2)" }}>Tocá para reservar</span>}
                    </div>
                  )}
                </div>
                {esHoraActual && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "white", opacity: 0.5, pointerEvents: "none" }} />}
              </div>
            );
          })}
          {/* Línea hora actual */}
          {isToday && (
            <div style={{ position: "absolute", top: linea * 48 * HORAS.length, left: 0, right: 0, height: 2, background: "white", opacity: 0.7, boxShadow: "0 0 8px rgba(255,255,255,0.5)", pointerEvents: "none", zIndex: 5 }} />
          )}
        </div>
      </div>
    );
  }

  // ── PAGOS ─────────────────────────────────────────────────────────────────────
  function VistaPagos() {
    return (
      <div style={{ padding: "12px 14px 200px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <button onClick={() => setMesOffset(m => m - 1)} style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid rgba(124,106,255,0.2)", background: "rgba(14,12,28,0.8)", cursor: "pointer", color: "white", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
          <span style={{ flex: 1, textAlign: "center", fontWeight: 700, fontSize: 13, color: "white", textTransform: "capitalize" }}>{mesLabel}</span>
          <button onClick={() => setMesOffset(m => m + 1)} style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid rgba(124,106,255,0.2)", background: "rgba(14,12,28,0.8)", cursor: "pointer", color: "white", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
          <button onClick={() => setMesOffset(0)} style={{ padding: "0 10px", height: 34, borderRadius: 10, border: "1px solid rgba(124,106,255,0.2)", background: "rgba(14,12,28,0.8)", cursor: "pointer", color: "#a0a8c0", fontSize: 11 }}>Hoy</button>
          {esAdmin && <button onClick={() => exportCSV(profs, reservas, mesStr)} style={{ padding: "0 12px", height: 34, borderRadius: 10, border: "none", background: "linear-gradient(135deg,#667eea,#764ba2)", color: "white", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>⬇ CSV</button>}
        </div>
        {esAdmin && profs.length > 0 && (() => {
          const total = profs.reduce((a, p) => a + calcPagos(reservas, p, mesStr).total, 0);
          return <div style={{ background: "rgba(14,12,28,0.9)", borderRadius: 14, padding: "14px 18px", marginBottom: 14, display: "flex", justifyContent: "space-between", border: "1px solid rgba(124,106,255,0.15)" }}><span style={{ color: "#a0a8c0", fontWeight: 700, fontSize: 12 }}>Total {mesLabel}</span><span style={{ color: "white", fontWeight: 900, fontSize: 20 }}>{fmt(total)}</span></div>;
        })()}
        {profs.map(prof => {
          const { total, det } = calcPagos(reservas, prof, mesStr);
          const col = colorMap[prof] || COLORES[0];
          return (
            <div key={prof} style={{ background: "rgba(14,12,28,0.8)", borderRadius: 14, marginBottom: 12, overflow: "hidden", border: "1px solid rgba(124,106,255,0.1)" }}>
              <div style={{ background: col, padding: "11px 16px", display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "white", fontWeight: 800, fontSize: 14 }}>👤 {prof}</span>
                <span style={{ color: "white", fontWeight: 900, fontSize: 18 }}>{fmt(total)}</span>
              </div>
              {det.length === 0 ? <p style={{ padding: "12px 16px", color: "#4a5270", fontSize: 12, margin: 0 }}>Sin reservas este mes.</p> :
                <div style={{ padding: 10 }}>
                  {det.map(d => (
                    <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 6px", borderBottom: "1px solid rgba(124,106,255,0.07)" }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "white" }}>{d.consultorio}</div>
                        <div style={{ fontSize: 10, color: "#4a5270" }}>{new Date(d.fecha + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })} · {d.horaInicio}:00–{d.horaFin}:00</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: "white" }}>{fmt(d.total)}</div>
                        <div style={{ fontSize: 9, color: "#4a5270" }}>{d.tipo}{d.tipo === "Semanal" ? ` × ${d.occ}` : ""}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 6px" }}>
                    <span style={{ fontSize: 11, color: "#4a5270" }}>${HORA_PRECIO.toLocaleString("es-AR")}/hora</span>
                    <span style={{ fontWeight: 900, color: "white" }}>Total: {fmt(total)}</span>
                  </div>
                </div>
              }
            </div>
          );
        })}
      </div>
    );
  }

  const horasRange = Array.from({ length: 14 }, (_, i) => i + 8);

  return (
    <div ref={pinchRef} style={{ height: "100vh", overflowY: "hidden", background: "#000" }} className="tab-content">

      {/* ══ HEADER ══ */}
      <div style={{ background: "linear-gradient(180deg,#0a0a14,#000)", padding: "54px 14px 10px", borderBottom: "1px solid rgba(124,106,255,0.1)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>

          {/* Nav semana / día */}
          {vista !== "pagos" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
              {vista === "dia" && (
                <button onClick={() => setVista("semana")} style={{ background: "none", border: "none", color: "#7c6aff", fontSize: 20, cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c6aff" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
                </button>
              )}
              <button onClick={() => vista === "semana" ? setWeekOffset(w => w - 1) : setDiaActivo(d => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; })} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(124,106,255,0.2)", background: "rgba(14,12,28,0.8)", cursor: "pointer", color: "white", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
              <span style={{ flex: 1, textAlign: "center", fontWeight: 700, fontSize: 11, color: "#a0a8c0" }}>
                {vista === "semana"
                  ? `${weekDates[0].toLocaleDateString("es-AR", { day: "numeric", month: "short" })} – ${weekDates[5].toLocaleDateString("es-AR", { day: "numeric", month: "short" })}`
                  : diaActivo?.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
              </span>
              <button onClick={() => vista === "semana" ? setWeekOffset(w => w + 1) : setDiaActivo(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; })} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(124,106,255,0.2)", background: "rgba(14,12,28,0.8)", cursor: "pointer", color: "white", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
              <button onClick={() => { setWeekOffset(0); if (vista === "dia") { setDiaActivo(new Date()); } }} style={{ padding: "0 8px", height: 30, borderRadius: 8, border: "1px solid rgba(124,106,255,0.2)", background: "rgba(14,12,28,0.8)", cursor: "pointer", color: "#a0a8c0", fontSize: 10, fontWeight: 600 }}>Hoy</button>
            </div>
          )}

          {/* Botón pagos */}
          <button onClick={() => setVista(v => v === "pagos" ? "semana" : "pagos")} style={{ padding: "6px 12px", borderRadius: 20, border: "1px solid rgba(124,106,255,0.2)", background: vista === "pagos" ? "rgba(124,106,255,0.15)" : "transparent", color: vista === "pagos" ? "#a78bfa" : "#a0a8c0", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
            {vista === "pagos" ? "← Agenda" : "💰 Pagos"}
          </button>
        </div>

        {/* Mini-tabs días en vista semana */}
        {vista === "semana" && (
          <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
            {weekDates.map((fecha, i) => {
              const isToday = dateKey(fecha) === todayKey;
              return (
                <button key={i} onClick={() => { setDiaActivo(fecha); setConsultorioActivo(0); setVista("dia"); }} style={{ flex: 1, padding: "5px 0", borderRadius: 9, border: "none", background: isToday ? "rgba(124,106,255,0.15)" : "rgba(14,12,28,0.5)", color: isToday ? "#a78bfa" : "#4a5270", fontSize: 10, fontWeight: isToday ? 800 : 500, cursor: "pointer" }}>
                  <div style={{ fontSize: 8 }}>{DIAS_CORTO[fecha.getDay()]}</div>
                  <div style={{ fontSize: 12, fontWeight: 800 }}>{fecha.getDate()}</div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ══ CONTENIDO ══ */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {vista === "semana" && <VistaSemana />}
        {vista === "dia" && diaActivo && <VistaDia fecha={diaActivo} />}
        {vista === "pagos" && <VistaPagos />}
      </div>

      {/* ══ FOOTER ══ */}
      {vista !== "pagos" && (
        <div style={{ position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)", zIndex: 60, display: "flex", alignItems: "center", gap: 10, width: "calc(100% - 32px)", maxWidth: 360 }}>

          {/* Bloque seleccionado — resumen y confirmación */}
          {selBloque && selBloque.horas.length > 1 ? (
            <div style={{ flex: 1, background: "rgba(10,10,20,0.95)", backdropFilter: "blur(20px)", border: "1px solid rgba(124,106,255,0.3)", borderRadius: 18, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "white" }}>
                  {Math.min(...selBloque.horas)}:00 – {Math.max(...selBloque.horas) + 1}:00
                </div>
                <div style={{ fontSize: 10, color: "#a0a8c0" }}>
                  {selBloque.horas.length}h · {selBloque.consultorio} · {fmt(selBloque.horas.length * HORA_PRECIO)}
                </div>
              </div>
              <button onClick={() => setSelBloque(null)} style={{ background: "none", border: "none", color: "#4a5270", fontSize: 14, cursor: "pointer", padding: 0 }}>✕</button>
              <button onClick={abrirDesdeBloque} style={{ padding: "8px 16px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#667eea,#764ba2)", color: "white", fontWeight: 800, fontSize: 12, cursor: "pointer", flexShrink: 0 }}>
                Reservar →
              </button>
            </div>
          ) : (
            <div style={{ flex: 1, background: "rgba(10,10,20,0.9)", backdropFilter: "blur(20px)", border: "1px solid rgba(124,106,255,0.15)", borderRadius: 18, padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, color: "#4a5270" }}>
                {vista === "semana" ? "Toca un día · pellizca para acercar" : "Toca o arrastrá para seleccionar"}
              </span>
              <button onClick={() => {
                if (esPublico) { onLogin(); return; }
                const fecha = vista === "dia" ? diaActivo : weekDates.find(f => dateKey(f) === todayKey) || weekDates[0];
                const consultorio = CONSULTORIOS[consultorioActivo || 0];
                abrirNueva(fecha, consultorio, Math.max(horaActual, 8));
              }} style={{ width: 40, height: 40, borderRadius: "50%", border: "none", background: "linear-gradient(135deg,#667eea,#764ba2)", color: "white", fontSize: 24, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(124,106,255,0.5)", flexShrink: 0 }}>+</button>
            </div>
          )}
        </div>
      )}

      {/* ══ MODAL NUEVA RESERVA ══ */}
      {modal === "nueva" && reservaModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 2000 }}>
          <div style={{ background: "#0a0a14", borderRadius: "24px 24px 0 0", padding: "20px 20px 44px", width: "100%", maxWidth: 500, border: "1px solid rgba(124,106,255,0.2)", animation: "slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.1)", margin: "0 auto 16px" }} />
            <h3 style={{ margin: "0 0 3px", fontSize: 17, fontWeight: 800, color: "white" }}>Nueva reserva</h3>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "#a0a8c0" }}>
              {reservaModal.consultorio} · {reservaModal.fecha?.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
            </p>

            {/* Resumen */}
            <div style={{ background: "rgba(124,106,255,0.08)", borderRadius: 12, padding: "10px 14px", marginBottom: 14, border: "1px solid rgba(124,106,255,0.12)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#a0a8c0" }}>{form.horaInicio}:00 – {form.horaFin}:00 · {form.horaFin - form.horaInicio}h</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: "white" }}>{fmt((form.horaFin - form.horaInicio) * HORA_PRECIO)}</span>
            </div>

            <label style={lbl}>Profesional</label>
            {esAdmin
              ? <input list="plist" value={form.profesional} onChange={e => setForm(f => ({ ...f, profesional: e.target.value }))} placeholder="Nombre del/la profesional" style={inp} />
              : <div style={{ ...inp, color: "#a0a8c0", marginBottom: 12 }}>{form.profesional}</div>
            }
            <datalist id="plist">{Object.keys(colorMap).map(p => <option key={p} value={p} />)}</datalist>

            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={lbl}>Desde</label>
                <select value={form.horaInicio} onChange={e => setForm(f => ({ ...f, horaInicio: parseInt(e.target.value), horaFin: Math.max(parseInt(e.target.value) + 1, f.horaFin) }))} style={inp}>
                  {horasRange.slice(0, -1).map(h => <option key={h} value={h}>{h}:00</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={lbl}>Hasta</label>
                <select value={form.horaFin} onChange={e => setForm(f => ({ ...f, horaFin: parseInt(e.target.value) }))} style={inp}>
                  {horasRange.filter(h => h > form.horaInicio).map(h => <option key={h} value={h}>{h}:00</option>)}
                </select>
              </div>
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 16 }}>
              <input type="checkbox" checked={form.repeteSemanal} onChange={e => setForm(f => ({ ...f, repeteSemanal: e.target.checked }))} style={{ width: 16, height: 16 }} />
              <span style={{ fontSize: 13, color: "white" }}>Repetir semanalmente</span>
            </label>

            {error && <div style={{ background: "rgba(239,83,80,0.1)", border: "1px solid rgba(239,83,80,0.3)", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "#ef5350", fontWeight: 600 }}>{error}</div>}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setModal(null); setSelBloque(null); setError(""); }} style={{ flex: 1, padding: 12, borderRadius: 12, border: "1px solid rgba(124,106,255,0.2)", background: "transparent", cursor: "pointer", fontSize: 13, color: "#a0a8c0", fontWeight: 600 }}>Cancelar</button>
              <button onClick={guardarNueva} disabled={esAdmin && !form.profesional.trim()} style={{ flex: 2, padding: 12, borderRadius: 12, border: "none", fontWeight: 800, fontSize: 13, cursor: "pointer", color: "white", background: "linear-gradient(135deg,#667eea,#764ba2)" }}>✓ Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL DETALLE ══ */}
      {modal === "detalle" && reservaModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 2000 }}>
          <div style={{ background: "#0a0a14", borderRadius: "24px 24px 0 0", padding: "20px 20px 44px", width: "100%", maxWidth: 500, border: "1px solid rgba(124,106,255,0.2)", animation: "slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.1)", margin: "0 auto 16px" }} />
            <div style={{ background: colorMap[reservaModal.profesional] || COLORES[0], borderRadius: 14, padding: "14px 16px", marginBottom: 16 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: "white", marginBottom: 4 }}>👤 {reservaModal.profesional}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>{reservaModal.consultorio}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>{new Date(reservaModal.fecha + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>{reservaModal.horaInicio}:00 – {reservaModal.horaFin}:00 · {reservaModal.horaFin - reservaModal.horaInicio}h</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: "white", marginTop: 6 }}>{fmt((reservaModal.horaFin - reservaModal.horaInicio) * HORA_PRECIO)}</div>
              {reservaModal.repeteSemanal && <div style={{ marginTop: 4, fontSize: 10, background: "rgba(255,255,255,0.15)", borderRadius: 6, padding: "2px 8px", display: "inline-block", color: "white" }}>🔁 Semanal</div>}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: 12, borderRadius: 12, border: "1px solid rgba(124,106,255,0.2)", background: "transparent", cursor: "pointer", fontSize: 13, color: "#a0a8c0", fontWeight: 600 }}>Cerrar</button>
              {puedeEditar(reservaModal) && !esPublico && <>
                <button onClick={() => setModal("editar")} style={{ flex: 1, padding: 12, borderRadius: 12, border: "none", background: "rgba(124,106,255,0.15)", color: "#a78bfa", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>✎ Editar</button>
                <button onClick={() => borrar(reservaModal.id)} style={{ flex: 1, padding: 12, borderRadius: 12, border: "none", background: "rgba(239,83,80,0.12)", color: "#ef5350", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>✕ Borrar</button>
              </>}
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL EDITAR ══ */}
      {modal === "editar" && reservaModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 2000 }}>
          <div style={{ background: "#0a0a14", borderRadius: "24px 24px 0 0", padding: "20px 20px 44px", width: "100%", maxWidth: 500, border: "1px solid rgba(124,106,255,0.2)", animation: "slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.1)", margin: "0 auto 16px" }} />
            <h3 style={{ margin: "0 0 3px", fontSize: 17, fontWeight: 800, color: "white" }}>Editar reserva</h3>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "#a0a8c0" }}>{reservaModal.consultorio} · {new Date(reservaModal.fecha + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}</p>
            <label style={lbl}>Profesional</label>
            {esAdmin
              ? <input list="plist2" value={form.profesional} onChange={e => setForm(f => ({ ...f, profesional: e.target.value }))} style={inp} />
              : <div style={{ ...inp, color: "#a0a8c0", marginBottom: 12 }}>{form.profesional}</div>
            }
            <datalist id="plist2">{Object.keys(colorMap).map(p => <option key={p} value={p} />)}</datalist>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={lbl}>Desde</label>
                <select value={form.horaInicio} onChange={e => setForm(f => ({ ...f, horaInicio: parseInt(e.target.value), horaFin: Math.max(parseInt(e.target.value) + 1, f.horaFin) }))} style={inp}>
                  {horasRange.slice(0, -1).map(h => <option key={h} value={h}>{h}:00</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={lbl}>Hasta</label>
                <select value={form.horaFin} onChange={e => setForm(f => ({ ...f, horaFin: parseInt(e.target.value) }))} style={inp}>
                  {horasRange.filter(h => h > form.horaInicio).map(h => <option key={h} value={h}>{h}:00</option>)}
                </select>
              </div>
            </div>
            <div style={{ background: "rgba(124,106,255,0.08)", borderRadius: 10, padding: "10px 14px", marginBottom: 12, display: "flex", justifyContent: "space-between", border: "1px solid rgba(124,106,255,0.12)" }}>
              <span style={{ fontSize: 13, color: "#a0a8c0" }}>{form.horaFin - form.horaInicio}h × ${HORA_PRECIO.toLocaleString("es-AR")}</span>
              <span style={{ fontWeight: 800, color: "white" }}>{fmt((form.horaFin - form.horaInicio) * HORA_PRECIO)}</span>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 16 }}>
              <input type="checkbox" checked={form.repeteSemanal} onChange={e => setForm(f => ({ ...f, repeteSemanal: e.target.checked }))} style={{ width: 16, height: 16 }} />
              <span style={{ fontSize: 13, color: "white" }}>Repetir semanalmente</span>
            </label>
            {error && <div style={{ background: "rgba(239,83,80,0.1)", border: "1px solid rgba(239,83,80,0.3)", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "#ef5350", fontWeight: 600 }}>{error}</div>}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setModal(null); setError(""); }} style={{ flex: 1, padding: 12, borderRadius: 12, border: "1px solid rgba(124,106,255,0.2)", background: "transparent", cursor: "pointer", fontSize: 13, color: "#a0a8c0", fontWeight: 600 }}>Cancelar</button>
              <button onClick={guardarEdicion} style={{ flex: 2, padding: 12, borderRadius: 12, border: "none", fontWeight: 800, fontSize: 13, cursor: "pointer", color: "white", background: "linear-gradient(135deg,#667eea,#764ba2)" }}>Actualizar</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: none; opacity: 1; } }
      `}</style>
    </div>
  );
}
