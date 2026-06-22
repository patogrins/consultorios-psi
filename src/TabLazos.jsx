import { useState } from "react";
import Derivaciones from "./Derivaciones";

export default function TabLazos({ usuario, esAdmin, esPublico, t, onLogin }) {
  const [seccion, setSeccion] = useState("derivaciones");

  if (esPublico) return (
    <div className="tab-content" style={{ minHeight: "100vh", background: t.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
      <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800, color: t.texto, textAlign: "center" }}>Lazos</h2>
      <p style={{ margin: "0 0 24px", fontSize: 14, color: t.textoSuave, textAlign: "center", lineHeight: 1.6 }}>
        La red de profesionales GRINS. Derivaciones, supervisión y comunidad.
      </p>
      <button onClick={onLogin} style={{ padding: "10px 24px", borderRadius: 24, border: "none", background: "linear-gradient(135deg,#667eea,#764ba2)", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
        Iniciar sesión para acceder →
      </button>
    </div>
  );

  const secciones = [
    { id: "derivaciones", label: "Derivaciones", icon: "🔄" },
    { id: "supervision", label: "Supervisión", label_short: "Superv.", icon: "🔍", soon: true },
    { id: "agora", label: "Ágora", icon: "🏛️", soon: true },
    { id: "comunidad", label: "Comunidad", icon: "💬", soon: true },
  ];

  return (
    <div className="tab-content" style={{ minHeight: "100vh", background: t.bg }}>

      {/* HEADER */}
      <div style={{ padding: "56px 20px 0", background: t.header }}>
        <img src="/IMG_0050.jpeg" alt="GRINS" style={{ height: 28, objectFit: "contain", marginBottom: 16, opacity: 0.8 }} />

        {/* SUB-TABS */}
        <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 0 }}>
          {secciones.map(({ id, label, icon, soon }) => {
            const active = seccion === id;
            return (
              <button key={id} onClick={() => !soon && setSeccion(id)} style={{
                padding: "8px 14px", borderRadius: "12px 12px 0 0", border: "none",
                cursor: soon ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 11,
                background: active ? t.bgCard : "transparent",
                color: active ? t.texto : t.textoMuy,
                borderBottom: active ? `2px solid ${t.acento}` : "2px solid transparent",
                whiteSpace: "nowrap", flexShrink: 0, opacity: soon ? 0.5 : 1,
                transition: "all 0.2s", position: "relative"
              }}>
                {icon} {label} {soon && <span style={{ fontSize: 8, color: t.acento, marginLeft: 2 }}>pronto</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTENIDO */}
      <div style={{ paddingBottom: 100 }}>
        {seccion === "derivaciones" && (
          <Derivaciones usuario={usuario} t={t} modoOscuro={true} />
        )}

        {seccion === "supervision" && (
          <div style={{ padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <h3 style={{ color: t.texto, margin: "0 0 8px" }}>Supervisión</h3>
            <p style={{ color: t.textoSuave, fontSize: 13 }}>Próximamente</p>
          </div>
        )}

        {seccion === "agora" && (
          <div style={{ padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏛️</div>
            <h3 style={{ color: t.texto, margin: "0 0 8px" }}>Ágora</h3>
            <p style={{ color: t.textoSuave, fontSize: 13 }}>Próximamente</p>
          </div>
        )}

        {seccion === "comunidad" && (
          <div style={{ padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
            <h3 style={{ color: t.texto, margin: "0 0 8px" }}>Comunidad</h3>
            <p style={{ color: t.textoSuave, fontSize: 13 }}>Próximamente</p>
          </div>
        )}
      </div>
    </div>
  );
}
