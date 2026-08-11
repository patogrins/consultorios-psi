import { useState, useEffect, useRef } from "react";
import { FAMILIAS, familiaDeSubtipo, avatarColor, tiempoRelativo, Tag, FamiliaChip } from "./derivacionesHelpers";

// ── NOTA CON FLECHAS — navegación independiente sin scroll ────────────────────
function NotaConFlechas({ nota, colorBorde }) {
  const CHARS = 140;
  const bloques = [];
  for (let i = 0; i < nota.length; i += CHARS) bloques.push(nota.slice(i, i + CHARS));
  const [b, setB] = useState(0);
  if (bloques.length <= 1) return (
    <div style={{margin:"0 0 10px",fontSize:12,color:"#e2e8f0",lineHeight:1.6,padding:"9px 12px",background:"rgba(124,106,255,0.06)",borderRadius:10,borderLeft:`2px solid ${colorBorde}66`}}>
      &ldquo;{nota}&rdquo;
    </div>
  );
  return (
    <div style={{margin:"0 0 10px",background:"rgba(124,106,255,0.06)",borderRadius:10,border:`1px solid ${colorBorde}22`}}>
      <div style={{padding:"9px 12px",borderLeft:`2px solid ${colorBorde}66`,minHeight:70}}>
        <div style={{fontSize:12,color:"#e2e8f0",lineHeight:1.6}}>
          &ldquo;{bloques[b]}{b < bloques.length-1 ? "…" : ""}&rdquo;
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"4px 10px",borderTop:`1px solid ${colorBorde}22`}}>
        <button onClick={e=>{e.stopPropagation();if(b>0)setB(i=>i-1);}}
          style={{width:28,height:28,borderRadius:"50%",border:"none",background:b>0?`${colorBorde}33`:"transparent",color:b>0?"#e2e8f0":"#3a3a5a",cursor:b>0?"pointer":"default",fontSize:14,fontWeight:700}}>↑</button>
        <span style={{fontSize:9,color:colorBorde,fontWeight:600}}>{b+1}/{bloques.length}</span>
        <button onClick={e=>{e.stopPropagation();if(b<bloques.length-1)setB(i=>i+1);}}
          style={{width:28,height:28,borderRadius:"50%",border:"none",background:b<bloques.length-1?`${colorBorde}33`:"transparent",color:b<bloques.length-1?"#e2e8f0":"#3a3a5a",cursor:b<bloques.length-1?"pointer":"default",fontSize:14,fontWeight:700}}>↓</button>
      </div>
    </div>
  );
}

