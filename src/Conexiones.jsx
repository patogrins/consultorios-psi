import { useState, useEffect, useRef } from "react";
import { familiaDeSubtipo, avatarColor, FamiliaChip, Tag, idChatDirecto } from "./derivacionesHelpers";
import PerfilProfesionalModal from "./PerfilProfesionalModal";

// ── FILA CON SWIPE PARA ARCHIVAR — deslizar a la izquierda archiva el chat
// (deja de verse en la lista principal, pero sigue existiendo para todos).
function FilaSwipeable({ onArchivar, children }) {
  const startX = useRef(null);
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);

  function onTS(e) { startX.current = e.touches[0].clientX; setSwiping(true); }
  function onTM(e) {
    if (startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    if (dx < 0) setOffset(dx); // solo hacia la izquierda
  }
  function onTE() {
    if (offset < -80) onArchivar();
    startX.current = null; setSwiping(false); setOffset(0);
  }

  const showHint = offset < -30;

  return (
    <div style={{ position:"relative", marginBottom:10, borderRadius:18, overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, background:"rgba(124,106,255,0.15)", display:"flex", alignItems:"center", justifyContent:"flex-end", paddingRight:20, borderRadius:18 }}>
        <span style={{ fontSize:11, color:"#a78bfa", fontWeight:700, opacity:showHint?1:0, transition:"opacity 0.15s", display:"flex", alignItems:"center", gap:4 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>
          Archivar
        </span>
      </div>
      <div onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE}
        style={{ transform:`translateX(${offset}px)`, transition:swiping?"none":"transform 0.3s ease", touchAction:"pan-y" }}>
        {children}
      </div>
    </div>
  );
}

// ── VISTA ARCHIVADOS — chats que el usuario ocultó, con opción de
// desarchivar (vuelven a la principal) o borrar definitivamente.
function VistaArchivados({ items, usuario, perfiles, onDesarchivar, onBorrarDefinitivo, onVolver, onAbrirFicha, onAbrirPerfil }) {
  return (
    <div style={{padding:"12px 14px 100px"}}>
      <button onClick={onVolver} style={{background:"none",border:"none",color:"#7c6aff",cursor:"pointer",fontSize:13,fontWeight:600,marginBottom:16,padding:0,display:"flex",alignItems:"center",gap:6}}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c6aff" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        Volver
      </button>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <span style={{fontSize:15,fontWeight:800,color:"white"}}>🗄️ Archivados</span>
        <span style={{background:"rgba(124,106,255,0.12)",color:"#7c6aff",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700}}>{items.length}</span>
      </div>
      {items.length===0 && <div style={{textAlign:"center",padding:"32px 0"}}><div style={{fontSize:40,marginBottom:10}}>🗄️</div><p style={{margin:0,color:"#4a5270",fontSize:13}}>No tenés chats archivados.</p></div>}
      {items.map(item => (
        <div key={item.id} style={{background:"rgba(14,12,28,0.75)",borderRadius:16,padding:"12px 14px",marginBottom:8,border:"1px solid rgba(255,255,255,0.06)",opacity:0.85}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <button onClick={()=>onAbrirPerfil(item.perfilBoton)} style={{width:32,height:32,borderRadius:"50%",background:avatarColor(item.nombreMostrado),overflow:"hidden",border:"none",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"white",padding:0,cursor:"pointer",flexShrink:0}}>
              {item.fotoUrl?<img src={item.fotoUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:item.nombreMostrado?.[0]?.toUpperCase()}
            </button>
            <button onClick={item.onAbrirFicha} style={{flex:1,minWidth:0,background:"transparent",border:"none",textAlign:"left",cursor:item.onAbrirFicha?"pointer":"default",padding:0}}>
              <div style={{fontSize:13,fontWeight:700,color:"#a0a8c0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.titulo}</div>
              <div style={{fontSize:10,color:"#4a5270",marginTop:1}}>{item.subtitulo}</div>
            </button>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>onDesarchivar(item)} style={{flex:1,padding:"7px",borderRadius:10,border:"1px solid rgba(124,106,255,0.2)",background:"rgba(124,106,255,0.08)",color:"#7c6aff",fontWeight:600,fontSize:11,cursor:"pointer"}}>↩ Desarchivar</button>
            <button onClick={()=>onBorrarDefinitivo(item)} style={{flex:1,padding:"7px",borderRadius:10,border:"1px solid rgba(239,83,80,0.25)",background:"rgba(239,83,80,0.06)",color:"#ef5350",fontWeight:600,fontSize:11,cursor:"pointer"}}>🗑 Borrar</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── CONEXIONES ────────────────────────────────────────────────────────────────
export default function Conexiones({ derivaciones, usuario, perfiles, chatsDirectos=[], chatInicial, onChatInicialUsado, onAbrirChat, onAbrirChatGrupal, onArchivarChat, onDesarchivarChat, onBorrarChatDefinitivo }) {
  const [vista, setVista] = useState("principal"); // principal | archivados

  // Filtrar chats que ya archivé yo — sigue existiendo para los demás
  const noArchivadoPorMi = (d) => !(d.ocultoPara||[]).includes(usuario.email);
  const archivadoPorMi = (d) => (d.ocultoPara||[]).includes(usuario.email);

  const todosDirectos = chatsDirectos.filter(c => c.participantes?.includes(usuario.email));
  const todasConexiones = derivaciones.filter(d=>d.estado==="asignada"&&(d.derivadoPorEmail===usuario.email||d.asignadoEmail===usuario.email));
  const todosGrupos = derivaciones.filter(d => {
    const esParte = d.derivadoPorEmail === usuario.email || d.interesadosEmails?.includes(usuario.email);
    const min = d.minimoInteresados || 0;
    const n = d.interesadosEmails?.length || 0;
    return esParte && min > 0 && n >= min;
  });

  const directos = todosDirectos.filter(noArchivadoPorMi);
  const conexiones = todasConexiones.filter(noArchivadoPorMi);
  const grupos = todosGrupos.filter(noArchivadoPorMi);

  // Modal de ficha: al tocar el título, se ve de qué trata ese chat.
  const [fichaVista, setFichaVista] = useState(null);
  // Modal de perfil profesional: al tocar una foto de participante.
  const [perfilVisto, setPerfilVisto] = useState(null);

  useEffect(()=>{
    if(!chatInicial?.email) return;
    const c=todasConexiones.find(d=>d.derivadoPorEmail===chatInicial.email||d.asignadoEmail===chatInicial.email);
    if(c){
      const oE=c.derivadoPorEmail===usuario.email?c.asignadoEmail:c.derivadoPorEmail;
      const oN=c.derivadoPorEmail===usuario.email?c.asignadoA:c.derivadoPor;
      onAbrirChat(c.id,oN,oE,"derivaciones",[c.derivadoPorEmail,c.asignadoEmail]);
    } else {
      // No hay ninguna ficha asignada entre ambos todavía — igual se puede
      // chatear directo, usando un id de chat determinístico por los emails.
      onAbrirChat(idChatDirecto(usuario.email, chatInicial.email), chatInicial.nombre, chatInicial.email, "chats_directos", [usuario.email, chatInicial.email]);
    }
    onChatInicialUsado?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[chatInicial]);

  // Fila de avatares superpuestos, reutilizada en la sección de grupales
  function AvatarStack({ emails, nombres }) {
    const n = emails.length;
    return (
      <div style={{ display:"flex", flexShrink:0 }}>
        {emails.slice(0,3).map((email,i) => {
          const p = perfiles.find(x=>x.email===email);
          const nombre = nombres?.[i] || email;
          return (
            <button key={email} onClick={(e)=>{ e.stopPropagation(); setPerfilVisto(p || { email, nombre }); }}
              style={{ width:34, height:34, borderRadius:"50%", background:avatarColor(nombre), overflow:"hidden", border:"2px solid #0a0a14", marginLeft:i>0?-10:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color:"white", padding:0, cursor:"pointer", flexShrink:0 }}>
              {p?.fotoUrl?<img src={p.fotoUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:nombre[0]?.toUpperCase()}
            </button>
          );
        })}
        {n > 3 && (
          <div style={{width:34,height:34,borderRadius:"50%",background:"rgba(255,255,255,0.08)",border:"2px solid #0a0a14",marginLeft:-10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:"#a0a8c0"}}>
            +{n-3}
          </div>
        )}
      </div>
    );
  }

  // ── VISTA ARCHIVADOS ──────────────────────────────────────────────────────
  if (vista === "archivados") {
    const gruposArch = todosGrupos.filter(archivadoPorMi).map(d => ({
      id:d.id, tipo:"ficha", coleccion:"derivaciones",
      participantesEmails:[d.derivadoPorEmail, ...(d.interesadosEmails||[])],
      titulo: d.titulo||d.especialidad||d.subtipo, subtitulo:`👥 Grupal · ${(d.interesadosEmails||[]).length} participantes`,
      nombreMostrado: d.titulo||d.subtipo||"?", fotoUrl:null,
      perfilBoton: null,
      onAbrirFicha: ()=>setFichaVista(d),
    }));
    const conexArch = todasConexiones.filter(archivadoPorMi).map(d => {
      const oE=d.derivadoPorEmail===usuario.email?d.asignadoEmail:d.derivadoPorEmail;
      const oN=d.derivadoPorEmail===usuario.email?d.asignadoA:d.derivadoPor;
      const p = perfiles.find(x=>x.email===oE);
      return {
        id:d.id, tipo:"ficha", coleccion:"derivaciones",
        participantesEmails:[d.derivadoPorEmail, d.asignadoEmail],
        titulo: oN, subtitulo:`🔗 ${d.titulo||d.especialidad||d.subtipo}`,
        nombreMostrado: oN, fotoUrl: p?.fotoUrl,
        perfilBoton: p || { email:oE, nombre:oN },
        onAbrirFicha: ()=>setFichaVista(d),
      };
    });
    const directosArch = todosDirectos.filter(archivadoPorMi).map(c => {
      const otroEmail = c.participantes.find(e => e !== usuario.email);
      const otroNombre = c.nombres?.[otroEmail] || otroEmail;
      const p = perfiles.find(x => x.email === otroEmail);
      return {
        id:c.id, tipo:"directo", coleccion:"chats_directos",
        participantesEmails: c.participantes,
        titulo: otroNombre, subtitulo: c.origen==="reserva" ? `📅 ${c.contexto||"Reserva"}` : "🌐 Chat directo",
        nombreMostrado: otroNombre, fotoUrl: p?.fotoUrl,
        perfilBoton: p || { email:otroEmail, nombre:otroNombre },
        onAbrirFicha: null,
      };
    });

    return (
      <VistaArchivados
        items={[...gruposArch, ...conexArch, ...directosArch]}
        usuario={usuario} perfiles={perfiles}
        onVolver={()=>setVista("principal")}
        onAbrirPerfil={(p)=>{ if(p) setPerfilVisto(p); }}
        onDesarchivar={(item)=>onDesarchivarChat(item.tipo, item.id)}
        onBorrarDefinitivo={(item)=>onBorrarChatDefinitivo(item.tipo, item.id)}
      />
    );
  }

  // ── VISTA PRINCIPAL ────────────────────────────────────────────────────────
  const hayArchivados = todosGrupos.some(archivadoPorMi) || todasConexiones.some(archivadoPorMi) || todosDirectos.some(archivadoPorMi);

  if(conexiones.length===0 && grupos.length===0 && directos.length===0 && !hayArchivados) {
    return <div style={{padding:"32px 20px",textAlign:"center"}}><div style={{fontSize:40,marginBottom:10}}>🔗</div><p style={{margin:0,color:"#4a5270",fontSize:13}}>Aún no tenés conexiones activas.</p></div>;
  }

  return (
    <div style={{padding:"12px 14px 20px"}}>

      {/* Botón a Archivados — mismo lugar donde WhatsApp lo pone, arriba de todo */}
      {hayArchivados && (
        <button onClick={()=>setVista("archivados")} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:14,border:"1px solid rgba(124,106,255,0.15)",background:"rgba(124,106,255,0.05)",cursor:"pointer",marginBottom:14}}>
          <div style={{width:30,height:30,borderRadius:10,background:"rgba(124,106,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>🗄️</div>
          <span style={{flex:1,textAlign:"left",fontSize:12,fontWeight:700,color:"#a0a8c0"}}>Archivados</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4a5270" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      )}

      {(grupos.length>0||conexiones.length>0||directos.length>0) && (
        <div style={{ fontSize:10, color:"#3a3a5a", marginBottom:14, textAlign:"center" }}>← Deslizá una fila para archivarla</div>
      )}

      {/* ── CHATS GRUPALES ── */}
      {grupos.length > 0 && (
        <div style={{ marginBottom: conexiones.length>0 ? 20 : 0 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#a0a8c0", textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>👥 Chats grupales</div>
          {grupos.map(d => {
            const fam = familiaDeSubtipo(d.subtipo||"Derivación");
            const n = d.interesadosEmails?.length || 0;
            const esDueño = d.derivadoPorEmail === usuario.email;
            const participantesEmails = [d.derivadoPorEmail, ...(d.interesadosEmails||[])];
            const abrir = () => onAbrirChatGrupal(d);
            return (
              <FilaSwipeable key={d.id} onArchivar={()=>onArchivarChat("ficha", d.id)}>
                <div style={{background:"rgba(14,12,28,0.9)",borderRadius:18,overflow:"hidden",border:"1px solid rgba(56,161,105,0.25)"}}>
                  <div style={{height:3,background:fam.grad}}/>
                  <div style={{padding:"14px 16px", display:"flex", alignItems:"center", gap:12}}>
                    <AvatarStack emails={d.interesadosEmails||[]} nombres={d.interesados||[]}/>
                    {/* Tocar el título/info abre el chat directamente */}
                    <button onClick={abrir} style={{ flex:1, minWidth:0, background:"transparent", border:"none", textAlign:"left", cursor:"pointer", padding:0 }}>
                      <div style={{fontSize:13,fontWeight:800,color:"white",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.titulo||d.especialidad||d.subtipo}</div>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginTop:2}}>
                        <FamiliaChip subtipo={d.subtipo||"Derivación"} small/>
                        <span style={{fontSize:10,color:"#4a5270"}}>{n} participante{n>1?"s":""}{esDueño?" · tu ficha":""}</span>
                      </div>
                    </button>
                    <button onClick={()=>setFichaVista(d)} title="Ver de qué trata" style={{width:28,height:28,borderRadius:"50%",border:"none",background:"rgba(255,255,255,0.06)",color:"#a0a8c0",fontSize:12,cursor:"pointer",flexShrink:0}}>ⓘ</button>
                    <button onClick={abrir} style={{padding:"9px 14px",borderRadius:12,border:"1px solid rgba(56,161,105,0.3)",background:"rgba(56,161,105,0.1)",color:"#66bb6a",fontWeight:700,fontSize:12,cursor:"pointer",flexShrink:0}}>💬</button>
                  </div>
                </div>
              </FilaSwipeable>
            );
          })}
        </div>
      )}

      {/* ── ASIGNACIONES DIRECTAS — mismo estilo compacto que los grupales ── */}
      {conexiones.length > 0 && (
        <div style={{ marginBottom: directos.length>0 ? 20 : 0 }}>
          {grupos.length > 0 && <div style={{ fontSize:11, fontWeight:700, color:"#a0a8c0", textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>🔗 Asignaciones directas</div>}
          {conexiones.map(d=>{
            const dp=perfiles.find(p=>p.email===d.derivadoPorEmail), ap=perfiles.find(p=>p.email===d.asignadoEmail);
            const oE=d.derivadoPorEmail===usuario.email?d.asignadoEmail:d.derivadoPorEmail;
            const oN=d.derivadoPorEmail===usuario.email?d.asignadoA:d.derivadoPor;
            const fam=familiaDeSubtipo(d.subtipo||"Derivación");
            const abrir = () => onAbrirChat(d.id,oN,oE,"derivaciones",[d.derivadoPorEmail,d.asignadoEmail]);
            return (
              <FilaSwipeable key={d.id} onArchivar={()=>onArchivarChat("ficha", d.id)}>
                <div style={{background:"rgba(14,12,28,0.9)",borderRadius:18,overflow:"hidden",border:"1px solid rgba(102,187,106,0.2)"}}>
                  <div style={{height:3,background:fam.grad}}/>
                  <div style={{padding:"14px 16px", display:"flex", alignItems:"center", gap:12}}>
                    {/* Avatares enfrentados, compactos, con la flechita de asignación */}
                    <div style={{ display:"flex", alignItems:"center", flexShrink:0 }}>
                      <button onClick={(e)=>{e.stopPropagation(); setPerfilVisto(dp || { email:d.derivadoPorEmail, nombre:d.derivadoPor });}}
                        style={{ width:34, height:34, borderRadius:"50%", background:avatarColor(d.derivadoPor||""), overflow:"hidden", border:`2px solid ${d.derivadoPorEmail===usuario.email?"rgba(124,106,255,0.6)":"#0a0a14"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color:"white", padding:0, cursor:"pointer" }}>
                        {dp?.fotoUrl?<img src={dp.fotoUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:d.derivadoPor?.[0]?.toUpperCase()}
                      </button>
                      <div style={{ width:14, height:14, borderRadius:"50%", background:"linear-gradient(135deg,#38a169,#2d8a5e)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 -4px", zIndex:2, border:"2px solid #0a0a14" }}>
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                      </div>
                      <button onClick={(e)=>{e.stopPropagation(); setPerfilVisto(ap || { email:d.asignadoEmail, nombre:d.asignadoA });}}
                        style={{ width:34, height:34, borderRadius:"50%", background:avatarColor(d.asignadoA||""), overflow:"hidden", border:`2px solid ${d.asignadoEmail===usuario.email?"rgba(124,106,255,0.6)":"#0a0a14"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color:"white", padding:0, cursor:"pointer" }}>
                        {ap?.fotoUrl?<img src={ap.fotoUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:d.asignadoA?.[0]?.toUpperCase()}
                      </button>
                    </div>
                    {/* Tocar el título/info abre el chat directamente */}
                    <button onClick={abrir} style={{ flex:1, minWidth:0, background:"transparent", border:"none", textAlign:"left", cursor:"pointer", padding:0 }}>
                      <div style={{fontSize:13,fontWeight:800,color:"white",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.titulo||d.especialidad||d.subtipo}</div>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginTop:2}}>
                        <FamiliaChip subtipo={d.subtipo||"Derivación"} small/>
                        <span style={{fontSize:10,color:"#4a5270"}}>con {oN}</span>
                      </div>
                    </button>
                    <button onClick={()=>setFichaVista(d)} title="Ver de qué trata" style={{width:28,height:28,borderRadius:"50%",border:"none",background:"rgba(255,255,255,0.06)",color:"#a0a8c0",fontSize:12,cursor:"pointer",flexShrink:0}}>ⓘ</button>
                    <button onClick={abrir} style={{padding:"9px 14px",borderRadius:12,border:"1px solid rgba(124,106,255,0.3)",background:"rgba(124,106,255,0.1)",color:"#a78bfa",fontWeight:700,fontSize:12,cursor:"pointer",flexShrink:0}}>💬</button>
                  </div>
                </div>
              </FilaSwipeable>
            );
          })}
        </div>
      )}

      {/* ── CHATS DIRECTOS — originados desde Red o desde un bloque
          reservado, sin depender de una ficha o asignación ── */}
      {directos.length > 0 && (
        <div>
          {(grupos.length>0||conexiones.length>0) && <div style={{ fontSize:11, fontWeight:700, color:"#a0a8c0", textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>💬 Chats directos</div>}
          {directos.map(c => {
            const otroEmail = c.participantes.find(e => e !== usuario.email);
            const otroNombre = c.nombres?.[otroEmail] || otroEmail;
            const p = perfiles.find(x => x.email === otroEmail);
            const esDeReserva = c.origen === "reserva";
            const abrir = () => onAbrirChat(c.id, otroNombre, otroEmail, "chats_directos", c.participantes);
            return (
              <FilaSwipeable key={c.id} onArchivar={()=>onArchivarChat("directo", c.id)}>
                <div style={{background:"rgba(14,12,28,0.9)",borderRadius:18,overflow:"hidden",border:"1px solid rgba(124,106,255,0.18)"}}>
                  <div style={{height:3,background:esDeReserva?"linear-gradient(90deg,#4facfe,#00f2fe)":"linear-gradient(90deg,#a18cd1,#fbc2eb)"}}/>
                  <div style={{padding:"14px 16px", display:"flex", alignItems:"center", gap:12}}>
                    <button onClick={()=>setPerfilVisto(p || { email:otroEmail, nombre:otroNombre })}
                      style={{ width:34, height:34, borderRadius:"50%", background:avatarColor(otroNombre), overflow:"hidden", border:"none", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color:"white", padding:0, cursor:"pointer", flexShrink:0 }}>
                      {p?.fotoUrl?<img src={p.fotoUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:otroNombre[0]?.toUpperCase()}
                    </button>
                    {/* Tocar el título/info abre el chat directamente */}
                    <button onClick={abrir} style={{ flex:1, minWidth:0, background:"transparent", border:"none", textAlign:"left", cursor:"pointer", padding:0 }}>
                      <div style={{fontSize:13,fontWeight:800,color:"white",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{otroNombre}</div>
                      <div style={{fontSize:10,color:"#4a5270",marginTop:2}}>{esDeReserva ? `📅 ${c.contexto||"Reserva"}` : "🌐 Desde Red"}</div>
                    </button>
                    <button onClick={abrir} style={{padding:"9px 14px",borderRadius:12,border:"1px solid rgba(124,106,255,0.3)",background:"rgba(124,106,255,0.1)",color:"#a78bfa",fontWeight:700,fontSize:12,cursor:"pointer",flexShrink:0}}>💬</button>
                  </div>
                </div>
              </FilaSwipeable>
            );
          })}
        </div>
      )}

      {/* ── MODAL: DE QUÉ TRATA ESTE CHAT (ficha) ── */}
      {fichaVista && (()=>{
        const fam = familiaDeSubtipo(fichaVista.subtipo||"Derivación");
        return (
          <div style={{ position:"fixed", inset:0, zIndex:3500, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"flex-end", justifyContent:"center" }}
            onClick={e=>{ if(e.target===e.currentTarget) setFichaVista(null); }}>
            <div style={{ width:"100%", maxWidth:420, background:"#0a0a14", borderRadius:"22px 22px 0 0", padding:"20px", border:"1px solid rgba(124,106,255,0.2)" }}>
              <div style={{ width:36, height:4, borderRadius:2, background:"rgba(255,255,255,0.1)", margin:"0 auto 16px" }}/>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                <div style={{ width:44, height:44, borderRadius:14, background:fam.grad, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{fam.emoji}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:15, fontWeight:800, color:"white" }}>{fichaVista.titulo||fichaVista.especialidad||fichaVista.subtipo}</div>
                  <FamiliaChip subtipo={fichaVista.subtipo||"Derivación"} small/>
                </div>
                <button onClick={()=>setFichaVista(null)} style={{ width:28, height:28, borderRadius:"50%", background:"rgba(255,255,255,0.06)", border:"none", color:"#4a5270", cursor:"pointer", fontSize:16 }}>✕</button>
              </div>
              {fichaVista.nota && <p style={{ margin:"0 0 14px", fontSize:13, color:"#e2e8f0", lineHeight:1.6, padding:"10px 12px", background:"rgba(124,106,255,0.06)", borderRadius:10, borderLeft:`2px solid ${fam.color}66` }}>&ldquo;{fichaVista.nota}&rdquo;</p>}
              <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:16 }}>
                {fichaVista.modalidad && <Tag label={`📍 ${fichaVista.modalidad}`}/>}
                {fichaVista.dias?.length>0 && <Tag label={`📅 ${fichaVista.dias.join("·")}`}/>}
                {fichaVista.franjas?.length>0 && <Tag label={`⏰ ${fichaVista.franjas.join("·")}`}/>}
              </div>
              <button onClick={()=>setFichaVista(null)} style={{ width:"100%", padding:12, borderRadius:12, border:"1px solid rgba(124,106,255,0.2)", background:"transparent", color:"#a0a8c0", fontWeight:600, fontSize:13, cursor:"pointer" }}>Cerrar</button>
            </div>
          </div>
        );
      })()}

      {/* ── MODAL: TARJETA DE PERFIL PROFESIONAL ── */}
      {perfilVisto && (
        <PerfilProfesionalModal perfil={perfilVisto} usuario={usuario} onCerrar={()=>setPerfilVisto(null)}
          onAbrirChatDirecto={(p)=>{ onAbrirChat(idChatDirecto(usuario.email,p.email), p.nombre, p.email, "chats_directos", [usuario.email, p.email]); setPerfilVisto(null); }}/>
      )}
    </div>
  );
}
