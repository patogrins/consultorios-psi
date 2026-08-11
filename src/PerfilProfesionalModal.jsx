import { avatarColor } from "./derivacionesHelpers";

// ── TARJETA DE PERFIL PROFESIONAL — misma info que en "Red", accesible
// desde cualquier avatar de Conexiones. Permite chatear directo aunque
// nunca haya habido una ficha asignada entre ambos.
export default function PerfilProfesionalModal({ perfil, usuario, onCerrar, onAbrirChatDirecto }) {
  const inicial = perfil.nombre?.[0]?.toUpperCase() || "?";
  const esMio = perfil.email === usuario?.email;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:4200, background:"rgba(0,0,0,0.8)", display:"flex", alignItems:"flex-end", justifyContent:"center" }}
      onClick={e=>{ if(e.target===e.currentTarget) onCerrar(); }}>
      <div style={{ width:"100%", maxWidth:420, background:"#0a0a14", borderRadius:"22px 22px 0 0", border:"1px solid rgba(124,106,255,0.2)", maxHeight:"85vh", overflowY:"auto" }}>
        <div style={{ width:36, height:4, borderRadius:2, background:"rgba(255,255,255,0.1)", margin:"12px auto" }}/>
        <div style={{ background:"linear-gradient(180deg,#0a0a18,#0d0d20)", padding:"12px 20px 20px", textAlign:"center" }}>
          <div style={{ width:76, height:76, borderRadius:"50%", background:avatarColor(perfil.nombre||""), overflow:"hidden", border:"3px solid rgba(124,106,255,0.4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:30, fontWeight:800, color:"white", margin:"0 auto 12px" }}>
            {perfil.fotoUrl ? <img src={perfil.fotoUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : inicial}
          </div>
          <h2 style={{ margin:"0 0 4px", fontSize:19, fontWeight:800, color:"white" }}>{perfil.nombre}</h2>
          {perfil.especialidad && <div style={{ fontSize:13, color:"#7c6aff", fontWeight:600 }}>{perfil.especialidad}</div>}
        </div>
        <div style={{ padding:"16px 20px 24px" }}>
          {perfil.bio && (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:10, color:"#4a5270", fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>Bio</div>
              <p style={{ margin:0, fontSize:13, color:"#a0a8c0", lineHeight:1.6 }}>{perfil.bio}</p>
            </div>
          )}
          {perfil.telefono && (
            <div style={{ marginBottom:14 }}>
              <a href={`tel:${perfil.telefono}`} style={{ fontSize:13, color:"#4fc3f7", textDecoration:"none", fontWeight:600 }}>📞 {perfil.telefono}</a>
            </div>
          )}
          {!esMio && (
            <button onClick={()=>onAbrirChatDirecto(perfil)}
              style={{ width:"100%", padding:"11px", borderRadius:12, border:"1px solid rgba(124,106,255,0.3)", background:"rgba(124,106,255,0.12)", color:"#a78bfa", fontWeight:700, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              Chatear con {perfil.nombre}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
