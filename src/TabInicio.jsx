import { useState, useEffect, useMemo, useRef } from "react";
import { db } from "./firebase";
import { collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";

const HORAS = Array.from({ length: 14 }, (_, i) => i + 8);
const CONSULTORIOS = ["Consultorio 1", "Consultorio 2", "Consultorio 3"];

function dateKey(date) { return date.toISOString().slice(0, 10); }

function avatarColor(nombre) {
  const colores = ["linear-gradient(135deg,#667eea,#764ba2)", "linear-gradient(135deg,#f093fb,#f5576c)", "linear-gradient(135deg,#4facfe,#00f2fe)", "linear-gradient(135deg,#43e97b,#38f9d7)", "linear-gradient(135deg,#fa709a,#fee140)", "linear-gradient(135deg,#a18cd1,#fbc2eb)"];
  let hash = 0;
  for (let i = 0; i < (nombre || "").length; i++) hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
  return colores[Math.abs(hash) % colores.length];
}

export default function TabInicio({ usuario, esAdmin, esPublico, t, onLogin, reservas = [] }) {
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMsg, setNuevoMsg] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [yaInstalado, setYaInstalado] = useState(false);
  const [mostrarIOSGuide, setMostrarIOSGuide] = useState(false);
  const scrollRef = useRef(null);

  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;

  useEffect(() => {
    if (isStandalone) setYaInstalado(true);
    const handler = e => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "mensajes_inicio"), snap => {
      const data = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      data.sort((a, b) => (b.creadoEn?.seconds || 0) - (a.creadoEn?.seconds || 0));
      setMensajes(data);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => setScrollY(el.scrollTop);
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  async function publicarMensaje() {
    if (!nuevoMsg.trim()) return;
    await addDoc(collection(db, "mensajes_inicio"), {
      texto: nuevoMsg.trim(), autor: usuario.nombre, creadoEn: serverTimestamp()
    });
    setNuevoMsg(""); setMostrarForm(false);
  }

  async function eliminarMensaje(id) { await deleteDoc(doc(db, "mensajes_inicio", id)); }

  async function handleInstalar() {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === "accepted") { setInstallPrompt(null); setYaInstalado(true); }
    } else {
      setMostrarIOSGuide(true);
    }
  }

  const hora = new Date().getHours();
  const saludo = hora < 12 ? "¡Buenos días" : hora < 19 ? "¡Buenas tardes" : "¡Buenas noches";
  const hoyKey = dateKey(new Date());
  const horaActual = hora;

  const COLORES_PROF = ["#667eea", "#f5576c", "#00b4d8", "#38b2ac", "#f59e0b", "#a78bfa", "#f97316", "#84cc16"];

  const colorMap = useMemo(() => {
    const map = {}; let idx = 0;
    reservas.forEach(r => { if (r.profesional && !map[r.profesional]) { map[r.profesional] = COLORES_PROF[idx++ % COLORES_PROF.length]; } });
    return map;
  }, [reservas]);

  const ocupacionHoy = useMemo(() => {
    const map = {};
    CONSULTORIOS.forEach(c => { map[c] = new Set(); });
    const diaSemana = new Date().getDay();
    reservas.forEach(r => {
      const esHoy = r.fecha === hoyKey;
      const esSemanalHoy = r.repeteSemanal && new Date(r.fecha + "T12:00:00").getDay() === diaSemana && new Date(r.fecha + "T12:00:00") <= new Date();
      if (!esHoy && !esSemanalHoy) return;
      for (let h = r.horaInicio; h < r.horaFin; h++) map[r.consultorio]?.add(h);
    });
    return map;
  }, [reservas, hoyKey]);

  function getBloquesLibres(consultorio) {
    const ocupadas = ocupacionHoy[consultorio] || new Set();
    const bloques = []; let inicio = null;
    for (let h = 8; h <= 22; h++) {
      const libre = !ocupadas.has(h);
      if (libre && inicio === null) inicio = h;
      if ((!libre || h === 22) && inicio !== null) { bloques.push({ desde: inicio, hasta: h }); inicio = null; }
    }
    return bloques;
  }

  function proximoLibreInfo(consultorio) {
    const ocupadas = ocupacionHoy[consultorio] || new Set();
    const totalOcupadas = HORAS.filter(h => ocupadas.has(h)).length;
    if (totalOcupadas === 0) return { texto: "Libre 8:00 – 22:00", color: "#4fc3f7", bg: "rgba(79,195,247,0.15)" };
    const bloques = getBloquesLibres(consultorio);
    const futuros = bloques.filter(b => b.hasta > horaActual);
    if (futuros.length === 0) return { texto: "Sin más turnos hoy", color: "#ef5350", bg: "rgba(239,83,80,0.12)" };
    const b = futuros[0];
    const desde = Math.max(b.desde, horaActual);
    if (desde === horaActual) return { texto: `Libre ahora – ${b.hasta}:00`, color: "#66bb6a", bg: "rgba(102,187,106,0.15)" };
    return { texto: `Libre ${desde}:00 – ${b.hasta}:00`, color: "#4fc3f7", bg: "rgba(79,195,247,0.15)" };
  }

  function colorBloque(consultorio, h) {
    const ocupadas = ocupacionHoy[consultorio] || new Set();
    if (ocupadas.has(h)) {
      const reserva = reservas.find(r => {
        const esHoy = r.fecha === hoyKey;
        const diaSemana = new Date().getDay();
        const esSemanalHoy = r.repeteSemanal && new Date(r.fecha + "T12:00:00").getDay() === diaSemana;
        return r.consultorio === consultorio && h >= r.horaInicio && h < r.horaFin && (esHoy || esSemanalHoy);
      });
      return { ocupado: true, reserva };
    }
    return { ocupado: false, esPasada: h < horaActual };
  }

  const nombreMostrado = esPublico ? null : (usuario?.nombre || "");
  const especialidad = usuario?.especialidad || "";
  const fotoUrl = usuario?.fotoUrl || null;
  const inicial = nombreMostrado?.[0]?.toUpperCase() || "?";

  // Animación basada en scroll
  const HERO_HEIGHT = 160;
  const logoProgress = Math.min(scrollY / 80, 1);        // 0→1 logo desaparece
  const perfilProgress = Math.min(scrollY / 120, 1);     // 0→1 perfil se achica
  const stickyVisible = scrollY > 100;

  return (
    <div ref={scrollRef} style={{ height: "100vh", overflowY: "auto", background: "linear-gradient(180deg,#0d1b2e 0%,#081020 40%,#000510 100%)" }} className="tab-content">

      {/* ══ STICKY BAR ══ */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        background: stickyVisible ? "rgba(13,27,46,0.88)" : "transparent",
        backdropFilter: stickyVisible ? "blur(24px)" : "none",
        WebkitBackdropFilter: stickyVisible ? "blur(24px)" : "none",
        borderBottom: stickyVisible ? "1px solid rgba(79,195,247,0.12)" : "none",
        transition: "all 0.3s ease",
        padding: stickyVisible ? "10px 20px" : "0 20px",
        height: stickyVisible ? "auto" : 0,
        overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: avatarColor(nombreMostrado || ""), overflow: "hidden", border: "1.5px solid rgba(79,195,247,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "white", flexShrink: 0 }}>
            {fotoUrl ? <img src={fotoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : inicial}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "white", lineHeight: 1 }}>{esPublico ? "GRINS" : nombreMostrado}</div>
            {especialidad && <div style={{ fontSize: 10, color: "#4fc3f7", fontWeight: 600, marginTop: 2 }}>{especialidad}</div>}
          </div>
        </div>
        <span style={{ fontSize: 15, fontWeight: 800, color: "rgba(255,255,255,0.5)", letterSpacing: 3, fontFamily: "system-ui" }}>GRINS</span>
      </div>

      {/* ══ HERO ══ */}
      <div style={{ paddingTop: 54, paddingBottom: 20, paddingLeft: 20, paddingRight: 20 }}>

        {/* LOGO centrado — se desvanece al scroll */}
        <div style={{
          textAlign: "center", marginBottom: 24,
          opacity: 1 - logoProgress,
          transform: `translateY(${-logoProgress * 16}px) scale(${1 - logoProgress * 0.1})`,
          transition: "none",
          pointerEvents: "none",
        }}>
          <img src="/logohead.jpeg" alt="GRINS" style={{ width: 200, objectFit: "contain", opacity: 0.95 }} />
        </div>

        {/* PERFIL — se achica y sube al scroll */}
        {!esPublico && (
          <div style={{
            display: "flex", alignItems: "center", gap: 14,
            opacity: 1 - perfilProgress * 0.3,
            transform: `translateY(${-perfilProgress * 8}px)`,
            transition: "none",
            marginBottom: 20,
          }}>
            {/* AVATAR */}
            <div style={{ width: 58, height: 58, borderRadius: "50%", background: avatarColor(nombreMostrado), overflow: "hidden", border: "2.5px solid rgba(79,195,247,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "white", flexShrink: 0, boxShadow: "0 0 20px rgba(79,195,247,0.15)" }}>
              {fotoUrl ? <img src={fotoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : inicial}
            </div>
            {/* TEXTO */}
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "white", letterSpacing: -0.3, lineHeight: 1.15 }}>
                {saludo}, {nombreMostrado}!
              </h1>
              <div style={{ fontSize: 13, color: "#7bafc4", fontWeight: 500, marginTop: 3 }}>
                {especialidad || (esAdmin ? "Administrador" : "Profesional")}
              </div>
            </div>
          </div>
        )}

        {esPublico && (
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 800, color: "white", letterSpacing: -0.5 }}>Bienvenido<br />a GRINS</h1>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "#7bafc4", lineHeight: 1.5 }}>Consultorios para profesionales de la salud mental</p>
            <button onClick={onLogin} style={{ padding: "9px 20px", borderRadius: 24, border: "none", background: "linear-gradient(135deg,#667eea,#764ba2)", color: "white", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Iniciar sesión →</button>
          </div>
        )}

        {/* ══ TILES ══ */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 10 }}>
            {[
              {
                id: "instagram",
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill="white" stroke="none"/></svg>,
                label: "Instagram",
                bg: "rgba(30,40,70,0.7)",
                border: "rgba(79,195,247,0.15)",
                onClick: () => window.open("https://www.instagram.com/grinsconsultorios?igsh=MXEzamhnYW9vbXF2&utm_source=qr", "_blank"),
              },
              {
                id: "whatsapp",
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>,
                label: "WhatsApp",
                bg: "rgba(30,40,70,0.7)",
                border: "rgba(79,195,247,0.15)",
                onClick: () => window.open("https://wa.me/541159373676", "_blank"),
              },
              {
                id: "maps",
                icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
                label: "Cómo llegar",
                bg: "rgba(30,40,70,0.7)",
                border: "rgba(79,195,247,0.15)",
                onClick: () => window.open("https://maps.app.goo.gl/Evx2MuLcFjK1PgaV9?g_st=ic", "_blank"),
              },
            ].map(tile => (
              <button key={tile.id} onClick={tile.onClick} style={{
                aspectRatio: "1", borderRadius: 18,
                border: `1px solid ${tile.border}`,
                background: tile.bg,
                backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
                cursor: "pointer",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: 10, padding: 12,
                boxShadow: "0 2px 16px rgba(0,0,0,0.25)",
                transition: "opacity 0.15s",
              }}
                onTouchStart={e => e.currentTarget.style.opacity = "0.65"}
                onTouchEnd={e => e.currentTarget.style.opacity = "1"}
                onMouseDown={e => e.currentTarget.style.opacity = "0.65"}
                onMouseUp={e => e.currentTarget.style.opacity = "1"}
              >
                {tile.icon}
                <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.85)", textAlign: "center", lineHeight: 1.2 }}>{tile.label}</span>
              </button>
            ))}
          </div>

          {/* BOTÓN INSTALAR */}
          {!yaInstalado && (
            <button onClick={handleInstalar} style={{
              width: "100%", padding: "12px 16px", borderRadius: 14,
              border: "1px solid rgba(79,195,247,0.2)",
              background: "rgba(30,40,70,0.7)",
              backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              transition: "opacity 0.15s",
            }}
              onTouchStart={e => e.currentTarget.style.opacity = "0.65"}
              onTouchEnd={e => e.currentTarget.style.opacity = "1"}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4fc3f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#4fc3f7" }}>Instalar app en este dispositivo</span>
            </button>
          )}
        </div>

        {/* ══ DISPONIBILIDAD HOY ══ */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h2 style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#7bafc4", textTransform: "uppercase", letterSpacing: 1.5 }}>Disponibilidad hoy</h2>
            <span style={{ fontSize: 11, color: "#4a6070" }}>{new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "short" })}</span>
          </div>

          <div style={{ background: "rgba(20,35,60,0.7)", borderRadius: 18, overflow: "hidden", border: "1px solid rgba(79,195,247,0.1)", backdropFilter: "blur(12px)" }}>
            {CONSULTORIOS.map((consultorio, ci) => {
              const info = proximoLibreInfo(consultorio);
              return (
                <div key={consultorio} style={{ padding: "14px 16px", borderBottom: ci < 2 ? "1px solid rgba(79,195,247,0.08)" : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>C{ci + 1} — {consultorio}</span>
                    <span style={{ fontSize: 11, background: info.bg, color: info.color, borderRadius: 20, padding: "3px 10px", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0, marginLeft: 8 }}>{info.texto}</span>
                  </div>
                  <div style={{ display: "flex", gap: 2 }}>
                    {HORAS.map(h => {
                      const { ocupado, reserva, esPasada } = colorBloque(consultorio, h);
                      const color = ocupado && reserva ? colorMap[reserva.profesional] || "#667eea" : null;
                      const esActual = h === horaActual;
                      return (
                        <div key={h} style={{ flex: 1, position: "relative" }}>
                          {esActual && <div style={{ position: "absolute", top: -3, left: "50%", transform: "translateX(-50%)", width: 2, height: 3, background: "white", borderRadius: 1 }} />}
                          <div style={{
                            height: 22, borderRadius: 4,
                            background: ocupado ? color : esPasada ? "rgba(255,255,255,0.06)" : "rgba(79,195,247,0.25)",
                            border: esActual ? "1px solid rgba(255,255,255,0.5)" : ocupado ? "none" : "1px solid rgba(79,195,247,0.15)",
                            opacity: esPasada && !ocupado ? 0.35 : 1,
                          }}
                            title={ocupado && reserva ? `${reserva.profesional} ${h}:00–${reserva.horaFin}:00` : `${h}:00 libre`}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                    {["8h", "11h", "14h", "17h", "20h"].map(h => (
                      <span key={h} style={{ fontSize: 9, color: "#3a5060", fontWeight: 600 }}>{h}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 16, marginTop: 8, paddingLeft: 4 }}>
            {[["rgba(79,195,247,0.3)", "Libre"], ["#667eea", "Ocupado"], ["rgba(255,255,255,0.08)", "Pasado"]].map(([bg, label]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: bg }} />
                <span style={{ fontSize: 10, color: "#4a6070", fontWeight: 500 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ══ NOVEDADES ══ */}
        <div style={{ marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#7bafc4", textTransform: "uppercase", letterSpacing: 1.5 }}>Novedades</h2>
          {esAdmin && (
            <button onClick={() => setMostrarForm(f => !f)} style={{ padding: "5px 12px", borderRadius: 20, border: "1px solid rgba(79,195,247,0.3)", background: "transparent", color: "#4fc3f7", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              {mostrarForm ? "Cancelar" : "+ Publicar"}
            </button>
          )}
        </div>

        {esAdmin && mostrarForm && (
          <div style={{ background: "rgba(20,35,60,0.8)", borderRadius: 14, padding: 14, marginBottom: 12, border: "1px solid rgba(79,195,247,0.1)" }}>
            <textarea value={nuevoMsg} onChange={e => setNuevoMsg(e.target.value)}
              placeholder="Escribí un mensaje para todos los profesionales..."
              rows={3} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(79,195,247,0.15)", background: "rgba(0,5,16,0.6)", color: "white", fontSize: 13, outline: "none", resize: "none", boxSizing: "border-box", fontFamily: "inherit", marginBottom: 10 }} />
            <button onClick={publicarMensaje} disabled={!nuevoMsg.trim()}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "none", background: nuevoMsg.trim() ? "linear-gradient(135deg,#667eea,#764ba2)" : "rgba(255,255,255,0.05)", color: "white", fontWeight: 700, fontSize: 13, cursor: nuevoMsg.trim() ? "pointer" : "not-allowed" }}>
              Publicar novedad
            </button>
          </div>
        )}

        {mensajes.length === 0 && (
          <div style={{ background: "rgba(20,35,60,0.5)", borderRadius: 14, padding: 22, textAlign: "center", border: "1px solid rgba(79,195,247,0.08)" }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>📢</div>
            <p style={{ margin: 0, fontSize: 12, color: "#4a6070" }}>Sin novedades por el momento.</p>
          </div>
        )}

        {mensajes.map(m => (
          <div key={m.id} style={{ background: "rgba(20,35,60,0.7)", borderRadius: 14, padding: "12px 14px", marginBottom: 10, border: "1px solid rgba(79,195,247,0.08)", backdropFilter: "blur(12px)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#667eea,#764ba2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "white" }}>
                  {m.autor?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "white" }}>{m.autor}</div>
                  <div style={{ fontSize: 10, color: "#4a6070" }}>{m.creadoEn?.toDate?.()?.toLocaleDateString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) || ""}</div>
                </div>
              </div>
              {esAdmin && <button onClick={() => eliminarMensaje(m.id)} style={{ background: "none", border: "none", color: "#4a6070", cursor: "pointer", fontSize: 13, padding: 4 }}>✕</button>}
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "#a0c4d8", lineHeight: 1.6 }}>{m.texto}</p>
          </div>
        ))}

      </div>

      {/* ══ GUÍA INSTALACIÓN ══ */}
      {mostrarIOSGuide && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", alignItems: "flex-end" }}>
          <div style={{ background: "#0d1b2e", borderRadius: "24px 24px 0 0", padding: "20px 20px 44px", width: "100%", border: "1px solid rgba(79,195,247,0.15)" }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", margin: "0 auto 16px" }} />
            <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 800, color: "white" }}>Instalá GRINS en tu dispositivo</h3>
            {[
              ["iPhone/iPad", 'En Safari: tocá <strong style="color:#4fc3f7">Compartir ⎋</strong> → <strong style="color:#4fc3f7">"Agregar a pantalla de inicio"</strong>'],
              ["Android", 'En Chrome: tocá los <strong style="color:#4fc3f7">3 puntitos ⋮</strong> → <strong style="color:#4fc3f7">"Agregar a pantalla de inicio"</strong>'],
              ["PC", 'En Chrome: tocá el ícono <strong style="color:#4fc3f7">⊕</strong> en la barra de direcciones'],
            ].map(([plat, txt]) => (
              <div key={plat} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
                <div style={{ minWidth: 28, height: 28, background: "rgba(79,195,247,0.1)", border: "1px solid rgba(79,195,247,0.2)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#4fc3f7", fontWeight: 800, fontSize: 9 }}>{plat.slice(0, 3)}</div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#4fc3f7", marginBottom: 3 }}>{plat}</div>
                  <span style={{ color: "#a0c4d8", fontSize: 12, lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: txt }} />
                </div>
              </div>
            ))}
            <button onClick={() => setMostrarIOSGuide(false)} style={{ width: "100%", padding: 13, borderRadius: 14, border: "none", background: "linear-gradient(135deg,#667eea,#764ba2)", color: "white", fontWeight: 700, fontSize: 14, cursor: "pointer", marginTop: 4 }}>
              Entendido
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
