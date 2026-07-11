import { useState, useEffect, useRef, useMemo } from "react";
import { db } from "./firebase";
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp
} from "firebase/firestore";

const ESPECIALIDADES = ["Pareja","Infanto-juvenil","Duelo","Adicciones","Grupal","Adultos","Familiar","Trauma","Ansiedad","Otro"];
const MODALIDADES = ["Presencial","Online","Ambas"];
const DIAS = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
const FRANJAS = ["Mañana","Tarde","Noche"];

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

function Tag({ label }) {
  return <span style={{background:"rgba(14,12,28,0.9)",color:"#a0a8c0",border:"1px solid rgba(124,106,255,0.15)",borderRadius:8,padding:"2px 8px",fontSize:10,fontWeight:600}}>{label}</span>;
}

function FooterSubVista({ onVolver }) {
  return (
    <div style={{position:"fixed",bottom:90,left:"50%",transform:"translateX(-50%)",zIndex:60,width:"calc(100% - 32px)",maxWidth:340}}>
      <button onClick={onVolver} style={{width:"100%",padding:"8px",borderRadius:12,border:"1px solid rgba(124,106,255,0.25)",background:"rgba(14,12,28,0.9)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",color:"#7c6aff",fontWeight:700,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c6aff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        Volver a Cartelera
      </button>
    </div>
  );
}

// ── CHAT FULLSCREEN ────────────────────────────────────────────────────────────
function ChatFullscreen({ derivacionId, usuario, otroNombre, otroPerfil, onCerrar }) {
  const [msgs, setMsgs] = useState([]);
  const [texto, setTexto] = useState("");
  const endRef = useRef(null);
  const inicial = otroNombre?.[0]?.toUpperCase()||"?";

  useEffect(() => {
    const unsub = onSnapshot(collection(db,`chats_derivacion/${derivacionId}/mensajes`), snap => {
      const data = snap.docs.map(d=>({...d.data(),id:d.id})).sort((a,b)=>(a.creadoEn?.seconds||0)-(b.creadoEn?.seconds||0));
      setMsgs(data);
      setTimeout(()=>endRef.current?.scrollIntoView({behavior:"smooth"}),80);
    });
    return ()=>unsub();
  },[derivacionId]);

  async function enviar() {
    if (!texto.trim()) return;
    await addDoc(collection(db,`chats_derivacion/${derivacionId}/mensajes`),{texto:texto.trim(),autorEmail:usuario.email,autorNombre:usuario.nombre,creadoEn:serverTimestamp()});
    setTexto("");
  }

  return (
    <div style={{position:"fixed",inset:0,background:"#000000",zIndex:5000,display:"flex",flexDirection:"column"}}>
      <div style={{padding:"54px 16px 14px",background:"linear-gradient(180deg,#0a0a14 0%,#000000 100%)",borderBottom:"1px solid rgba(124,106,255,0.15)",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
        <button onClick={onCerrar} style={{background:"none",border:"none",color:"white",fontSize:22,cursor:"pointer",padding:0,display:"flex",alignItems:"center"}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{width:38,height:38,borderRadius:"50%",background:avatarColor(otroNombre||""),overflow:"hidden",border:"1.5px solid rgba(124,106,255,0.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:"white",flexShrink:0}}>
          {otroPerfil?.fotoUrl?<img src={otroPerfil.fotoUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:inicial}
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
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>
  );
}

// ── PILA DE CARTAS ─────────────────────────────────────────────────────────────
function CarteleraLoop({ fichas, usuario, onInteresa, onArchivar, onQuitarInteres }) {
  const [idx, setIdx] = useState(0);
  const [animando, setAnimando] = useState(null);
  const startX = useRef(null);
  const startY = useRef(null);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [swipeDir, setSwipeDir] = useState(null);
  const THRESHOLD_H = 80;
  const THRESHOLD_V = 60;

  // Bloquear scroll de la página
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    return () => {
      document.body.style.overflow = prev;
      document.body.style.position = "";
      document.body.style.width = "";
    };
  }, []);

  useEffect(() => { if (fichas.length > 0 && idx >= fichas.length) setIdx(0); }, [fichas.length]);

  if (fichas.length === 0) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"60px 20px",textAlign:"center",minHeight:"45vh"}}>
      <div style={{fontSize:56,marginBottom:16}}>📌</div>
      <h3 style={{margin:"0 0 8px",color:"white",fontSize:18,fontWeight:800}}>Cartelera al día</h3>
      <p style={{margin:0,color:"#4a5270",fontSize:13}}>No hay fichas nuevas por ahora.</p>
    </div>
  );

  const total = fichas.length;
  const fichaActual = fichas[idx % total];
  const fichaDetras1 = fichas[(idx + 1) % total];
  const yaInteresado = fichaActual.interesadosEmails?.includes(usuario.email);

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
      setOffsetY(dy); setOffsetX(0); setSwipeDir(null);
    }
  }
  function onTouchEnd() {
    if (Math.abs(offsetX) > THRESHOLD_H) triggerH(offsetX > 0 ? "right" : "left");
    else if (offsetY > THRESHOLD_V) triggerV("down");
    else if (offsetY < -THRESHOLD_V) triggerV("up");
    else { setOffsetX(0); setOffsetY(0); setSwipeDir(null); }
    startX.current = null; startY.current = null;
  }

  function triggerH(dir) {
    setAnimando({ dir });
    setTimeout(() => {
      if (dir === "right") {
        onInteresa(fichaActual);
        setIdx(i => (i + 1) % total);
      } else {
        onArchivar(fichaActual);
      }
      setOffsetX(0); setOffsetY(0); setSwipeDir(null); setAnimando(null);
    }, 320);
  }

  function triggerV(dir) {
    setAnimando({ dir });
    setTimeout(() => {
      if (dir === "up") setIdx(i => (i + 1) % total);
      else setIdx(i => (i - 1 + total) % total);
      setOffsetX(0); setOffsetY(0); setSwipeDir(null); setAnimando(null);
    }, 220);
  }

  const flyX = animando?.dir === "right" ? 480 : animando?.dir === "left" ? -480 : offsetX;
  const flyY = animando?.dir === "up" ? -160 : animando?.dir === "down" ? 160 : offsetY;
  const rot = offsetX * 0.04;
  const opacidad = (animando?.dir === "left" || animando?.dir === "right") ? 0 : Math.max(0.3, 1 - Math.abs(offsetX) / 260 - Math.abs(offsetY) / 260);
  const isTransitioning = !!animando;
  const borderColor = swipeDir === "right" ? "rgba(102,187,106,0.6)" : swipeDir === "left" ? "rgba(239,83,80,0.6)" : "rgba(124,106,255,0.3)";

  return (
    <div style={{padding:"12px 16px 10px"}}>
      {/* Hints */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,padding:"0 4px"}}>
        <div style={{display:"flex",alignItems:"center",gap:6,opacity:swipeDir==="left"?1:0.3,transition:"opacity 0.2s"}}>
          <div style={{width:26,height:26,borderRadius:"50%",background:"rgba(239,83,80,0.15)",border:"1.5px solid #ef5350",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:11,color:"#ef5350"}}>✕</span></div>
          <span style={{fontSize:9,color:"#ef5350",fontWeight:600}}>Archivar</span>
        </div>
        <span style={{fontSize:10,color:"#4a5270"}}>{idx % total + 1} / {total}</span>
        <div style={{display:"flex",alignItems:"center",gap:6,opacity:swipeDir==="right"?1:0.3,transition:"opacity 0.2s"}}>
          <span style={{fontSize:9,color:"#66bb6a",fontWeight:600}}>Me interesa</span>
          <div style={{width:26,height:26,borderRadius:"50%",background:"rgba(102,187,106,0.15)",border:"1.5px solid #66bb6a",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:11,color:"#66bb6a"}}>♥</span></div>
        </div>
      </div>

      {/* PILA */}
      <div style={{position:"relative",height:420,perspective:"1000px"}}>
        {total > 2 && <div style={{position:"absolute",inset:"0 8px",borderRadius:22,background:"rgba(14,12,28,0.4)",border:"1px solid rgba(124,106,255,0.06)",transform:"translateY(20px) scale(0.88)",zIndex:1,transition:"transform 0.3s ease"}}/>}
        {total > 1 && (
          <div style={{position:"absolute",inset:"0 4px",borderRadius:22,background:"rgba(14,12,28,0.65)",border:"1px solid rgba(124,106,255,0.1)",transform:`translateY(${isTransitioning?"0px":"10px"}) scale(${isTransitioning?"1":"0.94"})`,zIndex:2,transition:"transform 0.3s ease",overflow:"hidden"}}>
            <div style={{height:3,background:"rgba(124,106,255,0.2)"}}/>
            <div style={{padding:"14px 16px",opacity:0.4}}>
              <div style={{fontSize:14,fontWeight:800,color:"white"}}>📌 {fichaDetras1?.especialidad}</div>
              <div style={{fontSize:11,color:"#4a5270",marginTop:2}}>por {fichaDetras1?.derivadoPor}</div>
            </div>
          </div>
        )}
        {/* Carta activa */}
        <div
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
          style={{position:"absolute",inset:0,zIndex:3,background:"rgba(14,12,28,0.97)",borderRadius:22,overflow:"hidden",border:`1px solid ${borderColor}`,transform:`translate(${flyX}px,${flyY}px) rotate(${rot}deg)`,opacity:opacidad,transition:isTransitioning?"transform 0.32s cubic-bezier(0.4,0,0.2,1),opacity 0.32s ease":"border 0.15s",cursor:"grab",userSelect:"none",touchAction:"none",boxShadow:"0 16px 48px rgba(0,0,0,0.5)"}}>

          <div style={{height:3,background:yaInteresado?"linear-gradient(90deg,#38a169,#2d8a5e)":"linear-gradient(90deg,#667eea,#764ba2)"}}/>

          {yaInteresado && (
            <div style={{position:"absolute",top:14,right:14,zIndex:5,background:"rgba(56,161,105,0.85)",borderRadius:8,padding:"3px 10px",border:"2px solid #38a169",transform:"rotate(12deg)"}}>
              <span style={{fontSize:11,fontWeight:800,color:"white"}}>♥ ME INTERESA</span>
            </div>
          )}
          {swipeDir === "right" && !yaInteresado && (
            <div style={{position:"absolute",top:16,left:16,zIndex:5,background:"rgba(102,187,106,0.9)",borderRadius:8,padding:"4px 12px",border:"2px solid #66bb6a",transform:"rotate(-12deg)"}}>
              <span style={{fontSize:13,fontWeight:800,color:"white"}}>♥ ME INTERESA</span>
            </div>
          )}
          {swipeDir === "left" && (
            <div style={{position:"absolute",top:16,right:16,zIndex:5,background:"rgba(239,83,80,0.9)",borderRadius:8,padding:"4px 12px",border:"2px solid #ef5350",transform:"rotate(12deg)"}}>
              <span style={{fontSize:13,fontWeight:800,color:"white"}}>ARCHIVAR ✕</span>
            </div>
          )}

          <div style={{padding:16,height:"calc(100% - 3px)",display:"flex",flexDirection:"column",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:42,height:42,borderRadius:"50%",background:"linear-gradient(135deg,#667eea22,#764ba222)",border:"1px solid rgba(124,106,255,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:19}}>📌</div>
                <div>
                  <div style={{fontSize:15,fontWeight:800,color:"white"}}>{fichaActual.especialidad}</div>
                  <div style={{fontSize:11,color:"#4a5270"}}>por {fichaActual.derivadoPor}</div>
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <span style={{fontSize:9,color:"#4a5270"}}>{tiempoRelativo(fichaActual.creadoEn?.seconds)}</span>
                {yaInteresado && <div style={{marginTop:3,fontSize:9,background:"rgba(102,187,106,0.15)",color:"#66bb6a",borderRadius:6,padding:"1px 6px",fontWeight:700}}>Ya te postulaste</div>}
              </div>
            </div>
            {fichaActual.nota && <p style={{margin:"0 0 12px",fontSize:13,color:"#e2e8f0",lineHeight:1.6,padding:"10px 12px",background:"rgba(124,106,255,0.06)",borderRadius:10,borderLeft:"2px solid rgba(124,106,255,0.4)"}}>&ldquo;{fichaActual.nota}&rdquo;</p>}
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
              <Tag label={`📍 ${fichaActual.modalidad}`}/>
              {fichaActual.genero !== "Indistinto" && <Tag label={`${fichaActual.genero==="Femenino"?"👩":"👨"} ${fichaActual.genero}`}/>}
              {fichaActual.edad !== "Indistinto" && <Tag label={`🎂 ${fichaActual.edad}`}/>}
              {fichaActual.dias?.length > 0 && <Tag label={`📅 ${fichaActual.dias.join(" · ")}`}/>}
              {fichaActual.franjas?.length > 0 && <Tag label={`⏰ ${fichaActual.franjas.join(" · ")}`}/>}
            </div>
            <div style={{display:"flex",gap:10,marginTop:"auto"}}>
              <button onClick={() => triggerH("left")} style={{flex:1,padding:"11px",borderRadius:14,border:"1px solid rgba(239,83,80,0.3)",background:"rgba(239,83,80,0.08)",color:"#ef5350",fontWeight:700,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>✕ Archivar</button>
              <button onClick={() => triggerH("right")} style={{flex:2,padding:"11px",borderRadius:14,border:"none",background:yaInteresado?"rgba(56,161,105,0.15)":"linear-gradient(135deg,#38a169,#2d8a5e)",color:yaInteresado?"#66bb6a":"white",fontWeight:700,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>♥ {yaInteresado?"Ya te postulaste":"Me interesa"}</button>
            </div>
          </div>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,marginTop:10,opacity:0.3}}>
        <span style={{fontSize:9,color:"#a0a8c0"}}>↑ ↓ navegar · ← → responder</span>
      </div>
    </div>
  );
}

// ── VISTA ARCHIVO ──────────────────────────────────────────────────────────────
// Funciona como papelera: el usuario ve sus archivadas, puede restaurar o eliminar definitivamente (solo admin borra de Firestore)
function VistaArchivo({ archivadas, setArchivadas, derivaciones, usuario, esAdmin, onVolver, onEliminarDefinitivo }) {
  const fichasArchivadas = derivaciones.filter(d => archivadas.includes(d.id));

  function restaurar(id) {
    const nueva = archivadas.filter(a => a !== id);
    setArchivadas(nueva);
    try { localStorage.setItem(`grins_arch_${usuario?.email}`, JSON.stringify(nueva)); } catch {}
  }

  function eliminarLocal(id) {
    // Solo desaparece para este usuario (queda archivada pero oculta también de archivo)
    const nueva = archivadas.filter(a => a !== id);
    const eliminadasKey = `grins_elim_${usuario?.email}`;
    try {
      const elim = JSON.parse(localStorage.getItem(eliminadasKey)||"[]");
      localStorage.setItem(eliminadasKey, JSON.stringify([...elim, id]));
      localStorage.setItem(`grins_arch_${usuario?.email}`, JSON.stringify(nueva));
    } catch {}
    setArchivadas(nueva);
  }

  return (
    <div style={{padding:"16px 14px 180px"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <span style={{fontSize:15,fontWeight:800,color:"white"}}>📁 Archivo</span>
        <span style={{background:"rgba(124,106,255,0.12)",color:"#7c6aff",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700}}>{fichasArchivadas.length}</span>
      </div>
      {fichasArchivadas.length === 0 && <div style={{textAlign:"center",padding:"32px 0"}}><div style={{fontSize:40,marginBottom:10}}>📁</div><p style={{margin:0,color:"#4a5270",fontSize:13}}>El archivo está vacío.</p></div>}
      {fichasArchivadas.map(d => (
        <div key={d.id} style={{background:"rgba(14,12,28,0.7)",borderRadius:14,padding:"12px 14px",marginBottom:10,border:"1px solid rgba(255,255,255,0.06)",opacity:0.8}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"#4a5270"}}>📌 {d.especialidad}</div>
              <div style={{fontSize:10,color:"#3a3a5a",marginTop:2}}>por {d.derivadoPor} · {tiempoRelativo(d.creadoEn?.seconds)}</div>
            </div>
            <span style={{fontSize:9,background:"rgba(255,255,255,0.05)",color:"#4a5270",borderRadius:6,padding:"2px 8px",fontWeight:600}}>Archivada</span>
          </div>
          {d.nota && <p style={{margin:"0 0 10px",fontSize:12,color:"#3a3a5a",fontStyle:"italic"}}>"{d.nota.slice(0,80)}{d.nota.length>80?"…":""}"</p>}
          <div style={{display:"flex",gap:8}}>
            {/* Restaurar — vuelve a la cartelera */}
            <button onClick={() => restaurar(d.id)} style={{flex:1,padding:"7px",borderRadius:10,border:"1px solid rgba(124,106,255,0.2)",background:"rgba(124,106,255,0.08)",color:"#7c6aff",fontWeight:600,fontSize:11,cursor:"pointer"}}>↩ Restaurar</button>
            {/* Eliminar solo para mí */}
            <button onClick={() => eliminarLocal(d.id)} style={{flex:1,padding:"7px",borderRadius:10,border:"1px solid rgba(255,255,255,0.06)",background:"transparent",color:"#4a5270",fontWeight:600,fontSize:11,cursor:"pointer"}}>🗑 Quitar</button>
            {/* Admin: borrar para todos */}
            {esAdmin && (
              <button onClick={() => onEliminarDefinitivo(d.id)} style={{flex:1,padding:"7px",borderRadius:10,border:"1px solid rgba(239,83,80,0.25)",background:"rgba(239,83,80,0.08)",color:"#ef5350",fontWeight:600,fontSize:11,cursor:"pointer"}}>✕ Todos</button>
            )}
          </div>
        </div>
      ))}
      <FooterSubVista onVolver={onVolver}/>
    </div>
  );
}

// ── VISTA ME INTERESA — con swipe izquierda para quitar interés ────────────────
function VistaMeInteresa({ archivadas, derivaciones, usuario, onVolver, onQuitarInteres }) {
  const fichasInteresa = derivaciones.filter(d =>
    d.interesadosEmails?.includes(usuario.email) && !archivadas.includes(d.id)
  );

  // Swipe para quitar interés
  const startX = useRef(null);
  const [swipingId, setSwipingId] = useState(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  function onTouchStartCard(e, id) {
    startX.current = e.touches[0].clientX;
    setSwipingId(id);
  }
  function onTouchMoveCard(e) {
    if (!startX.current) return;
    const dx = e.touches[0].clientX - startX.current;
    if (dx < 0) setSwipeOffset(dx); // solo izquierda
  }
  function onTouchEndCard(id) {
    if (swipeOffset < -80) onQuitarInteres(id);
    startX.current = null;
    setSwipingId(null);
    setSwipeOffset(0);
  }

  return (
    <div style={{padding:"16px 14px 180px"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <span style={{fontSize:15,fontWeight:800,color:"white"}}>♥ Me interesa</span>
        <span style={{background:"rgba(102,187,106,0.15)",color:"#66bb6a",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700}}>{fichasInteresa.length}</span>
      </div>
      {fichasInteresa.length === 0 && <div style={{textAlign:"center",padding:"32px 0"}}><div style={{fontSize:40,marginBottom:10}}>♥</div><p style={{margin:0,color:"#4a5270",fontSize:13}}>Todavía no marcaste ninguna ficha como interesante.</p></div>}
      {fichasInteresa.map(d => {
        const isSwiping = swipingId === d.id;
        const offset = isSwiping ? swipeOffset : 0;
        const showHint = offset < -30;
        return (
          <div key={d.id} style={{position:"relative",marginBottom:10,overflow:"hidden",borderRadius:14}}>
            {/* Fondo de acción */}
            <div style={{position:"absolute",inset:0,background:"rgba(239,83,80,0.15)",display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:20,borderRadius:14}}>
              <span style={{fontSize:12,color:"#ef5350",fontWeight:700,opacity:showHint?1:0,transition:"opacity 0.15s"}}>← Quitar interés</span>
            </div>
            <div
              onTouchStart={e => onTouchStartCard(e, d.id)}
              onTouchMove={onTouchMoveCard}
              onTouchEnd={() => onTouchEndCard(d.id)}
              style={{background:"rgba(14,12,28,0.9)",borderRadius:14,padding:"14px",border:"1px solid rgba(102,187,106,0.2)",transform:`translateX(${offset}px)`,transition:isSwiping?"none":"transform 0.3s ease",touchAction:"pan-y"}}>
              <div style={{height:3,background:"linear-gradient(90deg,#38a169,transparent)",borderRadius:2,marginBottom:10}}/>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div>
                  <div style={{fontSize:14,fontWeight:800,color:"white"}}>📌 {d.especialidad}</div>
                  <div style={{fontSize:11,color:"#4a5270",marginTop:2}}>por {d.derivadoPor} · {tiempoRelativo(d.creadoEn?.seconds)}</div>
                </div>
                <span style={{fontSize:9,background:"rgba(102,187,106,0.12)",color:"#66bb6a",borderRadius:6,padding:"2px 8px",fontWeight:700,border:"1px solid rgba(102,187,106,0.25)"}}>
                  {d.estado==="asignada"&&d.asignadoEmail===usuario.email?"✓ Asignada a vos":d.estado==="asignada"?"Asignada a otro":"♥ Te interesa"}
                </span>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:10}}>
                <Tag label={`📍 ${d.modalidad}`}/>
                {d.dias?.length>0&&<Tag label={`📅 ${d.dias.slice(0,2).join(" · ")}`}/>}
                {d.franjas?.length>0&&<Tag label={`⏰ ${d.franjas.join(" · ")}`}/>}
              </div>
              {d.nota&&<p style={{margin:"0 0 10px",fontSize:12,color:"#a0a8c0",fontStyle:"italic",lineHeight:1.5}}>"{d.nota.slice(0,100)}{d.nota.length>100?"…":""}"</p>}
              {/* Botón para quitar interés */}
              <button onClick={() => onQuitarInteres(d.id)} style={{width:"100%",padding:"8px",borderRadius:10,border:"1px solid rgba(239,83,80,0.2)",background:"rgba(239,83,80,0.06)",color:"#ef5350",fontWeight:600,fontSize:11,cursor:"pointer"}}>✕ Quitar interés</button>
            </div>
          </div>
        );
      })}
      <FooterSubVista onVolver={onVolver}/>
    </div>
  );
}

// ── MIS PUBLICACIONES ──────────────────────────────────────────────────────────
function MisPublicaciones({ derivaciones, usuario, perfiles, esAdmin, onAsignar, onCerrar, onEliminar, onAbrirChat, onVolver }) {
  const [expandida, setExpandida] = useState(null);
  const [matchModal, setMatchModal] = useState(null);
  const mias = derivaciones.filter(d => d.derivadoPorEmail === usuario.email);

  async function handleAsignar(d, nombre, email) {
    await onAsignar(d, nombre, email);
    const p = perfiles.find(x => x.email === email);
    setMatchModal({ derivacion:d, asignado:{nombre,email,fotoUrl:p?.fotoUrl,especialidad:p?.especialidad} });
    setExpandida(null);
  }

  return (
    <div style={{padding:"16px 14px 180px"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <span style={{fontSize:15,fontWeight:800,color:"white"}}>📋 Mis fichas</span>
        <span style={{background:"rgba(124,106,255,0.12)",color:"#7c6aff",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700}}>{mias.length}</span>
      </div>

      {matchModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
          <div style={{background:"rgba(14,12,28,0.98)",borderRadius:24,padding:"32px 24px",width:"100%",maxWidth:360,textAlign:"center",border:"1px solid rgba(124,106,255,0.3)"}}>
            <div style={{fontSize:32,marginBottom:20}}>🎉</div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",marginBottom:20}}>
              <div style={{width:64,height:64,borderRadius:"50%",background:avatarColor(usuario.nombre),overflow:"hidden",border:"3px solid rgba(124,106,255,0.5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:800,color:"white"}}>
                {usuario.fotoUrl?<img src={usuario.fotoUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:usuario.nombre?.[0]?.toUpperCase()}
              </div>
              <div style={{display:"flex",alignItems:"center",margin:"0 4px"}}>
                <div style={{width:20,borderTop:"1.5px dashed rgba(124,106,255,0.4)"}}/>
                <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#667eea,#764ba2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>✓</div>
                <div style={{width:20,borderTop:"1.5px dashed rgba(124,106,255,0.4)"}}/>
              </div>
              <div style={{width:64,height:64,borderRadius:"50%",background:avatarColor(matchModal.asignado.nombre),overflow:"hidden",border:"3px solid rgba(124,106,255,0.5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:800,color:"white"}}>
                {matchModal.asignado.fotoUrl?<img src={matchModal.asignado.fotoUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:matchModal.asignado.nombre?.[0]?.toUpperCase()}
              </div>
            </div>
            <h2 style={{margin:"0 0 8px",fontSize:20,fontWeight:800,color:"white"}}>¡Ficha asignada!</h2>
            <p style={{margin:"0 0 20px",fontSize:14,color:"#a0a8c0",lineHeight:1.5}}>Vos y <strong style={{color:"white"}}>{matchModal.asignado.nombre}</strong> están conectados.</p>
            <button onClick={()=>setMatchModal(null)} style={{width:"100%",padding:13,borderRadius:14,border:"none",background:"linear-gradient(135deg,#667eea,#764ba2)",color:"white",fontWeight:800,fontSize:14,cursor:"pointer"}}>¡Genial!</button>
          </div>
        </div>
      )}

      {mias.length === 0 && <div style={{textAlign:"center",padding:"32px 20px"}}><div style={{fontSize:40,marginBottom:10}}>📋</div><p style={{margin:0,color:"#4a5270",fontSize:13}}>No publicaste fichas aún.</p></div>}

      {mias.map(d => {
        const sinInt = !d.interesados?.length;
        const conInt = d.interesados?.length > 0 && d.estado !== "asignada";
        const asignada = d.estado === "asignada";
        const cerrada = d.estado === "cerrada";
        const isExp = expandida === d.id;
        return (
          <div key={d.id} style={{background:"rgba(14,12,28,0.9)",borderRadius:18,marginBottom:12,overflow:"hidden",border:`1px solid ${asignada?"rgba(102,187,106,0.3)":conInt?"rgba(124,106,255,0.35)":"rgba(124,106,255,0.12)"}`}}>
            <div style={{height:3,background:asignada?"linear-gradient(90deg,#38a169,#2d8a5e)":conInt?"linear-gradient(90deg,#667eea,#764ba2)":cerrada?"rgba(255,255,255,0.08)":"rgba(124,106,255,0.2)"}}/>
            <div style={{padding:"14px 16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div>
                  <div style={{fontSize:15,fontWeight:800,color:cerrada?"#4a5270":"white"}}>📌 {d.especialidad}</div>
                  <div style={{fontSize:10,color:"#4a5270",marginTop:2}}>{tiempoRelativo(d.creadoEn?.seconds)} · {d.modalidad}</div>
                </div>
                <span style={{fontSize:10,fontWeight:700,borderRadius:20,padding:"3px 10px",background:asignada?"rgba(102,187,106,0.12)":conInt?"rgba(124,106,255,0.15)":"rgba(255,255,255,0.05)",color:asignada?"#66bb6a":conInt?"#a78bfa":"#4a5270",border:`1px solid ${asignada?"rgba(102,187,106,0.3)":conInt?"rgba(124,106,255,0.3)":"rgba(255,255,255,0.08)"}`}}>
                  {asignada?"✓ Asignada":conInt?`${d.interesados.length} postulante${d.interesados.length>1?"s":""}`:cerrada?"Cerrada":"Sin postulantes"}
                </span>
              </div>
              {sinInt&&!cerrada&&<div style={{padding:"10px 12px",background:"rgba(255,255,255,0.03)",borderRadius:10,marginBottom:10,border:"1px dashed rgba(255,255,255,0.06)"}}><p style={{margin:0,fontSize:12,color:"#4a5270",fontStyle:"italic"}}>Aún sin postulantes.</p></div>}
              {conInt && (
                <button onClick={()=>setExpandida(isExp?null:d.id)} style={{width:"100%",background:"transparent",border:"none",cursor:"pointer",padding:0,marginBottom:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"rgba(124,106,255,0.06)",borderRadius:12,border:"1px solid rgba(124,106,255,0.15)"}}>
                    <div style={{display:"flex"}}>
                      {(d.interesadosEmails||[]).slice(0,3).map((email,i) => {
                        const p=perfiles.find(x=>x.email===email); const nombre=d.interesados[i]||email;
                        return <div key={email} style={{width:32,height:32,borderRadius:"50%",background:avatarColor(nombre),overflow:"hidden",border:"2px solid rgba(0,0,0,0.5)",marginLeft:i>0?-8:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"white"}}>{p?.fotoUrl?<img src={p.fotoUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:nombre[0]?.toUpperCase()}</div>;
                      })}
                    </div>
                    <span style={{fontSize:12,color:"#a0a8c0",flex:1,textAlign:"left"}}>Ver postulantes</span>
                    <span style={{fontSize:14,color:"#7c6aff"}}>{isExp?"▲":"▼"}</span>
                  </div>
                </button>
              )}
              {isExp && conInt && (
                <div style={{marginBottom:10}}>
                  {(d.interesadosEmails||[]).map((email,idx) => {
                    const p=perfiles.find(x=>x.email===email); const nombre=d.interesados[idx]||email;
                    return (
                      <div key={email} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"rgba(14,12,28,0.8)",borderRadius:14,marginBottom:8,border:"1px solid rgba(124,106,255,0.12)"}}>
                        <div style={{width:44,height:44,borderRadius:"50%",background:avatarColor(nombre),overflow:"hidden",border:"2px solid rgba(124,106,255,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:800,color:"white",flexShrink:0}}>
                          {p?.fotoUrl?<img src={p.fotoUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:nombre[0]?.toUpperCase()}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:700,fontSize:13,color:"white"}}>{nombre}</div>
                          {p?.especialidad&&<div style={{fontSize:11,color:"#7c6aff",marginTop:1}}>{p.especialidad}</div>}
                          {p?.bio&&<div style={{fontSize:11,color:"#4a5270",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.bio}</div>}
                        </div>
                        <button onClick={()=>handleAsignar(d,nombre,email)} style={{padding:"8px 14px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#38a169,#2d8a5e)",color:"white",fontWeight:700,fontSize:11,cursor:"pointer",flexShrink:0}}>Designar</button>
                      </div>
                    );
                  })}
                </div>
              )}
              {asignada && (
                <div style={{display:"flex",gap:8,marginBottom:10}}>
                  <div style={{flex:1,padding:"10px 12px",background:"rgba(102,187,106,0.08)",borderRadius:10,border:"1px solid rgba(102,187,106,0.2)",display:"flex",alignItems:"center",gap:8}}>
                    <span>🔗</span><span style={{fontSize:12,color:"#66bb6a",fontWeight:600}}>Asignada a {d.asignadoA}</span>
                  </div>
                  <button onClick={()=>onAbrirChat(d.id,d.asignadoA,d.asignadoEmail)} style={{padding:"0 14px",borderRadius:10,border:"1px solid rgba(124,106,255,0.25)",background:"rgba(124,106,255,0.1)",color:"#a78bfa",fontWeight:700,fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>💬 Chat</button>
                </div>
              )}
              <div style={{display:"flex",gap:8}}>
                {!cerrada&&!asignada&&<button onClick={()=>onCerrar(d)} style={{flex:1,padding:"8px",borderRadius:10,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"#4a5270",fontWeight:600,fontSize:11,cursor:"pointer"}}>Cerrar</button>}
                {esAdmin&&<button onClick={()=>onEliminar(d.id)} style={{flex:1,padding:"8px",borderRadius:10,border:"1px solid rgba(239,83,80,0.25)",background:"rgba(239,83,80,0.06)",color:"#ef5350",fontWeight:600,fontSize:11,cursor:"pointer"}}>🗑 Eliminar</button>}
              </div>
            </div>
          </div>
        );
      })}
      <FooterSubVista onVolver={onVolver}/>
    </div>
  );
}

// ── CONEXIONES ─────────────────────────────────────────────────────────────────
function Conexiones({ derivaciones, usuario, perfiles, chatInicial, onChatInicialUsado, onAbrirChat }) {
  const [filtro, setFiltro] = useState("todas");
  const [perfilVista, setPerfilVista] = useState(null);
  const conexiones = derivaciones.filter(d => d.estado==="asignada"&&(d.derivadoPorEmail===usuario.email||d.asignadoEmail===usuario.email));

  useEffect(() => {
    if (!chatInicial) return;
    const c = conexiones.find(d => d.derivadoPorEmail===chatInicial||d.asignadoEmail===chatInicial);
    if (c) {
      const otroEmail = c.derivadoPorEmail===usuario.email?c.asignadoEmail:c.derivadoPorEmail;
      const otroNombre = c.derivadoPorEmail===usuario.email?c.asignadoA:c.derivadoPor;
      onAbrirChat(c.id, otroNombre, otroEmail);
    }
    onChatInicialUsado?.();
  }, [chatInicial, conexiones]);

  const filtradas = conexiones.filter(d => {
    if (filtro==="derive") return d.derivadoPorEmail===usuario.email;
    if (filtro==="recibi") return d.asignadoEmail===usuario.email;
    return true;
  });

  if (perfilVista) {
    const ini = perfilVista.nombre?.[0]?.toUpperCase()||"?";
    return (
      <div style={{padding:"16px 14px 100px"}}>
        <button onClick={()=>setPerfilVista(null)} style={{background:"none",border:"none",color:"#7c6aff",cursor:"pointer",fontSize:13,fontWeight:600,marginBottom:14,display:"flex",alignItems:"center",gap:6,padding:0}}>← Volver</button>
        <div style={{background:"rgba(14,12,28,0.9)",borderRadius:20,overflow:"hidden",border:"1px solid rgba(124,106,255,0.2)"}}>
          <div style={{background:"linear-gradient(180deg,#0a0a18,#0d0d20)",padding:"28px 20px 20px",textAlign:"center"}}>
            <div style={{width:80,height:80,borderRadius:"50%",background:avatarColor(perfilVista.nombre),overflow:"hidden",border:"3px solid rgba(124,106,255,0.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,fontWeight:800,color:"white",margin:"0 auto 12px"}}>
              {perfilVista.fotoUrl?<img src={perfilVista.fotoUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:ini}
            </div>
            <h2 style={{margin:"0 0 4px",fontSize:20,fontWeight:800,color:"white"}}>{perfilVista.nombre}</h2>
            {perfilVista.especialidad&&<div style={{fontSize:13,color:"#7c6aff",fontWeight:600,marginBottom:8}}>{perfilVista.especialidad}</div>}
            <span style={{fontSize:11,color:"#66bb6a",background:"rgba(102,187,106,0.12)",borderRadius:20,padding:"3px 12px",border:"1px solid rgba(102,187,106,0.3)"}}>🔗 Conexión activa</span>
          </div>
          <div style={{padding:"16px 20px"}}>
            {perfilVista.bio&&<div style={{marginBottom:14}}><div style={{fontSize:10,color:"#4a5270",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Bio</div><p style={{margin:0,fontSize:13,color:"#a0a8c0",lineHeight:1.6}}>{perfilVista.bio}</p></div>}
            {perfilVista.telefono&&<div style={{marginBottom:14}}><a href={`tel:${perfilVista.telefono}`} style={{fontSize:13,color:"#4fc3f7",textDecoration:"none",fontWeight:600}}>📞 {perfilVista.telefono}</a></div>}
            <a href={`mailto:${perfilVista.email}`} style={{display:"block",textAlign:"center",background:"rgba(124,106,255,0.1)",borderRadius:12,padding:"10px 16px",border:"1px solid rgba(124,106,255,0.2)",textDecoration:"none",color:"#7c6aff",fontSize:13,fontWeight:600}}>✉ Enviar email</a>
          </div>
        </div>
      </div>
    );
  }

  if (conexiones.length===0) return <div style={{padding:"32px 20px",textAlign:"center"}}><div style={{fontSize:40,marginBottom:10}}>🔗</div><p style={{margin:0,color:"#4a5270",fontSize:13}}>Aún no tenés conexiones activas.</p></div>;

  return (
    <div style={{padding:"12px 14px 20px"}}>
      <div style={{display:"flex",gap:6,marginBottom:14}}>
        {[["todas","Todas"],["derive","Derivé"],["recibi","Recibí"]].map(([v,l])=>(
          <button key={v} onClick={()=>setFiltro(v)} style={{padding:"6px 14px",borderRadius:20,border:`1px solid ${filtro===v?"#7c6aff":"rgba(124,106,255,0.2)"}`,background:filtro===v?"linear-gradient(135deg,#667eea,#764ba2)":"transparent",color:filtro===v?"white":"#a0a8c0",fontSize:11,fontWeight:600,cursor:"pointer"}}>{l}</button>
        ))}
      </div>
      {filtradas.map(d => {
        const dp=perfiles.find(p=>p.email===d.derivadoPorEmail);
        const ap=perfiles.find(p=>p.email===d.asignadoEmail);
        const otroEmail=d.derivadoPorEmail===usuario.email?d.asignadoEmail:d.derivadoPorEmail;
        const otroNombre=d.derivadoPorEmail===usuario.email?d.asignadoA:d.derivadoPor;
        return (
          <div key={d.id} style={{background:"rgba(14,12,28,0.9)",borderRadius:18,marginBottom:12,overflow:"hidden",border:"1px solid rgba(102,187,106,0.2)"}}>
            <div style={{height:3,background:"linear-gradient(90deg,#38a169,#2d8a5e)"}}/>
            <div style={{padding:"16px 16px 12px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:0,marginBottom:14}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,cursor:"pointer"}} onClick={()=>{if(dp)setPerfilVista(dp);}}>
                  <div style={{width:52,height:52,borderRadius:"50%",background:avatarColor(d.derivadoPor||""),overflow:"hidden",border:`2px solid ${d.derivadoPorEmail===usuario.email?"rgba(124,106,255,0.6)":"rgba(102,187,106,0.3)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:800,color:"white"}}>
                    {dp?.fotoUrl?<img src={dp.fotoUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:d.derivadoPor?.[0]?.toUpperCase()}
                  </div>
                  <div style={{fontSize:9,color:d.derivadoPorEmail===usuario.email?"#a78bfa":"#4a5270",fontWeight:700,textAlign:"center",maxWidth:60,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.derivadoPorEmail===usuario.email?"Vos":d.derivadoPor}</div>
                  <div style={{fontSize:8,color:"#3a3a5a",fontWeight:600,textTransform:"uppercase",letterSpacing:0.5}}>deriva</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:0,margin:"0 8px",paddingBottom:20}}>
                  <div style={{width:16,height:1,background:"linear-gradient(90deg,rgba(102,187,106,0),rgba(102,187,106,0.6))"}}/>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                    <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#38a169,#2d8a5e)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 10px rgba(102,187,106,0.4)"}}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </div>
                    <div style={{fontSize:7,color:"#38a169",fontWeight:700,textTransform:"uppercase",letterSpacing:0.3}}>asignó</div>
                  </div>
                  <div style={{width:16,height:1,background:"linear-gradient(90deg,rgba(102,187,106,0.6),rgba(102,187,106,0))"}}/>
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,cursor:"pointer"}} onClick={()=>{if(ap)setPerfilVista(ap);}}>
                  <div style={{width:52,height:52,borderRadius:"50%",background:avatarColor(d.asignadoA||""),overflow:"hidden",border:`2px solid ${d.asignadoEmail===usuario.email?"rgba(124,106,255,0.6)":"rgba(102,187,106,0.3)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:800,color:"white"}}>
                    {ap?.fotoUrl?<img src={ap.fotoUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:d.asignadoA?.[0]?.toUpperCase()}
                  </div>
                  <div style={{fontSize:9,color:d.asignadoEmail===usuario.email?"#a78bfa":"#4a5270",fontWeight:700,textAlign:"center",maxWidth:60,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.asignadoEmail===usuario.email?"Vos":d.asignadoA}</div>
                  <div style={{fontSize:8,color:"#3a3a5a",fontWeight:600,textTransform:"uppercase",letterSpacing:0.5}}>recibe</div>
                </div>
              </div>
              <div style={{textAlign:"center",marginBottom:12}}>
                <div style={{fontSize:12,fontWeight:700,color:"white"}}>📌 {d.especialidad}</div>
                <div style={{fontSize:10,color:"#4a5270",marginTop:2}}>Ficha activa · {d.modalidad}</div>
              </div>
              <button onClick={()=>onAbrirChat(d.id,otroNombre,otroEmail)} style={{width:"100%",padding:"10px",borderRadius:12,border:"1px solid rgba(124,106,255,0.2)",background:"rgba(124,106,255,0.08)",color:"#a78bfa",fontWeight:700,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                Chatear con {otroNombre}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── COMPONENTE PRINCIPAL ───────────────────────────────────────────────────────
export default function Derivaciones({ usuario, t, esAdmin, chatInicial, onChatInicialUsado, vistaInicial }) {
  const [derivaciones, setDerivaciones] = useState([]);
  const [perfiles, setPerfiles] = useState([]);
  const [vista, setVista] = useState(vistaInicial||"cartelera");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [chatAbierto, setChatAbierto] = useState(null);
  const [archivadas, setArchivadas] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`grins_arch_${usuario?.email}`)||"[]"); } catch { return []; }
  });
  const [form, setForm] = useState({especialidad:"",otraEspecialidad:"",modalidad:"Ambas",dias:[],franjas:[],genero:"Indistinto",edad:"Indistinto",nota:""});

  useEffect(() => {
    const u1 = onSnapshot(collection(db,"derivaciones"), snap => {
      const data = snap.docs.map(d=>({...d.data(),id:d.id}));
      data.sort((a,b)=>(b.creadoEn?.seconds||0)-(a.creadoEn?.seconds||0));
      setDerivaciones(data);
    });
    const u2 = onSnapshot(collection(db,"usuarios"), snap => { setPerfiles(snap.docs.map(d=>({...d.data(),email:d.id}))); });
    return () => { u1(); u2(); };
  }, []);

  useEffect(() => { if (vistaInicial) setVista(vistaInicial); }, [vistaInicial]);

  function abrirChat(derivacionId, otroNombre, otroEmail) { setChatAbierto({derivacionId,otroNombre,otroEmail}); }
  function toggleArr(arr, val) { return arr.includes(val)?arr.filter(x=>x!==val):[...arr,val]; }

  function archivarLocal(d) {
    const nueva = [...archivadas, d.id];
    setArchivadas(nueva);
    try { localStorage.setItem(`grins_arch_${usuario?.email}`, JSON.stringify(nueva)); } catch {}
  }

  // Actualizar archivadas también en localStorage cuando cambian
  useEffect(() => {
    try { localStorage.setItem(`grins_arch_${usuario?.email}`, JSON.stringify(archivadas)); } catch {}
  }, [archivadas]);

  async function meInteresa(d) {
    if (d.derivadoPorEmail===usuario.email||d.interesadosEmails?.includes(usuario.email)) return;
    await updateDoc(doc(db,"derivaciones",d.id),{
      interesados:[...(d.interesados||[]),usuario.nombre],
      interesadosEmails:[...(d.interesadosEmails||[]),usuario.email],
      estado:"con_interesados"
    });
  }

  async function quitarInteres(id) {
    const d = derivaciones.find(x=>x.id===id);
    if (!d) return;
    await updateDoc(doc(db,"derivaciones",id),{
      interesados:(d.interesados||[]).filter(n=>n!==usuario.nombre),
      interesadosEmails:(d.interesadosEmails||[]).filter(e=>e!==usuario.email),
      estado:(d.interesados||[]).length<=1?"disponible":"con_interesados"
    });
  }

  async function asignar(d, nombre, email) {
    await updateDoc(doc(db,"derivaciones",d.id),{asignadoA:nombre,asignadoEmail:email,estado:"asignada"});
    await addDoc(collection(db,"notificaciones"),{para:email,de:usuario.email,deNombre:usuario.nombre,tipo:"derivacion_asignada",derivacionId:d.id,especialidad:d.especialidad,leida:false,creadoEn:serverTimestamp()});
    await addDoc(collection(db,"notificaciones"),{para:d.derivadoPorEmail,de:email,deNombre:nombre,tipo:"derivacion_match",derivacionId:d.id,especialidad:d.especialidad,leida:false,creadoEn:serverTimestamp()});
  }

  async function cerrar(d) { await updateDoc(doc(db,"derivaciones",d.id),{estado:"cerrada"}); }
  async function eliminar(id) { await deleteDoc(doc(db,"derivaciones",id)); }

  async function publicar() {
    if (!form.especialidad) return;
    const esp = form.especialidad==="Otro"?form.otraEspecialidad||"Otro":form.especialidad;
    await addDoc(collection(db,"derivaciones"),{especialidad:esp,modalidad:form.modalidad,dias:form.dias,franjas:form.franjas,genero:form.genero,edad:form.edad,nota:form.nota.trim(),estado:"disponible",derivadoPor:usuario.nombre,derivadoPorEmail:usuario.email,interesados:[],interesadosEmails:[],asignadoA:null,asignadoEmail:null,creadoEn:serverTimestamp()});
    setForm({especialidad:"",otraEspecialidad:"",modalidad:"Ambas",dias:[],franjas:[],genero:"Indistinto",edad:"Indistinto",nota:""});
    setMostrarForm(false);
  }

  const chip = (label,active,onClick) => (<button key={label} onClick={onClick} style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${active?"#7c6aff":"rgba(124,106,255,0.2)"}`,background:active?"linear-gradient(135deg,#667eea,#764ba2)":"rgba(14,12,28,0.8)",color:active?"white":"#a0a8c0",fontSize:11,fontWeight:600,cursor:"pointer"}}>{label}</button>);
  const inp = {width:"100%",padding:"10px 12px",borderRadius:10,border:"1px solid rgba(124,106,255,0.2)",fontSize:13,marginBottom:12,boxSizing:"border-box",outline:"none",background:"rgba(14,12,28,0.8)",color:"white"};
  const lbl = {display:"block",fontSize:11,fontWeight:700,color:"#a0a8c0",marginBottom:6,textTransform:"uppercase",letterSpacing:.5};

  // Cartelera: fichas de otros + las propias del usuario también aparecen (como vista)
  // Las propias no se pueden postular pero sí se ven
  const fichasCartelera = derivaciones.filter(d =>
    d.estado === "disponible" && !archivadas.includes(d.id)
  );

  if (chatAbierto) {
    const op = perfiles.find(p=>p.email===chatAbierto.otroEmail);
    return <ChatFullscreen derivacionId={chatAbierto.derivacionId} usuario={usuario} otroNombre={chatAbierto.otroNombre} otroPerfil={op} onCerrar={()=>setChatAbierto(null)}/>;
  }

  return (
    <div>
      {/* FORM MODAL */}
      {mostrarForm && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:3000}}>
          <div style={{background:"#0a0a14",borderRadius:"24px 24px 0 0",padding:"20px 20px 40px",width:"100%",maxWidth:520,border:"1px solid rgba(124,106,255,0.2)",maxHeight:"85vh",overflowY:"auto"}}>
            <div style={{width:36,height:4,borderRadius:2,background:"rgba(255,255,255,0.1)",margin:"0 auto 16px"}}/>
            <h3 style={{margin:"0 0 16px",fontSize:15,fontWeight:800,color:"white"}}>Nueva ficha</h3>
            <label style={lbl}>Especialidad requerida</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>{ESPECIALIDADES.map(e=>chip(e,form.especialidad===e,()=>setForm(f=>({...f,especialidad:e}))))}</div>
            {form.especialidad==="Otro"&&<input value={form.otraEspecialidad} onChange={e=>setForm(f=>({...f,otraEspecialidad:e.target.value}))} placeholder="Especificá la especialidad" style={inp}/>}
            <label style={lbl}>Modalidad</label>
            <div style={{display:"flex",gap:6,marginBottom:14}}>{MODALIDADES.map(m=>chip(m,form.modalidad===m,()=>setForm(f=>({...f,modalidad:m}))))}</div>
            <label style={lbl}>Días disponibles</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>{DIAS.map(d=>chip(d,form.dias.includes(d),()=>setForm(f=>({...f,dias:toggleArr(f.dias,d)}))))}</div>
            <label style={lbl}>Franjas horarias</label>
            <div style={{display:"flex",gap:6,marginBottom:14}}>{FRANJAS.map(f=>chip(f,form.franjas.includes(f),()=>setForm(fr=>({...fr,franjas:toggleArr(fr.franjas,f)}))))}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
              <div><label style={lbl}>Género</label><div style={{display:"flex",flexDirection:"column",gap:6}}>{["Indistinto","Femenino","Masculino"].map(g=>chip(g,form.genero===g,()=>setForm(f=>({...f,genero:g}))))}</div></div>
              <div><label style={lbl}>Franja etaria</label><div style={{display:"flex",flexDirection:"column",gap:6}}>{["Indistinto","Joven","Adulto"].map(e=>chip(e,form.edad===e,()=>setForm(f=>({...f,edad:e}))))}</div></div>
            </div>
            <label style={lbl}>Nota clínica (sin datos del paciente)</label>
            <textarea value={form.nota} onChange={e=>setForm(f=>({...f,nota:e.target.value}))} placeholder="Contexto clínico sin datos identificatorios..." rows={3} style={{...inp,resize:"vertical",fontFamily:"inherit"}}/>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setMostrarForm(false)} style={{flex:1,padding:13,borderRadius:12,border:"1px solid rgba(124,106,255,0.2)",background:"transparent",color:"#a0a8c0",fontWeight:600,fontSize:13,cursor:"pointer"}}>Cancelar</button>
              <button onClick={publicar} disabled={!form.especialidad} style={{flex:2,padding:13,borderRadius:12,border:"none",background:form.especialidad?"linear-gradient(135deg,#667eea,#764ba2)":"rgba(255,255,255,0.05)",color:"white",fontWeight:800,fontSize:13,cursor:form.especialidad?"pointer":"not-allowed"}}>Publicar ficha</button>
            </div>
          </div>
        </div>
      )}

      {/* VISTAS */}
      {vista==="cartelera" && <CarteleraLoop fichas={fichasCartelera} usuario={usuario} onInteresa={meInteresa} onArchivar={archivarLocal} onQuitarInteres={quitarInteres}/>}
      {vista==="archivo" && <VistaArchivo archivadas={archivadas} setArchivadas={setArchivadas} derivaciones={derivaciones} usuario={usuario} esAdmin={esAdmin} onVolver={()=>setVista("cartelera")} onEliminarDefinitivo={eliminar}/>}
      {vista==="meInteresa" && <VistaMeInteresa archivadas={archivadas} derivaciones={derivaciones} usuario={usuario} onVolver={()=>setVista("cartelera")} onQuitarInteres={quitarInteres}/>}
      {vista==="misPublicaciones" && <MisPublicaciones derivaciones={derivaciones} usuario={usuario} perfiles={perfiles} esAdmin={esAdmin} onAsignar={asignar} onCerrar={cerrar} onEliminar={eliminar} onAbrirChat={abrirChat} onVolver={()=>setVista("cartelera")}/>}
      {vista==="conexiones" && <Conexiones derivaciones={derivaciones} usuario={usuario} perfiles={perfiles} chatInicial={chatInicial} onChatInicialUsado={onChatInicialUsado} onAbrirChat={abrirChat}/>}

      {/* FOOTER CARTELERA */}
      {vista==="cartelera" && (
        <div style={{position:"fixed",bottom:90,left:"50%",transform:"translateX(-50%)",zIndex:60,display:"flex",flexDirection:"column",alignItems:"center",gap:6,width:"calc(100% - 32px)",maxWidth:340}}>
          <div style={{display:"flex",alignItems:"center",width:"100%",gap:8,background:"rgba(10,10,20,0.92)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",border:"1px solid rgba(124,106,255,0.2)",borderRadius:22,padding:"8px 10px",boxShadow:"0 8px 32px rgba(0,0,0,0.4)"}}>
            <button onClick={()=>setVista("archivo")} style={{flex:1,background:"transparent",border:"none",color:"#a0a8c0",fontSize:10,fontWeight:600,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"4px 0"}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a0a8c0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
              Archivo
            </button>
            <button onClick={()=>setMostrarForm(true)} style={{width:50,height:50,borderRadius:"50%",border:"none",background:"linear-gradient(135deg,#667eea,#764ba2)",color:"white",fontSize:28,fontWeight:300,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 4px 16px rgba(124,106,255,0.5)"}}>+</button>
            <button onClick={()=>setVista("meInteresa")} style={{flex:1,background:"transparent",border:"none",color:"#a0a8c0",fontSize:10,fontWeight:600,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"4px 0"}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a0a8c0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
              Me interesa
            </button>
          </div>
          <button onClick={()=>setVista("misPublicaciones")} style={{width:"100%",background:"rgba(14,12,28,0.85)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",border:"1px solid rgba(124,106,255,0.18)",borderRadius:16,padding:"9px",color:"#a0a8c0",fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a0a8c0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Mis fichas
          </button>
        </div>
      )}
    </div>
  );
}
