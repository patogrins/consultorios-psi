import { useState, useEffect, useMemo, useRef } from "react";
import { db } from "./firebase";
import { collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, updateDoc } from "firebase/firestore";

const HORAS = Array.from({ length: 14 }, (_, i) => i + 8);
const CONSULTORIOS = ["Consultorio 3", "Consultorio 4", "Consultorio 5"];
const CLOUDINARY_CLOUD = "dimsvpxri";
const CLOUDINARY_PRESET = "grins_perfiles";

function dateKey(date) { return date.toISOString().slice(0, 10); }

function avatarColor(nombre) {
  const colores = ["linear-gradient(135deg,#667eea,#764ba2)", "linear-gradient(135deg,#f093fb,#f5576c)", "linear-gradient(135deg,#4facfe,#00f2fe)", "linear-gradient(135deg,#43e97b,#38f9d7)", "linear-gradient(135deg,#fa709a,#fee140)", "linear-gradient(135deg,#a18cd1,#fbc2eb)"];
  let hash = 0;
  for (let i = 0; i < (nombre || "").length; i++) hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
  return colores[Math.abs(hash) % colores.length];
}

async function subirArchivoCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_PRESET);
  const isImage = file.type.startsWith("image/");
  const tipo = isImage ? "image" : "raw";
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/${tipo}/upload`, { method: "POST", body: formData });
  if (!res.ok) throw new Error("Error al subir archivo");
  const data = await res.json();
  return { url: data.secure_url, tipo: isImage ? "imagen" : "archivo", nombre: file.name, tamaño: file.size };
}

export default function TabInicio({ usuario, esAdmin, esPublico, t, onLogin, reservas = [] }) {
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMsg, setNuevoMsg] = useState("");
  const [archivosNuevos, setArchivosNuevos] = useState([]);
  const [subiendoArchivos, setSubiendoArchivos] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [yaInstalado, setYaInstalado] = useState(false);
  const [mostrarIOSGuide, setMostrarIOSGuide] = useState(false);
  const [horaActual, setHoraActual] = useState(new Date().getHours());
  const [notificaciones, setNotificaciones] = useState([]);
  const scrollRef = useRef(null);
  const fileRef = useRef(null);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;

  useEffect(() => {
    if (isStandalone) setYaInstalado(true);
    const handler = e => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Notificaciones de match / derivación
  useEffect(() => {
    if (!usuario) return;
    const unsub = onSnapshot(collection(db, "notificaciones"), snap => {
      const data = snap.docs
        .map(d => ({ ...d.data(), id: d.id }))
        .filter(n => n.para === usuario.email)
        .sort((a, b) => (b.creadoEn?.seconds || 0) - (a.creadoEn?.seconds || 0));
      setNotificaciones(data);
    });
    return () => unsub();
  }, [usuario]);

  async function marcarLeida(id) {
    await updateDoc(doc(db, "notificaciones", id), { leida: true });
  }

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "mensajes_inicio"), snap => {
      const data = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      data.sort((a, b) => (b.creadoEn?.seconds || 0) - (a.creadoEn?.seconds || 0));
      setMensajes(data);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const el = scrollRef.current; if (!el) return;
    const handleScroll = () => setScrollY(el.scrollTop);
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setHoraActual(new Date().getHours()), 60000);
    return () => clearInterval(interval);
  }, []);

  const hoyKey = dateKey(new Date());
  const diaSemana = new Date().getDay();

  // ── Reservas del usuario ──────────────────────────────────────────────────
  const misReservasHoy = useMemo(() => {
    if (!usuario) return [];
    return reservas.filter(r => {
      if (r.profesional !== usuario.nombre) return false;
      const esHoy = r.fecha === hoyKey;
      const esSemanalHoy = r.repeteSemanal && new Date(r.fecha + "T12:00:00").getDay() === diaSemana && new Date(r.fecha + "T12:00:00") <= new Date();
      return esHoy || esSemanalHoy;
    }).sort((a, b) => a.horaInicio - b.horaInicio);
  }, [reservas, usuario, hoyKey, diaSemana]);

  const proximaReserva = useMemo(() => {
    if (!usuario) return null;
    const hoy = hoyKey;
    const proximas = reservas.filter(r => {
      if (r.profesional !== usuario.nombre) return false;
      if (r.fecha > hoy) return true;
      if (r.repeteSemanal) { const o = new Date(r.fecha + "T12:00:00"); return o <= new Date() && o.getDay() !== diaSemana; }
      return false;
    }).sort((a, b) => a.fecha.localeCompare(b.fecha));
    return proximas[0] || null;
  }, [reservas, usuario, hoyKey]);

  // ── Mensaje dinámico contextual ───────────────────────────────────────────
  const mensajeDinamico = useMemo(() => {
    if (esPublico) return null;
    if (misReservasHoy.length > 0) {
      const proxima = misReservasHoy.find(r => r.horaInicio >= horaActual);
      if (proxima) return {
        emoji: "🏢",
        titulo: "Hoy nos vemos en GRINS",
        subtitulo: `Te espera el ${proxima.consultorio} a las ${proxima.horaInicio}:00`,
        extra: misReservasHoy.length > 1 ? `Tenés ${misReservasHoy.length} bloques reservados hoy` : "Que tengas una gran jornada",
        color: "#66bb6a", tipo: "hoy"
      };
      return {
        emoji: "✅",
        titulo: "Jornada completada",
        subtitulo: `Tuviste ${misReservasHoy.length} bloque${misReservasHoy.length > 1 ? "s" : ""} hoy en GRINS`,
        extra: "¡Hasta la próxima!",
        color: "#7c6aff", tipo: "completado"
      };
    }
    if (proximaReserva) {
      const fecha = new Date(proximaReserva.fecha + "T12:00:00");
      const diaLabel = fecha.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
      return {
        emoji: "📅",
        titulo: "Hoy no te vemos, pero te esperamos",
        subtitulo: `Tu próxima reserva es el ${diaLabel}`,
        extra: `${proximaReserva.consultorio} · ${proximaReserva.horaInicio}:00 hs`,
        color: "#4fc3f7", tipo: "proximo"
      };
    }
    return {
      emoji: "🌟",
      titulo: "¡Bienvenido/a a GRINS!",
      subtitulo: "Todavía no tenés reservas agendadas",
      extra: "Mirá la disponibilidad y reservá tu espacio",
      color: "#f59e0b", tipo: "sinreservas", cta: true
    };
  }, [misReservasHoy, proximaReserva, esPublico, horaActual]);

  // ── Ocupación hoy ─────────────────────────────────────────────────────────
  const ocupacionHoy = useMemo(() => {
    const map = {};
    CONSULTORIOS.forEach(c => { map[c] = new Set(); });
    reservas.forEach(r => {
      const esHoy = r.fecha === hoyKey;
      const esSemanalHoy = r.repeteSemanal && new Date(r.fecha + "T12:00:00").getDay() === diaSemana && new Date(r.fecha + "T12:00:00") <= new Date();
      if (!esHoy && !esSemanalHoy) return;
      for (let h = r.horaInicio; h < r.horaFin; h++) map[r.consultorio]?.add(h);
    });
    return map;
  }, [reservas, hoyKey, diaSemana]);

  function quienEstaAhora(consultorio) {
    return reservas.find(r => {
      if (r.consultorio !== consultorio) return false;
      const esHoy = r.fecha === hoyKey;
      const esSemanalHoy = r.repeteSemanal && new Date(r.fecha + "T12:00:00").getDay() === diaSemana;
      return (esHoy || esSemanalHoy) && horaActual >= r.horaInicio && horaActual < r.horaFin;
    });
  }

  function bloquesLibres(consultorio) {
    const ocupadas = ocupacionHoy[consultorio] || new Set();
    const bloques = []; let inicio = null;
    for (let h = horaActual; h <= 22; h++) {
      const libre = !ocupadas.has(h);
      if (libre && inicio === null) inicio = h;
      if ((!libre || h === 22) && inicio !== null) { bloques.push({ desde: inicio, hasta: h }); inicio = null; }
    }
    return bloques;
  }

  const mensajeOcupacion = useMemo(() => {
    const totales = CONSULTORIOS.map(c => {
      const ocupadas = ocupacionHoy[c] || new Set();
      const restantes = HORAS.filter(h => h >= horaActual);
      const libres = restantes.filter(h => !ocupadas.has(h)).length;
      return { consultorio: c, libres, total: restantes.length };
    });
    const totalLibres = totales.reduce((a, b) => a + b.libres, 0);
    const totalHoras = totales.reduce((a, b) => a + b.total, 0);
    const pct = totalHoras > 0 ? (totalLibres / totalHoras) * 100 : 100;
    const masLibre = totales.sort((a, b) => b.libres - a.libres)[0];
    if (pct < 25) return { msg: "Alta demanda hoy: quedan pocos horarios disponibles", color: "#ef5350", emoji: "🔥" };
    if (pct < 50) return { msg: `Ocupación media. ${masLibre.consultorio} tiene más disponibilidad`, color: "#f59e0b", emoji: "📊" };
    return { msg: `${masLibre.consultorio} tiene varios horarios libres hoy`, color: "#66bb6a", emoji: "✨" };
  }, [ocupacionHoy, horaActual]);

  // ── Publicar novedad ──────────────────────────────────────────────────────
  async function publicarMensaje() {
    if (!nuevoMsg.trim() && archivosNuevos.length === 0) return;
    setSubiendoArchivos(true);
    try {
      let archivosSubidos = [];
      if (archivosNuevos.length > 0) {
        archivosSubidos = await Promise.all(archivosNuevos.map(f => subirArchivoCloudinary(f)));
      }
      await addDoc(collection(db, "mensajes_inicio"), {
        texto: nuevoMsg.trim(),
        autor: usuario.nombre,
        archivos: archivosSubidos,
        creadoEn: serverTimestamp()
      });
      setNuevoMsg(""); setArchivosNuevos([]); setMostrarForm(false);
    } catch (e) { console.error(e); }
    setSubiendoArchivos(false);
  }

  async function eliminarMensaje(id) { await deleteDoc(doc(db, "mensajes_inicio", id)); }

  async function handleInstalar() {
    if (installPrompt) { installPrompt.prompt(); const { outcome } = await installPrompt.userChoice; if (outcome === "accepted") { setInstallPrompt(null); setYaInstalado(true); } }
    else setMostrarIOSGuide(true);
  }

  const hora = new Date().getHours();
  const saludo = hora < 12 ? "¡Buenos días" : hora < 19 ? "¡Buenas tardes" : "¡Buenas noches";
  const nombreMostrado = esPublico ? null : (usuario?.nombre || "");
  const especialidad = usuario?.especialidad || "";
  const fotoUrl = usuario?.fotoUrl || null;
  const inicial = nombreMostrado?.[0]?.toUpperCase() || "?";
  const logoProgress = Math.min(scrollY / 80, 1);
  const stickyVisible = scrollY > 100;
  const notificacionesNoLeidas = notificaciones.filter(n => !n.leida);

  return (
    <div ref={scrollRef} style={{ height: "100vh", overflowY: "auto", background: "#000000" }} className="tab-content">

      {/* ══ STICKY BAR ══ */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 20, background: stickyVisible ? "rgba(0,0,0,0.92)" : "transparent", backdropFilter: stickyVisible ? "blur(24px)" : "none", WebkitBackdropFilter: stickyVisible ? "blur(24px)" : "none", borderBottom: stickyVisible ? "1px solid rgba(124,106,255,0.15)" : "none", transition: "all 0.3s ease", padding: stickyVisible ? "10px 20px" : "0", height: stickyVisible ? "auto" : 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: avatarColor(nombreMostrado || ""), overflow: "hidden", border: "1.5px solid rgba(124,106,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "white", flexShrink: 0 }}>
            {fotoUrl ? <img src={fotoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : inicial}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "white", lineHeight: 1 }}>{esPublico ? "GRINS" : nombreMostrado}</div>
            {especialidad && <div style={{ fontSize: 10, color: "#7c6aff", fontWeight: 600, marginTop: 2 }}>{especialidad}</div>}
          </div>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: 2 }}>GRINS</span>
      </div>

      {/* ══ HERO ══ */}
      <div style={{ background: "linear-gradient(180deg,#0a0a14 0%,#000000 100%)", padding: "54px 20px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 20, opacity: 1 - logoProgress, transform: `translateY(${-logoProgress * 12}px)`, pointerEvents: logoProgress > 0.8 ? "none" : "auto" }}>
          <img src="/logohead.jpeg" alt="GRINS" style={{ height: 44, objectFit: "contain", opacity: 0.95 }} />
        </div>

        {!esPublico && (
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: avatarColor(nombreMostrado), overflow: "hidden", border: "2.5px solid rgba(124,106,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "white", flexShrink: 0, boxShadow: "0 0 20px rgba(124,106,255,0.2)" }}>
              {fotoUrl ? <img src={fotoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : inicial}
            </div>
            <div>
              <p style={{ margin: "0 0 3px", fontSize: 13, color: "#a0a8c0" }}>{saludo},</p>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "white", letterSpacing: -0.3, lineHeight: 1.1 }}>{nombreMostrado}! {esAdmin ? "👑" : ""}</h1>
              {especialidad && <div style={{ fontSize: 12, color: "#7c6aff", fontWeight: 500, marginTop: 3 }}>{especialidad}</div>}
            </div>
          </div>
        )}

        {esPublico && (
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 800, color: "white", letterSpacing: -0.5 }}>Bienvenido<br />a GRINS</h1>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "#a0a8c0", lineHeight: 1.5 }}>Consultorios para profesionales de la salud mental</p>
            <button onClick={onLogin} style={{ padding: "9px 20px", borderRadius: 24, border: "none", background: "linear-gradient(135deg,#667eea,#764ba2)", color: "white", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Iniciar sesión →</button>
          </div>
        )}

        {/* BLOQUE DINÁMICO CONTEXTUAL */}
        {mensajeDinamico && (
          <div style={{ background: "rgba(14,12,28,0.8)", borderRadius: 18, padding: "16px 18px", border: `1px solid ${mensajeDinamico.color}33`, backdropFilter: "blur(12px)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${mensajeDinamico.color}, transparent)` }} />
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>{mensajeDinamico.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "white", marginBottom: 4 }}>{mensajeDinamico.titulo}</div>
                <div style={{ fontSize: 12, color: mensajeDinamico.color, fontWeight: 600, marginBottom: 3 }}>{mensajeDinamico.subtitulo}</div>
                <div style={{ fontSize: 11, color: "#a0a8c0" }}>{mensajeDinamico.extra}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: "14px 14px 100px" }}>

        {/* ══ NOTIFICACIONES DE MATCH ══ */}
        {notificacionesNoLeidas.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#a0a8c0", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>🔔 Notificaciones</div>
            {notificacionesNoLeidas.map(n => {
              // Determinar icono, título y cuerpo según el tipo
              let icono = "🔔";
              let titulo = "Notificación";
              let cuerpo = n.mensaje || "";
              let colorBorde = "rgba(124,106,255,0.25)";
              let colorFondo = "rgba(124,106,255,0.1)";

              if (n.tipo === "derivacion_asignada") {
                icono = "✅";
                titulo = "¡Te eligieron para una derivación!";
                cuerpo = n.mensaje || `${n.deNombre} te designó para atender un caso de ${n.especialidad}`;
              } else if (n.tipo === "match_derivacion") {
                icono = "🤝";
                titulo = "¡Derivación asignada con éxito!";
                cuerpo = n.mensaje || `Designaste a ${n.deNombre} para tu derivación de ${n.especialidad}`;
              } else if (n.tipo === "admin_reserva") {
                icono = "📋";
                titulo = `Mensaje de ${n.deNombre || "Admin"}`;
                cuerpo = n.mensaje || "";
                colorBorde = "rgba(99,179,237,0.3)";
                colorFondo = "rgba(99,179,237,0.08)";
              } else if (n.tipo === "reserva_asignada") {
                icono = "📅";
                titulo = "Reserva asignada";
                cuerpo = n.mensaje || `Reserva en ${n.consultorio} el ${n.fecha} de ${n.horaInicio}:00 a ${n.horaFin}:00`;
                colorBorde = "rgba(56,161,105,0.3)";
                colorFondo = "rgba(56,161,105,0.08)";
              }

              return (
                <div key={n.id} style={{ background: colorFondo, borderRadius: 14, padding: "12px 14px", marginBottom: 8, border: `1px solid ${colorBorde}`, display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#667eea,#764ba2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                    {icono}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "white", marginBottom: 2 }}>{titulo}</div>
                    <div style={{ fontSize: 12, color: "#a0a8c0", marginBottom: 4 }}>{cuerpo}</div>
                    {(n.tipo === "derivacion_asignada" || n.tipo === "match_derivacion") && (
                      <div style={{ fontSize: 11, color: "#4a5270" }}>Ir a Lazos → Conexiones para coordinar</div>
                    )}
                  </div>
                  <button onClick={() => marcarLeida(n.id)} style={{ background: "none", border: "none", color: "#4a5270", cursor: "pointer", fontSize: 16, padding: 0, flexShrink: 0 }}>✕</button>
                </div>
              );
            })}
          </div>
        )}

        {/* ══ TILES ══ */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 10 }}>
            {[
              { id: "ig", icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill="white" stroke="none"/></svg>, label: "Instagram", onClick: () => window.open("https://www.instagram.com/grinsconsultorios?igsh=MXEzamhnYW9vbXF2&utm_source=qr", "_blank") },
              { id: "wa", icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>, label: "WhatsApp", onClick: () => window.open("https://wa.me/541159373676", "_blank") },
              { id: "maps", icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>, label: "Cómo llegar", onClick: () => window.open("https://maps.app.goo.gl/Evx2MuLcFjK1PgaV9?g_st=ic", "_blank") },
            ].map(tile => (
              <button key={tile.id} onClick={tile.onClick} style={{ aspectRatio: "1", borderRadius: 16, border: "1px solid rgba(124,106,255,0.2)", background: "rgba(20,15,40,0.7)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: 12, transition: "opacity 0.15s" }}
                onTouchStart={e => e.currentTarget.style.opacity = "0.6"} onTouchEnd={e => e.currentTarget.style.opacity = "1"}
                onMouseDown={e => e.currentTarget.style.opacity = "0.6"} onMouseUp={e => e.currentTarget.style.opacity = "1"}>
                {tile.icon}
                <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.8)", textAlign: "center" }}>{tile.label}</span>
              </button>
            ))}
          </div>
          {!yaInstalado && (
            <button onClick={handleInstalar} style={{ width: "100%", padding: "11px 16px", borderRadius: 14, border: "1px solid rgba(124,106,255,0.2)", background: "rgba(20,15,40,0.7)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, transition: "opacity 0.15s" }}
              onTouchStart={e => e.currentTarget.style.opacity = "0.6"} onTouchEnd={e => e.currentTarget.style.opacity = "1"}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7c6aff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#7c6aff" }}>Instalar app en este dispositivo</span>
            </button>
          )}
        </div>

        {/* ══ DISPONIBILIDAD HOY — DETALLADA ══ */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h2 style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#a0a8c0", textTransform: "uppercase", letterSpacing: 1.5 }}>Disponibilidad hoy</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 9 }}>{mensajeOcupacion.emoji}</span>
              <span style={{ fontSize: 10, color: mensajeOcupacion.color, fontWeight: 600 }}>{mensajeOcupacion.msg}</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {CONSULTORIOS.map((consultorio, ci) => {
              const ahora = quienEstaAhora(consultorio);
              const libres = bloquesLibres(consultorio);
              const ocupadas = ocupacionHoy[consultorio] || new Set();
              const totalOcupadas = HORAS.filter(h => ocupadas.has(h)).length;
              const pctOcupado = Math.round((totalOcupadas / 14) * 100);

              return (
                <div key={consultorio} style={{ background: "rgba(14,12,28,0.8)", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(124,106,255,0.1)", backdropFilter: "blur(12px)" }}>
                  <div style={{ padding: "12px 14px 8px", borderBottom: "1px solid rgba(124,106,255,0.08)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: "white" }}>C{ci + 3} — {consultorio}</span>
                      <span style={{ fontSize: 10, color: "#4a5270" }}>{pctOcupado}% ocupado</span>
                    </div>
                    <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden", marginBottom: 8 }}>
                      <div style={{ height: "100%", width: `${pctOcupado}%`, background: pctOcupado > 70 ? "#ef5350" : pctOcupado > 40 ? "#f59e0b" : "linear-gradient(90deg,#667eea,#764ba2)", borderRadius: 2, transition: "width 0.3s" }} />
                    </div>
                    <div style={{ display: "flex", gap: 1.5 }}>
                      {HORAS.map(h => {
                        const ocup = ocupadas.has(h);
                        const esPasada = h < horaActual;
                        const esActual = h === horaActual;
                        return (
                          <div key={h} style={{ flex: 1, height: 16, borderRadius: 2, background: ocup ? "rgba(124,106,255,0.7)" : esPasada ? "rgba(255,255,255,0.05)" : "rgba(124,106,255,0.2)", border: esActual ? "1px solid white" : "none", opacity: esPasada && !ocup ? 0.3 : 1 }} />
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                      {["8h", "11h", "14h", "17h", "20h"].map(h => <span key={h} style={{ fontSize: 8, color: "#3a3a5a", fontWeight: 600 }}>{h}</span>)}
                    </div>
                  </div>

                  <div style={{ padding: "10px 14px" }}>
                    {ahora ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef5350", boxShadow: "0 0 6px #ef5350" }} />
                        <span style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 600 }}>
                          {ahora.profesional}
                          <span style={{ color: "#4a5270", fontWeight: 400 }}> · hasta las {ahora.horaFin}:00</span>
                        </span>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#66bb6a", boxShadow: "0 0 6px #66bb6a" }} />
                        <span style={{ fontSize: 12, color: "#66bb6a", fontWeight: 600 }}>Libre ahora</span>
                      </div>
                    )}

                    {libres.length > 0 && (
                      <div>
                        <div style={{ fontSize: 10, color: "#4a5270", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 5 }}>Horarios disponibles</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {libres.map((b, i) => (
                            <span key={i} style={{ background: "rgba(124,106,255,0.12)", color: "#a78bfa", borderRadius: 8, padding: "3px 9px", fontSize: 11, fontWeight: 600, border: "1px solid rgba(124,106,255,0.2)" }}>
                              {b.desde}:00 – {b.hasta === 22 ? "cierre" : `${b.hasta}:00`}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {libres.length === 0 && (
                      <div style={{ fontSize: 11, color: "#4a5270", fontStyle: "italic" }}>Sin disponibilidad para el resto del día</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ══ NOVEDADES ══ */}
        <div style={{ marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#a0a8c0", textTransform: "uppercase", letterSpacing: 1.5 }}>Novedades</h2>
          {esAdmin && (
            <button onClick={() => setMostrarForm(f => !f)} style={{ padding: "5px 12px", borderRadius: 20, border: "1px solid rgba(124,106,255,0.3)", background: "transparent", color: "#7c6aff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              {mostrarForm ? "Cancelar" : "+ Publicar"}
            </button>
          )}
        </div>

        {esAdmin && mostrarForm && (
          <div style={{ background: "rgba(14,12,28,0.8)", borderRadius: 14, padding: 14, marginBottom: 12, border: "1px solid rgba(124,106,255,0.12)" }}>
            <textarea value={nuevoMsg} onChange={e => setNuevoMsg(e.target.value)}
              placeholder="Escribí un mensaje para todos los profesionales..."
              rows={3} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(124,106,255,0.15)", background: "rgba(0,0,0,0.5)", color: "white", fontSize: 13, outline: "none", resize: "none", boxSizing: "border-box", fontFamily: "inherit", marginBottom: 10 }} />

            <div style={{ marginBottom: 10 }}>
              <button onClick={() => fileRef.current?.click()} style={{ padding: "7px 14px", borderRadius: 10, border: "1px dashed rgba(124,106,255,0.3)", background: "transparent", color: "#7c6aff", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c6aff" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Adjuntar imagen o PDF
              </button>
              <input ref={fileRef} type="file" accept="image/*,.pdf,.doc,.docx" multiple onChange={e => setArchivosNuevos(prev => [...prev, ...Array.from(e.target.files)])} style={{ display: "none" }} />

              {archivosNuevos.length > 0 && (
                <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {archivosNuevos.map((f, i) => (
                    <div key={i} style={{ background: "rgba(124,106,255,0.1)", borderRadius: 8, padding: "4px 10px", display: "flex", alignItems: "center", gap: 6, border: "1px solid rgba(124,106,255,0.2)" }}>
                      <span style={{ fontSize: 11, color: "#a78bfa" }}>{f.name.length > 20 ? f.name.slice(0, 20) + "…" : f.name}</span>
                      <button onClick={() => setArchivosNuevos(prev => prev.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#4a5270", cursor: "pointer", fontSize: 12, padding: 0 }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button onClick={publicarMensaje} disabled={subiendoArchivos || (!nuevoMsg.trim() && archivosNuevos.length === 0)}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "none", background: (!nuevoMsg.trim() && archivosNuevos.length === 0) || subiendoArchivos ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg,#667eea,#764ba2)", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              {subiendoArchivos ? "Subiendo..." : "Publicar novedad"}
            </button>
          </div>
        )}

        {mensajes.length === 0 && (
          <div style={{ background: "rgba(14,12,28,0.6)", borderRadius: 14, padding: 22, textAlign: "center", border: "1px solid rgba(124,106,255,0.08)" }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>📢</div>
            <p style={{ margin: 0, fontSize: 12, color: "#4a5270" }}>Sin novedades por el momento.</p>
          </div>
        )}

        {mensajes.map(m => (
          <div key={m.id} style={{ background: "rgba(14,12,28,0.8)", borderRadius: 14, padding: "12px 14px", marginBottom: 10, border: "1px solid rgba(124,106,255,0.08)", backdropFilter: "blur(12px)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#667eea,#764ba2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "white" }}>
                  {m.autor?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "white" }}>{m.autor}</div>
                  <div style={{ fontSize: 10, color: "#4a5270" }}>{m.creadoEn?.toDate?.()?.toLocaleDateString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) || ""}</div>
                </div>
              </div>
              {esAdmin && <button onClick={() => eliminarMensaje(m.id)} style={{ background: "none", border: "none", color: "#4a5270", cursor: "pointer", fontSize: 13, padding: 4 }}>✕</button>}
            </div>
            {m.texto && <p style={{ margin: "0 0 8px", fontSize: 13, color: "#a0a8c0", lineHeight: 1.6 }}>{m.texto}</p>}

            {m.archivos?.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                {m.archivos.map((a, i) => (
                  a.tipo === "imagen" ? (
                    <a key={i} href={a.url} target="_blank" rel="noreferrer" style={{ display: "block", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(124,106,255,0.2)" }}>
                      <img src={a.url} alt={a.nombre} style={{ width: 120, height: 80, objectFit: "cover", display: "block" }} />
                    </a>
                  ) : (
                    <a key={i} href={a.url} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(124,106,255,0.1)", borderRadius: 10, padding: "6px 12px", border: "1px solid rgba(124,106,255,0.2)", textDecoration: "none" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c6aff" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      <span style={{ fontSize: 11, color: "#a78bfa", fontWeight: 600 }}>{a.nombre?.length > 24 ? a.nombre.slice(0, 24) + "…" : a.nombre}</span>
                    </a>
                  )
                ))}
              </div>
            )}
          </div>
        ))}

      </div>

      {/* ══ GUÍA INSTALACIÓN ══ */}
      {mostrarIOSGuide && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", alignItems: "flex-end" }}>
          <div style={{ background: "#0a0a14", borderRadius: "24px 24px 0 0", padding: "20px 20px 44px", width: "100%", border: "1px solid rgba(124,106,255,0.15)" }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.1)", margin: "0 auto 16px" }} />
            <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 800, color: "white" }}>Instalá GRINS en tu dispositivo</h3>
            {[["iPhone/iPad", 'En Safari: tocá <strong style="color:#7c6aff">Compartir ⎋</strong> → <strong style="color:#7c6aff">"Agregar a pantalla de inicio"</strong>'], ["Android", 'En Chrome: tocá los <strong style="color:#7c6aff">3 puntitos ⋮</strong> → <strong style="color:#7c6aff">"Agregar a pantalla de inicio"</strong>'], ["PC", 'En Chrome: tocá el ícono <strong style="color:#7c6aff">⊕</strong> en la barra de direcciones']].map(([plat, txt]) => (
              <div key={plat} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
                <div style={{ minWidth: 28, height: 28, background: "rgba(124,106,255,0.1)", border: "1px solid rgba(124,106,255,0.2)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#7c6aff", fontWeight: 800, fontSize: 9 }}>{plat.slice(0, 3)}</div>
                <div><div style={{ fontSize: 11, fontWeight: 700, color: "#7c6aff", marginBottom: 3 }}>{plat}</div><span style={{ color: "#a0a8c0", fontSize: 12, lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: txt }} /></div>
              </div>
            ))}
            <button onClick={() => setMostrarIOSGuide(false)} style={{ width: "100%", padding: 13, borderRadius: 14, border: "none", background: "linear-gradient(135deg,#667eea,#764ba2)", color: "white", fontWeight: 700, fontSize: 14, cursor: "pointer", marginTop: 4 }}>Entendido</button>
          </div>
        </div>
      )}

    </div>
  );
}
