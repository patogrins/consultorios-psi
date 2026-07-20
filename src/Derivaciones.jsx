import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";

const FAMILIAS = [
  { id:"casos",       label:"Casos",         emoji:"🧩", color:"#667eea", grad:"linear-gradient(135deg,#667eea,#764ba2)", tipos:["Derivación","Supervisión","Dispositivo"] },
  { id:"formacion",   label:"Formación",     emoji:"📚", color:"#f093fb", grad:"linear-gradient(135deg,#f093fb,#f5576c)", tipos:["Lectura","Mentoría","Clases"] },
  { id:"colaboracion",label:"Colaboración",  emoji:"🤝", color:"#43e97b", grad:"linear-gradient(135deg,#43e97b,#38f9d7)", tipos:["Proyecto","Taller","Red"] },
];
const MODALIDADES = ["Presencial","Online","Ambas"];
const DIAS = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
const FRANJAS = ["Mañana","Tarde","Noche"];
const ESPECIALIDADES = ["Pareja","Infanto-juvenil","Duelo","Adicciones","Grupal","Adultos","Familiar","Trauma","Ansiedad","Otro"];

function familiaDeSubtipo(subtipo) {
  return FAMILIAS.find(f => f.tipos.includes(subtipo)) || FAMILIAS[0];
}
function avatarColor(nombre) {
  const c = ["linear-gradient(135deg,#667eea,#764ba2)","linear-gradient(135deg,#f093fb,#f5576c)","linear-gradient(135deg,#4facfe,#00f2fe)","linear-gradient(135deg,#43e97b,#38f9d7)","linear-gradient(135deg,#fa709a,#fee140)","linear-gradient(135deg,#a18cd1,#fbc2eb)","linear-gradient(135deg,#fda085,#f6d365)"];
  let h = 0; for (let i=0;i<(nombre||"").length;i++) h=nombre.charCodeAt(i)+((h<<5)-h);
  return c[Math.abs(h)%c.length];
}
function tiempoRelativo(s) {
  if (!s) return "";
  const d = Math.floor(Date.now()/1000-s);
  if (d<3600) return `Hace ${Math.floor(d/60)} min`;
  if (d<86400) return `Hace ${Math.floor(d/3600)} h`;
  return `Hace ${Math.floor(d/86400)} d`;
}
function Tag({ label, color }) {
  return <span style={{background:"rgba(14,12,28,0.9)",color:color||"#a0a8c0",border:`1px solid ${color?color+"44":"rgba(124,106,255,0.15)"}`,borderRadius:8,padding:"2px 8px",fontSize:10,fontWeight:600}}>{label}</span>;
}
function FamiliaChip({ subtipo, small }) {
  const f = familiaDeSubtipo(subtipo);
  return <span style={{display:"inline-flex",alignItems:"center",gap:4,background:`${f.color}22`,color:f.color,border:`1px solid ${f.color}44`,borderRadius:20,padding:small?"1px 8px":"3px 10px",fontSize:small?9:11,fontWeight:700}}>{f.emoji} {subtipo}</span>;
}
function FooterSubVista({ onVolver }) {
  return (
    <div style={{position:"fixed",bottom:90,left:"50%",transform:"translateX(-50%)",zIndex:60,width:"calc(100% - 32px)",maxWidth:340}}>
      <button onClick={onVolver} style={{width:"100%",padding:"8px",borderRadius:12,border:"1px solid rgba(124,106,255,0.25)",background:"rgba(14,12,28,0.9)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",color:"#7c6aff",fontWeight:700,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c6aff" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        Volver a Cartelera
      </button>
    </div>
  );
}

// ── CHAT FULLSCREEN (1:1 y GRUPAL) ──────────────────────────────────────────
function ChatFullscreen({ derivacionId, usuario, otroNombre, otroPerfil, onCerrar, esGrupal, tituloGrupo, participantes }) {
  const [msgs, setMsgs] = useState([]);
  const [texto, setTexto] = useState("");
  const endRef = useRef(null);
  useEffect(() => {
    const unsub = onSnapshot(collection(db,`chats_derivacion/${derivacionId}/mensajes`), snap => {
      setMsgs(snap.docs.map(d=>({...d.data(),id:d.id})).sort((a,b)=>(a.creadoEn?.seconds||0)-(b.creadoEn?.seconds||0)));
      setTimeout(()=>endRef.current?.scrollIntoView({behavior:"smooth"}),80);
    });
    return()=>unsub();
  },[derivacionId]);
  async function enviar() {
    if (!texto.trim()) return;
    await addDoc(collection(db,`chats_derivacion/${derivacionId}/mensajes`),{texto:texto.trim(),autorEmail:usuario.email,autorNombre:usuario.nombre,creadoEn:serverTimestamp()});
    setTexto("");
  }
  const ini = otroNombre?.[0]?.toUpperCase()||"?";
  const titulo = esGrupal ? (tituloGrupo||"Chat grupal") : otroNombre;
  const subtitulo = esGrupal ? `${participantes?.length||0} participantes` : (otroPerfil?.especialidad||"");
  return (
    <div style={{position:"fixed",inset:0,background:"#000",zIndex:5000,display:"flex",flexDirection:"column"}}>
      <div style={{padding:"54px 16px 14px",background:"linear-gradient(180deg,#0a0a14,#000)",borderBottom:"1px solid rgba(124,106,255,0.15)",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
        <button onClick={onCerrar} style={{background:"none",border:"none",color:"white",fontSize:22,cursor:"pointer",padding:0}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        {esGrupal ? (
          <div style={{width:40,height:40,borderRadius:14,background:"linear-gradient(135deg,#667eea,#764ba2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>👥</div>
        ) : (
          <div style={{width:40,height:40,borderRadius:"50%",background:avatarColor(otroNombre||""),overflow:"hidden",border:"1.5px solid rgba(124,106,255,0.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:"white",flexShrink:0}}>
            {otroPerfil?.fotoUrl?<img src={otroPerfil.fotoUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:ini}
          </div>
        )}
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:15,fontWeight:800,color:"white",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{titulo}</div>
          {subtitulo&&<div style={{fontSize:11,color:"#7c6aff",fontWeight:600}}>{subtitulo}</div>}
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"16px 14px",display:"flex",flexDirection:"column",gap:10}}>
        {msgs.length===0&&<div style={{textAlign:"center",padding:"40px 0"}}><div style={{fontSize:32,marginBottom:10}}>💬</div><p style={{margin:0,fontSize:13,color:"#4a5270"}}>{esGrupal?"El chat grupal está activo. ¡Empiecen a coordinar!":"Empezá la conversación"}</p></div>}
        {msgs.map(m=>{
          const esMio=m.autorEmail===usuario.email;
          const fecha=m.creadoEn?.toDate?.()?.toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})||"";
          return (
            <div key={m.id} style={{display:"flex",flexDirection:"column",alignItems:esMio?"flex-end":"flex-start"}}>
              {!esMio&&<div style={{fontSize:9,color:"#4a5270",marginBottom:3,marginLeft:4}}>{m.autorNombre}</div>}
              <div style={{maxWidth:"80%",padding:"10px 14px",borderRadius:esMio?"18px 18px 4px 18px":"18px 18px 18px 4px",background:esMio?"linear-gradient(135deg,#667eea,#764ba2)":"rgba(255,255,255,0.08)",color:"white",fontSize:14,lineHeight:1.4,wordBreak:"break-word"}}>{m.texto}</div>
              <div style={{fontSize:9,color:"#3a3a5a",marginTop:3}}>{fecha}</div>
            </div>
          );
        })}
        <div ref={endRef}/>
      </div>
      <div style={{padding:"10px 12px 24px",borderTop:"1px solid rgba(124,106,255,0.1)",background:"rgba(10,10,20,0.95)",display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
        <input value={texto} onChange={e=>setTexto(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&enviar()} placeholder={esGrupal?"Escribí al grupo...":"Escribile a "+otroNombre+"..."} style={{flex:1,padding:"11px 16px",borderRadius:24,border:"1px solid rgba(124,106,255,0.2)",background:"rgba(255,255,255,0.05)",color:"white",fontSize:14,outline:"none"}}/>
        <button onClick={enviar} disabled={!texto.trim()} style={{width:42,height:42,borderRadius:"50%",border:"none",background:texto.trim()?"linear-gradient(135deg,#667eea,#764ba2)":"rgba(255,255,255,0.05)",cursor:texto.trim()?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>
  );
}

// ── NOTA CON FLECHAS — navegación independiente sin scroll ────────────────────
// ── NOTA CON FLECHAS ─────────────────────────────────────────────────────────
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

function CarteleraLoop({ fichas, filtro, setFiltro, usuario, onInteresa, onArchivar }) {
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

// ── FORM NUEVA FICHA ──────────────────────────────────────────────────────────
function FormNuevaFicha({ usuario, onPublicar, onCerrar }) {
  const [step, setStep] = useState("familia");
  const [familiaId, setFamiliaId] = useState(null);
  const [subtipo, setSubtipo] = useState(null);
  const [form, setForm] = useState({titulo:"",especialidad:"",otraEspecialidad:"",modalidad:"Ambas",dias:[],franjas:[],genero:"Indistinto",edad:"Indistinto",nota:"",minimoInteresados:"",maxParticipantes:""});
  const familia = FAMILIAS.find(f=>f.id===familiaId);
  function toggleArr(arr,val){ return arr.includes(val)?arr.filter(x=>x!==val):[...arr,val]; }
  const chip=(label,active,onClick,color)=>(
    <button key={label} onClick={onClick} style={{padding:"6px 14px",borderRadius:20,border:`1px solid ${active?(color||"#7c6aff"):"rgba(124,106,255,0.2)"}`,background:active?`${color||"#667eea"}22`:"transparent",color:active?(color||"#a78bfa"):"#a0a8c0",fontSize:11,fontWeight:600,cursor:"pointer",transition:"all 0.15s"}}>{label}</button>
  );
  const inp={width:"100%",padding:"10px 12px",borderRadius:10,border:"1px solid rgba(124,106,255,0.2)",fontSize:13,marginBottom:10,boxSizing:"border-box",outline:"none",background:"rgba(14,12,28,0.8)",color:"white",fontFamily:"inherit"};
  const lbl={display:"block",fontSize:10,fontWeight:700,color:"#a0a8c0",marginBottom:6,textTransform:"uppercase",letterSpacing:.5};
  async function publicar() {
    const esp=form.especialidad==="Otro"?form.otraEspecialidad||"Otro":form.especialidad;
    await onPublicar({familia:familiaId,subtipo,titulo:form.titulo.trim()||subtipo,especialidad:esp,modalidad:form.modalidad,dias:form.dias,franjas:form.franjas,genero:form.genero,edad:form.edad,nota:form.nota.trim(),minimoInteresados:familiaId!=="casos"?(parseInt(form.minimoInteresados)||null):null,maxParticipantes:familiaId!=="casos"?(parseInt(form.maxParticipantes)||null):null});
    onCerrar();
  }
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:3000}}>
      <div style={{background:"#0a0a14",borderRadius:"24px 24px 0 0",padding:"20px 20px 40px",width:"100%",maxWidth:520,border:"1px solid rgba(124,106,255,0.2)",maxHeight:"88vh",overflowY:"auto"}}>
        <div style={{width:36,height:4,borderRadius:2,background:"rgba(255,255,255,0.1)",margin:"0 auto 16px"}}/>
        {step==="familia"&&(
          <>
            <h3 style={{margin:"0 0 6px",fontSize:16,fontWeight:800,color:"white"}}>Nueva ficha</h3>
            <p style={{margin:"0 0 20px",fontSize:12,color:"#4a5270"}}>¿De qué tipo es?</p>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {FAMILIAS.map(f=>(
                <button key={f.id} onClick={()=>{setFamiliaId(f.id);setStep("subtipo");}} style={{width:"100%",padding:"18px 20px",borderRadius:18,border:`1px solid ${f.color}44`,background:`${f.color}11`,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:14}}>
                  <div style={{width:48,height:48,borderRadius:14,background:f.grad,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{f.emoji}</div>
                  <div><div style={{fontSize:16,fontWeight:800,color:"white"}}>{f.label}</div><div style={{fontSize:11,color:"#a0a8c0",marginTop:3}}>{f.tipos.join(" · ")}</div></div>
                </button>
              ))}
            </div>
            <button onClick={onCerrar} style={{width:"100%",marginTop:14,padding:"10px",borderRadius:12,border:"1px solid rgba(124,106,255,0.15)",background:"transparent",color:"#4a5270",fontWeight:600,fontSize:13,cursor:"pointer"}}>Cancelar</button>
          </>
        )}
        {step==="subtipo"&&familia&&(
          <>
            <button onClick={()=>setStep("familia")} style={{background:"none",border:"none",color:"#7c6aff",cursor:"pointer",fontSize:13,fontWeight:600,marginBottom:14,padding:0,display:"flex",alignItems:"center",gap:6}}>← {familia.label}</button>
            <h3 style={{margin:"0 0 20px",fontSize:16,fontWeight:800,color:"white"}}>¿Qué tipo de {familia.label.toLowerCase()}?</h3>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {familia.tipos.map(t=>(
                <button key={t} onClick={()=>{setSubtipo(t);setStep("detalle");}} style={{width:"100%",padding:"14px 18px",borderRadius:14,border:`1px solid ${familia.color}33`,background:`${familia.color}0e`,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:36,height:36,borderRadius:10,background:familia.grad,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{familia.emoji}</div>
                  <span style={{fontSize:15,fontWeight:700,color:"white"}}>{t}</span>
                </button>
              ))}
            </div>
            <button onClick={onCerrar} style={{width:"100%",marginTop:14,padding:"10px",borderRadius:12,border:"1px solid rgba(124,106,255,0.15)",background:"transparent",color:"#4a5270",fontWeight:600,fontSize:13,cursor:"pointer"}}>Cancelar</button>
          </>
        )}
        {step==="detalle"&&familia&&subtipo&&(
          <>
            <button onClick={()=>setStep("subtipo")} style={{background:"none",border:"none",color:"#7c6aff",cursor:"pointer",fontSize:13,fontWeight:600,marginBottom:14,padding:0,display:"flex",alignItems:"center",gap:6}}>← {subtipo}</button>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
              <div style={{width:36,height:36,borderRadius:10,background:familia.grad,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{familia.emoji}</div>
              <div><div style={{fontSize:15,fontWeight:800,color:"white"}}>{subtipo}</div><div style={{fontSize:10,color:familia.color,fontWeight:600}}>{familia.label}</div></div>
            </div>
            <label style={lbl}>Título (opcional)</label>
            <input value={form.titulo} onChange={e=>setForm(f=>({...f,titulo:e.target.value}))} placeholder={`Ej: ${subtipo}...`} style={inp}/>
            {familiaId==="casos"&&(
              <>
                <label style={lbl}>Especialidad buscada</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>{ESPECIALIDADES.map(e=>chip(e,form.especialidad===e,()=>setForm(f=>({...f,especialidad:e})),familia.color))}</div>
                {form.especialidad==="Otro"&&<input value={form.otraEspecialidad} onChange={e=>setForm(f=>({...f,otraEspecialidad:e.target.value}))} placeholder="Especificá" style={inp}/>}
                <label style={lbl}>Modalidad</label>
                <div style={{display:"flex",gap:6,marginBottom:10}}>{MODALIDADES.map(m=>chip(m,form.modalidad===m,()=>setForm(f=>({...f,modalidad:m})),familia.color))}</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:10}}>
                  <div><label style={lbl}>Género</label><div style={{display:"flex",flexDirection:"column",gap:5}}>{["Indistinto","Femenino","Masculino"].map(g=>chip(g,form.genero===g,()=>setForm(f=>({...f,genero:g})),familia.color))}</div></div>
                  <div><label style={lbl}>Franja etaria</label><div style={{display:"flex",flexDirection:"column",gap:5}}>{["Indistinto","Joven","Adulto"].map(e=>chip(e,form.edad===e,()=>setForm(f=>({...f,edad:e})),familia.color))}</div></div>
                </div>
              </>
            )}
            {familiaId!=="casos"&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:10}}>
                <div>
                  <label style={lbl}>Mínimo para realizarse</label>
                  <input type="number" min="1" max="100" value={form.minimoInteresados} onChange={e=>setForm(f=>({...f,minimoInteresados:e.target.value}))} placeholder="Ej: 3" style={inp}/>
                </div>
                <div>
                  <label style={lbl}>Cupo máximo</label>
                  <input type="number" min="1" max="500" value={form.maxParticipantes} onChange={e=>setForm(f=>({...f,maxParticipantes:e.target.value}))} placeholder="Ej: 10" style={inp}/>
                </div>
              </div>
            )}
            <label style={lbl}>Días disponibles</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>{DIAS.map(d=>chip(d,form.dias.includes(d),()=>setForm(f=>({...f,dias:toggleArr(f.dias,d)})),familia.color))}</div>
            <label style={lbl}>Franjas horarias</label>
            <div style={{display:"flex",gap:6,marginBottom:10}}>{FRANJAS.map(fr=>chip(fr,form.franjas.includes(fr),()=>setForm(f=>({...f,franjas:toggleArr(f.franjas,fr)})),familia.color))}</div>
            <label style={lbl}>Descripción / nota</label>
            <textarea value={form.nota} onChange={e=>setForm(f=>({...f,nota:e.target.value}))} placeholder="Describí brevemente..." rows={3} style={{...inp,resize:"vertical"}}/>
            <div style={{display:"flex",gap:10,marginTop:6}}>
              <button onClick={onCerrar} style={{flex:1,padding:13,borderRadius:12,border:"1px solid rgba(124,106,255,0.2)",background:"transparent",color:"#a0a8c0",fontWeight:600,fontSize:13,cursor:"pointer"}}>Cancelar</button>
              <button onClick={publicar} style={{flex:2,padding:13,borderRadius:12,border:"none",background:familia.grad,color:"white",fontWeight:800,fontSize:13,cursor:"pointer"}}>Publicar ficha</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── FOOTER CARTELERA ──────────────────────────────────────────────────────────
function FooterCartelera({ onNueva, onArchivo, onMeInteresa, onMisFichas }) {
  return (
    <div style={{position:"fixed",bottom:90,left:"50%",transform:"translateX(-50%)",zIndex:60,display:"flex",flexDirection:"column",alignItems:"center",gap:6,width:"calc(100% - 24px)",maxWidth:360}}>
      <div style={{display:"flex",alignItems:"center",width:"100%",gap:6,background:"rgba(10,10,20,0.92)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",border:"1px solid rgba(124,106,255,0.2)",borderRadius:22,padding:"8px 10px",boxShadow:"0 8px 32px rgba(0,0,0,0.4)"}}>
        <button onClick={onArchivo} style={{flex:1,background:"transparent",border:"none",color:"#a0a8c0",fontSize:10,fontWeight:600,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"4px 0"}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a0a8c0" strokeWidth="1.8" strokeLinecap="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
          Archivo
        </button>
        <button onClick={onNueva} style={{width:52,height:52,borderRadius:"50%",border:"none",background:"linear-gradient(135deg,#667eea,#764ba2)",color:"white",fontSize:28,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 4px 16px rgba(124,106,255,0.5)"}}>+</button>
        <button onClick={onMeInteresa} style={{flex:1,background:"transparent",border:"none",color:"#a0a8c0",fontSize:10,fontWeight:600,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"4px 0"}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a0a8c0" strokeWidth="1.8" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
          Me interesa
        </button>
      </div>
      <button onClick={onMisFichas} style={{width:"100%",background:"rgba(14,12,28,0.85)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",border:"1px solid rgba(124,106,255,0.18)",borderRadius:16,padding:"9px",color:"#a0a8c0",fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a0a8c0" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        Mis fichas
      </button>
    </div>
  );
}

// ── VISTA ARCHIVO ─────────────────────────────────────────────────────────────
function VistaArchivo({ archivadas, setArchivadas, derivaciones, usuario, esAdmin, onVolver, onEliminarDefinitivo }) {
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

// ── VISTA ME INTERESA ─────────────────────────────────────────────────────────
function VistaMeInteresa({ archivadas, derivaciones, usuario, onVolver, onQuitarInteres }) {
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
        return (
          <div key={d.id} style={{position:"relative",marginBottom:10,overflow:"hidden",borderRadius:14}}>
            <div style={{position:"absolute",inset:0,background:"rgba(239,83,80,0.12)",display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:20,borderRadius:14}}><span style={{fontSize:11,color:"#ef5350",fontWeight:700,opacity:off<-30?1:0,transition:"opacity 0.15s"}}>← Quitar interés</span></div>
            <div onTouchStart={e=>onTSC(e,d.id)} onTouchMove={onTMC} onTouchEnd={()=>onTEC(d.id)} style={{background:"rgba(14,12,28,0.9)",borderRadius:14,padding:"14px",border:"1px solid rgba(102,187,106,0.2)",transform:`translateX(${off}px)`,transition:isSw?"none":"transform 0.3s ease",touchAction:"pan-y"}}>
              <div style={{height:3,background:fam.grad,borderRadius:2,marginBottom:10}}/>
              <FamiliaChip subtipo={d.subtipo||"Derivación"} small/>
              <div style={{fontSize:14,fontWeight:800,color:"white",marginTop:6}}>{d.titulo||d.especialidad||d.subtipo}</div>
              <div style={{fontSize:11,color:"#4a5270",marginTop:2,marginBottom:10}}>por {d.derivadoPor} · {tiempoRelativo(d.creadoEn?.seconds)}</div>
              {d.nota&&<p style={{margin:"0 0 10px",fontSize:12,color:"#a0a8c0",fontStyle:"italic"}}>"{d.nota.slice(0,100)}{d.nota.length>100?"…":""}"</p>}
              <button onClick={()=>onQuitarInteres(d.id)} style={{width:"100%",padding:"8px",borderRadius:10,border:"1px solid rgba(239,83,80,0.2)",background:"rgba(239,83,80,0.06)",color:"#ef5350",fontWeight:600,fontSize:11,cursor:"pointer"}}>✕ Quitar interés</button>
            </div>
          </div>
        );
      })}
      <FooterSubVista onVolver={onVolver}/>
    </div>
  );
}

// ── MIS PUBLICACIONES ─────────────────────────────────────────────────────────
function MisPublicaciones({ derivaciones, usuario, perfiles, esAdmin, onAsignar, onCerrar, onEliminar, onAbrirChat, onAbrirChatGrupal, onVolver }) {
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
              {asignada&&<div style={{display:"flex",gap:8,marginBottom:10}}><div style={{flex:1,padding:"9px 12px",background:"rgba(102,187,106,0.08)",borderRadius:10,border:"1px solid rgba(102,187,106,0.2)",display:"flex",alignItems:"center",gap:8}}><span>🔗</span><span style={{fontSize:12,color:"#66bb6a",fontWeight:600}}>{d.asignadoA}</span></div><button onClick={()=>onAbrirChat(d.id,d.asignadoA,d.asignadoEmail)} style={{padding:"0 14px",borderRadius:10,border:"1px solid rgba(124,106,255,0.25)",background:"rgba(124,106,255,0.1)",color:"#a78bfa",fontWeight:700,fontSize:11,cursor:"pointer"}}>💬</button></div>}
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

// ── CONEXIONES ────────────────────────────────────────────────────────────────
function Conexiones({ derivaciones, usuario, perfiles, chatInicial, onChatInicialUsado, onAbrirChat, onAbrirChatGrupal }) {
  const conexiones = derivaciones.filter(d=>d.estado==="asignada"&&(d.derivadoPorEmail===usuario.email||d.asignadoEmail===usuario.email));
  useEffect(()=>{
    if(!chatInicial) return;
    const c=conexiones.find(d=>d.derivadoPorEmail===chatInicial||d.asignadoEmail===chatInicial);
    if(c){const oE=c.derivadoPorEmail===usuario.email?c.asignadoEmail:c.derivadoPorEmail;const oN=c.derivadoPorEmail===usuario.email?c.asignadoA:c.derivadoPor;onAbrirChat(c.id,oN,oE);}
    onChatInicialUsado?.();
  },[chatInicial,conexiones]);
  if(conexiones.length===0) return <div style={{padding:"32px 20px",textAlign:"center"}}><div style={{fontSize:40,marginBottom:10}}>🔗</div><p style={{margin:0,color:"#4a5270",fontSize:13}}>Aún no tenés conexiones activas.</p></div>;
  return (
    <div style={{padding:"12px 14px 20px"}}>
      {conexiones.map(d=>{
        const dp=perfiles.find(p=>p.email===d.derivadoPorEmail), ap=perfiles.find(p=>p.email===d.asignadoEmail);
        const oE=d.derivadoPorEmail===usuario.email?d.asignadoEmail:d.derivadoPorEmail;
        const oN=d.derivadoPorEmail===usuario.email?d.asignadoA:d.derivadoPor;
        const fam=familiaDeSubtipo(d.subtipo||"Derivación");
        return (
          <div key={d.id} style={{background:"rgba(14,12,28,0.9)",borderRadius:18,marginBottom:12,overflow:"hidden",border:"1px solid rgba(102,187,106,0.2)"}}>
            <div style={{height:3,background:fam.grad}}/>
            <div style={{padding:"16px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:0,marginBottom:12}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                  <div style={{width:48,height:48,borderRadius:"50%",background:avatarColor(d.derivadoPor||""),overflow:"hidden",border:`2px solid ${d.derivadoPorEmail===usuario.email?"rgba(124,106,255,0.6)":"rgba(102,187,106,0.3)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:800,color:"white"}}>{dp?.fotoUrl?<img src={dp.fotoUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:d.derivadoPor?.[0]?.toUpperCase()}</div>
                  <div style={{fontSize:9,color:d.derivadoPorEmail===usuario.email?"#a78bfa":"#4a5270",fontWeight:700}}>{d.derivadoPorEmail===usuario.email?"Vos":d.derivadoPor}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",margin:"0 10px",paddingBottom:18}}>
                  <div style={{width:20,height:1,background:"rgba(102,187,106,0.4)"}}/>
                  <div style={{width:26,height:26,borderRadius:"50%",background:"linear-gradient(135deg,#38a169,#2d8a5e)",display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg></div>
                  <div style={{width:20,height:1,background:"rgba(102,187,106,0.4)"}}/>
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                  <div style={{width:48,height:48,borderRadius:"50%",background:avatarColor(d.asignadoA||""),overflow:"hidden",border:`2px solid ${d.asignadoEmail===usuario.email?"rgba(124,106,255,0.6)":"rgba(102,187,106,0.3)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:800,color:"white"}}>{ap?.fotoUrl?<img src={ap.fotoUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:d.asignadoA?.[0]?.toUpperCase()}</div>
                  <div style={{fontSize:9,color:d.asignadoEmail===usuario.email?"#a78bfa":"#4a5270",fontWeight:700}}>{d.asignadoEmail===usuario.email?"Vos":d.asignadoA}</div>
                </div>
              </div>
              <div style={{textAlign:"center",marginBottom:12}}>
                <FamiliaChip subtipo={d.subtipo||"Derivación"} small/>
                <div style={{fontSize:12,fontWeight:700,color:"white",marginTop:6}}>{d.titulo||d.especialidad||d.subtipo}</div>
              </div>
              <button onClick={()=>onAbrirChat(d.id,oN,oE)} style={{width:"100%",padding:"10px",borderRadius:12,border:"1px solid rgba(124,106,255,0.2)",background:"rgba(124,106,255,0.1)",color:"#a78bfa",fontWeight:700,fontSize:12,cursor:"pointer"}}>💬 Abrir chat</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── COMPONENTE PRINCIPAL CON EXPORT DEFAULT ──────────────────────────────────
export default function Derivaciones({ usuario, perfiles, esAdmin, vistaInicial = "cartelera" }) {
  const [vista, setVista] = useState(vistaInicial);
  const [derivaciones, setDerivaciones] = useState([]);
  const [perfiles, setPerfiles] = useState([]);
  const [filtro, setFiltro] = useState("todas");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [archivadas, setArchivadas] = useState([]);
  const [chatActivo, setChatActivo] = useState(null);

  // Cargar IDs de fichas archivadas localmente
  useEffect(() => {
    if (!usuario?.email) return;
    try {
      const guardadas = localStorage.getItem(`grins_arch_${usuario.email}`);
      if (guardadas) setArchivadas(JSON.parse(guardadas));
    } catch (e) {
      console.error(e);
    }
  }, [usuario]);

  // Escuchar la colección de derivaciones en tiempo real
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "derivaciones"), (snap) => {
      setDerivaciones(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  // Escuchar la colección de usuarios (perfiles) en tiempo real
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "usuarios"), (snap) => {
      setPerfiles(snap.docs.map(d => ({ email: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Manejadores de acciones globales de Firebase
  const handlePublicar = async (nuevaFicha) => {
    await addDoc(collection(db, "derivaciones"), {
      ...nuevaFicha,
      derivadoPor: usuario.nombre,
      derivadoPorEmail: usuario.email,
      estado: "activa",
      interesados: [],
      interesadosEmails: [],
      creadoEn: serverTimestamp()
    });
  };

  const handleInteresa = async (ficha) => {
    if (ficha.derivadoPorEmail === usuario.email) return;
    if (ficha.interesadosEmails?.includes(usuario.email)) return;
    const internos = ficha.interesados || [];
    const emails = ficha.interesadosEmails || [];
    await updateDoc(doc(db, "derivaciones", ficha.id), {
      interesados: [...internos, usuario.nombre],
      interesadosEmails: [...emails, usuario.email],
      estado: "con_interesados"
    });
  };

  const handleArchivar = (ficha) => {
    if (archivadas.includes(ficha.id)) return;
    const nuevas = [...archivadas, ficha.id];
    setArchivadas(nuevas);
    try {
      localStorage.setItem(`grins_arch_${usuario.email}`, JSON.stringify(nuevas));
    } catch {}
  };

  const handleQuitarInteres = async (id) => {
    const ficha = derivaciones.find(d => d.id === id);
    if (!ficha) return;
    await updateDoc(doc(db, "derivaciones", id), {
      interesados: (ficha.interesados || []).filter(n => n !== usuario.nombre),
      interesadosEmails: (ficha.interesadosEmails || []).filter(e => e !== usuario.email)
    });
  };

  const handleAsignar = async (ficha, nombreAsignado, emailAsignado) => {
    await updateDoc(doc(db, "derivaciones", ficha.id), {
      estado: "asignada",
      asignadoA: nombreAsignado,
      asignadoEmail: emailAsignado
    });
  };

  const handleCerrarFicha = async (ficha) => {
    await updateDoc(doc(db, "derivaciones", ficha.id), { estado: "cerrada" });
  };

  const handleEliminarFicha = async (id) => {
    await deleteDoc(doc(db, "derivaciones", id));
  };

  // Filtrar las fichas visibles de la cartelera activa
  const fichasVisibles = derivaciones.filter(d => {
    if (d.estado !== "activa") return false;
    if (archivadas.includes(d.id)) return false;
    // Ocultar si el cupo máximo está lleno
    if (d.maxParticipantes && (d.interesadosEmails?.length || 0) >= d.maxParticipantes) return false;
    if (filtro !== "todas" && familiaDeSubtipo(d.subtipo).id !== filtro) return false;
    return true;
  });

  return (
    <div style={{ minHeight: "100vh", background: "#05050a", color: "white", paddingBottom: 120 }}>
      {/* Selector de Pestañas Superiores (Cartelera / Conexiones) */}
      {vista === "cartelera" && (
        <CarteleraLoop
          fichas={fichasVisibles}
          filtro={filtro}
          setFiltro={setFiltro}
          usuario={usuario}
          onInteresa={handleInteresa}
          onArchivar={handleArchivar}
        />
      )}

      {vista === "archivo" && (
        <VistaArchivo
          archivadas={archivadas}
          setArchivadas={setArchivadas}
          derivaciones={derivaciones}
          usuario={usuario}
          esAdmin={esAdmin}
          onVolver={() => setVista("cartelera")}
          onEliminarDefinitivo={handleEliminarFicha}
        />
      )}

      {vista === "me_interesa" && (
        <VistaMeInteresa
          archivadas={archivadas}
          derivaciones={derivaciones}
          usuario={usuario}
          onVolver={() => setVista("cartelera")}
          onQuitarInteres={handleQuitarInteres}
        />
      )}

      {vista === "mis_fichas" && (
        <MisPublicaciones
          derivaciones={derivaciones}
          usuario={usuario}
          perfiles={perfiles}
          esAdmin={esAdmin}
          onAsignar={handleAsignar}
          onCerrar={handleCerrarFicha}
          onEliminar={handleEliminarFicha}
          onAbrirChat={(id, nombre, email) => setChatActivo({ id, nombre, email, esGrupal: false })}
          onAbrirChatGrupal={(d) => setChatActivo({ id: d.id, esGrupal: true, tituloGrupo: d.titulo, participantes: d.interesados })}
          onVolver={() => setVista("cartelera")}
        />
      )}

      {vista === "conexiones" && (
        <Conexiones
          derivaciones={derivaciones}
          usuario={usuario}
          perfiles={perfiles}
          chatInicial={null}
          onChatInicialUsado={() => {}}
          onAbrirChat={(id, nombre, email) => setChatActivo({ id, nombre, email, esGrupal: false })}
          onAbrirChatGrupal={(d) => setChatActivo({ id: d.id, esGrupal: true, tituloGrupo: d.titulo, participantes: d.interesados })}
        />
      )}

      {/* Footer solo en vistas sin su propio botón volver */}
      {["cartelera"].includes(vista) && (
        <FooterCartelera
          onNueva={() => setMostrarForm(true)}
          onArchivo={() => setVista("archivo")}
          onMeInteresa={() => setVista("me_interesa")}
          onMisFichas={() => setVista("mis_fichas")}
        />
      )}

      {/* Modal para Crear Nueva Ficha */}
      {mostrarForm && (
        <FormNuevaFicha
          usuario={usuario}
          onPublicar={handlePublicar}
          onCerrar={() => setMostrarForm(false)}
        />
      )}

      {/* Pantalla Completa de Mensajería Interactiva */}
      {chatActivo && (
        <ChatFullscreen
          derivacionId={chatActivo.id}
          usuario={usuario}
          otroNombre={chatActivo.nombre}
          otroPerfil={perfiles?.find(p => p.email === chatActivo.email)}
          esGrupal={chatActivo.esGrupal}
          tituloGrupo={chatActivo.tituloGrupo}
          participantes={chatActivo.participantes}
          onCerrar={() => setChatActivo(null)}
        />
      )}
    </div>
  );
}