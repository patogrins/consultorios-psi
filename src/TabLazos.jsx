import { useState, useEffect } from "react";
import Derivaciones from "./Derivaciones";
import RedGrins from "./RedGrins";
import OnboardingLazos from "./OnboardingLazos";

export default function TabLazos({ usuario, esAdmin, esPublico, t, onLogin, reservas = [], esHorizontal=false }) {
  const [seccion, setSeccion] = useState("cartelera");
  const [chatInicial, setChatInicial] = useState(null);
  const [vistaDerivaciones, setVistaDerivaciones] = useState(null);
  const [chatGrupalInicial, setChatGrupalInicial] = useState(null);

  // Onboarding: se muestra automáticamente la primera vez que este usuario
  // entra a Lazos. Se recuerda por email en localStorage para no repetirlo.
  const [mostrarOnboarding, setMostrarOnboarding] = useState(false);
  useEffect(() => {
    if (!usuario?.email) return;
    const yaVisto = localStorage.getItem(`grins_onboarding_lazos_${usuario.email}`);
    if (!yaVisto) setMostrarOnboarding(true);
  }, [usuario?.email]);

  function cerrarOnboarding() {
    setMostrarOnboarding(false);
    if (usuario?.email) localStorage.setItem(`grins_onboarding_lazos_${usuario.email}`, "1");
  }

  useEffect(() => {
    const handler = (e) => {
      setChatInicial(e.detail?.email || null);
      setSeccion("conexiones");
      setVistaDerivaciones("conexiones");
    };
    window.addEventListener("abrirChatConexion", handler);
    return () => window.removeEventListener("abrirChatConexion", handler);
  }, []);

  // Llega desde una notificación de "grupo_minimo_alcanzado" en Inicio:
  // ir directo a la Cartelera y abrir el chat grupal de esa ficha.
  useEffect(() => {
    const handler = (e) => {
      if (!e.detail?.derivacionId) return;
      setChatGrupalInicial(e.detail);
      setSeccion("cartelera");
      setVistaDerivaciones("cartelera");
    };
    window.addEventListener("abrirChatGrupalDesdeNotif", handler);
    return () => window.removeEventListener("abrirChatGrupalDesdeNotif", handler);
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

      {/* STICKY BAR — Lazos / ayuda / GRINS. Deja espacio al sidebar en horizontal */}
      <div style={{ position:"fixed", top:0, left: esHorizontal ? 88 : 0, right:0, zIndex:50, background:"rgba(0,0,0,0.92)", backdropFilter:"blur(24px)", WebkitBackdropFilter:"blur(24px)", borderBottom:"1px solid rgba(124,106,255,0.15)", height:48, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 20px" }}>
        <span style={{ fontSize:15, fontWeight:800, color:"white" }}>Lazos</span>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={() => setMostrarOnboarding(true)} aria-label="Cómo funciona Lazos"
            style={{ width:26, height:26, borderRadius:"50%", border:"1px solid rgba(124,106,255,0.3)", background:"rgba(124,106,255,0.1)", color:"#7c6aff", fontSize:12, fontWeight:800, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            ?
          </button>
          <span style={{ fontSize:11, color:"#7c6aff", fontWeight:700, letterSpacing:2 }}>GRINS</span>
        </div>
      </div>

      {mostrarOnboarding && <OnboardingLazos onCerrar={cerrarOnboarding}/>}

      {/* Espaciador */}
      <div style={{ height:48 }}/>

      {/* NAV Red / Cartelera / Conexiones — fuera del sticky, como antes */}
      <div style={{ padding:"10px 16px 0", background:"#000" }}>
        <div style={{ display:"flex", gap:6, background:"rgba(14,12,28,0.8)", border:"1px solid rgba(124,106,255,0.15)", borderRadius:20, padding:"5px 6px" }}>
          {[
            { id:"red", label:"Red", emoji:"🌐" },
            { id:"cartelera", label:"Cartelera", emoji:"📌" },
            { id:"conexiones", label:"Conexiones", emoji:"🔗" },
          ].map(s => (
            <button key={s.id}
              onClick={() => {
                setSeccion(s.id);
                if (s.id === "conexiones") setVistaDerivaciones("conexiones");
                else if (s.id === "cartelera") setVistaDerivaciones(null);
              }}
              style={{ flex:1, padding:"7px 6px", borderRadius:14, border:"none", background:seccion===s.id?"linear-gradient(135deg,#667eea,#764ba2)":"transparent", color:seccion===s.id?"white":"#4a5270", fontSize:11, fontWeight:seccion===s.id?800:600, cursor:"pointer", transition:"all 0.2s", display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
              <span style={{ fontSize:14 }}>{s.emoji}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

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
            chatGrupalInicial={chatGrupalInicial}
            onChatGrupalInicialUsado={() => setChatGrupalInicial(null)}
            esHorizontal={esHorizontal}
          />
        )}
      </div>
    </div>
  );
}
