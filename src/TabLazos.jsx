import { useState, useEffect } from "react";
import Derivaciones from "./Derivaciones";
import RedGrins from "./RedGrins";

export default function TabLazos({ usuario, esAdmin, esPublico, t, onLogin, reservas = [] }) {
  const [seccion, setSeccion] = useState("cartelera");
  const [chatInicial, setChatInicial] = useState(null);
  const [vistaDerivaciones, setVistaDerivaciones] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      setChatInicial(e.detail?.email || null);
      setSeccion("cartelera");
      setVistaDerivaciones("conexiones");
    };
    window.addEventListener("abrirChatConexion", handler);
    return () => window.removeEventListener("abrirChatConexion", handler);
  }, []);

  if (esPublico) return (
    <div className="tab-content" style={{ minHeight: "100vh", background: "#000000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
      <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800, color: "white", textAlign: "center" }}>Lazos</h2>
      <p style={{ margin: "0 0 24px", fontSize: 14, color: "#a0a8c0", textAlign: "center", lineHeight: 1.6 }}>
        La red de profesionales GRINS. Cartelera, conexiones y comunidad.
      </p>
      <button onClick={onLogin} style={{ padding: "10px 24px", borderRadius: 24, border: "none", background: "linear-gradient(135deg,#667eea,#764ba2)", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
        Iniciar sesión para acceder →
      </button>
    </div>
  );

  return (
    <div className="tab-content" style={{ minHeight: "100vh", background: "#000000" }}>

      {/* HEADER STICKY */}
      <div style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "rgba(0,0,0,0.92)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(124,106,255,0.15)",
      }}>
        <div style={{ padding: "54px 16px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>

            {/* RED LAZOS — izquierda */}
            <button
              onClick={() => setSeccion("red")}
              style={{ background: "transparent", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "4px 8px", flex: 1, opacity: seccion === "red" ? 1 : 0.45, transition: "opacity 0.2s" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={seccion === "red" ? "#7c6aff" : "#a0a8c0"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/>
                <path d="M12 3a14 14 0 010 18a14 14 0 010-18z"/>
              </svg>
              <span style={{ fontSize: 10, fontWeight: seccion === "red" ? 800 : 600, color: seccion === "red" ? "#7c6aff" : "#a0a8c0", whiteSpace: "nowrap" }}>Red Lazos</span>
            </button>

            {/* CARTELERA — centro, destacada */}
            <button
              onClick={() => { setSeccion("cartelera"); setVistaDerivaciones(null); }}
              style={{ background: "transparent", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "4px 8px", flex: 1.4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={seccion === "cartelera" ? "#7c6aff" : "#a0a8c0"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="2" x2="12" y2="6"/>
                  <rect x="5" y="6" width="14" height="14" rx="2"/>
                  <line x1="9" y1="11" x2="15" y2="11"/>
                  <line x1="9" y1="15" x2="13" y2="15"/>
                </svg>
                <span style={{ fontSize: 14, fontWeight: 800, color: seccion === "cartelera" ? "#7c6aff" : "white" }}>Cartelera</span>
              </div>
              {seccion === "cartelera" && (
                <div style={{ width: 28, height: 2.5, borderRadius: 2, background: "linear-gradient(90deg,#667eea,#764ba2)" }} />
              )}
            </button>

            {/* CONEXIONES — derecha */}
            <button
              onClick={() => { setSeccion("conexiones"); setVistaDerivaciones("conexiones"); }}
              style={{ background: "transparent", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "4px 8px", flex: 1, opacity: seccion === "conexiones" ? 1 : 0.45, transition: "opacity 0.2s" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={seccion === "conexiones" ? "#7c6aff" : "#a0a8c0"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              <span style={{ fontSize: 10, fontWeight: seccion === "conexiones" ? 800 : 600, color: seccion === "conexiones" ? "#7c6aff" : "#a0a8c0", whiteSpace: "nowrap" }}>Conexiones</span>
            </button>

          </div>
        </div>
      </div>

      {/* CONTENIDO */}
      <div style={{ paddingBottom: 80 }}>

        {seccion === "red" && (
          <RedGrins usuario={usuario} t={t} reservas={reservas} />
        )}

        {seccion === "cartelera" && (
          <Derivaciones
            usuario={usuario}
            t={t}
            esAdmin={esAdmin}
            chatInicial={null}
            onChatInicialUsado={() => {}}
            vistaInicial={vistaDerivaciones || "cartelera"}
          />
        )}

        {seccion === "conexiones" && (
          <Derivaciones
            usuario={usuario}
            t={t}
            esAdmin={esAdmin}
            chatInicial={chatInicial}
            onChatInicialUsado={() => setChatInicial(null)}
            vistaInicial="conexiones"
          />
        )}

      </div>
    </div>
  );
}
