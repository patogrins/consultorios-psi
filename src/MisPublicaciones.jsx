import { useState } from "react";
import { familiaDeSubtipo, avatarColor, tiempoRelativo, FamiliaChip, FooterSubVista } from "./derivacionesHelpers";

// ── MIS PUBLICACIONES ─────────────────────────────────────────────────────────
export default function MisPublicaciones({ derivaciones, usuario, perfiles, esAdmin, onAsignar, onCerrar, onEliminar, onAbrirChat, onAbrirChatGrupal, onVolver }) {
  const [expandida, setExpandida] = useState(null);
  const [matchModal, setMatchModal] = useState(null);
  const mias = derivaciones.filter(d=>d.derivadoPorEmail===usuario.email);
  async function handleAsignar(d,nombre,email){ await onAsignar(d,nombre,email); const p=perfiles.find(x=>x.email===email); setMatchModal({derivacion:d,asignado:{nombre,email,fotoUrl:p?.fotoUrl}}); setExpandida(null); }
  return (
    <div style={{padding:"16px 14px 180px"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <span style={{fontSize:15,fontWeight:800,color:"white"}}>📋 Mis fichas</span>
        <span style={{background:"rgba(124,106,255,0.12)",color:"#7c6aff",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700}}>{mias.length}</span>
      </div>
      {matchModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
          <div style={{background:"rgba(14,12,28,0.98)",borderRadius:24,padding:"32px 24px",width:"100%",maxWidth:360,textAlign:"center",border:"1px solid rgba(124,106,255,0.3)"}}>
            <div style={{fontSize:32,marginBottom:16}}>🎉</div>
            <h2 style={{margin:"0 0 8px",fontSize:20,fontWeight:800,color:"white"}}>¡Ficha asignada!</h2>
            <p style={{margin:"0 0 20px",fontSize:14,color:"#a0a8c0"}}>Conectaste con <strong style={{color:"white"}}>{matchModal.asignado.nombre}</strong></p>
            <button onClick={()=>setMatchModal(null)} style={{width:"100%",padding:13,borderRadius:14,border:"none",background:"linear-gradient(135deg,#667eea,#764ba2)",color:"white",fontWeight:800,fontSize:14,cursor:"pointer"}}>¡Genial!</button>
          </div>
        </div>
      )}
      {mias.length===0&&<div style={{textAlign:"center",padding:"32px 20px"}}><div style={{fontSize:40,marginBottom:10}}>📋</div><p style={{margin:0,color:"#4a5270",fontSize:13}}>No publicaste fichas aún.</p></div>}
      {mias.map(d=>{
        const conInt=d.interesados?.length>0&&d.estado!=="asignada";
        const asignada=d.estado==="asignada", cerrada=d.estado==="cerrada";
        const isExp=expandida===d.id;
        const fam=familiaDeSubtipo(d.subtipo||"Derivación");
        return (
          <div key={d.id} style={{background:"rgba(14,12,28,0.9)",borderRadius:18,marginBottom:12,overflow:"hidden",border:`1px solid ${asignada?"rgba(102,187,106,0.3)":conInt?"rgba(124,106,255,0.35)":"rgba(124,106,255,0.12)"}`}}>
            <div style={{height:3,background:asignada?"linear-gradient(90deg,#38a169,#2d8a5e)":conInt?fam.grad:"rgba(124,106,255,0.2)"}}/>
            <div style={{padding:"14px 16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div><FamiliaChip subtipo={d.subtipo||"Derivación"} small/><div style={{fontSize:14,fontWeight:800,color:cerrada?"#4a5270":"white",marginTop:6}}>{d.titulo||d.especialidad||d.subtipo}</div><div style={{fontSize:10,color:"#4a5270",marginTop:2}}>{tiempoRelativo(d.creadoEn?.seconds)}</div></div>
                <span style={{fontSize:10,fontWeight:700,borderRadius:20,padding:"3px 10px",background:asignada?"rgba(102,187,106,0.12)":conInt?"rgba(124,106,255,0.15)":"rgba(255,255,255,0.05)",color:asignada?"#66bb6a":conInt?"#a78bfa":"#4a5270",flexShrink:0}}>
                  {asignada?"✓ Asignada":conInt?`${d.interesados.length} postulante${d.interesados.length>1?"s":""}`:cerrada?"Cerrada":"Sin postulantes"}
                </span>
              </div>
              {conInt&&(
                <button onClick={()=>setExpandida(isExp?null:d.id)} style={{width:"100%",background:"transparent",border:"none",cursor:"pointer",padding:0,marginBottom:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"rgba(124,106,255,0.06)",borderRadius:12,border:"1px solid rgba(124,106,255,0.15)"}}>
                    <div style={{display:"flex"}}>{(d.interesadosEmails||[]).slice(0,3).map((email,i)=>{const p=perfiles.find(x=>x.email===email);const n=d.interesados[i]||email;return<div key={email} style={{width:28,height:28,borderRadius:"50%",background:avatarColor(n),overflow:"hidden",border:"2px solid rgba(0,0,0,0.5)",marginLeft:i>0?-7:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"white"}}>{p?.fotoUrl?<img src={p.fotoUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:n[0]?.toUpperCase()}</div>})}</div>
                    <span style={{fontSize:12,color:"#a0a8c0",flex:1,textAlign:"left"}}>Ver postulantes</span>
                    <span style={{fontSize:14,color:"#7c6aff"}}>{isExp?"▲":"▼"}</span>
                  </div>
                </button>
              )}
              {isExp&&conInt&&(
                <div style={{marginBottom:10}}>
                  {(d.interesadosEmails||[]).map((email,i)=>{const p=perfiles.find(x=>x.email===email);const n=d.interesados[i]||email;return(
                    <div key={email} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"rgba(14,12,28,0.8)",borderRadius:14,marginBottom:8,border:"1px solid rgba(124,106,255,0.12)"}}>
                      <div style={{width:40,height:40,borderRadius:"50%",background:avatarColor(n),overflow:"hidden",border:"2px solid rgba(124,106,255,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:800,color:"white",flexShrink:0}}>{p?.fotoUrl?<img src={p.fotoUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:n[0]?.toUpperCase()}</div>
                      <div style={{flex:1,minWidth:0}}><div style={{fontWeight:700,fontSize:13,color:"white"}}>{n}</div>{p?.especialidad&&<div style={{fontSize:11,color:"#7c6aff",marginTop:1}}>{p.especialidad}</div>}</div>
                      <button onClick={()=>handleAsignar(d,n,email)} style={{padding:"7px 12px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#38a169,#2d8a5e)",color:"white",fontWeight:700,fontSize:11,cursor:"pointer",flexShrink:0}}>Designar</button>
                    </div>
                  );})}
                </div>
              )}
              {asignada&&<div style={{display:"flex",gap:8,marginBottom:10}}><div style={{flex:1,padding:"9px 12px",background:"rgba(102,187,106,0.08)",borderRadius:10,border:"1px solid rgba(102,187,106,0.2)",display:"flex",alignItems:"center",gap:8}}><span>🔗</span><span style={{fontSize:12,color:"#66bb6a",fontWeight:600}}>{d.asignadoA}</span></div><button onClick={()=>onAbrirChat(d.id,d.asignadoA,d.asignadoEmail,"derivaciones",[d.derivadoPorEmail,d.asignadoEmail])} style={{padding:"0 14px",borderRadius:10,border:"1px solid rgba(124,106,255,0.25)",background:"rgba(124,106,255,0.1)",color:"#a78bfa",fontWeight:700,fontSize:11,cursor:"pointer"}}>💬</button></div>}
              {d.minimoInteresados&&(d.interesadosEmails?.length||0)>=d.minimoInteresados&&(
                <button onClick={()=>onAbrirChatGrupal(d)} style={{width:"100%",padding:"9px",borderRadius:10,border:"1px solid rgba(56,161,105,0.3)",background:"rgba(56,161,105,0.08)",color:"#66bb6a",fontWeight:700,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginBottom:8}}>
                  👥 Chat grupal · {d.interesadosEmails?.length} participantes
                </button>
              )}
              <div style={{display:"flex",gap:8}}>
                {!cerrada&&!asignada&&<button onClick={()=>onCerrar(d)} style={{flex:1,padding:"7px",borderRadius:10,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"#4a5270",fontWeight:600,fontSize:11,cursor:"pointer"}}>Cerrar</button>}
                {esAdmin&&<button onClick={()=>onEliminar(d.id)} style={{flex:1,padding:"7px",borderRadius:10,border:"1px solid rgba(239,83,80,0.25)",background:"rgba(239,83,80,0.06)",color:"#ef5350",fontWeight:600,fontSize:11,cursor:"pointer"}}>🗑 Eliminar</button>}
              </div>
            </div>
          </div>
        );
      })}
      <FooterSubVista onVolver={onVolver}/>
    </div>
  );
}
