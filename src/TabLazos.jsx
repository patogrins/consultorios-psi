import { useState } from "react";
import Derivaciones from "./Derivaciones";
import RedGrins from "./RedGrins";

export default function TabLazos({ usuario, esAdmin, esPublico, t, onLogin, reservas = [] }) {
  const [seccion, setSeccion] = useState("red");

useEffect(() => {
  const handler = () => { setSeccion("derivaciones"); };
  window.addEventListener("abrirChatConexion", handler);
  return () => window.removeEventListener("abrirChatConexion", handler);
}, []);

  if (esPublico) return (
    <div className="tab-content" style={{ minHeight: "100vh", background: "#000000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
      <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800, color: "white", textAlign: "center" }}>Lazos</h2>
      <p style={{ margin: "0 0 24px", fontSize: 14, color: "#a0a8c0", textAlign: "center", lineHeight: 1.6 }}>
        La red de profesionales GRINS. Directorio, derivaciones y comunidad.
      </p>
      <button onClick={onLogin} style={{ padding: "10px 24px", borderRadius: 24, border: "none", background: "linear-gradient(135deg,#667eea,#764ba2)", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
        Iniciar sesión para acceder →
      </button>
    </div>
  );

  const secciones = [
    { id: "red", label: "Red GRINS", icon: "👥", soon: false },
    { id: "derivaciones", label: "Derivaciones", icon: "🔄", soon: false },
    { id: "supervision", label: "Supervisión", icon: "🔍", soon: true },
    { id: "agora", label: "Ágora", icon: "🏛️", soon: true },
  ];

  return (
    <div className="tab-content" style={{ minHeight: "100vh", background: "#000000" }}>

      {/* STICKY BAR */}
      <div style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(0,0,0,0.92)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderBottom: "1px solid rgba(124,106,255,0.15)" }}>

        {/* Header */}
        <div style={{ padding: "54px 20px 0", background: "linear-gradient(180deg,#0a0a14 0%,transparent 100%)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "white" }}>Lazos</h1>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "#4a5270" }}>Red profesional GRINS</p>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#667eea,#764ba2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🔗</div>
          </div>
        </div>

        {/* SUB-TABS */}
        <div style={{ display: "flex", overflowX: "auto", padding: "0 14px", gap: 0 }}>
          {secciones.map(({ id, label, icon, soon }) => {
            const active = seccion === id;
            return (
              <button key={id} onClick={() => !soon && setSeccion(id)} style={{
                padding: "10px 14px", border: "none",
                borderBottom: active ? "2px solid #7c6aff" : "2px solid transparent",
                cursor: soon ? "not-allowed" : "pointer",
                fontWeight: active ? 700 : 500, fontSize: 12,
                background: "transparent",
                color: active ? "#a78bfa" : "#4a5270",
                whiteSpace: "nowrap", flexShrink: 0,
                opacity: soon ? 0.4 : 1,
                transition: "all 0.2s",
                display: "flex", alignItems: "center", gap: 5
              }}>
                <span>{icon}</span>
                <span>{label}</span>
                {soon && <span style={{ fontSize: 8, background: "rgba(124,106,255,0.15)", color: "#7c6aff", borderRadius: 4, padding: "1px 5px", fontWeight: 700 }}>pronto</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTENIDO */}
      <div style={{ paddingBottom: 80 }}>
        {seccion === "red" && (
          <RedGrins usuario={usuario} t={t} reservas={reservas} />
        )}

        {seccion === "derivaciones" && (
          <Derivaciones usuario={usuario} t={t} esAdmin={esAdmin} />
        )}

        {seccion === "supervision" && (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🔍</div>
            <h3 style={{ color: "white", margin: "0 0 8px", fontSize: 18, fontWeight: 800 }}>Supervisión</h3>
            <p style={{ color: "#a0a8c0", fontSize: 13, lineHeight: 1.6, maxWidth: 280, margin: "0 auto" }}>
              Encontrá un profesional para supervisar tus casos. Próximamente.
            </p>
          </div>
        )}

        {seccion === "agora" && (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🏛️</div>
            <h3 style={{ color: "white", margin: "0 0 8px", fontSize: 18, fontWeight: 800 }}>Ágora</h3>
            <p style={{ color: "#a0a8c0", fontSize: 13, lineHeight: 1.6, maxWidth: 280, margin: "0 auto" }}>
              Espacio de encuentro para talleres y grupos de estudio. Próximamente.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
