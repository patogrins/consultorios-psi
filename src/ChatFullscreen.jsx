import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import { collection, onSnapshot, addDoc, doc, serverTimestamp, setDoc, getDocs, writeBatch } from "firebase/firestore";
import { avatarColor } from "./derivacionesHelpers";

// ── CHAT FULLSCREEN (1:1 y GRUPAL) ────────────────────────────────────────────
export default function ChatFullscreen({ derivacionId, usuario, otroNombre, otroEmail, otroPerfil, onCerrar, esGrupal, tituloGrupo, participantes }) {
  const [msgs, setMsgs] = useState([]);
  const [texto, setTexto] = useState("");
  const [mostrarMenu, setMostrarMenu] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const endRef = useRef(null);
  const esDirecto = !esGrupal && derivacionId?.startsWith("directo_");

  useEffect(() => {
    const unsub = onSnapshot(collection(db,`chats_derivacion/${derivacionId}/mensajes`), snap => {
      setMsgs(snap.docs.map(d=>({...d.data(),id:d.id})).sort((a,b)=>(a.creadoEn?.seconds||0)-(b.creadoEn?.seconds||0)));
      setTimeout(()=>endRef.current?.scrollIntoView({behavior:"smooth"}),80);
    });
    return()=>unsub();
  },[derivacionId]);

  // Registrar este chat directo para que aparezca listado en Conexiones.
  // Se guarda con merge cada vez que se abre — no duplica, solo actualiza
  // quién es el otro participante visto desde cada lado.
  useEffect(() => {
    if (!esDirecto || !otroEmail) return;
    setDoc(doc(db, "chats_directos", derivacionId), {
      participantes: [usuario.email, otroEmail],
      nombres: { [usuario.email]: usuario.nombre, [otroEmail]: otroNombre },
      origen: "red",
      actualizadoEn: serverTimestamp(),
    }, { merge: true }).catch(()=>{});
  }, [esDirecto, derivacionId, usuario.email, otroEmail]);

  async function enviar() {
    if (!texto.trim()) return;
    await addDoc(collection(db,`chats_derivacion/${derivacionId}/mensajes`),{texto:texto.trim(),autorEmail:usuario.email,autorNombre:usuario.nombre,creadoEn:serverTimestamp()});
    setTexto("");
  }

  // Borra todos los mensajes del chat. Si es un chat directo (sin ficha
  // ni asignación detrás), también borra su registro en chats_directos
  // para que deje de aparecer listado en Conexiones.
  async function borrarChat() {
    setBorrando(true);
    try {
      const snap = await getDocs(collection(db, `chats_derivacion/${derivacionId}/mensajes`));
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      if (esDirecto) batch.delete(doc(db, "chats_directos", derivacionId));
      await batch.commit();
    } catch(e) {
      console.error("Error al borrar el chat:", e);
    }
    setBorrando(false);
    onCerrar();
  }

  const ini = otroNombre?.[0]?.toUpperCase()||"?";
  const titulo = esGrupal ? (tituloGrupo||"Chat grupal") : otroNombre;
  const subtitulo = esGrupal ? `${participantes?.length||0} participantes` : (otroPerfil?.especialidad||"");
  return (
    <div style={{position:"fixed",inset:0,background:"#000",zIndex:5000,display:"flex",flexDirection:"column"}}>
      <div style={{padding:"54px 16px 14px",background:"linear-gradient(180deg,#0a0a14,#000)",borderBottom:"1px solid rgba(124,106,255,0.15)",display:"flex",alignItems:"center",gap:12,flexShrink:0,position:"relative"}}>
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
        <button onClick={()=>setMostrarMenu(v=>!v)} style={{background:"none",border:"none",color:"#a0a8c0",fontSize:20,cursor:"pointer",padding:"4px 8px",flexShrink:0}}>⋮</button>
        {mostrarMenu && (
          <>
            <div onClick={()=>setMostrarMenu(false)} style={{position:"fixed",inset:0,zIndex:5100}}/>
            <div style={{position:"absolute",top:"100%",right:16,marginTop:4,background:"#14121f",border:"1px solid rgba(124,106,255,0.2)",borderRadius:12,overflow:"hidden",zIndex:5200,boxShadow:"0 8px 24px rgba(0,0,0,0.5)"}}>
              <button onClick={()=>{setMostrarMenu(false);setConfirmarBorrado(true);}} style={{display:"flex",alignItems:"center",gap:8,padding:"12px 16px",background:"transparent",border:"none",color:"#ef5350",fontSize:13,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef5350" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                {esGrupal ? "Salir y borrar chat" : "Borrar chat"}
              </button>
            </div>
          </>
        )}
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
        <input value={texto} onChange={e=>setTexto(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&enviar()} placeholder={esGrupal?"Escribí al grupo...":"Escribile a "+otroNombre+"..."} style={{flex:1,padding:"11px 16px",borderRadius:24,border:"1px solid rgba(124,106,255,0.2)",background:"rgba(255,255,255,0.05)",color:"white",fontSize:16,outline:"none"}}/>
        <button onClick={enviar} disabled={!texto.trim()} style={{width:42,height:42,borderRadius:"50%",border:"none",background:texto.trim()?"linear-gradient(135deg,#667eea,#764ba2)":"rgba(255,255,255,0.05)",cursor:texto.trim()?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>

      {confirmarBorrado && (
        <div style={{position:"fixed",inset:0,zIndex:5300,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"flex-end",justifyContent:"center"}}
          onClick={e=>{ if(e.target===e.currentTarget && !borrando) setConfirmarBorrado(false); }}>
          <div style={{width:"100%",maxWidth:420,background:"#0a0a14",borderRadius:"22px 22px 0 0",padding:"20px 20px 40px",textAlign:"center",border:"1px solid rgba(124,106,255,0.2)"}}>
            <div style={{width:36,height:4,borderRadius:2,background:"rgba(255,255,255,0.1)",margin:"0 auto 16px"}}/>
            <div style={{fontSize:36,marginBottom:10}}>🗑️</div>
            <h3 style={{margin:"0 0 8px",color:"white",fontSize:16,fontWeight:800}}>{esGrupal ? "¿Salir de este chat grupal?" : "¿Borrar esta conversación?"}</h3>
            <p style={{margin:"0 0 20px",color:"#a0a8c0",fontSize:13,lineHeight:1.5}}>
              {esGrupal
                ? "Se van a borrar todos los mensajes para todos los participantes. Esta acción no se puede deshacer."
                : "Se van a borrar todos los mensajes de esta conversación. Esta acción no se puede deshacer."}
            </p>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setConfirmarBorrado(false)} disabled={borrando} style={{flex:1,padding:12,borderRadius:12,border:"1px solid rgba(124,106,255,0.2)",background:"transparent",cursor:"pointer",fontSize:13,fontWeight:600,color:"#a0a8c0"}}>Cancelar</button>
              <button onClick={borrarChat} disabled={borrando} style={{flex:1,padding:12,borderRadius:12,border:"none",background:"#ef4444",color:"white",cursor:borrando?"default":"pointer",fontSize:13,fontWeight:800,opacity:borrando?0.6:1}}>
                {borrando ? "Borrando..." : "Borrar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
