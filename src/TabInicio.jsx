import { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";

export default function TabInicio({ usuario, esAdmin, esPublico, t, onLogin }) {
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
      texto: nuevoMsg.trim(),
      autor: usuario.nombre,
      creadoEn: serverTimestamp()
    });
    setNuevoMsg("");
    setMostrarForm(false);
  }

  async function eliminarMensaje(id) {
    await deleteDoc(doc(db, "mensajes_inicio", id));
  }

  const hora = new Date().getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";

  return (
    <div className="tab-content" style={{ minHeight: "100vh", background: t.bg }}>

      {/* HEADER */}
      <div style={{ padding: "56px 20px 24px", background: "linear-gradient(180deg, #0d0d1a 0%, #000000 100%)" }}>
        <img src="/IMG_0050.jpeg" alt="GRINS" style={{ height: 36, objectFit: "contain", marginBottom: 24, opacity: 0.9 }} />
        {esPublico ? (
          <div>
            <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 800, color: "white", letterSpacing: -0.5 }}>
              Bienvenido a GRINS
            </h1>
            <p style={{ margin: "0 0 20px", fontSize: 14, color: t.textoSuave, lineHeight: 1.5 }}>
              Espacio de consultorios para profesionales de la salud mental
            </p>
            <button onClick={onLogin} style={{ padding: "10px 24px", borderRadius: 24, border: "none", background: "linear-gradient(135deg,#667eea,#764ba2)", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              Iniciar sesión →
            </button>
          </div>
        ) : (
          <div>
            <p style={{ margin: "0 0 4px", fontSize: 13, color: t.textoSuave }}>{saludo},</p>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "white", letterSpacing: -0.5 }}>
              {usuario.nombre} {esAdmin ? "👑" : ""}
            </h1>
          </div>
        )}
      </div>

      <div style={{ padding: "20px 16px" }}>

        {/* CARDS DE ACCESO RÁPIDO */}
        {!esPublico && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
            {[
              { icon: "📅", label: "Mis reservas", sub: "Ver agenda", grad: "linear-gradient(135deg,#667eea,#764ba2)" },
              { icon: "🔄", label: "Derivaciones", sub: "Red de lazos", grad: "linear-gradient(135deg,#f093fb,#f5576c)" },
              { icon: "🔍", label: "Supervisión", sub: "Próximamente", grad: "linear-gradient(135deg,#4facfe,#00f2fe)", disabled: true },
              { icon: "🏛️", label: "Ágora", sub: "Próximamente", grad: "linear-gradient(135deg,#43e97b,#38f9d7)", disabled: true },
            ].map(({ icon, label, sub, grad, disabled }) => (
              <div key={label} style={{ background: t.bgCard, borderRadius: 16, padding: "16px 14px", border: `1px solid ${t.borde}`, opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -10, right: -10, width: 60, height: 60, borderRadius: "50%", background: grad, opacity: 0.15 }} />
                <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
                <div style={{ fontWeight: 700, fontSize: 13, color: t.texto }}>{label}</div>
                <div style={{ fontSize: 11, color: t.textoSuave, marginTop: 2 }}>{sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* ESPACIO */}
        <div style={{ background: t.bgCard, borderRadius: 20, overflow: "hidden", marginBottom: 20, border: `1px solid ${t.borde}` }}>
          <div style={{ background: "linear-gradient(135deg,#0d0d1a,#1a1d27)", padding: "20px 20px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#667eea,#764ba2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🏢</div>
              <span style={{ fontWeight: 800, fontSize: 15, color: "white" }}>GRINS Consultorios</span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: t.textoSuave, lineHeight: 1.6 }}>
              Tres consultorios equipados para profesionales de la salud mental. Ambiente cuidado, luminoso y reservado. Disponibles por hora con reserva online.
            </p>
          </div>
          <div style={{ padding: "14px 20px", display: "flex", gap: 16, flexWrap: "wrap" }}>
            {[["📍", "Lanús, Buenos Aires"], ["🕐", "8:00 a 22:00"], ["💜", "3 consultorios"], ["💰", "$3.500/hora"]].map(([ic, txt]) => (
              <div key={txt} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: t.textoSuave }}>
                <span>{ic}</span><span>{txt}</span>
              </div>
            ))}
          </div>
        </div>

        {/* MENSAJES INSTITUCIONALES */}
        <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: t.textoSuave, textTransform: "uppercase", letterSpacing: 1 }}>Novedades</h2>
          {esAdmin && (
            <button onClick={() => setMostrarForm(f => !f)} style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${t.acento}`, background: "transparent", color: t.acento, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              {mostrarForm ? "Cancelar" : "+ Publicar"}
            </button>
          )}
        </div>

        {/* FORM ADMIN */}
        {esAdmin && mostrarForm && (
          <div style={{ background: t.bgCard, borderRadius: 14, padding: 16, marginBottom: 14, border: `1px solid ${t.borde}` }}>
            <textarea value={nuevoMsg} onChange={e => setNuevoMsg(e.target.value)}
              placeholder="Escribí un mensaje para todos los profesionales..."
              rows={3} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${t.borde}`, background: t.bgElevated, color: t.texto, fontSize: 13, outline: "none", resize: "none", boxSizing: "border-box", fontFamily: "inherit", marginBottom: 10 }} />
            <button onClick={publicarMensaje} disabled={!nuevoMsg.trim()}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "none", background: nuevoMsg.trim() ? "linear-gradient(135deg,#667eea,#764ba2)" : "#2d2d3a", color: "white", fontWeight: 700, fontSize: 13, cursor: nuevoMsg.trim() ? "pointer" : "not-allowed" }}>
              Publicar novedad
            </button>
          </div>
        )}

        {/* LISTA MENSAJES */}
        {mensajes.length === 0 && (
          <div style={{ background: t.bgCard, borderRadius: 14, padding: 24, textAlign: "center", border: `1px solid ${t.borde}` }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📢</div>
            <p style={{ margin: 0, fontSize: 13, color: t.textoMuy }}>Sin novedades por el momento.</p>
          </div>
        )}

        {mensajes.map(m => (
          <div key={m.id} style={{ background: t.bgCard, borderRadius: 14, padding: "14px 16px", marginBottom: 10, border: `1px solid ${t.borde}`, position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#667eea,#764ba2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "white" }}>
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
                <button onClick={() => eliminarMensaje(m.id)} style={{ background: "none", border: "none", color: t.textoMuy, cursor: "pointer", fontSize: 14, padding: 4 }}>✕</button>
              )}
            </div>
            <p style={{ margin: 0, fontSize: 13, color: t.textoSuave, lineHeight: 1.6 }}>{m.texto}</p>
          </div>
        ))}

        {/* PRÓXIMAMENTE */}
        <div style={{ background: t.bgCard, borderRadius: 16, padding: "16px 18px", marginTop: 8, border: `1px solid ${t.borde}`, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#667eea22,#764ba222)", border: "1px solid #667eea44", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>✨</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: t.texto, marginBottom: 3 }}>Más funciones próximamente</div>
            <div style={{ fontSize: 12, color: t.textoMuy, lineHeight: 1.5 }}>Ágora, Supervisión y más herramientas para la comunidad GRINS.</div>
          </div>
        </div>

      </div>
    </div>
  );
}
