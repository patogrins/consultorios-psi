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
      setSeccion("conexiones");
      setVistaDerivaciones("conexiones");
    };
    window.addEventListener("abrirChatConexion", handler);
    return () => window.removeEventListener("abrirChatConexion", handler);
  }, []);

  if (esPublico) return (
    <div className="tab-content" style={{ minHeight:"100vh", background:"#000", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:32 }}>
      <div style={{ fontSize:48, marginBottom:16 }}>🔗</div>
      <h2 style={{ margin:"0 0 8px", fontSize:20, fontWeight:800, color:"white", textAlign:"center" }}>Lazos</h2>
      <p style={{ margin:"0 0 24px", fontSize:14, color:"#a0a8c0", textAlign:"center", lineHeight:1.6 }}>La red de profesionales GRINS.</p>
      <button onClick={onLogin} style={{ padding:"10px 24px", borderRadius:24, border:"none", background:"linear-gradient(135deg,#667eea,#764ba2)", color:"white", fontWeight:700, fontSize:13, cursor:"pointer" }}>
        Iniciar sesión →
      </button>
    </div>
  );

  return (
    <div className="tab-content" style={{ minHeight:"100vh", background:"#000" }}>

      {/* STICKY BAR — simple, solo Lazos / GRINS */}
      <div style={{ position:"fixed", top:0, left:0, right:0, zIndex:50, background:"rgba(0,0,0,0.92)", backdropFilter:"blur(24px)", WebkitBackdropFilter:"blur(24px)", borderBottom:"1px solid rgba(124,106,255,0.15)", height:54, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 20px" }}>
        <span style={{ fontSize:15, fontWeight:800, color:"white" }}>Lazos</span>
        {/* Sub-nav centrado */}
        <div style={{ position:"absolute", left:"50%", transform:"translateX(-50%)", display:"flex", gap:4 }}>
          {[
            { id:"red", label:"Red" },
            { id:"cartelera", label:"Cartelera" },
            { id:"conexiones", label:"Conexiones" },
          ].map(s => (
            <button key={s.id}
              onClick={() => {
                setSeccion(s.id);
                if (s.id !== "cartelera") setVistaDerivaciones(s.id === "conexiones" ? "conexiones" : null);
                else setVistaDerivaciones(null);
              }}
              style={{ padding:"5px 11px", borderRadius:20, border:"none", background:seccion===s.id?"rgba(124,106,255,0.25)":"transparent", color:seccion===s.id?"#a78bfa":"#4a5270", fontSize:11, fontWeight:seccion===s.id?800:600, cursor:"pointer", transition:"all 0.2s" }}>
              {s.label}
            </button>
          ))}
        </div>
        <span style={{ fontSize:11, color:"#7c6aff", fontWeight:700, letterSpacing:2 }}>GRINS</span>
      </div>

      {/* Espaciador para la sticky bar */}
      <div style={{ height:54 }}/>

      {/* CONTENIDO */}
      <div style={{ paddingBottom:90 }}>
        {seccion === "red" && <RedGrins usuario={usuario} t={t} reservas={reservas}/>}

        {(seccion === "cartelera" || seccion === "conexiones") && (
          <Derivaciones
            usuario={usuario}
            t={t}
            esAdmin={esAdmin}
            chatInicial={seccion === "conexiones" ? chatInicial : null}
            onChatInicialUsado={() => setChatInicial(null)}
            vistaInicial={vistaDerivaciones || "cartelera"}
          />
        )}
      </div>
    </div>
  );
}
