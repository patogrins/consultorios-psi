import { useState, useRef } from "react";
import { familiaDeSubtipo, tiempoRelativo, FamiliaChip, FooterSubVista } from "./derivacionesHelpers";

// ── VISTA ME INTERESA ─────────────────────────────────────────────────────────
export default function VistaMeInteresa({ archivadas, derivaciones, usuario, onVolver, onQuitarInteres, onAbrirChatGrupal }) {
  const fichas = derivaciones.filter(d=>d.interesadosEmails?.includes(usuario.email)&&!archivadas.includes(d.id));
  const startX = useRef(null);
  const [swipingId, setSwipingId] = useState(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  function onTSC(e,id){ startX.current=e.touches[0].clientX; setSwipingId(id); }
  function onTMC(e){ if(!startX.current) return; const dx=e.touches[0].clientX-startX.current; if(dx<0) setSwipeOffset(dx); }
  function onTEC(id){ if(swipeOffset<-80) onQuitarInteres(id); startX.current=null; setSwipingId(null); setSwipeOffset(0); }
  return (
    <div style={{padding:"16px 14px 180px"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <span style={{fontSize:15,fontWeight:800,color:"white"}}>♥ Me interesa</span>
        <span style={{background:"rgba(102,187,106,0.15)",color:"#66bb6a",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700}}>{fichas.length}</span>
      </div>
      {fichas.length===0&&<div style={{textAlign:"center",padding:"32px 0"}}><div style={{fontSize:40,marginBottom:10}}>♥</div><p style={{margin:0,color:"#4a5270",fontSize:13}}>Todavía no marcaste ninguna ficha.</p></div>}
      {fichas.map(d=>{
        const isSw=swipingId===d.id, off=isSw?swipeOffset:0;
        const fam=familiaDeSubtipo(d.subtipo||"Derivación");
        const min = d.minimoInteresados || 0;
        const n = d.interesadosEmails?.length || 0;
        const minAlcanzado = min > 0 && n >= min;
        return (
          <div key={d.id} style={{position:"relative",marginBottom:10,overflow:"hidden",borderRadius:14}}>
            <div style={{position:"absolute",inset:0,background:"rgba(239,83,80,0.12)",display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:20,borderRadius:14}}><span style={{fontSize:11,color:"#ef5350",fontWeight:700,opacity:off<-30?1:0,transition:"opacity 0.15s"}}>← Quitar interés</span></div>
            <div onTouchStart={e=>onTSC(e,d.id)} onTouchMove={onTMC} onTouchEnd={()=>onTEC(d.id)} style={{background:"rgba(14,12,28,0.9)",borderRadius:14,padding:"14px",border:"1px solid rgba(102,187,106,0.2)",transform:`translateX(${off}px)`,transition:isSw?"none":"transform 0.3s ease",touchAction:"pan-y"}}>
              <div style={{height:3,background:fam.grad,borderRadius:2,marginBottom:10}}/>
              <FamiliaChip subtipo={d.subtipo||"Derivación"} small/>
              <div style={{fontSize:14,fontWeight:800,color:"white",marginTop:6}}>{d.titulo||d.especialidad||d.subtipo}</div>
              <div style={{fontSize:11,color:"#4a5270",marginTop:2,marginBottom:10}}>por {d.derivadoPor} · {tiempoRelativo(d.creadoEn?.seconds)}</div>
              {d.nota&&<p style={{margin:"0 0 10px",fontSize:12,color:"#a0a8c0",fontStyle:"italic"}}>"{d.nota.slice(0,100)}{d.nota.length>100?"…":""}"</p>}
              {min > 0 && (
                <div style={{ marginBottom:10, fontSize:11, color: minAlcanzado ? "#66bb6a" : "#a0a8c0", fontWeight:600 }}>
                  {minAlcanzado ? `✓ Mínimo alcanzado (${n}/${min})` : `⏳ Esperando interesados (${n}/${min})`}
                </div>
              )}
              {minAlcanzado && (
                <button onClick={()=>onAbrirChatGrupal(d)} style={{width:"100%",padding:"9px",borderRadius:10,border:"1px solid rgba(56,161,105,0.3)",background:"rgba(56,161,105,0.08)",color:"#66bb6a",fontWeight:700,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginBottom:8}}>
                  👥 Abrir chat grupal
                </button>
              )}
              <button onClick={()=>onQuitarInteres(d.id)} style={{width:"100%",padding:"8px",borderRadius:10,border:"1px solid rgba(239,83,80,0.2)",background:"rgba(239,83,80,0.06)",color:"#ef5350",fontWeight:600,fontSize:11,cursor:"pointer"}}>✕ Quitar interés</button>
            </div>
          </div>
        );
      })}
      <FooterSubVista onVolver={onVolver}/>
    </div>
  );
}
