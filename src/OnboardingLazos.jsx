import { useState } from "react";

const PASOS = [
  {
    titulo: "Elegí una familia",
    cuerpo: "Toda ficha pertenece a una de tres familias. Cada una tiene su color y sus subtipos.",
    render: () => (
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {[
          { n:"🧩 Casos", s:"Derivación · Supervisión · Dispositivo", grad:"linear-gradient(135deg,#667eea,#764ba2)" },
          { n:"📚 Formación", s:"Lectura · Mentoría · Clases", grad:"linear-gradient(135deg,#f093fb,#f5576c)" },
          { n:"🤝 Colaboración", s:"Proyecto · Taller · Red", grad:"linear-gradient(135deg,#43e97b,#38f9d7)" },
        ].map(f => (
          <div key={f.n} style={{ background:"rgba(255,255,255,0.04)", borderRadius:14, padding:"12px 16px", border:"1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize:14, fontWeight:800, color:"white", marginBottom:2 }}>{f.n}</div>
            <div style={{ fontSize:12, color:"#a0a8c0" }}>{f.s}</div>
            <div style={{ height:3, background:f.grad, borderRadius:2, marginTop:8 }}/>
          </div>
        ))}
      </div>
    ),
  },
  {
    titulo: "La ficha aparece en la cartelera",
    cuerpo: "Cada ficha es una fila compacta. Tocarla la expande con todos los detalles.",
    render: () => (
      <div style={{ background:"rgba(14,12,28,0.85)", borderRadius:14, padding:"12px 14px", border:"1px solid rgba(124,106,255,0.15)", display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:40, height:40, borderRadius:12, background:"linear-gradient(135deg,#667eea,#764ba2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🧩</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"white" }}>Derivación · adultos</div>
          <div style={{ fontSize:11, color:"#4a5270" }}>por Pato · hace 2h</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4a5270" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
    ),
  },
  {
    titulo: "Swipe para decidir",
    cuerpo: "Deslizá a la derecha si te interesa, a la izquierda para archivarla. Funciona en la fila compacta y en la ficha expandida.",
    render: () => (
      <div style={{ display:"flex", gap:20, justifyContent:"center", padding:"8px 0" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ width:60, height:60, borderRadius:"50%", background:"rgba(239,83,80,0.15)", border:"1.5px solid #ef5350", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 8px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef5350" strokeWidth="2.5" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          </div>
          <div style={{ fontSize:11, color:"#ef5350", fontWeight:700 }}>Archivar</div>
        </div>
        <div style={{ textAlign:"center" }}>
          <div style={{ width:60, height:60, borderRadius:"50%", background:"rgba(102,187,106,0.15)", border:"1.5px solid #66bb6a", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 8px" }}>
            <span style={{ fontSize:24 }}>♥</span>
          </div>
          <div style={{ fontSize:11, color:"#66bb6a", fontWeight:700 }}>Me interesa</div>
        </div>
      </div>
    ),
  },
  {
    titulo: "Cupos: mínimo y máximo",
    cuerpo: "En Formación y Colaboración podés fijar cuántos interesados hacen falta para arrancar, y un cupo tope.",
    render: () => (
      <div style={{ background:"rgba(56,161,105,0.1)", border:"1px solid rgba(56,161,105,0.3)", borderRadius:14, padding:"14px 16px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:8 }}>
          <span style={{ color:"#66bb6a", fontWeight:700 }}>✓ Mínimo alcanzado</span>
          <span style={{ color:"#a0a8c0", fontWeight:600 }}>4/4 mín · 4/10 cupos</span>
        </div>
        <div style={{ height:6, background:"rgba(255,255,255,0.06)", borderRadius:4, overflow:"hidden" }}>
          <div style={{ height:"100%", width:"100%", background:"linear-gradient(90deg,#38a169,#2d8a5e)" }}/>
        </div>
      </div>
    ),
  },
  {
    titulo: "Se activa el chat grupal",
    cuerpo: "Al llegar al mínimo, todos los interesados hasta ese momento reciben una notificación y se abre un chat compartido. Quien se sume después entra al mismo hilo.",
    render: () => (
      <div style={{ background:"rgba(14,12,28,0.85)", borderRadius:14, padding:"14px 16px", border:"1px solid rgba(56,161,105,0.25)", display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:44, height:44, borderRadius:14, background:"linear-gradient(135deg,#38a169,#2d8a5e)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>👥</div>
        <div>
          <div style={{ fontSize:13, fontWeight:800, color:"white" }}>Se activó un chat grupal</div>
          <div style={{ fontSize:11, color:"#66bb6a" }}>Tocá para coordinar con el grupo</div>
        </div>
      </div>
    ),
  },
  {
    titulo: "Cuatro vistas para gestionar todo",
    cuerpo: "Desde la cartelera accedés a Archivo, Me interesa, Mis fichas y Conexiones.",
    render: () => (
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        {[
          { icon:"📁", n:"Archivo", d:"swipe para restaurar o quitar" },
          { icon:"♥", n:"Me interesa", d:"tus postulaciones activas" },
          { icon:"📋", n:"Mis fichas", d:"gestioná lo que publicaste" },
          { icon:"🔗", n:"Conexiones", d:"chats activos por asignación" },
        ].map(v => (
          <div key={v.n} style={{ background:"rgba(255,255,255,0.04)", borderRadius:12, padding:"12px 10px", textAlign:"center", border:"1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize:20, marginBottom:4 }}>{v.icon}</div>
            <div style={{ fontSize:12, fontWeight:700, color:"white" }}>{v.n}</div>
            <div style={{ fontSize:10, color:"#4a5270", marginTop:2 }}>{v.d}</div>
          </div>
        ))}
      </div>
    ),
  },
];

export default function OnboardingLazos({ onCerrar }) {
  const [paso, setPaso] = useState(0);
  const esUltimo = paso === PASOS.length - 1;
  const actual = PASOS[paso];

  return (
    <div style={{ position:"fixed", inset:0, zIndex:4000, background:"rgba(0,0,0,0.88)", display:"flex", alignItems:"flex-end", justifyContent:"center" }}
      onClick={e => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div style={{ width:"100%", maxWidth:420, background:"#0a0a14", borderRadius:"24px 24px 0 0", padding:"20px 20px 40px", border:"1px solid rgba(124,106,255,0.2)", animation:"slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}>
        <div style={{ width:36, height:4, borderRadius:2, background:"rgba(255,255,255,0.1)", margin:"0 auto 16px" }}/>

        {/* Puntos de progreso */}
        <div style={{ display:"flex", gap:6, justifyContent:"center", marginBottom:20 }}>
          {PASOS.map((_, i) => (
            <button key={i} onClick={() => setPaso(i)}
              style={{ width:i===paso?18:6, height:6, borderRadius:3, border:"none", cursor:"pointer", background:i===paso?"#7c6aff":"rgba(255,255,255,0.15)", transition:"all 0.25s" }}/>
          ))}
        </div>

        <h3 style={{ margin:"0 0 6px", fontSize:17, fontWeight:800, color:"white" }}>{actual.titulo}</h3>
        <p style={{ margin:"0 0 18px", fontSize:13, color:"#a0a8c0", lineHeight:1.55 }}>{actual.cuerpo}</p>

        <div style={{ minHeight:130, display:"flex", alignItems:"center" }}>
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
