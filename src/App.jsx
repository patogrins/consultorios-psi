import { useState, useMemo, useEffect, useCallback } from "react";
import { agregarReserva, actualizarReserva, eliminarReserva, suscribirReservas, onAuthChanged, getUserData, logoutUser } from "./firebase";
import Login from "./Login";
import Derivaciones from "./Derivaciones";

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

const TEMA = {
  claro: {
    bg: "#f0f4f8", cardBg: "white", headerBg: "#000000",
    texto: "#1a202c", textoSuave: "#718096", textoMuy: "#a0aec0",
    borde: "#e2e8f0", bordeTabla: "#edf2f7",
    celdaBg: "white", celdaHoy: "#eff6ff", thBg: "#f7fafc",
    thHoy: "#dbeafe", thHoyTexto: "#2b6cb0",
    navBg: "white", navBorde: "#cbd5e0", navTexto: "#4a5568",
    inputBg: "white", inputBorde: "#e2e8f0",
    previewBg: "#f7fafc", totalBg: "#000000",
  },
  oscuro: {
    bg: "#0a0a0a", cardBg: "#111318", headerBg: "#000000",
    texto: "#e2e8f0", textoSuave: "#a0aec0", textoMuy: "#718096",
    borde: "#2d3748", bordeTabla: "#2d3748",
    celdaBg: "#111318", celdaHoy: "#1a2744", thBg: "#0a0a0a",
    thHoy: "#1a2744", thHoyTexto: "#90cdf4",
    navBg: "#2d3748", navBorde: "#4a5568", navTexto: "#e2e8f0",
    inputBg: "#2d3748", inputBorde: "#4a5568",
    previewBg: "#0a0a0a", totalBg: "#000000",
  }
};

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
  const [usuario, setUsuario] = useState(null);
  const [authListo, setAuthListo] = useState(false);
  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [vista, setVista] = useState("agenda");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ profesional: "", horaInicio: 8, horaFin: 9, repeteSemanal: false });
  const [mesOffset, setMesOffset] = useState(0);
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [modoOscuro, setModoOscuro] = useState(() => localStorage.getItem("grins_dark") !== "0");
  const [errorSolapamiento, setErrorSolapamiento] = useState("");
  const [installPrompt, setInstallPrompt] = useState(null);
  const [mostrarBannerIOS, setMostrarBannerIOS] = useState(() => {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const yaVisto = localStorage.getItem("grins_ios_banner") === "1";
    return isIOS && !isStandalone && !yaVisto;
  });

  const t = modoOscuro ? TEMA.oscuro : TEMA.claro;
  const esAdmin = usuario?.rol === "admin";
  const esPublico = !usuario;

  useEffect(() => { localStorage.setItem("grins_dark", modoOscuro ? "1" : "0"); }, [modoOscuro]);

  useEffect(() => {
    const handler = e => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    return onAuthChanged(async firebaseUser => {
      if (firebaseUser) {
        const data = await getUserData(firebaseUser.email);
        setUsuario({ email: firebaseUser.email, rol: data?.rol || "profesional", nombre: data?.nombre || firebaseUser.email });
        setMostrarLogin(false);
      } else {
        setUsuario(null);
      }
      setAuthListo(true);
    });
  }, []);

  useEffect(() => {
    const unsub = suscribirReservas(data => { setReservas(data); setCargando(false); });
    return () => unsub();
  }, []);

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

  const showToast = useCallback((msg, tipo = "ok") => { setToast({ msg, tipo }); setTimeout(() => setToast(null), 2800); }, []);

  function hayConflicto(consultorio, fecha, horaInicio, horaFin, excludeId = null) {
    const key = dateKey(fecha);
    const diaSemana = fecha.getDay();
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
    if (esPublico) { setMostrarLogin(true); return; }
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
    if (conflicto) { setErrorSolapamiento("⚠️ Ese horario ya está ocupado en este consultorio. Elegí otro horario."); return; }
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

  const horasRange = Array.from({ length: 14 }, (_, i) => i + 8);
  const todayKey = dateKey(new Date());
  const navBtn = { padding: "6px 13px", borderRadius: 8, border: `1px solid ${t.navBorde}`, background: t.navBg, cursor: "pointer", fontWeight: 800, fontSize: 15, color: t.navTexto };
  const thStyle = { padding: "7px 4px", background: t.thBg, color: t.navTexto, fontSize: 11, fontWeight: 700, borderBottom: `1px solid ${t.borde}`, textAlign: "center" };
  const labelStyle = { display: "block", fontSize: 11, fontWeight: 700, color: t.textoSuave, marginBottom: 4, textTransform: "uppercase", letterSpacing: .5 };
  const inputStyle = { width: "100%", padding: "9px 11px", borderRadius: 8, border: `1px solid ${t.inputBorde}`, fontSize: 13, marginBottom: 14, boxSizing: "border-box", outline: "none", background: t.inputBg, color: t.texto };

  if (!authListo || cargando) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#000000", flexDirection: "column", gap: 16 }}>
      <img src="/IMG_0050.jpeg" alt="GRINS" style={{ height: 80, objectFit: "contain", marginBottom: 8 }} />
      <div style={{ width: 40, height: 40, border: "3px solid #222", borderTop: "3px solid white", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );

  if (mostrarLogin) return <Login modoOscuro={modoOscuro} onVolver={() => setMostrarLogin(false)} />;

const vistasDisponibles = esPublico
  ? [["agenda", "📅 Agenda"], ["unificado", "🗓 Vista general"]]
  : [["agenda", "📅 Agenda"], ["unificado", "🗓 Vista general"], ["pagos", "💰 Pagos"], ["derivaciones", "🔄 Derivaciones"]];

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", minHeight: "100vh", background: t.bg, color: t.texto, position: "relative", transition: "background .3s, color .3s" }}>

      {/* BANNER ANDROID/PC */}
      {installPrompt && (
        <div style={{ position: "fixed", bottom: 20, left: 16, right: 16, zIndex: 9998, background: "linear-gradient(135deg,#667eea,#764ba2)", borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
          <div>
            <div style={{ color: "white", fontWeight: 800, fontSize: 13 }}>📲 Instalá GRINS como app</div>
            <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, marginTop: 2 }}>Accedé más rápido desde tu pantalla de inicio</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button onClick={() => setInstallPrompt(null)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.3)", background: "transparent", color: "white", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>Ahora no</button>
            <button onClick={async () => { installPrompt.prompt(); const { outcome } = await installPrompt.userChoice; if (outcome === "accepted") setInstallPrompt(null); }} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "white", color: "#764ba2", fontSize: 11, cursor: "pointer", fontWeight: 800 }}>Instalar ✓</button>
          </div>
        </div>
      )}

      {/* BANNER IOS */}
      {mostrarBannerIOS && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9998, background: "#111318", borderTop: "1px solid #2d3748", padding: "16px 20px 36px", boxShadow: "0 -8px 32px rgba(0,0,0,0.5)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ color: "white", fontWeight: 800, fontSize: 14 }}>📲 Instalá GRINS en tu iPhone</span>
            <button onClick={() => { setMostrarBannerIOS(false); localStorage.setItem("grins_ios_banner", "1"); }} style={{ background: "none", border: "none", color: "#a0aec0", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>✕</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[["1", "Tocá el botón Compartir ⎋ en la barra de Safari"], ["2", 'Elegí "Agregar a pantalla de inicio"'], ["3", 'Tocá "Agregar" y listo 🎉']].map(([n, txt]) => (
              <div key={n} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 28, height: 28, background: "#2d3748", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{n}</div>
                <span style={{ color: "#e2e8f0", fontSize: 13 }} dangerouslySetInnerHTML={{ __html: txt.replace(/(".*?")/g, '<strong style="color:white">$1</strong>') }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {toast && <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999, background: toast.tipo === "warn" ? "#744210" : "#1a4731", color: "white", padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,0.25)" }}>{toast.msg}</div>}

      {/* HEADER */}
      <div style={{ background: t.headerBg, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <img src="/IMG_0050.jpeg" alt="GRINS Consultorios" style={{ height: 64, objectFit: "contain" }} />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {vistasDisponibles.map(([v, label]) => (
            <button key={v} onClick={() => setVista(v)} style={{ padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 11, background: vista === v ? "#4299e1" : "rgba(255,255,255,0.15)", color: "white" }}>{label}</button>
          ))}
          <button onClick={() => setModoOscuro(m => !m)} style={{ padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14, background: "rgba(255,255,255,0.1)", color: "white" }}>{modoOscuro ? "☀️" : "🌙"}</button>
          {usuario
            ? <button onClick={logoutUser} style={{ padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 11, background: "rgba(255,255,255,0.1)", color: "white" }}>🚪 Salir</button>
            : <button onClick={() => setMostrarLogin(true)} style={{ padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 11, background: "rgba(255,255,255,0.2)", color: "white" }}>🔑 Ingresar</button>
          }
        </div>
      </div>

      {/* BARRA ESTADO */}
      <div style={{ background: t.cardBg, borderBottom: `1px solid ${t.borde}`, padding: "6px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: t.textoMuy }}>
          {esPublico ? "👁 Modo solo lectura — iniciá sesión para reservar" : esAdmin ? "👑 Admin" : `👤 ${usuario.nombre}`}
        </span>
        {esAdmin && profesionales.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {profesionales.map(p => { const col = colorMap[p]; return <span key={p} style={{ background: modoOscuro ? "rgba(255,255,255,0.08)" : col.light, color: col.text, border: `1px solid ${col.solid}`, borderRadius: 20, padding: "1px 8px", fontSize: 10, fontWeight: 700 }}>{p}</span>; })}
          </div>
        )}
      </div>

      {/* AGENDA */}
      {vista === "agenda" && (
        <div style={{ padding: "16px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <button onClick={() => setWeekOffset(w => w - 1)} style={navBtn}>‹</button>
            <span style={{ fontWeight: 700, fontSize: 13, color: t.navTexto, minWidth: 180, textAlign: "center" }}>{weekDates[0].toLocaleDateString("es-AR", { day: "numeric", month: "short" })} – {weekDates[5].toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}</span>
            <button onClick={() => setWeekOffset(w => w + 1)} style={navBtn}>›</button>
            <button onClick={() => setWeekOffset(0)} style={{ ...navBtn, fontSize: 11, padding: "5px 10px" }}>Hoy</button>
          </div>
          {CONSULTORIOS.map(consultorio => (
            <div key={consultorio} style={{ background: t.cardBg, borderRadius: 12, marginBottom: 18, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
              <div style={{ background: "#000000", color: "white", padding: "9px 14px", fontWeight: 800, fontSize: 13 }}>🏢 {consultorio}</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 540 }}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, width: 44 }}>Hora</th>
                      {weekDates.map(fecha => {
                        const isToday = dateKey(fecha) === todayKey;
                        return <th key={dateKey(fecha)} style={{ ...thStyle, background: isToday ? t.thHoy : t.thBg, color: isToday ? t.thHoyTexto : t.navTexto, borderLeft: `1px solid ${t.borde}` }}>
                          <div style={{ fontSize: 10 }}>{DIAS_SEMANA[fecha.getDay()]}</div>
                          <div style={{ fontWeight: 800, fontSize: 14 }}>{fecha.getDate()}</div>
                        </th>;
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {HORAS.map(hora => (
                      <tr key={hora}>
                        <td style={{ padding: "3px 4px", textAlign: "center", fontSize: 10, color: t.textoMuy, borderRight: `1px solid ${t.bordeTabla}`, borderBottom: `1px solid ${t.bordeTabla}`, background: t.thBg }}>{hora}:00</td>
                        {weekDates.map(fecha => {
                          const isToday = dateKey(fecha) === todayKey;
                          const ocupadas = getReservasParaCelda(consultorio, fecha, hora);
                          const libre = ocupadas.length === 0;
                          return (
                            <td key={dateKey(fecha)} onClick={() => libre && openCrear(consultorio, fecha, hora)}
                              style={{ padding: 2, borderBottom: `1px solid ${t.bordeTabla}`, borderLeft: `1px solid ${t.bordeTabla}`, verticalAlign: "top", minWidth: 72, cursor: libre && !esPublico ? "pointer" : "default", background: libre ? (isToday ? t.celdaHoy : t.celdaBg) : undefined }}>
                              {ocupadas.map(r => {
                                const col = colorMap[r.profesional] || COLORES_PROF[0];
                                const esInicio = hora === r.horaInicio;
                                const puedeMod = puedeEditar(r);
                                return (
                                  <div key={r.id} style={{ background: col.bg, color: "white", borderRadius: esInicio ? "5px 5px 3px 3px" : "3px", padding: esInicio ? "3px 5px 2px" : "1px 5px", fontSize: 10, fontWeight: 700, marginBottom: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    {esInicio ? <>
                                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 55 }}>{r.profesional}</span>
                                      {puedeMod && !esPublico && <span style={{ display: "flex", gap: 2 }}>
                                        <button onClick={e => { e.stopPropagation(); openEditar(r); }} style={{ background: "rgba(255,255,255,0.25)", border: "none", color: "white", cursor: "pointer", borderRadius: 3, padding: "0 3px", fontSize: 9, lineHeight: "14px" }}>✎</button>
                                        <button onClick={e => { e.stopPropagation(); setConfirmDelete(r.id); }} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", cursor: "pointer", borderRadius: 3, padding: "0 3px", fontSize: 9, lineHeight: "14px" }}>✕</button>
                                      </span>}
                                    </> : <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 8 }}>│</span>}
                                  </div>
                                );
                              })}
                              {libre && !esPublico && <div style={{ color: t.textoMuy, fontSize: 9, textAlign: "center", paddingTop: 5 }}>+</div>}
                              {libre && esPublico && <div style={{ color: t.bordeTabla, fontSize: 9, textAlign: "center", paddingTop: 5 }}>·</div>}
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

      {/* VISTA UNIFICADA */}
      {vista === "unificado" && (
        <div style={{ padding: "16px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <button onClick={() => setWeekOffset(w => w - 1)} style={navBtn}>‹</button>
            <span style={{ fontWeight: 700, fontSize: 13, color: t.navTexto, minWidth: 180, textAlign: "center" }}>{weekDates[0].toLocaleDateString("es-AR", { day: "numeric", month: "short" })} – {weekDates[5].toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}</span>
            <button onClick={() => setWeekOffset(w => w + 1)} style={navBtn}>›</button>
            <button onClick={() => setWeekOffset(0)} style={{ ...navBtn, fontSize: 11, padding: "5px 10px" }}>Hoy</button>
          </div>
          <div style={{ background: t.cardBg, borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, width: 44 }}>Hora</th>
                    {weekDates.map(fecha => { const isToday = dateKey(fecha) === todayKey; return <th key={dateKey(fecha)} colSpan={3} style={{ ...thStyle, background: isToday ? t.thHoy : t.thBg, color: isToday ? t.thHoyTexto : t.navTexto, borderLeft: `2px solid ${t.borde}` }}><div style={{ fontSize: 10 }}>{DIAS_SEMANA[fecha.getDay()]}</div><div style={{ fontWeight: 800, fontSize: 14 }}>{fecha.getDate()}</div></th>; })}
                  </tr>
                  <tr>
                    <th style={{ ...thStyle }}></th>
                    {weekDates.map(fecha => CONSULTORIOS.map((c, i) => (
                      <th key={`${dateKey(fecha)}-${c}`} style={{ ...thStyle, fontSize: 9, fontWeight: 700, color: t.textoSuave, borderLeft: i === 0 ? `2px solid ${t.borde}` : `1px solid ${t.bordeTabla}`, padding: "3px 2px" }}>C{i + 1}</th>
                    )))}
                  </tr>
                </thead>
                <tbody>
                  {HORAS.map(hora => (
                    <tr key={hora}>
                      <td style={{ padding: "3px 4px", textAlign: "center", fontSize: 10, color: t.textoMuy, borderRight: `1px solid ${t.bordeTabla}`, borderBottom: `1px solid ${t.bordeTabla}`, background: t.thBg }}>{hora}:00</td>
                      {weekDates.map(fecha => CONSULTORIOS.map((consultorio, i) => {
                        const isToday = dateKey(fecha) === todayKey;
                        const ocupadas = getReservasParaCelda(consultorio, fecha, hora);
                        const libre = ocupadas.length === 0;
                        return (
                          <td key={`${dateKey(fecha)}-${consultorio}`} onClick={() => libre && openCrear(consultorio, fecha, hora)}
                            style={{ padding: 1, borderBottom: `1px solid ${t.bordeTabla}`, borderLeft: i === 0 ? `2px solid ${t.borde}` : `1px solid ${t.bordeTabla}`, verticalAlign: "top", minWidth: 48, cursor: libre && !esPublico ? "pointer" : "default", background: libre ? (isToday ? t.celdaHoy : t.celdaBg) : undefined }}>
                            {ocupadas.map(r => { const col = colorMap[r.profesional] || COLORES_PROF[0]; const esInicio = hora === r.horaInicio; return (
                              <div key={r.id} title={`${r.profesional} · ${consultorio}`} style={{ background: col.bg, color: "white", borderRadius: 3, padding: esInicio ? "2px 3px" : "1px 3px", fontSize: 9, fontWeight: 700, marginBottom: 1 }}>
                                {esInicio ? <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", maxWidth: 44 }}>{r.profesional}</span> : <span style={{ color: "rgba(255,255,255,0.4)" }}>│</span>}
                              </div>
                            ); })}
                            {libre && <div style={{ color: t.bordeTabla, fontSize: 8, textAlign: "center", paddingTop: 4 }}>·</div>}
                          </td>
                        );
                      }))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: "10px 14px", borderTop: `1px solid ${t.borde}` }}>
              <span style={{ fontSize: 11, color: t.textoSuave, fontWeight: 600 }}>C1 = Consultorio 1 · C2 = Consultorio 2 · C3 = Consultorio 3</span>
            </div>
          </div>
        </div>
      )}

      {/* PAGOS */}
      {vista === "pagos" && !esPublico && (
        <div style={{ padding: "16px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <button onClick={() => setMesOffset(m => m - 1)} style={navBtn}>‹</button>
            <span style={{ fontWeight: 700, fontSize: 14, color: t.navTexto, textTransform: "capitalize", minWidth: 160, textAlign: "center" }}>{mesLabel}</span>
            <button onClick={() => setMesOffset(m => m + 1)} style={navBtn}>›</button>
            <button onClick={() => setMesOffset(0)} style={{ ...navBtn, fontSize: 11, padding: "5px 10px" }}>Este mes</button>
            {esAdmin && <button onClick={() => exportarCSV(profesionales, reservas, mesStr)} style={{ marginLeft: "auto", padding: "7px 14px", borderRadius: 8, border: "none", background: "#000000", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>⬇ CSV</button>}
          </div>
          {profesionales.length === 0 && <div style={{ background: t.cardBg, borderRadius: 12, padding: 36, textAlign: "center", color: t.textoMuy }}><div style={{ fontSize: 44, marginBottom: 10 }}>📋</div><p style={{ margin: 0 }}>Aún no hay reservas.</p></div>}
          {esAdmin && profesionales.length > 0 && (() => { const totalGlobal = profesionales.reduce((acc, p) => acc + calcularPagosProfesional(reservas, p, mesStr).totalMes, 0); return <div style={{ background: t.totalBg, borderRadius: 12, padding: "14px 18px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ color: "#90cdf4", fontWeight: 700, fontSize: 13 }}>Total {mesLabel}</span><span style={{ color: "white", fontWeight: 900, fontSize: 22 }}>{formatCurrency(totalGlobal)}</span></div>; })()}
          {profesionales.map(prof => {
            const { totalMes, detalle } = calcularPagosProfesional(reservas, prof, mesStr);
            const col = colorMap[prof] || COLORES_PROF[0];
            return (
              <div key={prof} style={{ background: t.cardBg, borderRadius: 12, marginBottom: 14, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
                <div style={{ background: col.bg, padding: "11px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "white", fontWeight: 800, fontSize: 14 }}>👤 {prof}</span>
                  <span style={{ color: "white", fontWeight: 900, fontSize: 19 }}>{formatCurrency(totalMes)}</span>
                </div>
                {detalle.length === 0 ? <p style={{ padding: "12px 16px", color: t.textoMuy, fontSize: 12, margin: 0 }}>Sin reservas este mes.</p> : (
                  <div style={{ padding: 10 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                      <thead><tr style={{ color: t.textoSuave }}>{["Consultorio","Fecha","Horario","Tipo","Horas","Monto"].map(h => <th key={h} style={{ textAlign: h === "Monto" || h === "Horas" ? "right" : "left", padding: "4px 6px", fontWeight: 600 }}>{h}</th>)}</tr></thead>
                      <tbody>
                        {detalle.map(d => (
                          <tr key={d.id} style={{ borderTop: `1px solid ${t.borde}` }}>
                            <td style={{ padding: "5px 6px", color: t.texto }}>{d.consultorio}</td>
                            <td style={{ padding: "5px 6px", color: t.textoSuave }}>{new Date(d.fecha + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })}</td>
                            <td style={{ padding: "5px 6px", color: t.texto }}>{d.horaInicio}:00–{d.horaFin}:00</td>
                            <td style={{ padding: "5px 6px" }}><span style={{ background: d.tipo === "Semanal" ? (modoOscuro ? "rgba(167,139,250,0.15)" : col.light) : (modoOscuro ? "rgba(52,211,153,0.1)" : "#f0fff4"), color: d.tipo === "Semanal" ? col.text : "#276749", borderRadius: 4, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>{d.tipo}</span></td>
                            <td style={{ padding: "5px 6px", textAlign: "right", color: t.texto }}>{d.horas}h{d.tipo === "Semanal" ? ` × ${d.ocurrenciasMes}` : ""}</td>
                            <td style={{ padding: "5px 6px", textAlign: "right", fontWeight: 800, color: t.texto }}>{formatCurrency(d.montoMes)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ borderTop: `2px solid ${t.borde}`, marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 11, color: t.textoMuy }}>Tarifa: {formatCurrency(HORA_PRECIO)}/hora</span>
                      <span style={{ fontWeight: 900, color: t.texto, fontSize: 14 }}>Total: {formatCurrency(totalMes)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* DERIVACIONES */}
{vista === "derivaciones" && !esPublico && (
  <Derivaciones usuario={usuario} t={t} modoOscuro={modoOscuro} />
)}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: t.cardBg, borderRadius: 18, padding: 24, width: "100%", maxWidth: 390, boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>
            <h3 style={{ margin: "0 0 3px", fontSize: 17, fontWeight: 800, color: t.texto }}>{modal.mode === "crear" ? "Nueva reserva" : "Editar reserva"}</h3>
            <p style={{ margin: "0 0 18px", fontSize: 12, color: t.textoSuave }}>{modal.consultorio} · {modal.fecha.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}</p>
            <label style={labelStyle}>Profesional</label>
            {esAdmin
              ? <input list="prof-list" value={form.profesional} onChange={e => setForm(f => ({ ...f, profesional: e.target.value }))} placeholder="Nombre del/la profesional" style={inputStyle} />
              : <div style={{ ...inputStyle, background: t.previewBg, color: t.textoSuave, cursor: "not-allowed", display: "flex", alignItems: "center" }}>{form.profesional}</div>
            }
            <datalist id="prof-list">{Object.keys(colorMap).map(p => <option key={p} value={p} />)}</datalist>
            {modal.mode === "editar" && esAdmin && <><label style={labelStyle}>Consultorio</label><select value={modal.consultorio} onChange={e => setModal(m => ({ ...m, consultorio: e.target.value }))} style={inputStyle}>{CONSULTORIOS.map(c => <option key={c} value={c}>{c}</option>)}</select></>}
            <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}><label style={labelStyle}>Desde</label><select value={form.horaInicio} onChange={e => { setForm(f => ({ ...f, horaInicio: parseInt(e.target.value), horaFin: Math.max(parseInt(e.target.value) + 1, f.horaFin) })); setErrorSolapamiento(""); }} style={inputStyle}>{horasRange.slice(0, -1).map(h => <option key={h} value={h}>{h}:00</option>)}</select></div>
              <div style={{ flex: 1 }}><label style={labelStyle}>Hasta</label><select value={form.horaFin} onChange={e => { setForm(f => ({ ...f, horaFin: parseInt(e.target.value) })); setErrorSolapamiento(""); }} style={inputStyle}>{horasRange.filter(h => h > form.horaInicio).map(h => <option key={h} value={h}>{h}:00</option>)}</select></div>
            </div>
            <div style={{ background: t.previewBg, borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: t.textoSuave }}>
                <span>{form.horaFin - form.horaInicio} hora(s) × {formatCurrency(HORA_PRECIO)}</span>
                <span style={{ fontWeight: 800, color: t.texto, fontSize: 15 }}>{formatCurrency((form.horaFin - form.horaInicio) * HORA_PRECIO)}</span>
              </div>
            </div>
            {errorSolapamiento && (
              <div style={{ background: "#2d1010", border: "1px solid #fc8181", borderRadius: 8, padding: "8px 12px", marginBottom: 14, fontSize: 12, color: "#fc8181", fontWeight: 600 }}>
                {errorSolapamiento}
              </div>
            )}
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 20 }}>
              <input type="checkbox" checked={form.repeteSemanal} onChange={e => setForm(f => ({ ...f, repeteSemanal: e.target.checked }))} style={{ width: 16, height: 16 }} />
              <span style={{ fontSize: 13, color: t.texto }}>Repetir semanalmente</span>
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={closeModal} style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${t.borde}`, background: t.cardBg, cursor: "pointer", fontSize: 13, color: t.textoSuave, fontWeight: 600 }}>Cancelar</button>
              <button onClick={guardarReserva} disabled={!form.profesional.trim()} style={{ flex: 1, padding: 10, borderRadius: 8, border: "none", fontWeight: 800, fontSize: 13, cursor: form.profesional.trim() ? "pointer" : "not-allowed", color: "white", background: form.profesional.trim() ? "linear-gradient(135deg,#667eea,#764ba2)" : "#4a5568" }}>{modal.mode === "crear" ? "Guardar" : "Actualizar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ELIMINAR */}
      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1010, padding: 16 }}>
          <div style={{ background: t.cardBg, borderRadius: 16, padding: 24, maxWidth: 340, width: "100%", textAlign: "center", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🗑️</div>
            <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 800, color: t.texto }}>¿Eliminar esta reserva?</h3>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: t.textoSuave }}>Esta acción no se puede deshacer.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${t.borde}`, background: t.cardBg, cursor: "pointer", fontSize: 13, fontWeight: 600, color: t.textoSuave }}>Cancelar</button>
              <button onClick={() => borrarReserva(confirmDelete)} style={{ flex: 1, padding: 10, borderRadius: 8, border: "none", background: "#fc8181", color: "white", cursor: "pointer", fontSize: 13, fontWeight: 800 }}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:none } }`}</style>
    </div>
  );
}
