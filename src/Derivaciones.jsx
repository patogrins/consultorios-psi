import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";

// ── CATEGORÍAS ────────────────────────────────────────────────────────────────
const FAMILIAS = [
  {
    id: "casos", label: "Casos", emoji: "🧩",
    color: "#667eea", grad: "linear-gradient(135deg,#667eea,#764ba2)",
    tipos: ["Derivación","Interconsulta","Dispositivo"],
  },
  {
    id: "formacion", label: "Formación", emoji: "📚",
    color: "#f093fb", grad: "linear-gradient(135deg,#f093fb,#f5576c)",
    tipos: ["Supervisión","Lectura","Mentoría"],
  },
  {
    id: "colaboracion", label: "Colaboración", emoji: "🤝",
    color: "#43e97b", grad: "linear-gradient(135deg,#43e97b,#38f9d7)",
    tipos: ["Proyecto","Taller","Red"],
  },
];
function familiaDeSubtipo(subtipo) {
  return FAMILIAS.find(f => f.tipos.includes(subtipo)) || FAMILIAS[0];
}

const MODALIDADES = ["Presencial","Online","Ambas"];
const DIAS = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
const FRANJAS = ["Mañana","Tarde","Noche"];
const ESPECIALIDADES = ["Pareja","Infanto-juvenil","Duelo","Adicciones","Grupal","Adultos","Familiar","Trauma","Ansiedad","Otro"];

function avatarColor(nombre) {
  const c = ["linear-gradient(135deg,#667eea,#764ba2)","linear-gradient(135deg,#f093fb,#f5576c)","linear-gradient(135deg,#4facfe,#00f2fe)","linear-gradient(135deg,#43e97b,#38f9d7)","linear-gradient(135deg,#fa709a,#fee140)","linear-gradient(135deg,#a18cd1,#fbc2eb)","linear-gradient(135deg,#fda085,#f6d365)"];
  let h = 0; for (let i = 0; i < (nombre||"").length; i++) h = nombre.charCodeAt(i)+((h<<5)-h);
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

// ── CHIP DE FAMILIA EN LA CARTA ───────────────────────────────────────────────
function FamiliaChip({ subtipo, small }) {
  const f = familiaDeSubtipo(subtipo);
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:4,background:`${f.color}22`,color:f.color,border:`1px solid ${f.color}44`,borderRadius:20,padding:small?"1px 8px":"3px 10px",fontSize:small?9:11,fontWeight:700}}>
      {f.emoji} {subtipo}
    </span>
  );
}

