import { useState, useEffect, useMemo } from "react";
import { db } from "./firebase";
import { collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";

const HORAS = Array.from({ length: 14 }, (_, i) => i + 8);
const CONSULTORIOS = ["Consultorio 1", "Consultorio 2", "Consultorio 3"];

function dateKey(date) { return date.toISOString().slice(0, 10); }

export default function TabInicio({ usuario, esAdmin, esPublico, t, onLogin, reservas = [] }) {
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMsg, setNuevoMsg] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "mensajes_inicio"), snap => {
      const data = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      data.sort((a, b) => (b.creadoEn?.seconds || 0) - (a.creadoEn?.seconds || 0));
      setMensajes(data);
    });
    return () => unsub();
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
  const horaActual = new Date().getHours();

  // Calcular ocupación por consultorio para hoy
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

  // Próximo bloque libre por consultorio
  function proximoLibre(consultorio) {
    const ocupadas = ocupacionHoy[consultorio] || new Set();
    const horasRestantes = HORAS.filter(h => h >= horaActual);
    const libre = horasRestantes.find(h => !ocupadas.has(h));
    if (!libre) return null;
    // Ver si está libre todo el día
    const todasLibres = HORAS.every(h => !ocupadas.has(h));
    if (todasLibres) return { tipo: "todo", hora: null };
    if (libre === horaActual) return { tipo: "ahora", hora: libre };
    return { tipo: "desde", hora: libre };
  }

  function colorBloque(consultorio, hora) {
    const ocupadas = ocupacionHoy[consultorio] || new Set();
    const esActual = hora === horaActual;
    if (ocupadas.has(hora)) {
      // Buscar el profesional para usar su color
      const reserva = reservas.find(r => {
        const esHoy = r.fecha === hoyKey;
        const diaSemana = new Date().getDay();
        const esSemanalHoy = r.repeteSemanal && new Date(r.fecha + "T12:00:00").getDay() === diaSemana;
        return r.consultorio === consultorio && hora >= r.horaInicio && hora < r.horaFin && (esHoy || esSemanalHoy);
      });
      return { ocupado: true, reserva };
    }
    return { ocupado: false, esActual };
  }

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

  return (
    <div className="tab-content" style={{ minHeight: "100vh", background: t.bg }}>

      {/* HEADER */}
      <div style={{ padding: "56px 20px 20px", background: "linear-gradient(180deg,#0d0d1a 0%,#000 100%)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            {esPublico ? (
              <>
                <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 800, color: "white", letterSpacing: -0.5 }}>
                  Bienvenido a GRINS
                </h1>
                <p style={{ margin: "0 0 16px", fontSize: 13, color: t.textoSuave, lineHeight: 1.5, maxWidth: 260 }}>
                  Espacio de consultorios para profesionales de la salud mental
                </p>
                <button onClick={onLogin} style={{ padding: "9px 20px", borderRadius: 24, border: "none", background: t.acentoGrad, color: "white", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                  Iniciar sesión →
                </button>
              </>
            ) : (
              <>
                <p style={{ margin: "0 0 4px", fontSize: 12, color: t.textoSuave }}>{saludo},</p>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "white", letterSpacing: -0.5 }}>
                  {usuario.nombre} {esAdmin ? "👑" : ""}
                </h1>
              </>
            )}
          </div>
          <img src="/IMG_0050.jpeg" alt="GRINS" style={{ height: 36, objectFit: "contain", opacity: 0.85, flexShrink: 0 }} />
        </div>
      </div>

      <div style={{ padding: "16px 14px" }}>

        {/* DISPONIBILIDAD HOY */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: t.textoSuave, textTransform: "uppercase", letterSpacing: 1 }}>
              Disponibilidad hoy
            </h2>
            <span style={{ fontSize: 11, color: t.textoMuy }}>
              {new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
            </span>
          </div>

          <div style={{ background: t.bgCard, borderRadius: 16, overflow: "hidden", border: `1px solid ${t.borde}` }}>
            {CONSULTORIOS.map((consultorio, ci) => {
              const libre = proximoLibre(consultorio);
              return (
                <div key={consultorio} style={{ padding: "12px 14px", borderBottom: ci < 2 ? `1px solid ${t.borde}` : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: t.texto }}>C{ci + 1}</span>
                    {libre === null ? (
                      <span style={{ fontSize: 10, background: "rgba(239,68,68,0.12)", color: "#ef4444", borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>Sin disponibilidad</span>
                    ) : libre.tipo === "todo" ? (
                      <span style={{ fontSize: 10, background: "rgba(56,161,105,0.12)", color: "#38a169", borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>Disponible todo el día</span>
                    ) : libre.tipo === "ahora" ? (
                      <span style={{ fontSize: 10, background: "rgba(56,161,105,0.12)", color: "#38a169", borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>🟢 Libre ahora</span>
                    ) : (
                      <span style={{ fontSize: 10, background: "rgba(214,158,46,0.12)", color: "#d69e2e", borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>Libre desde {libre.hora}:00</span>
                    )}
                  </div>

                  {/* TIMELINE */}
                  <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
                    {HORAS.map(h => {
                      const { ocupado, reserva, esActual } = colorBloque(consultorio, h);
                      const color = ocupado && reserva ? colorMap[reserva.profesional] || t.acento : null;
                      const esPasada = h < horaActual;
                      return (
                        <div key={h} style={{ flex: 1, position: "relative" }}>
                          {esActual && (
                            <div style={{ position: "absolute", top: -4, left: "50%", transform: "translateX(-50%)", width: 2, height: 4, background: "white", borderRadius: 1 }} />
                          )}
                          <div style={{
                            height: 20, borderRadius: 3,
                            background: ocupado
                              ? color
                              : esPasada
                                ? "rgba(255,255,255,0.04)"
                                : "rgba(56,161,105,0.2)",
                            border: esActual ? "1px solid white" : "none",
                            opacity: esPasada && !ocupado ? 0.4 : 1,
                            transition: "all 0.2s"
                          }} title={ocupado && reserva ? `${reserva.profesional} ${h}:00–${reserva.horaFin}:00` : `${h}:00 libre`} />
                        </div>
                      );
                    })}
                  </div>

                  {/* Etiquetas de hora */}
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                    {["8", "11", "14", "17", "20"].map(h => (
                      <span key={h} style={{ fontSize: 8, color: t.textoMuy }}>{h}h</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* LEYENDA */}
          <div style={{ display: "flex", gap: 14, marginTop: 8, paddingLeft: 2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: "rgba(56,161,105,0.3)" }} />
              <span style={{ fontSize: 10, color: t.textoMuy }}>Libre</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: t.acento }} />
              <span style={{ fontSize: 10, color: t.textoMuy }}>Ocupado</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: "rgba(255,255,255,0.04)" }} />
              <span style={{ fontSize: 10, color: t.textoMuy }}>Pasado</span>
            </div>
          </div>
        </div>

        {/* NOVEDADES */}
        <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: t.textoSuave, textTransform: "uppercase", letterSpacing: 1 }}>Novedades</h2>
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
          <div style={{ background: t.bgCard, borderRadius: 14, padding: 24, textAlign: "center", border: `1px solid ${t.borde}` }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>📢</div>
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
