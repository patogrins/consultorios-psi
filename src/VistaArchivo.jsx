import { useState, useRef } from "react";
import { familiaDeSubtipo, tiempoRelativo, FamiliaChip, FooterSubVista } from "./derivacionesHelpers";

// ── VISTA ARCHIVO ─────────────────────────────────────────────────────────────
export default function VistaArchivo({ archivadas, setArchivadas, derivaciones, usuario, esAdmin, onVolver, onEliminarDefinitivo }) {
  const fichas = derivaciones.filter(d=>archivadas.includes(d.id));
  const [swipingId, setSwipingId] = useState(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const startX = useRef(null);

  function restaurar(id){ const n=archivadas.filter(a=>a!==id); setArchivadas(n); try{localStorage.setItem(`grins_arch_${usuario?.email}`,JSON.stringify(n));}catch{} }
  function eliminarLocal(id){
    const n=archivadas.filter(a=>a!==id);
    try{ const k=`grins_elim_${usuario?.email}`; const e=JSON.parse(localStorage.getItem(k)||"[]"); localStorage.setItem(k,JSON.stringify([...e,id])); localStorage.setItem(`grins_arch_${usuario?.email}`,JSON.stringify(n)); }catch{}
    setArchivadas(n);
  }

  function onTS(e,id){ startX.current=e.touches[0].clientX; setSwipingId(id); setSwipeOffset(0); }
  function onTM(e){ if(!startX.current) return; setSwipeOffset(e.touches[0].clientX - startX.current); }
  function onTE(ficha){
    if(swipeOffset > 80) restaurar(ficha.id);
    else if(swipeOffset < -80) eliminarLocal(ficha.id);
    startX.current=null; setSwipingId(null); setSwipeOffset(0);
  }

  return (
    <div style={{padding:"16px 14px 180px"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
        <span style={{fontSize:15,fontWeight:800,color:"white"}}>📁 Archivo</span>
        <span style={{background:"rgba(124,106,255,0.12)",color:"#7c6aff",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700}}>{fichas.length}</span>
      </div>
      <div style={{fontSize:10,color:"#3a3a5a",marginBottom:14}}>← Swipe izquierda para quitar · Swipe derecha para restaurar</div>
      {fichas.length===0&&<div style={{textAlign:"center",padding:"32px 0"}}><div style={{fontSize:40,marginBottom:10}}>📁</div><p style={{margin:0,color:"#4a5270",fontSize:13}}>El archivo está vacío.</p></div>}
      {fichas.map(d=>{
        const fam=familiaDeSubtipo(d.subtipo||"Derivación");
        const isSw=swipingId===d.id, off=isSw?swipeOffset:0;
        const showR=off>30, showL=off<-30;
        return (
          <div key={d.id} style={{position:"relative",marginBottom:10,borderRadius:14,overflow:"hidden"}}>
            <div style={{position:"absolute",inset:0,background:"rgba(124,106,255,0.15)",display:"flex",alignItems:"center",paddingLeft:16,borderRadius:14,opacity:showR?1:0,transition:"opacity 0.15s"}}>
              <span style={{fontSize:11,color:"#a78bfa",fontWeight:700}}>↩ Restaurar</span>
            </div>
            <div style={{position:"absolute",inset:0,background:"rgba(239,83,80,0.15)",display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:16,borderRadius:14,opacity:showL?1:0,transition:"opacity 0.15s"}}>
              <span style={{fontSize:11,color:"#ef5350",fontWeight:700}}>Quitar ✕</span>
            </div>
            <div onTouchStart={e=>onTS(e,d.id)} onTouchMove={onTM} onTouchEnd={()=>onTE(d)}
              style={{background:"rgba(14,12,28,0.7)",borderRadius:14,padding:"12px 14px",border:"1px solid rgba(255,255,255,0.06)",opacity:0.8,transform:`translateX(${off}px)`,transition:isSw?"none":"transform 0.3s ease",touchAction:"pan-y"}}>
              <div style={{marginBottom:6}}><FamiliaChip subtipo={d.subtipo||"Derivación"} small/><div style={{fontSize:13,fontWeight:700,color:"#4a5270",marginTop:6}}>{d.titulo||d.especialidad||d.subtipo}</div><div style={{fontSize:10,color:"#3a3a5a",marginTop:2}}>por {d.derivadoPor} · {tiempoRelativo(d.creadoEn?.seconds)}</div></div>
              {d.nota&&<p style={{margin:"0 0 8px",fontSize:11,color:"#3a3a5a",fontStyle:"italic"}}>"{d.nota.slice(0,80)}{d.nota.length>80?"…":""}"</p>}
              {esAdmin&&(
                <button onClick={()=>onEliminarDefinitivo(d.id)} style={{width:"100%",padding:"7px",borderRadius:10,border:"1px solid rgba(239,83,80,0.3)",background:"rgba(239,83,80,0.08)",color:"#ef5350",fontWeight:700,fontSize:11,cursor:"pointer",marginTop:4}}>
                  🗑 Eliminar para todos
                </button>
              )}
            </div>
          </div>
        );
      })}
      <FooterSubVista onVolver={onVolver}/>
    </div>
  );
}
