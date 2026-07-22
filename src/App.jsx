import { useState, useEffect, useCallback } from "react";
import { onAuthChanged, getUserData, logoutUser, suscribirReservas, suscribirUsuarios, agregarReserva, actualizarReserva, eliminarReserva } from "./firebase";
import Login from "./Login";
import TabInicio from "./TabInicio";
import TabReservas from "./TabReservas";
import TabLazos from "./TabLazos";
import TabPerfil from "./TabPerfil";

const TEMA = {
  bg: "#000000",
  bgCard: "#111318",
  bgElevated: "#1a1d27",
  header: "#000000",
  texto: "#f0f0f0",
  textoSuave: "#a0a8c0",
  textoMuy: "#4a5270",
  borde: "#1e2235",
  bordeTabla: "#181c28",
  acento: "#7c6aff",
  acentoGrad: "linear-gradient(135deg,#667eea,#764ba2)",
  acentoSuave: "rgba(124,106,255,0.15)",
  hoy: "#1a1f3a",
  hoyTexto: "#90cdf4",
  pill: "rgba(124,106,255,0.18)",
};

export default function App() {
  const [reservas, setReservas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [usuario, setUsuario] = useState(null);
  const [authListo, setAuthListo] = useState(false);
  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [esPublico, setEsPublico] = useState(false);
  const [tab, setTab] = useState("inicio");

  // Permite que otras partes de la app (ej: tocar una notificación en Inicio)
  // pidan navegar a un tab específico sin tener que pasar setTab en cascada.
  useEffect(() => {
    const handler = (e) => { if (e.detail) setTab(e.detail); };
    window.addEventListener("irATab", handler);
    return () => window.removeEventListener("irATab", handler);
  }, []);

  const [toast, setToast] = useState(null);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [mostrarBannerIOS, setMostrarBannerIOS] = useState(() => {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const yaVisto = localStorage.getItem("grins_ios_banner") === "1";
    return isIOS && !isStandalone && !yaVisto;
  });

  const t = TEMA;
  const esAdmin = usuario?.rol === "admin";

  useEffect(() => {
    const handler = e => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    return onAuthChanged(async firebaseUser => {
      if (firebaseUser) {
        const data = await getUserData(firebaseUser.email);
        setUsuario({
          email: firebaseUser.email,
          rol: data?.rol || "profesional",
          nombre: data?.nombre || firebaseUser.email,
          fotoUrl: data?.fotoUrl || "",
          telefono: data?.telefono || "",
          especialidad: data?.especialidad || "",
          bio: data?.bio || "",
        });
        setEsPublico(false);
        setMostrarLogin(false);
      } else {
        setUsuario(null);
      }
      setAuthListo(true);
    });
  }, []);

  // Suscripción a reservas
  useEffect(() => {
    const unsub = suscribirReservas(data => {
      setReservas(data);
      setCargando(false);
    });
    return () => unsub();
  }, []);

  // Suscripción a usuarios registrados (para TabReservas y otras tabs)
  useEffect(() => {
    const unsub = suscribirUsuarios(data => setUsuarios(data));
    return () => unsub();
  }, []);

  const showToast = useCallback((msg, tipo = "ok") => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 2800);
  }, []);

  function pedirLogin() { setMostrarLogin(true); }

  function handleLoginExitoso() {
    setMostrarLogin(false);
    setEsPublico(false);
  }

  function handleContinuarSinLogin() {
    setEsPublico(true);
    setMostrarLogin(false);
  }

  if (!authListo || cargando) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#000000", flexDirection:"column", gap:0 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulso { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.6; transform:scale(0.93); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        @keyframes orb1 { 0%,100% { transform:translate(0,0) scale(1); opacity:0.5; } 50% { transform:translate(-18px,-12px) scale(1.15); opacity:0.8; } }
        @keyframes orb2 { 0%,100% { transform:translate(0,0) scale(1); opacity:0.4; } 50% { transform:translate(16px,10px) scale(1.1); opacity:0.7; } }
        @keyframes ringPulse { 0%,100% { transform:scale(1); opacity:0.15; } 50% { transform:scale(1.08); opacity:0.3; } }
      `}</style>

      {/* Orbes de fondo */}
      <div style={{ position:"fixed", inset:0, overflow:"hidden", pointerEvents:"none" }}>
        <div style={{ position:"absolute", width:260, height:260, borderRadius:"50%", background:"radial-gradient(circle,rgba(102,126,234,0.18) 0%,transparent 70%)", top:"28%", left:"50%", transform:"translateX(-50%)", animation:"orb1 4s ease-in-out infinite" }}/>
        <div style={{ position:"absolute", width:200, height:200, borderRadius:"50%", background:"radial-gradient(circle,rgba(118,75,162,0.14) 0%,transparent 70%)", top:"35%", left:"50%", transform:"translateX(-50%)", animation:"orb2 5s ease-in-out infinite" }}/>
      </div>

      {/* Contenedor central */}
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:28, animation:"fadeIn 0.6s ease" }}>

        {/* Logo con anillo pulsante */}
        <div style={{ position:"relative", width:100, height:100 }}>
          {/* Anillo exterior */}
          <div style={{ position:"absolute", inset:-10, borderRadius:"50%", border:"1.5px solid rgba(124,106,255,0.25)", animation:"ringPulse 2s ease-in-out infinite" }}/>
          {/* Anillo interior */}
          <div style={{ position:"absolute", inset:-4, borderRadius:"50%", border:"1px solid rgba(124,106,255,0.12)", animation:"ringPulse 2s ease-in-out infinite 0.4s" }}/>
          {/* Logo */}
          <div style={{ width:100, height:100, borderRadius:"50%", overflow:"hidden", border:"2px solid rgba(124,106,255,0.2)", boxShadow:"0 0 32px rgba(124,106,255,0.2)", animation:"pulso 2.4s ease-in-out infinite", background:"#0a0a14" }}>
            <img src="/IMG_0050.jpeg" alt="GRINS" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
          </div>
        </div>

        {/* Spinner de puntos */}
        <div style={{ display:"flex", gap:7 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width:6, height:6, borderRadius:"50%", background:"rgba(124,106,255,0.7)", animation:`pulso 1.2s ease-in-out infinite`, animationDelay:`${i*0.18}s` }}/>
          ))}
        </div>
      </div>
    </div>
  );

  if (mostrarLogin || (!usuario && !esPublico)) return (
    <Login
      onLogin={handleLoginExitoso}
      onContinuarSinLogin={handleContinuarSinLogin}
    />
  );

  const tabs = [
    {
      id: "inicio", label: "Inicio",
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    },
    {
      id: "reservas", label: "Reservas",
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
    },
    {
      id: "lazos", label: "Lazos",
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
    },
    {
      id: "perfil", label: "Perfil",
      icon: usuario?.fotoUrl
        ? <img src={usuario.fotoUrl} alt="perfil" style={{ width:26, height:26, borderRadius:"50%", objectFit:"cover", border:tab==="perfil"?`2px solid ${t.acento}`:"2px solid transparent" }}/>
        : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    },
  ];

  return (
    <div style={{ fontFamily:"'Segoe UI', system-ui, sans-serif", minHeight:"100vh", background:t.bg, color:t.texto, position:"relative" }}>

      {/* TOAST */}
      {toast && (
        <div style={{ position:"fixed", top:16, left:"50%", transform:"translateX(-50%)", zIndex:9999, background:toast.tipo==="warn"?"#7c2d12":"#14532d", color:"white", padding:"10px 20px", borderRadius:30, fontSize:13, fontWeight:600, boxShadow:"0 4px 24px rgba(0,0,0,0.4)", whiteSpace:"nowrap" }}>
          {toast.msg}
        </div>
      )}

      {/* BANNER ANDROID/PC */}
      {installPrompt && (
        <div style={{ position:"fixed", bottom:90, left:16, right:16, zIndex:9998, background:t.acentoGrad, borderRadius:16, padding:"14px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, boxShadow:"0 8px 32px rgba(0,0,0,0.4)" }}>
          <div>
            <div style={{ color:"white", fontWeight:800, fontSize:13 }}>Instalá GRINS como app</div>
            <div style={{ color:"rgba(255,255,255,0.75)", fontSize:11, marginTop:2 }}>Accedé más rápido desde tu pantalla de inicio</div>
          </div>
          <div style={{ display:"flex", gap:8, flexShrink:0 }}>
            <button onClick={()=>setInstallPrompt(null)} style={{ padding:"6px 10px", borderRadius:8, border:"1px solid rgba(255,255,255,0.3)", background:"transparent", color:"white", fontSize:11, cursor:"pointer", fontWeight:600 }}>Ahora no</button>
            <button onClick={async()=>{ installPrompt.prompt(); const{outcome}=await installPrompt.userChoice; if(outcome==="accepted") setInstallPrompt(null); }} style={{ padding:"6px 12px", borderRadius:8, border:"none", background:"white", color:"#764ba2", fontSize:11, cursor:"pointer", fontWeight:800 }}>Instalar</button>
          </div>
        </div>
      )}

      {/* BANNER IOS */}
      {mostrarBannerIOS && (
        <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:9998, background:"#111318", borderTop:`1px solid ${t.borde}`, padding:"16px 20px 36px", boxShadow:"0 -8px 32px rgba(0,0,0,0.5)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <span style={{ color:"white", fontWeight:800, fontSize:14 }}>Instalá GRINS en tu iPhone</span>
            <button onClick={()=>{ setMostrarBannerIOS(false); localStorage.setItem("grins_ios_banner","1"); }} style={{ background:"none", border:"none", color:t.textoMuy, fontSize:22, cursor:"pointer" }}>✕</button>
          </div>
          {[["1",'Tocá el botón <strong style="color:white">Compartir ⎋</strong> en Safari'],["2",'Elegí <strong style="color:white">"Agregar a pantalla de inicio"</strong>'],["3",'Tocá <strong style="color:white">"Agregar"</strong> y listo 🎉']].map(([n,txt])=>(
            <div key={n} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
              <div style={{ width:28, height:28, background:t.bgElevated, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontWeight:800, fontSize:13, flexShrink:0 }}>{n}</div>
              <span style={{ color:"#e2e8f0", fontSize:13 }} dangerouslySetInnerHTML={{ __html:txt }}/>
            </div>
          ))}
        </div>
      )}

      {/* CONTENIDO */}
      <div style={{ paddingBottom:90 }}>
        {tab==="inicio"   && <TabInicio   usuario={usuario} esAdmin={esAdmin} esPublico={esPublico} t={t} onLogin={pedirLogin} reservas={reservas}/>}
        {tab==="reservas" && <TabReservas usuario={usuario} esAdmin={esAdmin} esPublico={esPublico} t={t} reservas={reservas} usuarios={usuarios} agregarReserva={agregarReserva} actualizarReserva={actualizarReserva} eliminarReserva={eliminarReserva} showToast={showToast} onLogin={pedirLogin}/>}
        {tab==="lazos"    && <TabLazos    usuario={usuario} esAdmin={esAdmin} esPublico={esPublico} t={t} onLogin={pedirLogin} reservas={reservas}/>}
        {tab==="perfil"   && <TabPerfil   usuario={usuario} esAdmin={esAdmin} esPublico={esPublico} t={t} reservas={reservas} onLogin={pedirLogin} onLogout={async()=>{ await logoutUser(); setUsuario(null); setEsPublico(false); setMostrarLogin(true); }}/>}
      </div>

      {/* BOTTOM TAB BAR */}
      <div style={{ position:"fixed", bottom:16, left:"50%", transform:"translateX(-50%)", width:"calc(100% - 32px)", maxWidth:480, background:"rgba(10,10,20,0.88)", backdropFilter:"blur(24px)", WebkitBackdropFilter:"blur(24px)", borderRadius:28, border:"1px solid rgba(255,255,255,0.07)", boxShadow:"0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)", display:"flex", alignItems:"center", justifyContent:"space-around", padding:"8px 8px", zIndex:1000 }}>
        {tabs.map(({ id, label, icon }) => {
          const active = tab===id;
          return (
            <button key={id} onClick={()=>setTab(id)} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, padding:active?"8px 20px":"8px 12px", borderRadius:20, border:"none", cursor:"pointer", background:active?t.pill:"transparent", color:active?t.acento:t.textoMuy, transition:"all 0.25s cubic-bezier(0.34,1.56,0.64,1)", minWidth:active?80:56 }}>
              <div style={{ transition:"transform 0.25s cubic-bezier(0.34,1.56,0.64,1)", transform:active?"scale(1.1)":"scale(1)" }}>
                {icon}
              </div>
              <span style={{ fontSize:10, fontWeight:active?700:500, letterSpacing:0.3 }}>{label}</span>
            </button>
          );
        })}
      </div>

      <style>{`
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
        @keyframes spin { to { transform:rotate(360deg); } }
        .tab-content { animation: fadeUp 0.3s ease; }
      `}</style>
    </div>
  );
}