// ── CHAT FULLSCREEN ───────────────────────────────────────────────────────────
function ChatFullscreen({ derivacionId, usuario, otroNombre, otroPerfil, onCerrar }) {
  const [msgs, setMsgs] = useState([]);
  const [texto, setTexto] = useState("");
  const endRef = useRef(null);
  useEffect(() => {
    const unsub = onSnapshot(collection(db,`chats_derivacion/${derivacionId}/mensajes`), snap => {
      setMsgs(snap.docs.map(d=>({...d.data(),id:d.id})).sort((a,b)=>(a.creadoEn?.seconds||0)-(b.creadoEn?.seconds||0)));
      setTimeout(()=>endRef.current?.scrollIntoView({behavior:"smooth"}),80);
    });
    return ()=>unsub();
  },[derivacionId]);
  async function enviar() {
    if (!texto.trim()) return;
    await addDoc(collection(db,`chats_derivacion/${derivacionId}/mensajes`),{texto:texto.trim(),autorEmail:usuario.email,autorNombre:usuario.nombre,creadoEn:serverTimestamp()});
    setTexto("");
  }
  const ini = otroNombre?.[0]?.toUpperCase()||"?";
  return (
    <div style={{position:"fixed",inset:0,background:"#000",zIndex:5000,display:"flex",flexDirection:"column"}}>
      <div style={{padding:"54px 16px 14px",background:"linear-gradient(180deg,#0a0a14,#000)",borderBottom:"1px solid rgba(124,106,255,0.15)",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
        <button onClick={onCerrar} style={{background:"none",border:"none",color:"white",fontSize:22,cursor:"pointer",padding:0}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{width:38,height:38,borderRadius:"50%",background:avatarColor(otroNombre||""),overflow:"hidden",border:"1.5px solid rgba(124,106,255,0.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:"white",flexShrink:0}}>
          {otroPerfil?.fotoUrl?<img src={otroPerfil.fotoUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:ini}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:15,fontWeight:800,color:"white",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{otroNombre}</div>
          {otroPerfil?.especialidad&&<div style={{fontSize:11,color:"#7c6aff",fontWeight:600}}>{otroPerfil.especialidad}</div>}
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"16px 14px",display:"flex",flexDirection:"column",gap:10}}>
        {msgs.length===0&&<div style={{textAlign:"center",padding:"40px 0"}}><div style={{fontSize:32,marginBottom:10}}>💬</div><p style={{margin:0,fontSize:13,color:"#4a5270"}}>Empezá la conversación con {otroNombre}</p></div>}
        {msgs.map(m=>{
          const esMio=m.autorEmail===usuario.email;
          const fecha=m.creadoEn?.toDate?.()?.toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})||"";
          return (
            <div key={m.id} style={{display:"flex",flexDirection:"column",alignItems:esMio?"flex-end":"flex-start"}}>
              {!esMio&&<div style={{fontSize:9,color:"#4a5270",marginBottom:3,marginLeft:4}}>{m.autorNombre}</div>}
              <div style={{maxWidth:"80%",padding:"10px 14px",borderRadius:esMio?"18px 18px 4px 18px":"18px 18px 18px 4px",background:esMio?"linear-gradient(135deg,#667eea,#764ba2)":"rgba(255,255,255,0.08)",color:"white",fontSize:14,lineHeight:1.4,wordBreak:"break-word"}}>{m.texto}</div>
              <div style={{fontSize:9,color:"#3a3a5a",marginTop:3,marginLeft:esMio?0:4,marginRight:esMio?4:0}}>{fecha}</div>
            </div>
          );
        })}
        <div ref={endRef}/>
      </div>
      <div style={{padding:"10px 12px",paddingBottom:"calc(10px + env(safe-area-inset-bottom))",borderTop:"1px solid rgba(124,106,255,0.1)",background:"rgba(10,10,20,0.95)",display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
        <input value={texto} onChange={e=>setTexto(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&enviar()} placeholder={`Escribile a ${otroNombre}...`} style={{flex:1,padding:"11px 16px",borderRadius:24,border:"1px solid rgba(124,106,255,0.2)",background:"rgba(255,255,255,0.05)",color:"white",fontSize:14,outline:"none"}}/>
        <button onClick={enviar} disabled={!texto.trim()} style={{width:42,height:42,borderRadius:"50%",border:"none",background:texto.trim()?"linear-gradient(135deg,#667eea,#764ba2)":"rgba(255,255,255,0.05)",cursor:texto.trim()?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>
  );
}

// ── PILA DE CARTAS ────────────────────────────────────────────────────────────
function CarteleraLoop({ fichas, filtro, setFiltro, usuario, onInteresa, onArchivar }) {
  const [idx, setIdx] = useState(0);
  const [animando, setAnimando] = useState(null);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [swipeDir, setSwipeDir] = useState(null);
  const startX = useRef(null);
  const startY = useRef(null);
  const THRESHOLD_H = 80, THRESHOLD_V = 55;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    return () => { document.body.style.overflow = prev; document.body.style.position = ""; document.body.style.width = ""; };
  }, []);

  useEffect(() => { if (fichas.length > 0 && idx >= fichas.length) setIdx(0); }, [fichas.length]);

  const total = fichas.length;
  const getIdx = (offset) => ((idx + offset) % total + total) % total;

  function onTouchStart(e) {
    if (e.touches.length !== 1) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  }
  function onTouchMove(e) {
    if (startX.current === null) return;
    e.preventDefault();
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    if (Math.abs(dx) > Math.abs(dy)) {
      setOffsetX(dx); setOffsetY(0);
      setSwipeDir(dx > 20 ? "right" : dx < -20 ? "left" : null);
    } else {
      setOffsetY(dy); setOffsetX(0); setSwipeDir(dy < -20 ? "up" : dy > 20 ? "down" : null);
    }
  }
  function onTouchEnd() {
    if (Math.abs(offsetX) > THRESHOLD_H) triggerH(offsetX > 0 ? "right" : "left");
    else if (offsetY < -THRESHOLD_V) triggerV("up");
    else if (offsetY > THRESHOLD_V) triggerV("down");
    else { setOffsetX(0); setOffsetY(0); setSwipeDir(null); }
    startX.current = null; startY.current = null;
  }
  function triggerH(dir) {
    setAnimando({ dir });
    setTimeout(() => {
      if (total > 0) {
        const f = fichas[getIdx(0)];
        if (dir === "right" && f.derivadoPorEmail !== usuario.email) onInteresa(f);
        else if (dir === "left") onArchivar(f);
      }
      setIdx(i => total > 0 ? (i + 1) % total : 0);
      setOffsetX(0); setOffsetY(0); setSwipeDir(null); setAnimando(null);
    }, 320);
  }
  function triggerV(dir) {
    setAnimando({ dir });
    setTimeout(() => {
      setIdx(i => dir === "up" ? (i + 1) % total : (i - 1 + total) % total);
      setOffsetX(0); setOffsetY(0); setSwipeDir(null); setAnimando(null);
    }, 260);
  }

  if (total === 0) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"60px 20px",textAlign:"center",minHeight:"50vh"}}>
      <div style={{fontSize:52,marginBottom:14}}>📌</div>
      <h3 style={{margin:"0 0 8px",color:"white",fontSize:17,fontWeight:800}}>Cartelera al día</h3>
      <p style={{margin:0,color:"#4a5270",fontSize:13}}>No hay fichas con este filtro.</p>
    </div>
  );

  const fichaActual = fichas[getIdx(0)];
  const fichaSig = fichas[getIdx(1)];
  const fichaAnt = fichas[getIdx(-1)];
  const yaInteresado = fichaActual.interesadosEmails?.includes(usuario.email);
  const esPropia = fichaActual.derivadoPorEmail === usuario.email;
  const familia = familiaDeSubtipo(fichaActual.subtipo || "Derivación");

  const flyX = animando?.dir === "right" ? 500 : animando?.dir === "left" ? -500 : offsetX;
  const flyY = animando?.dir === "up" ? -220 : animando?.dir === "down" ? 220 : offsetY;
  const rot = offsetX * 0.035;
  const isH = animando?.dir === "left" || animando?.dir === "right";
  const opActual = isH ? 0 : Math.max(0.15, 1 - Math.abs(offsetX)/260 - Math.abs(offsetY)/200);
  const peekPct = Math.min(1, Math.abs(offsetY) / 140);
  const isMovingUp = offsetY < -10;
  const isMovingDown = offsetY > 10;

  return (
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 54px)",overflow:"hidden"}}>

      {/* FILTROS — arriba de las fichas */}
      <div style={{padding:"10px 14px 6px",flexShrink:0}}>
        <div style={{display:"flex",gap:6,background:"rgba(10,10,20,0.7)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",border:"1px solid rgba(124,106,255,0.15)",borderRadius:20,padding:"6px 8px"}}>
          <button onClick={()=>setFiltro("todas")} style={{flex:1,padding:"7px 4px",borderRadius:14,border:"none",background:filtro==="todas"?"rgba(124,106,255,0.25)":"transparent",color:filtro==="todas"?"#a78bfa":"#4a5270",fontSize:11,fontWeight:700,cursor:"pointer",transition:"all 0.15s"}}>Todas</button>
          {FAMILIAS.map(f=>(
            <button key={f.id} onClick={()=>setFiltro(f.id)}
              style={{flex:1,padding:"7px 4px",borderRadius:14,border:"none",background:filtro===f.id?`${f.color}33`:"transparent",color:filtro===f.id?f.color:"#4a5270",fontSize:filtro===f.id?12:11,fontWeight:700,cursor:"pointer",transition:"all 0.15s",display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
              <span style={{fontSize:filtro===f.id?18:14,transition:"font-size 0.15s"}}>{f.emoji}</span>
              <span>{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* AREA DE CARTAS */}
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"0 14px",position:"relative",minHeight:0}}>

        {/* FLECHA ARRIBA — botón + hint */}
        <button onClick={()=>triggerV("down")}
          style={{position:"absolute",top:2,left:"50%",transform:"translateX(-50%)",zIndex:10,background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:1,opacity:isMovingDown?0.9:0.3,transition:"opacity 0.2s",padding:"4px 20px"}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
          <span style={{fontSize:8,color:"#7c6aff",fontWeight:600,letterSpacing:1}}>ANTERIOR</span>
        </button>

        {/* PILA */}
        <div style={{position:"relative",width:"100%",height:320}}>

          {/* CARTA ANTERIOR — peek arriba */}
          {total > 1 && (
            <div style={{
              position:"absolute",inset:"0 8px",borderRadius:20,
              background:"rgba(14,12,28,0.75)",
              border:"1px solid rgba(124,106,255,0.07)",
              overflow:"hidden",
              transform:`translateY(${-44 + (isMovingDown ? Math.min(44,peekPct*80) : 0)}px) scale(${0.86+(isMovingDown?peekPct*0.09:0)})`,
              opacity:isMovingDown?0.2+peekPct*0.6:0.2,
              filter:`blur(${isMovingDown?Math.max(0,7-peekPct*7):7}px)`,
              transition:animando?"transform 0.26s ease,opacity 0.26s,filter 0.26s":"none",
              zIndex:1,
            }}>
              <div style={{height:3,background:familiaDeSubtipo(fichaAnt.subtipo||"Derivación").grad}}/>
              <div style={{padding:"10px 14px"}}>
                <FamiliaChip subtipo={fichaAnt.subtipo||"Derivación"} small/>
                <div style={{fontSize:13,fontWeight:800,color:"white",marginTop:5,opacity:0.6}}>{fichaAnt.titulo||fichaAnt.especialidad||fichaAnt.subtipo}</div>
              </div>
            </div>
          )}

          {/* CARTA SIGUIENTE — peek abajo */}
          {total > 1 && (
            <div style={{
              position:"absolute",inset:"0 8px",borderRadius:20,
              background:"rgba(14,12,28,0.75)",
              border:"1px solid rgba(124,106,255,0.07)",
              overflow:"hidden",
              transform:`translateY(${28+(isMovingUp?Math.min(28,peekPct*60):0)}px) scale(${0.90+(isMovingUp?peekPct*0.07:0)})`,
              opacity:isMovingUp?0.2+peekPct*0.6:0.25,
              filter:`blur(${isMovingUp?Math.max(0,6-peekPct*6):6}px)`,
              transition:animando?"transform 0.26s ease,opacity 0.26s,filter 0.26s":"none",
              zIndex:2,
            }}>
              <div style={{height:3,background:familiaDeSubtipo(fichaSig.subtipo||"Derivación").grad}}/>
              <div style={{padding:"10px 14px"}}>
                <FamiliaChip subtipo={fichaSig.subtipo||"Derivación"} small/>
                <div style={{fontSize:13,fontWeight:800,color:"white",marginTop:5,opacity:0.6}}>{fichaSig.titulo||fichaSig.especialidad||fichaSig.subtipo}</div>
              </div>
            </div>
          )}

          {/* CARTA ACTIVA */}
          <div
            onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
            style={{
              position:"absolute",inset:0,zIndex:3,
              background:"rgba(14,12,28,0.97)",
              borderRadius:20,
              border:`1px solid ${swipeDir==="right"?"rgba(102,187,106,0.7)":swipeDir==="left"?"rgba(239,83,80,0.7)":"rgba(124,106,255,0.3)"}`,
              transform:`translate(${flyX}px,${flyY}px) rotate(${rot}deg)`,
              opacity:opActual,
              transition:animando?"transform 0.32s cubic-bezier(0.4,0,0.2,1),opacity 0.32s":"border 0.15s",
              cursor:"grab", userSelect:"none", touchAction:"none",
              boxShadow:"0 16px 48px rgba(0,0,0,0.6)",
              overflow:"hidden",
            }}>
            <div style={{height:4,background:familia.grad}}/>

            {/* Badge swipe derecha */}
            {swipeDir==="right"&&!esPropia&&(
              <div style={{position:"absolute",top:12,left:12,zIndex:5,background:"rgba(102,187,106,0.9)",borderRadius:8,padding:"3px 10px",border:"2px solid #66bb6a",transform:"rotate(-10deg)"}}>
                <span style={{fontSize:11,fontWeight:800,color:"white"}}>♥ ME INTERESA</span>
              </div>
            )}
            {swipeDir==="left"&&(
              <div style={{position:"absolute",top:12,right:12,zIndex:5,background:"rgba(239,83,80,0.9)",borderRadius:8,padding:"3px 10px",border:"2px solid #ef5350",transform:"rotate(10deg)"}}>
                <span style={{fontSize:11,fontWeight:800,color:"white"}}>ARCHIVAR ✕</span>
              </div>
            )}
            {yaInteresado&&(
              <div style={{position:"absolute",top:12,right:12,zIndex:5,background:"rgba(56,161,105,0.85)",borderRadius:8,padding:"2px 8px",border:"2px solid #38a169",transform:"rotate(8deg)"}}>
                <span style={{fontSize:9,fontWeight:800,color:"white"}}>♥ ME INTERESA</span>
              </div>
            )}
            {esPropia&&(
              <div style={{position:"absolute",top:12,right:12,zIndex:5,background:"rgba(124,106,255,0.8)",borderRadius:8,padding:"2px 8px",border:"2px solid #7c6aff"}}>
                <span style={{fontSize:9,fontWeight:800,color:"white"}}>Tu ficha</span>
              </div>
            )}

            <div style={{padding:"12px 14px",height:"calc(100% - 4px)",display:"flex",flexDirection:"column",overflowY:"auto"}}>
              {/* Header con icono grande de la familia */}
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
                <div style={{width:46,height:46,borderRadius:14,background:familia.grad,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0,boxShadow:`0 4px 14px ${familia.color}44`}}>
                  {familia.emoji}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:15,fontWeight:800,color:"white",lineHeight:1.2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{fichaActual.titulo||fichaActual.especialidad||fichaActual.subtipo}</div>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3}}>
                    <FamiliaChip subtipo={fichaActual.subtipo||"Derivación"} small/>
                  </div>
                  <div style={{fontSize:10,color:"#4a5270",marginTop:3}}>por {fichaActual.derivadoPor} · {tiempoRelativo(fichaActual.creadoEn?.seconds)}</div>
                </div>
              </div>

              {fichaActual.nota&&(
                <p style={{margin:"0 0 10px",fontSize:12,color:"#e2e8f0",lineHeight:1.55,padding:"9px 11px",background:"rgba(124,106,255,0.06)",borderRadius:10,borderLeft:`2px solid ${familia.color}66`}}>
                  &ldquo;{fichaActual.nota}&rdquo;
                </p>
              )}

              <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10}}>
                {fichaActual.modalidad&&<Tag label={`📍 ${fichaActual.modalidad}`}/>}
                {fichaActual.especialidad&&fichaActual.especialidad!==fichaActual.titulo&&<Tag label={fichaActual.especialidad}/>}
                {fichaActual.genero&&fichaActual.genero!=="Indistinto"&&<Tag label={fichaActual.genero}/>}
                {fichaActual.dias?.length>0&&<Tag label={`📅 ${fichaActual.dias.slice(0,2).join("·")}`}/>}
                {fichaActual.franjas?.length>0&&<Tag label={`⏰ ${fichaActual.franjas.join("·")}`}/>}
              </div>

              <div style={{display:"flex",gap:8,marginTop:"auto"}}>
                <button onClick={()=>triggerH("left")} style={{flex:1,padding:"10px",borderRadius:13,border:"1px solid rgba(239,83,80,0.3)",background:"rgba(239,83,80,0.08)",color:"#ef5350",fontWeight:700,fontSize:12,cursor:"pointer"}}>✕ Archivar</button>
                {!esPropia&&(
                  <button onClick={()=>triggerH("right")} style={{flex:2,padding:"10px",borderRadius:13,border:"none",background:yaInteresado?"rgba(56,161,105,0.15)":"linear-gradient(135deg,#38a169,#2d8a5e)",color:yaInteresado?"#66bb6a":"white",fontWeight:700,fontSize:12,cursor:"pointer"}}>
                    ♥ {yaInteresado?"Postulado":"Me interesa"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* INDICADORES DE SWIPE H */}
        <div style={{display:"flex",justifyContent:"space-between",width:"100%",marginTop:8,padding:"0 4px"}}>
          <div style={{display:"flex",alignItems:"center",gap:5,opacity:swipeDir==="left"?1:0.2,transition:"opacity 0.15s"}}>
            <div style={{width:22,height:22,borderRadius:"50%",background:"rgba(239,83,80,0.15)",border:"1.5px solid #ef5350",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:9,color:"#ef5350"}}>✕</span></div>
            <span style={{fontSize:9,color:"#ef5350",fontWeight:600}}>Archivar</span>
          </div>
          <span style={{fontSize:10,color:"#4a5270"}}>{getIdx(0)+1}/{total}</span>
          <div style={{display:"flex",alignItems:"center",gap:5,opacity:swipeDir==="right"?1:0.2,transition:"opacity 0.15s"}}>
            <span style={{fontSize:9,color:"#66bb6a",fontWeight:600}}>Me interesa</span>
            <div style={{width:22,height:22,borderRadius:"50%",background:"rgba(102,187,106,0.15)",border:"1.5px solid #66bb6a",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:9,color:"#66bb6a"}}>♥</span></div>
          </div>
        </div>

        {/* FLECHA ABAJO — botón + hint */}
        <button onClick={()=>triggerV("up")}
          style={{position:"absolute",bottom:2,left:"50%",transform:"translateX(-50%)",zIndex:10,background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:1,opacity:isMovingUp?0.9:0.3,transition:"opacity 0.2s",padding:"4px 20px"}}>
          <span style={{fontSize:8,color:"#7c6aff",fontWeight:600,letterSpacing:1}}>SIGUIENTE</span>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
      </div>
    </div>
  );
}

// ── FOOTER CON FILTRO ─────────────────────────────────────────────────────────
function FooterCartelera({ onNueva, onArchivo, onMeInteresa, onMisFichas }) {
  return (
    <div style={{position:"fixed",bottom:90,left:"50%",transform:"translateX(-50%)",zIndex:60,display:"flex",flexDirection:"column",alignItems:"center",gap:6,width:"calc(100% - 24px)",maxWidth:360}}>
      <div style={{display:"flex",alignItems:"center",width:"100%",gap:6,background:"rgba(10,10,20,0.92)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",border:"1px solid rgba(124,106,255,0.2)",borderRadius:22,padding:"8px 10px",boxShadow:"0 8px 32px rgba(0,0,0,0.4)"}}>
        <button onClick={onArchivo} style={{flex:1,background:"transparent",border:"none",color:"#a0a8c0",fontSize:10,fontWeight:600,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"4px 0"}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a0a8c0" strokeWidth="1.8" strokeLinecap="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
          Archivo
        </button>
        <button onClick={onNueva} style={{width:52,height:52,borderRadius:"50%",border:"none",background:"linear-gradient(135deg,#667eea,#764ba2)",color:"white",fontSize:28,fontWeight:300,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 4px 16px rgba(124,106,255,0.5)"}}>+</button>
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

// ── VISTA ARCHIVO ─────────────────────────────────────────────────────────────
function VistaArchivo({ archivadas, setArchivadas, derivaciones, usuario, esAdmin, onVolver, onEliminarDefinitivo }) {
  const fichas = derivaciones.filter(d => archivadas.includes(d.id));
  function restaurar(id) {
    const n = archivadas.filter(a=>a!==id);
    setArchivadas(n);
    try { localStorage.setItem(`grins_arch_${usuario?.email}`,JSON.stringify(n)); } catch {}
  }
  function eliminarLocal(id) {
    const n = archivadas.filter(a=>a!==id);
    try {
      const k=`grins_elim_${usuario?.email}`;
      const e=JSON.parse(localStorage.getItem(k)||"[]");
      localStorage.setItem(k,JSON.stringify([...e,id]));
      localStorage.setItem(`grins_arch_${usuario?.email}`,JSON.stringify(n));
    } catch {}
    setArchivadas(n);
  }
  return (
    <div style={{padding:"16px 14px 180px"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <span style={{fontSize:15,fontWeight:800,color:"white"}}>📁 Archivo</span>
        <span style={{background:"rgba(124,106,255,0.12)",color:"#7c6aff",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700}}>{fichas.length}</span>
      </div>
      {fichas.length===0&&<div style={{textAlign:"center",padding:"32px 0"}}><div style={{fontSize:40,marginBottom:10}}>📁</div><p style={{margin:0,color:"#4a5270",fontSize:13}}>El archivo está vacío.</p></div>}
      {fichas.map(d=>(
        <div key={d.id} style={{background:"rgba(14,12,28,0.7)",borderRadius:14,padding:"12px 14px",marginBottom:10,border:"1px solid rgba(255,255,255,0.06)",opacity:0.8}}>
          <div style={{marginBottom:8}}>
            <FamiliaChip subtipo={d.subtipo||"Derivación"} small/>
            <div style={{fontSize:13,fontWeight:700,color:"#4a5270",marginTop:6}}>{d.titulo||d.especialidad||d.subtipo}</div>
            <div style={{fontSize:10,color:"#3a3a5a",marginTop:2}}>por {d.derivadoPor} · {tiempoRelativo(d.creadoEn?.seconds)}</div>
          </div>
          {d.nota&&<p style={{margin:"0 0 10px",fontSize:11,color:"#3a3a5a",fontStyle:"italic"}}>"{d.nota.slice(0,80)}{d.nota.length>80?"…":""}"</p>}
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>restaurar(d.id)} style={{flex:1,padding:"7px",borderRadius:10,border:"1px solid rgba(124,106,255,0.2)",background:"rgba(124,106,255,0.08)",color:"#7c6aff",fontWeight:600,fontSize:11,cursor:"pointer"}}>↩ Restaurar</button>
            <button onClick={()=>eliminarLocal(d.id)} style={{flex:1,padding:"7px",borderRadius:10,border:"1px solid rgba(255,255,255,0.06)",background:"transparent",color:"#4a5270",fontWeight:600,fontSize:11,cursor:"pointer"}}>🗑 Quitar</button>
            {esAdmin&&<button onClick={()=>onEliminarDefinitivo(d.id)} style={{flex:1,padding:"7px",borderRadius:10,border:"1px solid rgba(239,83,80,0.25)",background:"rgba(239,83,80,0.08)",color:"#ef5350",fontWeight:600,fontSize:11,cursor:"pointer"}}>✕ Todos</button>}
          </div>
        </div>
      ))}
      <FooterSubVista onVolver={onVolver}/>
    </div>
  );
}

// ── VISTA ME INTERESA ─────────────────────────────────────────────────────────
function VistaMeInteresa({ archivadas, derivaciones, usuario, onVolver, onQuitarInteres }) {
  const fichas = derivaciones.filter(d => d.interesadosEmails?.includes(usuario.email) && !archivadas.includes(d.id));
  const startX = useRef(null);
  const [swipingId, setSwipingId] = useState(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  function onTSC(e,id) { startX.current=e.touches[0].clientX; setSwipingId(id); }
  function onTMC(e) { if(!startX.current) return; const dx=e.touches[0].clientX-startX.current; if(dx<0) setSwipeOffset(dx); }
  function onTEC(id) { if(swipeOffset<-80) onQuitarInteres(id); startX.current=null; setSwipingId(null); setSwipeOffset(0); }

  return (
    <div style={{padding:"16px 14px 180px"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <span style={{fontSize:15,fontWeight:800,color:"white"}}>♥ Me interesa</span>
        <span style={{background:"rgba(102,187,106,0.15)",color:"#66bb6a",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700}}>{fichas.length}</span>
      </div>
      {fichas.length===0&&<div style={{textAlign:"center",padding:"32px 0"}}><div style={{fontSize:40,marginBottom:10}}>♥</div><p style={{margin:0,color:"#4a5270",fontSize:13}}>Todavía no marcaste ninguna ficha.</p></div>}
      {fichas.map(d=>{
        const isSw=swipingId===d.id;
        const off=isSw?swipeOffset:0;
        const familia=familiaDeSubtipo(d.subtipo||"Derivación");
        return (
          <div key={d.id} style={{position:"relative",marginBottom:10,overflow:"hidden",borderRadius:14}}>
            <div style={{position:"absolute",inset:0,background:"rgba(239,83,80,0.12)",display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:20,borderRadius:14}}>
              <span style={{fontSize:11,color:"#ef5350",fontWeight:700,opacity:off<-30?1:0,transition:"opacity 0.15s"}}>← Quitar interés</span>
            </div>
            <div onTouchStart={e=>onTSC(e,d.id)} onTouchMove={onTMC} onTouchEnd={()=>onTEC(d.id)}
              style={{background:"rgba(14,12,28,0.9)",borderRadius:14,padding:"14px",border:"1px solid rgba(102,187,106,0.2)",transform:`translateX(${off}px)`,transition:isSw?"none":"transform 0.3s ease",touchAction:"pan-y"}}>
              <div style={{height:3,background:familia.grad,borderRadius:2,marginBottom:10}}/>
              <div style={{marginBottom:8}}>
                <FamiliaChip subtipo={d.subtipo||"Derivación"} small/>
                <div style={{fontSize:14,fontWeight:800,color:"white",marginTop:6}}>{d.titulo||d.especialidad||d.subtipo}</div>
                <div style={{fontSize:11,color:"#4a5270",marginTop:2}}>por {d.derivadoPor} · {tiempoRelativo(d.creadoEn?.seconds)}</div>
              </div>
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
function MisPublicaciones({ derivaciones, usuario, perfiles, esAdmin, onAsignar, onCerrar, onEliminar, onAbrirChat, onVolver }) {
  const [expandida, setExpandida] = useState(null);
  const [matchModal, setMatchModal] = useState(null);
  const mias = derivaciones.filter(d=>d.derivadoPorEmail===usuario.email);

  async function handleAsignar(d,nombre,email) {
    await onAsignar(d,nombre,email);
    const p=perfiles.find(x=>x.email===email);
    setMatchModal({derivacion:d,asignado:{nombre,email,fotoUrl:p?.fotoUrl}});
    setExpandida(null);
  }

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
        const asignada=d.estado==="asignada";
        const cerrada=d.estado==="cerrada";
        const isExp=expandida===d.id;
        const familia=familiaDeSubtipo(d.subtipo||"Derivación");
        return (
          <div key={d.id} style={{background:"rgba(14,12,28,0.9)",borderRadius:18,marginBottom:12,overflow:"hidden",border:`1px solid ${asignada?"rgba(102,187,106,0.3)":conInt?"rgba(124,106,255,0.35)":"rgba(124,106,255,0.12)"}`}}>
            <div style={{height:3,background:asignada?"linear-gradient(90deg,#38a169,#2d8a5e)":conInt?familia.grad:"rgba(124,106,255,0.2)"}}/>
            <div style={{padding:"14px 16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div>
                  <FamiliaChip subtipo={d.subtipo||"Derivación"} small/>
                  <div style={{fontSize:14,fontWeight:800,color:cerrada?"#4a5270":"white",marginTop:6}}>{d.titulo||d.especialidad||d.subtipo}</div>
                  <div style={{fontSize:10,color:"#4a5270",marginTop:2}}>{tiempoRelativo(d.creadoEn?.seconds)}</div>
                </div>
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
              {asignada&&(
                <div style={{display:"flex",gap:8,marginBottom:10}}>
                  <div style={{flex:1,padding:"9px 12px",background:"rgba(102,187,106,0.08)",borderRadius:10,border:"1px solid rgba(102,187,106,0.2)",display:"flex",alignItems:"center",gap:8}}>
                    <span>🔗</span><span style={{fontSize:12,color:"#66bb6a",fontWeight:600}}>{d.asignadoA}</span>
                  </div>
                  <button onClick={()=>onAbrirChat(d.id,d.asignadoA,d.asignadoEmail)} style={{padding:"0 14px",borderRadius:10,border:"1px solid rgba(124,106,255,0.25)",background:"rgba(124,106,255,0.1)",color:"#a78bfa",fontWeight:700,fontSize:11,cursor:"pointer"}}>💬</button>
                </div>
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
function Conexiones({ derivaciones, usuario, perfiles, chatInicial, onChatInicialUsado, onAbrirChat }) {
  const conexiones = derivaciones.filter(d=>d.estado==="asignada"&&(d.derivadoPorEmail===usuario.email||d.asignadoEmail===usuario.email));
  useEffect(()=>{
    if(!chatInicial) return;
    const c=conexiones.find(d=>d.derivadoPorEmail===chatInicial||d.asignadoEmail===chatInicial);
    if(c){const otroEmail=c.derivadoPorEmail===usuario.email?c.asignadoEmail:c.derivadoPorEmail;const otroNombre=c.derivadoPorEmail===usuario.email?c.asignadoA:c.derivadoPor;onAbrirChat(c.id,otroNombre,otroEmail);}
    onChatInicialUsado?.();
  },[chatInicial,conexiones]);

  if(conexiones.length===0) return <div style={{padding:"32px 20px",textAlign:"center"}}><div style={{fontSize:40,marginBottom:10}}>🔗</div><p style={{margin:0,color:"#4a5270",fontSize:13}}>Aún no tenés conexiones activas.</p></div>;

  return (
    <div style={{padding:"12px 14px 20px"}}>
      {conexiones.map(d=>{
        const dp=perfiles.find(p=>p.email===d.derivadoPorEmail);
        const ap=perfiles.find(p=>p.email===d.asignadoEmail);
        const otroEmail=d.derivadoPorEmail===usuario.email?d.asignadoEmail:d.derivadoPorEmail;
        const otroNombre=d.derivadoPorEmail===usuario.email?d.asignadoA:d.derivadoPor;
        const familia=familiaDeSubtipo(d.subtipo||"Derivación");
        return (
          <div key={d.id} style={{background:"rgba(14,12,28,0.9)",borderRadius:18,marginBottom:12,overflow:"hidden",border:"1px solid rgba(102,187,106,0.2)"}}>
            <div style={{height:3,background:familia.grad}}/>
            <div style={{padding:"16px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:0,marginBottom:12}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                  <div style={{width:48,height:48,borderRadius:"50%",background:avatarColor(d.derivadoPor||""),overflow:"hidden",border:`2px solid ${d.derivadoPorEmail===usuario.email?"rgba(124,106,255,0.6)":"rgba(102,187,106,0.3)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:800,color:"white"}}>{dp?.fotoUrl?<img src={dp.fotoUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:d.derivadoPor?.[0]?.toUpperCase()}</div>
                  <div style={{fontSize:9,color:d.derivadoPorEmail===usuario.email?"#a78bfa":"#4a5270",fontWeight:700}}>{d.derivadoPorEmail===usuario.email?"Vos":d.derivadoPor}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",margin:"0 10px",paddingBottom:18}}>
                  <div style={{width:20,height:1,background:"rgba(102,187,106,0.4)"}}/>
                  <div style={{width:26,height:26,borderRadius:"50%",background:"linear-gradient(135deg,#38a169,#2d8a5e)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
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
              <button onClick={()=>onAbrirChat(d.id,otroNombre,otroEmail)} style={{width:"100%",padding:"10px",borderRadius:12,border:"1px solid rgba(124,106,255,0.2)",background:"rgba(124,106,255,0.08)",color:"#a78bfa",fontWeight:700,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                Chatear con {otroNombre}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
export default function Derivaciones({ usuario, t, esAdmin, chatInicial, onChatInicialUsado, vistaInicial }) {
  const [derivaciones, setDerivaciones] = useState([]);
  const [perfiles, setPerfiles] = useState([]);
  const [vista, setVista] = useState(vistaInicial||"cartelera");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [chatAbierto, setChatAbierto] = useState(null);
  const [filtro, setFiltro] = useState("todas");
  const [archivadas, setArchivadas] = useState(()=>{
    try { return JSON.parse(localStorage.getItem(`grins_arch_${usuario?.email}`)||"[]"); } catch { return []; }
  });

  useEffect(()=>{
    const u1=onSnapshot(collection(db,"derivaciones"),snap=>{
      setDerivaciones(snap.docs.map(d=>({...d.data(),id:d.id})).sort((a,b)=>(b.creadoEn?.seconds||0)-(a.creadoEn?.seconds||0)));
    });
    const u2=onSnapshot(collection(db,"usuarios"),snap=>{setPerfiles(snap.docs.map(d=>({...d.data(),email:d.id})));});
    return()=>{u1();u2();};
  },[]);

  useEffect(()=>{ if(vistaInicial) setVista(vistaInicial); },[vistaInicial]);
  useEffect(()=>{ try{localStorage.setItem(`grins_arch_${usuario?.email}`,JSON.stringify(archivadas));}catch{} },[archivadas]);

  function abrirChat(id,n,e){ setChatAbierto({derivacionId:id,otroNombre:n,otroEmail:e}); }

  function archivarLocal(d){
    const n=[...archivadas,d.id];
    setArchivadas(n);
  }

  async function meInteresa(d){
    if(d.derivadoPorEmail===usuario.email||d.interesadosEmails?.includes(usuario.email)) return;
    await updateDoc(doc(db,"derivaciones",d.id),{interesados:[...(d.interesados||[]),usuario.nombre],interesadosEmails:[...(d.interesadosEmails||[]),usuario.email],estado:"con_interesados"});
  }

  async function quitarInteres(id){
    const d=derivaciones.find(x=>x.id===id); if(!d) return;
    await updateDoc(doc(db,"derivaciones",id),{interesados:(d.interesados||[]).filter(n=>n!==usuario.nombre),interesadosEmails:(d.interesadosEmails||[]).filter(e=>e!==usuario.email),estado:(d.interesados||[]).length<=1?"disponible":"con_interesados"});
  }

  async function asignar(d,nombre,email){
    await updateDoc(doc(db,"derivaciones",d.id),{asignadoA:nombre,asignadoEmail:email,estado:"asignada"});
    await addDoc(collection(db,"notificaciones"),{para:email,de:usuario.email,deNombre:usuario.nombre,tipo:"derivacion_asignada",derivacionId:d.id,especialidad:d.titulo||d.subtipo,leida:false,creadoEn:serverTimestamp()});
    await addDoc(collection(db,"notificaciones"),{para:d.derivadoPorEmail,de:email,deNombre:nombre,tipo:"derivacion_match",derivacionId:d.id,especialidad:d.titulo||d.subtipo,leida:false,creadoEn:serverTimestamp()});
  }

  async function cerrar(d){ await updateDoc(doc(db,"derivaciones",d.id),{estado:"cerrada"}); }
  async function eliminar(id){ await deleteDoc(doc(db,"derivaciones",id)); }

  async function publicar(data){
    await addDoc(collection(db,"derivaciones"),{
      ...data,
      estado:"disponible",
      derivadoPor:usuario.nombre,
      derivadoPorEmail:usuario.email,
      interesados:[],
      interesadosEmails:[],
      asignadoA:null,
      asignadoEmail:null,
      creadoEn:serverTimestamp(),
    });
  }

  // Fichas para la cartelera: disponibles, no archivadas, filtradas por familia
  const fichasCartelera = derivaciones.filter(d=>{
    if(d.estado!=="disponible") return false;
    if(archivadas.includes(d.id)) return false;
    if(filtro!=="todas"){
      const f=familiaDeSubtipo(d.subtipo||"Derivación");
      if(f.id!==filtro) return false;
    }
    return true;
  });

  if(chatAbierto){
    const op=perfiles.find(p=>p.email===chatAbierto.otroEmail);
    return <ChatFullscreen derivacionId={chatAbierto.derivacionId} usuario={usuario} otroNombre={chatAbierto.otroNombre} otroPerfil={op} onCerrar={()=>setChatAbierto(null)}/>;
  }

  const tituloVista = { cartelera:"Cartelera", archivo:"Archivo", meInteresa:"Me interesa", misPublicaciones:"Mis fichas", conexiones:"Conexiones" }[vista] || "Lazos";

  return (
    <div>
      {/* STICKY BAR — título dinámico */}
      <div style={{position:"fixed",top:0,left:0,right:0,zIndex:50,background:"rgba(0,0,0,0.92)",backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",borderBottom:"1px solid rgba(124,106,255,0.15)",padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",height:54}}>
        <span style={{fontSize:14,fontWeight:800,color:"white"}}>Lazos</span>
        <span style={{fontSize:12,fontWeight:700,color:"#7c6aff"}}>{tituloVista}</span>
        <span style={{fontSize:11,color:"#7c6aff",fontWeight:700,letterSpacing:2,opacity:0.6}}>GRINS</span>
      </div>

      {/* Espaciador para sticky bar */}
      <div style={{height:54}}/>

      {mostrarForm&&<FormNuevaFicha usuario={usuario} onPublicar={publicar} onCerrar={()=>setMostrarForm(false)}/>}

      {vista==="cartelera"&&<CarteleraLoop fichas={fichasCartelera} filtro={filtro} setFiltro={setFiltro} usuario={usuario} onInteresa={meInteresa} onArchivar={archivarLocal} onQuitarInteres={quitarInteres}/>}
      {vista==="archivo"&&<VistaArchivo archivadas={archivadas} setArchivadas={setArchivadas} derivaciones={derivaciones} usuario={usuario} esAdmin={esAdmin} onVolver={()=>setVista("cartelera")} onEliminarDefinitivo={eliminar}/>}
      {vista==="meInteresa"&&<VistaMeInteresa archivadas={archivadas} derivaciones={derivaciones} usuario={usuario} onVolver={()=>setVista("cartelera")} onQuitarInteres={quitarInteres}/>}
      {vista==="misPublicaciones"&&<MisPublicaciones derivaciones={derivaciones} usuario={usuario} perfiles={perfiles} esAdmin={esAdmin} onAsignar={asignar} onCerrar={cerrar} onEliminar={eliminar} onAbrirChat={abrirChat} onVolver={()=>setVista("cartelera")}/>}
      {vista==="conexiones"&&<Conexiones derivaciones={derivaciones} usuario={usuario} perfiles={perfiles} chatInicial={chatInicial} onChatInicialUsado={onChatInicialUsado} onAbrirChat={abrirChat}/>}

      {vista==="cartelera"&&(
        <FooterCartelera
          onNueva={()=>setMostrarForm(true)}
          onArchivo={()=>setVista("archivo")}
          onMeInteresa={()=>setVista("meInteresa")}
          onMisFichas={()=>setVista("misPublicaciones")}
        />
      )}
    </div>
  );
}
