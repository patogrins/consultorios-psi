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
    { id: "derivaciones", label: "Derivaciones", icon: "🔄", soon: false },
    { id: "supervision", label: "Supervisión", icon: "🔍", soon: true },
    { id: "agora", label: "Ágora", icon: "🏛️", soon: true },
    { id: "comunidad", label: "Comunidad", icon: "💬", soon: true },
  ];

  return (
    <div className="tab-content" style={{ minHeight: "100vh", background: t.bg }}>

      {/* HEADER */}
      <div style={{ padding: "56px 20px 0", background: t.header, borderBottom: `1px solid ${t.borde}` }}>
        <img src="/IMG_0050.jpeg" alt="GRINS" style={{ height: 28, objectFit: "contain", marginBottom: 16, opacity: 0.8 }} />

        {/* SUB-TABS */}
        <div style={{ display: "flex", gap: 0, overflowX: "auto" }}>
          {secciones.map(({ id, label, icon, soon }) => {
            const active = seccion === id;
            return (
              <button key={id} onClick={() => !soon && setSeccion(id)} style={{
                padding: "10px 16px",
                border: "none",
                borderBottom: active ? `2px solid ${t.acento}` : "2px solid transparent",
                cursor: soon ? "not-allowed" : "pointer",
                fontWeight: active ? 700 : 500,
                fontSize: 12,
                background: "transparent",
                color: active ? t.acento : t.textoMuy,
                whiteSpace: "nowrap",
                flexShrink: 0,
                opacity: soon ? 0.4 : 1,
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: 5
              }}>
                <span>{icon}</span>
                <span>{label}</span>
                {soon && <span style={{ fontSize: 8, background: t.bgElevated, color: t.acento, borderRadius: 4, padding: "1px 5px", fontWeight: 700 }}>pronto</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTENIDO */}
      <div style={{ paddingBottom: 100 }}>
        {seccion === "derivaciones" && (
          <Derivaciones usuario={usuario} t={t} esAdmin={esAdmin} />
        )}

        {seccion === "supervision" && (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🔍</div>
            <h3 style={{ color: t.texto, margin: "0 0 8px", fontSize: 18, fontWeight: 800 }}>Supervisión</h3>
            <p style={{ color: t.textoSuave, fontSize: 13, lineHeight: 1.6, maxWidth: 280, margin: "0 auto" }}>
              Encontrá un profesional para supervisar tus casos. Próximamente en GRINS.
            </p>
          </div>
        )}

        {seccion === "agora" && (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🏛️</div>
            <h3 style={{ color: t.texto, margin: "0 0 8px", fontSize: 18, fontWeight: 800 }}>Ágora</h3>
            <p style={{ color: t.textoSuave, fontSize: 13, lineHeight: 1.6, maxWidth: 280, margin: "0 auto" }}>
              Espacio de encuentro para talleres, grupos de lectura y estudio entre profesionales. Próximamente.
            </p>
          </div>
        )}

        {seccion === "comunidad" && (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>💬</div>
            <h3 style={{ color: t.texto, margin: "0 0 8px", fontSize: 18, fontWeight: 800 }}>Comunidad</h3>
            <p style={{ color: t.textoSuave, fontSize: 13, lineHeight: 1.6, maxWidth: 280, margin: "0 auto" }}>
              Mensajes y novedades de la comunidad GRINS. Próximamente.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
