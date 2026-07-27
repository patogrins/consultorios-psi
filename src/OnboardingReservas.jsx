import { useState } from "react";

const PASOS = [
  {
    titulo: "Tocá una celda libre",
    cuerpo: "El sistema detecta automáticamente el día y el consultorio que elegiste.",
    render: () => (
      <div style={{ background:"rgba(14,12,28,0.85)", borderRadius:14, padding:"16px", border:"1px solid rgba(124,106,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", gap:16 }}>
        {["9h","10h","11h"].map((h,i) => (
          <div key={h} style={{ textAlign:"center" }}>
            <div style={{ width:44, height:36, borderRadius:8, background:i===1?"rgba(124,106,255,0.3)":"rgba(255,255,255,0.04)", border:i===1?"2px solid #7c6aff":"1px solid rgba(255,255,255,0.08)", marginBottom:4 }}/>
            <span style={{ fontSize:10, color:"#4a5270" }}>{h}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    titulo: "Seleccioná las horas",
    cuerpo: "Podés elegir varios bloques seguidos tocando cada hora que necesitás.",
    render: () => (
      <div style={{ background:"rgba(14,12,28,0.85)", borderRadius:14, padding:"16px", border:"1px solid rgba(124,106,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", gap:16 }}>
        {["9h","10h","11h"].map((h,i) => (
          <div key={h} style={{ textAlign:"center" }}>
            <div style={{ width:44, height:36, borderRadius:8, background:i<2?"rgba(124,106,255,0.3)":"rgba(255,255,255,0.04)", border:i<2?"2px solid #7c6aff":"1px solid rgba(255,255,255,0.08)", marginBottom:4 }}/>
            <span style={{ fontSize:10, color:"#4a5270" }}>{h}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    titulo: "Confirmá con el botón +",
    cuerpo: "Con el resumen a la vista, tocá el botón + para revisar y confirmar la reserva.",
    render: () => (
      <div style={{ display:"flex", justifyContent:"center", padding:"8px 0" }}>
        <div style={{ width:56, height:56, borderRadius:"50%", background:"linear-gradient(135deg,#667eea,#764ba2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:30, color:"white", boxShadow:"0 4px 20px rgba(124,106,255,0.5)" }}>+</div>
      </div>
    ),
  },
  {
    titulo: "Zoom para ver mejor",
    cuerpo: "Pellizcá con dos dedos o usá el slider vertical para acercar o alejar la grilla.",
    render: () => (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:14 }}>
        <div style={{ background:"rgba(14,12,28,0.85)", borderRadius:14, padding:"10px 8px", border:"1px solid rgba(124,106,255,0.15)", display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:8, color:"#7c6aff" }}>4×</span>
          <div style={{ width:4, height:60, background:"linear-gradient(to top,#7c6aff 60%,rgba(124,106,255,0.2) 60%)", borderRadius:4 }}/>
          <span style={{ fontSize:8, color:"#3a3a5a" }}>1×</span>
        </div>
        <span style={{ fontSize:20 }}>🤏</span>
      </div>
    ),
  },
  {
    titulo: "Tocá un bloque ocupado",
    cuerpo: "Vas a ver los detalles del profesional que lo reservó, y si sos vos o el admin, podés editar o eliminar.",
    render: () => (
      <div style={{ background:"rgba(14,12,28,0.85)", borderRadius:14, padding:"14px", border:"1px solid rgba(124,106,255,0.15)", display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:40, height:40, borderRadius:"50%", background:"linear-gradient(135deg,#f093fb,#f5576c)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:800, color:"white" }}>L</div>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:"white" }}>Lic. Laura Gómez</div>
          <div style={{ fontSize:11, color:"#4a5270" }}>Consultorio 4 · 10:00–11:00</div>
        </div>
      </div>
    ),
  },
];

export default function OnboardingReservas({ onCerrar }) {
  const [paso, setPaso] = useState(0);
  const esUltimo = paso === PASOS.length - 1;
  const actual = PASOS[paso];

  return (
    <div style={{ position:"fixed", inset:0, zIndex:4000, background:"rgba(0,0,0,0.88)", display:"flex", alignItems:"flex-end", justifyContent:"center" }}
      onClick={e => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div style={{ width:"100%", maxWidth:420, background:"#0a0a14", borderRadius:"24px 24px 0 0", padding:"20px 20px 40px", border:"1px solid rgba(124,106,255,0.2)", animation:"slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}>
        <div style={{ width:36, height:4, borderRadius:2, background:"rgba(255,255,255,0.1)", margin:"0 auto 16px" }}/>

        <div style={{ display:"flex", gap:6, justifyContent:"center", marginBottom:20 }}>
          {PASOS.map((_, i) => (
            <button key={i} onClick={() => setPaso(i)}
              style={{ width:i===paso?18:6, height:6, borderRadius:3, border:"none", cursor:"pointer", background:i===paso?"#7c6aff":"rgba(255,255,255,0.15)", transition:"all 0.25s" }}/>
          ))}
        </div>

        <h3 style={{ margin:"0 0 6px", fontSize:17, fontWeight:800, color:"white" }}>{actual.titulo}</h3>
        <p style={{ margin:"0 0 18px", fontSize:13, color:"#a0a8c0", lineHeight:1.55 }}>{actual.cuerpo}</p>

        <div style={{ minHeight:110, display:"flex", alignItems:"center" }}>
          <div style={{ width:"100%" }}>{actual.render()}</div>
        </div>

        <div style={{ display:"flex", gap:10, marginTop:24 }}>
          {paso > 0 ? (
            <button onClick={() => setPaso(p => p - 1)} style={{ flex:1, padding:13, borderRadius:14, border:"1px solid rgba(124,106,255,0.2)", background:"transparent", color:"#a0a8c0", fontWeight:600, fontSize:13, cursor:"pointer" }}>
              Anterior
            </button>
          ) : (
            <button onClick={onCerrar} style={{ flex:1, padding:13, borderRadius:14, border:"1px solid rgba(124,106,255,0.2)", background:"transparent", color:"#a0a8c0", fontWeight:600, fontSize:13, cursor:"pointer" }}>
              Saltar
            </button>
          )}
          <button onClick={() => esUltimo ? onCerrar() : setPaso(p => p + 1)}
            style={{ flex:2, padding:13, borderRadius:14, border:"none", background:"linear-gradient(135deg,#667eea,#764ba2)", color:"white", fontWeight:800, fontSize:13, cursor:"pointer" }}>
            {esUltimo ? "Entendido, ¡vamos!" : "Siguiente →"}
          </button>
        </div>
      </div>
      <style>{`@keyframes slideUp { from { transform:translateY(100%); opacity:0; } to { transform:none; opacity:1; } }`}</style>
    </div>
  );
}
