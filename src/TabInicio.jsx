import { useState, useEffect, useMemo, useRef } from "react";
import { db } from "./firebase";
import { collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";

const HORAS = Array.from({ length: 14 }, (_, i) => i + 8);
const CONSULTORIOS = ["Consultorio 1", "Consultorio 2", "Consultorio 3"];

function dateKey(date) { return date.toISOString().slice(0, 10); }

export default function TabInicio({ usuario, esAdmin, esPublico, t, onLogin, reservas = [] }) {
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMsg, setNuevoMsg] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const scrollRef = useRef(null);

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
    const handleScroll = () => setScrolled(el.scrollTop > 60);
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

  const hora = new Date().getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";
  const hoyKey = dateKey(new Date());
  const horaActual = hora;

  const COLORES_PROF = [
    "#667eea", "#f5576c", "#00b4d8", "#38b2ac",
    "#f59e0b", "#a78bfa", "#f97316", "#84cc16",
  ];

  const colorMap = useMemo(() => {
    const map = {}; let idx = 0;
    reservas.forEach(r => {
      if (r.profesional && !map[r.profesional]) {
        map[r.profesional] = COLORES_PROF[idx % COLORES_PROF.length];
        idx++;
      }
    });
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
      for (let h = r.horaInicio; h < r.horaFin; h++) {
        map[r.consultorio]?.add(h);
      }
    });
    return map;
  }, [reservas, hoyKey]);

  function getBloquesLibres(consultorio) {
    const ocupadas = ocupacionHoy[consultorio] || new Set();
    const bloques = [];
    let inicio = null;
    for (let h = 8; h <= 22; h++) {
      const libre = !ocupadas.has(h);
      if (libre && inicio === null) inicio = h;
      if ((!libre || h === 22) && inicio !== null) {
        bloques.push({ desde: inicio, hasta: h });
        inicio = null;
      }
    }
    return bloques;
  }

  function proximoLibreInfo(consultorio) {
    const bloques = getBloquesLibres(consultorio);
    const ocupadas = ocupacionHoy[consultorio] || new Set();
    const totalOcupadas = HORAS.filter(h => ocupadas.has(h)).length;

    if (totalOcupadas === 0) return { texto: "Todo el día disponible", color: "#38a169", bg: "rgba(56,161,105,0.12)" };

    const futuros = bloques.filter(b => b.hasta > horaActual);
    if (futuros.length === 0) return { texto: "Sin más turnos hoy", color: "#ef4444", bg: "rgba(239,68,68,0.1)" };

    const b = futuros[0];
    const desde = Math.max(b.desde, horaActual);
    const hasta = b.hasta;
    if (desde === horaActual) return { texto: `Libre ahora hasta las ${hasta}:00`, color: "#38a169", bg: "rgba(56,161,105,0.12)" };
    return { texto: `Libre ${desde}:00 – ${hasta}:00`, color: "#d69e2e", bg: "rgba(214,158,46,0.12)" };
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

  return (
    <div ref={scrollRef} style={{ height: "100vh", overflowY: "auto", background: t.bg }} className="tab-content">

      {/* ── HEADER FIJO AL HACER SCROLL ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 20,
        background: scrolled ? "rgba(0,0,0,0.92)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid #1e2235" : "none",
        transition: "background 0.3s ease, border 0.3s ease",
        padding: scrolled ? "12px 20px" : "0",
        display: scrolled ? "flex" : "none",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <span style={{ fontWeight: 800, fontSize: 15, color: "white" }}>
          {esPublico ? "GRINS Consultorios" : nombreMostrado}
        </span>
        <img src="/IMG_0050.jpeg" alt="GRINS" style={{ height: 28, objectFit: "contain", opacity: 0.9 }} />
      </div>

      {/* ── HERO GRANDE (visible antes del scroll) ── */}
      <div style={{
        background: "linear-gradient(180deg,#0a0a18 0%,#000 100%)",
        padding: "64px 20px 28px",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
      }}>
        {/* SALUDO izquierda */}
        <div>
          {esPublico ? (
            <>
              <h1 style={{ margin: "0 0 8px", fontSize: 30, fontWeight: 800, color: "white", letterSpacing: -0.5, lineHeight: 1.1 }}>
                Bienvenido<br />a GRINS
              </h1>
              <p style={{ margin: "0 0 18px", fontSize: 13, color: t.textoSuave, lineHeight: 1.5, maxWidth: 200 }}>
                Consultorios para profesionales de la salud mental
              </p>
              <button onClick={onLogin} style={{ padding: "9px 20px", borderRadius: 24, border: "none", background: t.acentoGrad, color: "white", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                Iniciar sesión →
              </button>
            </>
          ) : (
            <>
              <p style={{ margin: "0 0 6px", fontSize: 13, color: t.textoSuave }}>{saludo},</p>
              <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, color: "white", letterSpacing: -0.5, lineHeight: 1.1, maxWidth: 220 }}>
                {nombreMostrado} {esAdmin ? "👑" : ""}
              </h1>
            </>
          )}
        </div>

        {/* LOGO derecha */}
        <img src="/IMG_0050.jpeg" alt="GRINS" style={{
          height: 90, objectFit: "contain", opacity: 0.9,
          flexShrink: 0, marginLeft: 16, marginBottom: 4
        }} />
      </div>

      {/* ── CONTENIDO ── */}
      <div style={{ padding: "16px 14px 100px" }}>

        {/* DISPONIBILIDAD HOY */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h2 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: t.textoSuave, textTransform: "uppercase", letterSpacing: 1 }}>
              Disponibilidad hoy
            </h2>
            <span style={{ fontSize: 11, color: t.textoMuy }}>
              {new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "short" })}
            </span>
          </div>

          <div style={{ background: t.bgCard, borderRadius: 16, overflow: "hidden", border: `1px solid ${t.borde}` }}>
            {CONSULTORIOS.map((consultorio, ci) => {
              const info = proximoLibreInfo(consultorio);
              return (
                <div key={consultorio} style={{ padding: "12px 14px", borderBottom: ci < 2 ? `1px solid ${t.borde}` : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#ffffff" }}>C{ci + 1} — {consultorio}</span>
                    <span style={{ fontSize: 11, background: info.bg, color: info.color, borderRadius: 20, padding: "3px 10px", fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0, marginLeft: 8 }}>
                      {info.texto}
                    </span>
                  </div>

                  {/* TIMELINE */}
                  <div style={{ display: "flex", gap: 2 }}>
                    {HORAS.map(h => {
                      const { ocupado, reserva, esPasada } = colorBloque(consultorio, h);
                      const color = ocupado && reserva ? colorMap[reserva.profesional] || t.acento : null;
                      const esActual = h === horaActual;
                      return (
                        <div key={h} style={{ flex: 1, position: "relative" }}>
                          {esActual && (
                            <div style={{ position: "absolute", top: -3, left: "50%", transform: "translateX(-50%)", width: 2, height: 3, background: "white", borderRadius: 1 }} />
                          )}
                          <div style={{
                            height: 20, borderRadius: 3,
                            background: ocupado ? color : esPasada ? "rgba(255,255,255,0.05)" : "rgba(56,161,105,0.25)",
                            border: esActual ? "1px solid rgba(255,255,255,0.4)" : "none",
                            opacity: esPasada && !ocupado ? 0.3 : 1,
                          }}
                            title={ocupado && reserva ? `${reserva.profesional} ${h}:00–${reserva.horaFin}:00` : `${h}:00 libre`}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* HORAS */}
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    {["8h", "11h", "14h", "17h", "20h"].map(h => (
                      <span key={h} style={{ fontSize: 9, color: "#6b7280", fontWeight: 600 }}>{h}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 14, marginTop: 8, paddingLeft: 2 }}>
            {[["rgba(56,161,105,0.3)", "Libre"], [t.acento, "Ocupado"], ["rgba(255,255,255,0.06)", "Pasado"]].map(([bg, label]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: bg }} />
                <span style={{ fontSize: 10, color: t.textoMuy }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* NOVEDADES */}
        <div style={{ marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: t.textoSuave, textTransform: "uppercase", letterSpacing: 1 }}>Novedades</h2>
          {esAdmin && (
            <button onClick={() => setMostrarForm(f => !f)} style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${t.acento}`, background: "transparent", color: t.acento, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              {mostrarForm ? "Cancelar" : "+ Publicar"}
            </button>
          )}
        </div>

        {esAdmin && mostrarForm && (
          <div style={{ background: t.bgCard, borderRadius: 14, padding: 14, marginBottom: 12, border: `1px solid ${t.borde}` }}>
            <textarea value={nuevoMsg} onChange={e => setNuevoMsg(e.target.value)}
              placeholder="Escribí un mensaje para todos los profesionales..."
              rows={3} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${t.borde}`, background: t.bgElevated, color: t.texto, fontSize: 13, outline: "none", resize: "none", boxSizing: "border-box", fontFamily: "inherit", marginBottom: 10 }} />
            <button onClick={publicarMensaje} disabled={!nuevoMsg.trim()}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "none", background: nuevoMsg.trim() ? t.acentoGrad : t.bgElevated, color: "white", fontWeight: 700, fontSize: 13, cursor: nuevoMsg.trim() ? "pointer" : "not-allowed" }}>
              Publicar novedad
            </button>
          </div>
        )}

        {mensajes.length === 0 && (
          <div style={{ background: t.bgCard, borderRadius: 14, padding: 22, textAlign: "center", border: `1px solid ${t.borde}` }}>
            <div style={{ fontSize: 26, marginBottom: 6 }}>📢</div>
            <p style={{ margin: 0, fontSize: 12, color: t.textoMuy }}>Sin novedades por el momento.</p>
          </div>
        )}

        {mensajes.map(m => (
          <div key={m.id} style={{ background: t.bgCard, borderRadius: 14, padding: "12px 14px", marginBottom: 10, border: `1px solid ${t.borde}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: t.acentoGrad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "white" }}>
                  {m.autor?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: t.texto }}>{m.autor}</div>
                  <div style={{ fontSize: 10, color: t.textoMuy }}>
                    {m.creadoEn?.toDate?.()?.toLocaleDateString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) || ""}
                  </div>
                </div>
              </div>
              {esAdmin && (
                <button onClick={() => eliminarMensaje(m.id)} style={{ background: "none", border: "none", color: t.textoMuy, cursor: "pointer", fontSize: 13, padding: 4 }}>✕</button>
              )}
            </div>
            <p style={{ margin: 0, fontSize: 13, color: t.textoSuave, lineHeight: 1.6 }}>{m.texto}</p>
          </div>
        ))}

      </div>
    </div>
  );
}