export default function CarteleraLoop({ fichas, filtro, setFiltro, usuario, onInteresa, onArchivar }) {
  const [expandida, setExpandida] = useState(null);
  const [animando, setAnimando] = useState(null);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [swipeDir, setSwipeDir] = useState(null);
  const [compactSwipeId, setCompactSwipeId] = useState(null);
  const [compactOffset, setCompactOffset] = useState(0);
  const startX = useRef(null);
  const startY = useRef(null);
  const compactStartX = useRef(null);
  const THRESHOLD_H = 80, THRESHOLD_V = 55;

  useEffect(() => {
    if (!expandida) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    return () => { document.body.style.overflow = prev; document.body.style.position = ""; document.body.style.width = ""; };
  }, [expandida]);

  const idxExp = fichas.findIndex(f => f.id === expandida);
  const fichaActual = idxExp >= 0 ? fichas[idxExp] : null;
  const total = fichas.length;
  const fichaSig = total > 1 ? fichas[(idxExp+1)%total] : null;
  const fichaAnt = total > 1 ? fichas[(idxExp-1+total)%total] : null;

  function cerrar() { setExpandida(null); setOffsetX(0); setOffsetY(0); setSwipeDir(null); setAnimando(null); }

  function onTouchStart(e) { if(e.touches.length!==1) return; startX.current=e.touches[0].clientX; startY.current=e.touches[0].clientY; }
  function onTouchMove(e) {
    if(startX.current===null) return; e.preventDefault();
    const dx=e.touches[0].clientX-startX.current, dy=e.touches[0].clientY-startY.current;
    if(Math.abs(dx)>Math.abs(dy)){ setOffsetX(dx); setOffsetY(0); setSwipeDir(dx>20?"right":dx<-20?"left":null); }
    else { setOffsetY(dy); setOffsetX(0); setSwipeDir(dy<-20?"up":dy>20?"down":null); }
  }
  function onTouchEnd() {
    if(!fichaActual) return;
    if(Math.abs(offsetX)>THRESHOLD_H) triggerH(offsetX>0?"right":"left");
    else if(offsetY<-THRESHOLD_V) triggerV("up");
    else if(offsetY>THRESHOLD_V) triggerV("down");
    else { setOffsetX(0); setOffsetY(0); setSwipeDir(null); }
    startX.current=null; startY.current=null;
  }
  function triggerH(dir) {
    setAnimando({dir});
    setTimeout(()=>{
      if(dir==="right"&&fichaActual.derivadoPorEmail!==usuario.email) onInteresa(fichaActual);
      else if(dir==="left") { onArchivar(fichaActual); cerrar(); return; }
      const next=fichas[(idxExp+1)%total];
      setExpandida(next?.id||null);
      setOffsetX(0); setOffsetY(0); setSwipeDir(null); setAnimando(null);
    },300);
  }
  function triggerV(dir) {
    setAnimando({dir});
    setTimeout(()=>{
      const ni=dir==="up"?(idxExp+1)%total:(idxExp-1+total)%total;
      setExpandida(fichas[ni]?.id||null);
      setOffsetX(0); setOffsetY(0); setSwipeDir(null); setAnimando(null);
    },220);
  }

  function onCompactStart(e, id) { compactStartX.current=e.touches[0].clientX; setCompactSwipeId(id); setCompactOffset(0); }
  function onCompactMove(e) {
    if(!compactStartX.current) return;
    const dx=e.touches[0].clientX-compactStartX.current;
    setCompactOffset(dx);
  }
  function onCompactEnd(ficha) {
    if(compactOffset > THRESHOLD_H) { onInteresa(ficha); }
    else if(compactOffset < -THRESHOLD_H) { onArchivar(ficha); }
    compactStartX.current=null; setCompactSwipeId(null); setCompactOffset(0);
  }

  const flyX=animando?.dir==="right"?460:animando?.dir==="left"?-460:offsetX;
  const flyY=animando?.dir==="up"?-180:animando?.dir==="down"?180:offsetY;
  const rot=offsetX*0.03;
  const isH=animando?.dir==="left"||animando?.dir==="right";
  const opActual=isH?0:Math.max(0.15,1-Math.abs(offsetX)/260-Math.abs(offsetY)/200);
  const peekPct=Math.min(1,Math.abs(offsetY)/130);
  const isUp=offsetY<-10, isDown=offsetY>10;

  return (
    <div style={{padding:"10px 14px 0"}}>
      <div style={{display:"flex",gap:5,background:"rgba(10,10,20,0.7)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",border:"1px solid rgba(124,106,255,0.15)",borderRadius:18,padding:"5px 6px",marginBottom:12}}>
        <button onClick={()=>setFiltro("todas")} style={{flex:1,padding:"6px 4px",borderRadius:12,border:"none",background:filtro==="todas"?"rgba(124,106,255,0.25)":"transparent",color:filtro==="todas"?"#a78bfa":"#4a5270",fontSize:11,fontWeight:700,cursor:"pointer",transition:"all 0.15s"}}>Todas</button>
        {FAMILIAS.map(f=>(
          <button key={f.id} onClick={()=>setFiltro(f.id)} style={{flex:1,padding:"6px 4px",borderRadius:12,border:"none",background:filtro===f.id?`${f.color}33`:"transparent",color:filtro===f.id?f.color:"#4a5270",fontSize:10,fontWeight:700,cursor:"pointer",transition:"all 0.15s",display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
            <span style={{fontSize:filtro===f.id?16:13,transition:"font-size 0.15s"}}>{f.emoji}</span>
            <span>{f.label}</span>
          </button>
        ))}
      </div>

      {fichas.length===0?(
        <div style={{textAlign:"center",padding:"40px 20px"}}>
          <div style={{fontSize:48,marginBottom:12}}>📌</div>
          <p style={{margin:0,color:"#4a5270",fontSize:13}}>No hay fichas con este filtro.</p>
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {fichas.map(f=>{
            const fam=familiaDeSubtipo(f.subtipo||"Derivación");
            const yaInt=f.interesadosEmails?.includes(usuario.email);
            const esPropia=f.derivadoPorEmail===usuario.email;
            const isSwiping=compactSwipeId===f.id;
            const off=isSwiping?compactOffset:0;
            const showRight=off>30, showLeft=off<-30;
            return (
              <div key={f.id} style={{position:"relative",borderRadius:14,overflow:"hidden"}}>
                <div style={{position:"absolute",inset:0,background:"rgba(239,83,80,0.15)",display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:16,borderRadius:14,opacity:showLeft?1:0,transition:"opacity 0.15s"}}>
                  <span style={{fontSize:11,color:"#ef5350",fontWeight:700}}>Archivar ✕</span>
                </div>
                <div style={{position:"absolute",inset:0,background:"rgba(102,187,106,0.15)",display:"flex",alignItems:"center",paddingLeft:16,borderRadius:14,opacity:showRight?1:0,transition:"opacity 0.15s"}}>
                  <span style={{fontSize:11,color:"#66bb6a",fontWeight:700}}>♥ Me interesa</span>
                </div>
                <div
                  onTouchStart={e=>onCompactStart(e,f.id)}
                  onTouchMove={onCompactMove}
                  onTouchEnd={()=>onCompactEnd(f)}
                  onClick={()=>{ if(Math.abs(off)<5) setExpandida(f.id); }}
                  style={{display:"flex",alignItems:"center",gap:12,background:"rgba(14,12,28,0.85)",borderRadius:14,padding:"11px 14px",border:`1px solid ${yaInt?"rgba(102,187,106,0.25)":"rgba(124,106,255,0.1)"}`,cursor:"pointer",position:"relative",transform:`translateX(${off}px)`,transition:isSwiping?"none":"transform 0.3s ease",touchAction:"pan-y"}}>
                  <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,background:fam.grad,borderRadius:"3px 0 0 3px"}}/>
                  <div style={{width:36,height:36,borderRadius:11,background:fam.grad,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>{fam.emoji}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                      <span style={{fontSize:12,fontWeight:800,color:"white",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.titulo||f.especialidad||f.subtipo}</span>
                      {esPropia&&<span style={{fontSize:9,color:"#7c6aff",fontWeight:700,flexShrink:0,background:"rgba(124,106,255,0.12)",borderRadius:6,padding:"1px 6px"}}>tuya</span>}
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <span style={{fontSize:9,color:fam.color,fontWeight:600}}>{f.subtipo}</span>
                      <span style={{fontSize:9,color:"#3a3a5a"}}>·</span>
                      <span style={{fontSize:9,color:"#4a5270"}}>por {f.derivadoPor}</span>
                      {f.modalidad&&<><span style={{fontSize:9,color:"#3a3a5a"}}>·</span><span style={{fontSize:9,color:"#4a5270"}}>📍{f.modalidad}</span></>}
                    </div>
                  </div>
                  <div style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
                    {yaInt&&<span style={{fontSize:9,color:"#66bb6a",fontWeight:700}}>♥</span>}
                    <span style={{fontSize:9,color:"#3a3a5a"}}>{tiempoRelativo(f.creadoEn?.seconds)}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3a3a5a" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {expandida&&fichaActual&&(()=>{
        const fam=familiaDeSubtipo(fichaActual.subtipo||"Derivación");
        const yaInt=fichaActual.interesadosEmails?.includes(usuario.email);
        const esPropia=fichaActual.derivadoPorEmail===usuario.email;
        return (
          <div style={{position:"fixed",inset:0,zIndex:3000,background:"rgba(0,0,0,0.75)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"16px 14px"}}
            onClick={e=>{if(e.target===e.currentTarget) cerrar();}}>

            {total>1&&(
              <div style={{position:"absolute",left:14,right:14,top:"calc(50% - 220px)",height:440,borderRadius:20,background:"rgba(20,18,36,0.92)",border:"1px solid rgba(124,106,255,0.2)",overflow:"hidden",transform:`translateY(${-28+(isDown?Math.min(28,peekPct*50):0)}px) scale(${0.88+(isDown?peekPct*0.09:0)})`,opacity:isDown?0.55+peekPct*0.35:0.45,filter:`blur(${isDown?Math.max(0,3-peekPct*3):3}px)`,transition:animando?"transform 0.26s,opacity 0.26s,filter 0.26s":"none",zIndex:1,pointerEvents:"none",maxWidth:420,margin:"0 auto"}}>
                <div style={{height:4,background:familiaDeSubtipo(fichaAnt?.subtipo||"Derivación").grad}}/>
                <div style={{padding:"14px 16px"}}>
                  <div style={{fontSize:13,fontWeight:800,color:"white",marginBottom:4}}>{fichaAnt?.titulo||fichaAnt?.especialidad||fichaAnt?.subtipo}</div>
                  <FamiliaChip subtipo={fichaAnt?.subtipo||"Derivación"} small/>
                  <div style={{fontSize:10,color:"#4a5270",marginTop:4}}>por {fichaAnt?.derivadoPor}</div>
                </div>
              </div>
            )}

            {total>1&&(
              <div style={{position:"absolute",left:14,right:14,top:"calc(50% - 220px)",height:440,borderRadius:20,background:"rgba(20,18,36,0.92)",border:"1px solid rgba(124,106,255,0.2)",overflow:"hidden",transform:`translateY(${20+(isUp?Math.min(20,peekPct*44):0)}px) scale(${0.92+(isUp?peekPct*0.06:0)})`,opacity:isUp?0.6+peekPct*0.3:0.5,filter:`blur(${isUp?Math.max(0,2-peekPct*2):2}px)`,transition:animando?"transform 0.26s,opacity 0.26s,filter 0.26s":"none",zIndex:2,pointerEvents:"none",maxWidth:420,margin:"0 auto"}}>
                <div style={{height:4,background:familiaDeSubtipo(fichaSig?.subtipo||"Derivación").grad}}/>
                <div style={{padding:"14px 16px"}}>
                  <div style={{fontSize:13,fontWeight:800,color:"white",marginBottom:4}}>{fichaSig?.titulo||fichaSig?.especialidad||fichaSig?.subtipo}</div>
                  <FamiliaChip subtipo={fichaSig?.subtipo||"Derivación"} small/>
                  <div style={{fontSize:10,color:"#4a5270",marginTop:4}}>por {fichaSig?.derivadoPor}</div>
                </div>
              </div>
            )}

            <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
              style={{position:"relative",zIndex:3,width:"100%",maxWidth:420,height:440,background:"rgba(14,12,28,0.98)",borderRadius:22,border:`1px solid ${swipeDir==="right"?"rgba(102,187,106,0.7)":swipeDir==="left"?"rgba(239,83,80,0.7)":fam.color+"55"}`,transform:`translate(${flyX}px,${flyY}px) rotate(${rot}deg)`,opacity:opActual,transition:animando?"transform 0.32s cubic-bezier(0.4,0,0.2,1),opacity 0.32s":"border 0.15s",cursor:"grab",userSelect:"none",touchAction:"none",boxShadow:"0 24px 64px rgba(0,0,0,0.8)",overflow:"hidden",display:"flex",flexDirection:"column"}}>
              <div style={{height:4,background:fam.grad,flexShrink:0}}/>
              {swipeDir==="right"&&!esPropia&&<div style={{position:"absolute",top:14,left:14,zIndex:5,background:"rgba(102,187,106,0.9)",borderRadius:8,padding:"3px 10px",border:"2px solid #66bb6a",transform:"rotate(-10deg)"}}><span style={{fontSize:11,fontWeight:800,color:"white"}}>♥ ME INTERESA</span></div>}
              {swipeDir==="left"&&<div style={{position:"absolute",top:14,right:14,zIndex:5,background:"rgba(239,83,80,0.9)",borderRadius:8,padding:"3px 10px",border:"2px solid #ef5350",transform:"rotate(10deg)"}}><span style={{fontSize:11,fontWeight:800,color:"white"}}>ARCHIVAR ✕</span></div>}
              {yaInt&&!swipeDir&&<div style={{position:"absolute",top:14,right:14,zIndex:5,background:"rgba(56,161,105,0.85)",borderRadius:8,padding:"2px 8px",border:"2px solid #38a169",transform:"rotate(8deg)"}}><span style={{fontSize:9,fontWeight:800,color:"white"}}>♥ ME INTERESA</span></div>}
              {esPropia&&!swipeDir&&<div style={{position:"absolute",top:14,right:14,zIndex:5,background:"rgba(124,106,255,0.85)",borderRadius:8,padding:"2px 8px",border:"2px solid #7c6aff"}}><span style={{fontSize:9,fontWeight:800,color:"white"}}>Tu ficha</span></div>}
              <div style={{padding:"14px 16px",flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12,flexShrink:0}}>
                  <div style={{width:46,height:46,borderRadius:14,background:fam.grad,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0,boxShadow:`0 4px 14px ${fam.color}44`}}>{fam.emoji}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:15,fontWeight:800,color:"white",lineHeight:1.2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{fichaActual.titulo||fichaActual.especialidad||fichaActual.subtipo}</div>
                    <div style={{marginTop:4}}><FamiliaChip subtipo={fichaActual.subtipo||"Derivación"} small/></div>
                    <div style={{fontSize:10,color:"#4a5270",marginTop:3}}>por {fichaActual.derivadoPor} · {tiempoRelativo(fichaActual.creadoEn?.seconds)}</div>
                  </div>
                  <button onClick={cerrar} style={{width:28,height:28,borderRadius:"50%",background:"rgba(255,255,255,0.06)",border:"none",color:"#4a5270",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:16}}>✕</button>
                </div>
                {fichaActual.nota&&<NotaConFlechas nota={fichaActual.nota} colorBorde={fam.color}/>}
                <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:8,flexShrink:0}}>
                  {fichaActual.modalidad&&<Tag label={`📍 ${fichaActual.modalidad}`}/>}
                  {fichaActual.especialidad&&fichaActual.especialidad!==fichaActual.titulo&&<Tag label={fichaActual.especialidad}/>}
                  {fichaActual.genero&&fichaActual.genero!=="Indistinto"&&<Tag label={fichaActual.genero}/>}
                  {fichaActual.edad&&fichaActual.edad!=="Indistinto"&&<Tag label={fichaActual.edad}/>}
                  {fichaActual.dias?.length>0&&<Tag label={`📅 ${fichaActual.dias.join("·")}`}/>}
                  {fichaActual.franjas?.length>0&&<Tag label={`⏰ ${fichaActual.franjas.join("·")}`}/>}
                </div>
                {(fichaActual.minimoInteresados||fichaActual.maxParticipantes)&&(()=>{
                  const n=fichaActual.interesadosEmails?.length||0;
                  const min=fichaActual.minimoInteresados||0;
                  const max=fichaActual.maxParticipantes||0;
                  const ok=min>0&&n>=min;
                  return (
                    <div style={{marginBottom:8,padding:"8px 12px",background:ok?"rgba(56,161,105,0.1)":"rgba(124,106,255,0.06)",borderRadius:10,border:`1px solid ${ok?"rgba(56,161,105,0.3)":"rgba(124,106,255,0.15)"}`,flexShrink:0}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:min>0?4:0}}>
                        {min>0&&<span style={{fontSize:10,color:ok?"#66bb6a":"#a0a8c0",fontWeight:700}}>{ok?"✓ Mínimo alcanzado":"⏳ Mínimo para realizarse"}</span>}
                        <span style={{fontSize:10,color:"#a0a8c0",fontWeight:600,marginLeft:"auto"}}>
                          {min>0&&`${n}/${min} mín`}{min>0&&max>0&&" · "}{max>0&&`${n}/${max} cupos`}
                        </span>
                      </div>
                      {min>0&&<div style={{height:3,background:"rgba(255,255,255,0.06)",borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(100,(n/min)*100)}%`,background:ok?"linear-gradient(90deg,#38a169,#2d8a5e)":"linear-gradient(90deg,#667eea,#764ba2)",borderRadius:4}}/></div>}
                    </div>
                  );
                })()}
                <div style={{marginTop:"auto",display:"flex",flexDirection:"column",gap:8,flexShrink:0}}>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>triggerH("left")} style={{flex:1,padding:"10px",borderRadius:13,border:"1px solid rgba(239,83,80,0.3)",background:"rgba(239,83,80,0.08)",color:"#ef5350",fontWeight:700,fontSize:12,cursor:"pointer"}}>✕ Archivar</button>
                    {!esPropia&&<button onClick={()=>triggerH("right")} style={{flex:2,padding:"10px",borderRadius:13,border:"none",background:yaInt?"rgba(56,161,105,0.15)":"linear-gradient(135deg,#38a169,#2d8a5e)",color:yaInt?"#66bb6a":"white",fontWeight:700,fontSize:12,cursor:"pointer"}}>♥ {yaInt?"Postulado":"Me interesa"}</button>}
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",opacity:0.35}}>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>
                      <span style={{fontSize:8,color:"#7c6aff"}}>anterior</span>
                    </div>
                    <span style={{fontSize:9,color:"#4a5270",alignSelf:"center"}}>{idxExp+1}/{total}</span>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
                      <span style={{fontSize:8,color:"#7c6aff"}}>siguiente</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
