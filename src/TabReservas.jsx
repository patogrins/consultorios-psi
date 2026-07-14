import { useState, useMemo, useRef, useEffect, memo, useCallback } from "react";
import { db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const HORA_PRECIO = 3500;
const HORAS = Array.from({ length: 14 }, (_, i) => i + 8);
const CONSULTORIOS = ["Consultorio 3", "Consultorio 4", "Consultorio 5"];
const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const COLORES_PROF = [
  { bg: "linear-gradient(135deg,#667eea,#764ba2)" },
  { bg: "linear-gradient(135deg,#f093fb,#f5576c)" },
  { bg: "linear-gradient(135deg,#4facfe,#00f2fe)" },
  { bg: "linear-gradient(135deg,#43e97b,#38f9d7)" },
  { bg: "linear-gradient(135deg,#fa709a,#fee140)" },
  { bg: "linear-gradient(135deg,#a18cd1,#fbc2eb)" },
  { bg: "linear-gradient(135deg,#fda085,#f6d365)" },
  { bg: "linear-gradient(135deg,#96fbc4,#f9f586)" },
];

const ROW_H = 28;
const HORA_COL = 38;
const CON_COL = 44;

function getWeekDates(offset = 0) {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i); return d;
  });
}

function dateKey(d) {
  // Usar fecha local (no UTC) para evitar corrimiento de día en zonas UTC-
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function fmtCurrency(n) { return "$" + n.toLocaleString("es-AR"); }

function calcPagos(reservas, profesional, mesStr) {
  let totalMes = 0; const detalle = [];
  reservas.filter(r => r.profesional === profesional).forEach(r => {
    const horas = r.horaFin - r.horaInicio, montoBloque = horas * HORA_PRECIO;
    if (r.repeteSemanal) {
      const year = parseInt(mesStr.slice(0,4)), month = parseInt(mesStr.slice(5,7))-1;
      const diasEnMes = new Date(year, month+1, 0).getDate();
      const orig = new Date(r.fecha+"T12:00:00"); let occ = 0;
      for (let d = 1; d <= diasEnMes; d++) { const dia = new Date(year,month,d); if (dia.getDay()===orig.getDay()&&dia>=orig) occ++; }
      totalMes += occ*montoBloque;
      detalle.push({ ...r, horas, montoBloque, occ, montoMes: occ*montoBloque, tipo:"Semanal" });
    } else {
      if (r.fecha.startsWith(mesStr)) totalMes += montoBloque;
      detalle.push({ ...r, horas, montoBloque, occ:1, montoMes: r.fecha.startsWith(mesStr)?montoBloque:0, tipo:"Única vez" });
    }
  });
  return { totalMes, detalle };
}

function exportarCSV(profs, reservas, mesStr) {
  const rows = ["Profesional,Consultorio,Fecha,Horario,Tipo,Horas,Ocurrencias,Monto"];
  profs.forEach(prof => {
    const { detalle } = calcPagos(reservas, prof, mesStr);
    detalle.forEach(d => rows.push([prof,d.consultorio,d.fecha,`${d.horaInicio}:00-${d.horaFin}:00`,d.tipo,d.horas,d.occ,d.montoMes].join(",")));
  });
  const blob = new Blob([rows.join("\n")],{type:"text/csv"});
  const a = document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`pagos_${mesStr}.csv`; a.click();
}

function getLineaPct() {
  const n = new Date();
  return Math.max(0, Math.min(((n.getHours()-8)*60+n.getMinutes())/(14*60), 1));
}

// ── POPUP DE RESERVA ──────────────────────────────────────────────────────────
function PopupReserva({ reserva, colorMap, usuarios, esAdmin, puedeEditar, onClose, onEditar, onEliminar, onNotificar, onAsociarUsuario }) {
  const col = colorMap[reserva.profesional] || COLORES_PROF[0];
  const usuarioData = usuarios?.find(u => u.nombre === reserva.profesional);
  const duracion = reserva.horaFin - reserva.horaInicio;
  const fecha = new Date(reserva.fecha+"T12:00:00");
  const [asociando, setAsociando] = useState(false);
  const [usuarioSel, setUsuarioSel] = useState("");

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:3000, display:"flex", alignItems:"flex-end", justifyContent:"center", background:"rgba(0,0,0,0.6)" }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:"100%", maxWidth:400, background:"#0a0a14", borderRadius:"24px 24px 0 0", padding:"20px 20px 44px", border:"1px solid rgba(124,106,255,0.2)", animation:"slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)", maxHeight:"85vh", overflowY:"auto" }}>
        <div style={{ width:36, height:4, borderRadius:2, background:"rgba(255,255,255,0.1)", margin:"0 auto 16px" }}/>

        {/* Perfil */}
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16 }}>
          <div style={{ width:52, height:52, borderRadius:"50%", background:col.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, overflow:"hidden", boxShadow:"0 4px 16px rgba(0,0,0,0.4)" }}>
            {usuarioData?.fotoUrl
              ? <img src={usuarioData.fotoUrl} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
              : <span style={{ fontSize:20, fontWeight:800, color:"white" }}>{(reserva.profesional||"?")[0].toUpperCase()}</span>
            }
          </div>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:"white" }}>{reserva.profesional}</div>
            {usuarioData?.especialidad && <div style={{ fontSize:11, color:"#7c6aff", marginTop:2 }}>{usuarioData.especialidad}</div>}
            {usuarioData?.telefono && <div style={{ fontSize:11, color:"#4a5270", marginTop:1 }}>📞 {usuarioData.telefono}</div>}
            {!usuarioData && <div style={{ fontSize:10, color:"rgba(251,191,36,0.7)", marginTop:2 }}>Sin cuenta registrada</div>}
          </div>
        </div>

        {/* Datos reserva */}
        <div style={{ background:"rgba(124,106,255,0.07)", borderRadius:14, padding:"12px 14px", marginBottom:16, border:"1px solid rgba(124,106,255,0.12)" }}>
          {[
            ["📅", fecha.toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long"})],
            ["🏢", reserva.consultorio],
            ["⏰", `${reserva.horaInicio}:00 – ${reserva.horaFin}:00 (${duracion}h)`],
            ["🔁", reserva.repeteSemanal ? "Semanal" : "Única vez"],
            ["💰", fmtCurrency(duracion * HORA_PRECIO)],
          ].map(([icon,val])=>(
            <div key={icon} style={{ display:"flex", alignItems:"center", gap:10, padding:"5px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
              <span style={{ fontSize:14, width:20, textAlign:"center" }}>{icon}</span>
              <span style={{ fontSize:12, color:"#a0a8c0" }}>{val}</span>
            </div>
          ))}
        </div>

        {/* Acciones solo para admin */}
        {esAdmin && (
          <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:12 }}>
            {!asociando ? (
              <button onClick={()=>setAsociando(true)}
                style={{ width:"100%", padding:"10px", borderRadius:12, border:"1px solid rgba(99,179,237,0.3)", background:"rgba(99,179,237,0.08)", color:"#63b3ed", fontWeight:700, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                {reserva.emailAsociado ? `Reasociar usuario (${reserva.emailAsociado})` : "Asociar a usuario registrado"}
              </button>
            ) : (
              <div style={{ background:"rgba(99,179,237,0.06)", borderRadius:12, padding:"12px", border:"1px solid rgba(99,179,237,0.2)" }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#63b3ed", marginBottom:8 }}>Seleccioná el usuario</div>
                <select value={usuarioSel} onChange={e=>setUsuarioSel(e.target.value)}
                  style={{ width:"100%", padding:"9px 12px", borderRadius:9, border:"1px solid rgba(124,106,255,0.2)", background:"rgba(14,12,28,0.9)", color:"white", fontSize:13, marginBottom:8, outline:"none" }}>
                  <option value="">— Elegí un usuario —</option>
                  {(usuarios||[]).map(u => (
                    <option key={u.email} value={u.email}>{u.nombre} ({u.email})</option>
                  ))}
                </select>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={()=>setAsociando(false)} style={{ flex:1, padding:"8px", borderRadius:9, border:"1px solid rgba(255,255,255,0.08)", background:"transparent", color:"#4a5270", fontSize:12, cursor:"pointer", fontWeight:600 }}>Cancelar</button>
                  <button onClick={async ()=>{ if(!usuarioSel) return; await onAsociarUsuario(reserva, usuarioSel); setAsociando(false); onClose(); }} disabled={!usuarioSel}
                    style={{ flex:2, padding:"8px", borderRadius:9, border:"none", background:usuarioSel?"linear-gradient(135deg,#667eea,#764ba2)":"rgba(255,255,255,0.05)", color:usuarioSel?"white":"#4a5270", fontSize:12, fontWeight:800, cursor:usuarioSel?"pointer":"not-allowed" }}>
                    Asociar y notificar
                  </button>
                </div>
              </div>
            )}
            <button onClick={()=>onNotificar(reserva)} style={{ width:"100%", padding:"10px", borderRadius:12, border:"1px solid rgba(124,106,255,0.25)", background:"rgba(124,106,255,0.1)", color:"#a78bfa", fontWeight:700, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
              Enviar mensaje al profesional
            </button>
          </div>
        )}

        {/* Editar / Eliminar — visible para el dueño de la reserva O para el admin */}
        {(esAdmin || puedeEditar) && (
          <div style={{ display:"flex", gap:8, marginBottom:12 }}>
            <button onClick={()=>{onEditar(reserva);onClose();}} style={{ flex:1, padding:"10px", borderRadius:12, border:"1px solid rgba(255,255,255,0.1)", background:"transparent", color:"#a0a8c0", fontWeight:600, fontSize:12, cursor:"pointer" }}>✎ Editar</button>
            <button onClick={()=>{onEliminar(reserva.id);onClose();}} style={{ flex:1, padding:"10px", borderRadius:12, border:"1px solid rgba(239,83,80,0.3)", background:"rgba(239,83,80,0.08)", color:"#ef5350", fontWeight:600, fontSize:12, cursor:"pointer" }}>🗑 Eliminar</button>
          </div>
        )}

        <button onClick={onClose} style={{ width:"100%", padding:"10px", borderRadius:12, border:"1px solid rgba(255,255,255,0.08)", background:"transparent", color:"#4a5270", fontWeight:600, fontSize:12, cursor:"pointer" }}>Cerrar</button>
      </div>
    </div>
  );
}

// ── MODAL NOTIFICACION ADMIN ──────────────────────────────────────────────────
function ModalNotificar({ reserva, usuarios, onClose, onEnviar }) {
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const usuarioData = usuarios?.find(u => u.nombre === reserva.profesional);
  const fecha = new Date(reserva.fecha+"T12:00:00").toLocaleDateString("es-AR",{weekday:"short",day:"numeric",month:"short"});

  async function handleEnviar() {
    if (!mensaje.trim()) return;
    setEnviando(true);
    await onEnviar(reserva, mensaje.trim(), usuarioData?.email);
    setEnviando(false);
    onClose();
  }

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:4000, display:"flex", alignItems:"flex-end", justifyContent:"center", background:"rgba(0,0,0,0.7)" }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:"100%", maxWidth:400, background:"#0a0a14", borderRadius:"24px 24px 0 0", padding:"20px 20px 44px", border:"1px solid rgba(124,106,255,0.2)", animation:"slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)" }}>
        <div style={{ width:36, height:4, borderRadius:2, background:"rgba(255,255,255,0.1)", margin:"0 auto 16px" }}/>
        <div style={{ fontSize:15, fontWeight:800, color:"white", marginBottom:4 }}>Notificar a {reserva.profesional}</div>
        <div style={{ fontSize:11, color:"#4a5270", marginBottom:16 }}>📅 {fecha} · {reserva.horaInicio}:00–{reserva.horaFin}:00 · {reserva.consultorio}</div>
        <textarea
          value={mensaje}
          onChange={e=>setMensaje(e.target.value)}
          placeholder="Escribí el mensaje que va a ver en su Tab Inicio..."
          style={{ width:"100%", minHeight:100, padding:"12px 14px", borderRadius:12, border:"1px solid rgba(124,106,255,0.2)", background:"rgba(14,12,28,0.8)", color:"white", fontSize:13, resize:"none", outline:"none", boxSizing:"border-box", fontFamily:"inherit", marginBottom:12 }}
        />
        {!usuarioData?.email && (
          <div style={{ background:"rgba(251,191,36,0.1)", border:"1px solid rgba(251,191,36,0.2)", borderRadius:10, padding:"8px 12px", marginBottom:12, fontSize:11, color:"#fbbf24" }}>
            ⚠️ Este profesional no tiene cuenta registrada. La notificación se guardará igual pero no podrá verla hasta que se registre.
          </div>
        )}
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={onClose} style={{ flex:1, padding:"11px", borderRadius:12, border:"1px solid rgba(124,106,255,0.2)", background:"transparent", color:"#a0a8c0", fontWeight:600, fontSize:13, cursor:"pointer" }}>Cancelar</button>
          <button onClick={handleEnviar} disabled={!mensaje.trim()||enviando} style={{ flex:2, padding:"11px", borderRadius:12, border:"none", background:mensaje.trim()?"linear-gradient(135deg,#667eea,#764ba2)":"rgba(255,255,255,0.05)", color:mensaje.trim()?"white":"#4a5270", fontWeight:800, fontSize:13, cursor:mensaje.trim()?"pointer":"not-allowed", transition:"all 0.2s" }}>
            {enviando?"Enviando...":"🔔 Enviar notificación"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── CELDA ─────────────────────────────────────────────────────────────────────
const Celda = memo(function Celda({
  consultorio, fecha, hora, cellH,
  reservas, colorMap, flujoHoras, flujoDia, flujoConsultorio,
  esPublico, puedeEditarFn, onToggleHora, onLogin, onClickReserva, zoom
}) {
  const key = dateKey(fecha), dow = fecha.getDay();
  const bloques = useMemo(() => reservas.filter(r => {
    if (r.consultorio!==consultorio||hora<r.horaInicio||hora>=r.horaFin) return false;
    if (r.fecha===key) return true;
    if (r.repeteSemanal){const o=new Date(r.fecha+"T12:00:00");return o.getDay()===dow&&o<=fecha;}
    return false;
  }), [reservas, consultorio, hora, key, dow, fecha]);

  const libre = bloques.length===0;
  const esFlujoActivo = flujoConsultorio===consultorio && flujoDia && dateKey(fecha)===dateKey(flujoDia);
  const seleccionada = esFlujoActivo && flujoHoras.includes(hora);
  const showName = zoom >= 2;
  const h = cellH || ROW_H;

  function handleClick() {
    if (!libre) {
      const r = bloques[0];
      onClickReserva(r);
      return;
    }
    if (esPublico) { onLogin(); return; }
    onToggleHora(consultorio, fecha, hora);
  }

  return (
    <div onClick={handleClick}
      style={{ height:h, padding:1, position:"relative", cursor:"pointer", background:seleccionada?"rgba(124,106,255,0.3)":"transparent", transition:"background 0.1s", overflow:"hidden" }}>
      {seleccionada && libre && <div style={{ position:"absolute", inset:1, borderRadius:3, border:"2px solid rgba(124,106,255,0.9)", pointerEvents:"none" }}/>}
      {bloques.map(r => {
        const col = colorMap[r.profesional]||COLORES_PROF[0];
        const esInicio = hora===r.horaInicio;
        return (
          <div key={r.id} style={{ height:"100%", background:col.bg, borderRadius:esInicio?"4px 4px 1px 1px":"1px", padding:"1px 3px", display:"flex", alignItems:"center", overflow:"hidden" }}>
            {esInicio && showName && <span style={{ fontSize:9, fontWeight:700, color:"white", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.profesional}</span>}
          </div>
        );
      })}
    </div>
  );
});

// ── GRILLA — cabeceras siempre visibles, zoom via tamaño de celda ──────────────
const Grilla = memo(function Grilla({
  weekDates, zoom, lineaPct, todayKey,
  reservas, colorMap, flujoHoras, flujoDia, flujoConsultorio, paso,
  esPublico, puedeEditarFn, onToggleHora, onLogin, onClickReserva, onSeleccionarDia
}) {
  const hoyEnDias = weekDates.some(f => dateKey(f)===todayKey);
  const cellH = Math.round(ROW_H * zoom);
  const cellW = Math.round(CON_COL * zoom);
  const HEAD_H1 = 44;
  const HEAD_H2 = 22;
  const bodyRef = useRef(null);

  // Sincronizar scroll horizontal del body con los headers
  function onBodyScroll(e) {
    const sl = e.currentTarget.scrollLeft;
    const d = document.getElementById("gh-dias");
    const c = document.getElementById("gh-cons");
    if (d) d.scrollLeft = sl;
    if (c) c.scrollLeft = sl;
  }

  return (
    <div style={{ position:"relative" }}>

      {/* ── CABECERAS — sticky verticalmente, sincronizadas al scroll horizontal ── */}
      <div style={{ position:"sticky", top:0, zIndex:25, background:"#000", userSelect:"none" }}>

        {/* Días */}
        <div style={{ display:"flex", height:HEAD_H1, borderBottom:"1px solid rgba(255,255,255,0.08)", overflow:"hidden" }}>
          <div style={{ width:HORA_COL, minWidth:HORA_COL, flexShrink:0, background:"rgba(0,0,0,0.97)", borderRight:"1px solid rgba(255,255,255,0.08)" }}/>
          <div id="gh-dias" style={{ display:"flex", flex:1, overflow:"hidden" }}>
            {weekDates.map(fecha => {
              const isToday = dateKey(fecha)===todayKey;
              const esFlujo = flujoDia && dateKey(fecha)===dateKey(flujoDia);
              return (
                <div key={dateKey(fecha)} onClick={() => paso===null && onSeleccionarDia(fecha)}
                  style={{ width:cellW*3, minWidth:cellW*3, flexShrink:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:1, borderLeft:"2px solid rgba(255,255,255,0.07)", background:esFlujo?"rgba(124,106,255,0.22)":isToday?"rgba(124,106,255,0.1)":"rgba(0,0,0,0.97)", cursor:paso===null?"pointer":"default", transition:"background 0.2s" }}>
                  <div style={{ fontSize:9, fontWeight:600, color:esFlujo?"#a78bfa":isToday?"#a78bfa":"#a0a8c0" }}>{DIAS_SEMANA[fecha.getDay()]}</div>
                  <div style={{ fontSize:14, fontWeight:800, color:esFlujo?"#a78bfa":isToday?"#a78bfa":"white" }}>{fecha.getDate()}</div>
                  {paso===null && <div style={{ fontSize:7, color:"rgba(124,106,255,0.3)" }}>reservar</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Consultorios */}
        <div style={{ display:"flex", height:HEAD_H2, borderBottom:"1px solid rgba(255,255,255,0.06)", overflow:"hidden" }}>
          <div style={{ width:HORA_COL, minWidth:HORA_COL, flexShrink:0, background:"rgba(0,0,0,0.97)", borderRight:"1px solid rgba(255,255,255,0.08)" }}/>
          <div id="gh-cons" style={{ display:"flex", flex:1, overflow:"hidden" }}>
            {weekDates.map(fecha => CONSULTORIOS.map((c,ci) => {
              const esFlujoC = flujoConsultorio===c && flujoDia && dateKey(fecha)===dateKey(flujoDia);
              return (
                <div key={`hc-${dateKey(fecha)}-${c}`}
                  style={{ width:cellW, minWidth:cellW, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, borderLeft:ci===0?"2px solid rgba(255,255,255,0.07)":"1px solid rgba(255,255,255,0.04)", color:esFlujoC?"#a78bfa":"#a0a8c0", background:esFlujoC?"rgba(124,106,255,0.18)":"rgba(0,0,0,0.95)", transition:"all 0.2s" }}>
                  C{ci+3}
                </div>
              );
            }))}
          </div>
        </div>
      </div>

      {/* ── CUERPO con scroll horizontal sincronizado ── */}
      <div ref={bodyRef} style={{ overflowX:"auto", position:"relative" }} onScroll={onBodyScroll}>
        <div style={{ width: HORA_COL + weekDates.length*3*cellW, position:"relative" }}>

          {HORAS.map(hora => (
            <div key={hora} style={{ display:"flex", height:cellH, borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
              {/* Hora — sticky izquierda */}
              <div style={{ width:HORA_COL, minWidth:HORA_COL, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"flex-end", paddingRight:6, fontSize:9, color:"rgba(255,255,255,0.55)", fontWeight:700, background:"rgba(0,0,0,0.9)", borderRight:"1px solid rgba(255,255,255,0.08)", position:"sticky", left:0, zIndex:5 }}>
                {hora}h
              </div>
              {weekDates.map(fecha => CONSULTORIOS.map((c,ci) => (
                <div key={`${dateKey(fecha)}-${c}-${hora}`}
                  style={{ width:cellW, minWidth:cellW, flexShrink:0, borderLeft:ci===0?"2px solid rgba(255,255,255,0.06)":"1px solid rgba(255,255,255,0.03)" }}>
                  <Celda
                    consultorio={c} fecha={fecha} hora={hora} zoom={zoom} cellH={cellH}
                    reservas={reservas} colorMap={colorMap}
                    flujoHoras={flujoHoras} flujoDia={flujoDia} flujoConsultorio={flujoConsultorio}
                    esPublico={esPublico} puedeEditarFn={puedeEditarFn}
                    onToggleHora={onToggleHora} onLogin={onLogin} onClickReserva={onClickReserva}
                  />
                </div>
              )))}
            </div>
          ))}

          {/* Línea hora actual */}
          {hoyEnDias && (
            <div style={{ position:"absolute", top:lineaPct*HORAS.length*cellH, left:HORA_COL, right:0, height:2, background:"white", opacity:0.7, pointerEvents:"none", boxShadow:"0 0 6px rgba(255,255,255,0.5)", zIndex:5 }}/>
          )}
        </div>
      </div>
    </div>
  );
});

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
export default function TabReservas({ usuario, esAdmin, esPublico, reservas=[], usuarios=[], agregarReserva, actualizarReserva, eliminarReserva, showToast, onLogin }) {
  const [zoom, setZoom] = useState(1.0);
  const [weekOffset, setWeekOffset] = useState(0);
  const [mesOffset, setMesOffset] = useState(0);
  const [verPagos, setVerPagos] = useState(false);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ profesional:"", horaInicio:8, horaFin:9, repeteSemanal:false });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [errorSolapamiento, setErrorSolapamiento] = useState("");
  const [editandoReserva, setEditandoReserva] = useState(null);
  const [lineaPct, setLineaPct] = useState(getLineaPct());
  const [scrollY, setScrollY] = useState(0);
  const [popupReserva, setPopupReserva] = useState(null);
  const [modalNotificar, setModalNotificar] = useState(null);

  const [paso, setPaso] = useState(null);
  const [flujoDia, setFlujoDia] = useState(null);
  const [flujoConsultorio, setFlujoConsultorio] = useState(null);
  const [flujoHoras, setFlujoHoras] = useState([]);

  const outerRef = useRef(null);
  const lastPinchDist = useRef(null);
  const lastPinchZoom = useRef(1);

  useEffect(() => { const i=setInterval(()=>setLineaPct(getLineaPct()),60000); return()=>clearInterval(i); },[]);

  useEffect(() => {
    const meta = document.querySelector("meta[name=viewport]");
    if (meta) meta.content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no";
    return () => { if (meta) meta.content="width=device-width,initial-scale=1"; };
  },[]);

  useEffect(() => {
    const el = outerRef.current; if (!el) return;
    const fn = () => setScrollY(el.scrollTop);
    el.addEventListener("scroll", fn, { passive:true });
    return () => el.removeEventListener("scroll", fn);
  },[]);

  // Pinch continuo
  useEffect(() => {
    const outer = outerRef.current; if (!outer) return;
    function dist(t) { const dx=t[0].clientX-t[1].clientX,dy=t[0].clientY-t[1].clientY; return Math.sqrt(dx*dx+dy*dy); }
    function onStart(e) {
      if (e.touches.length!==2) return;
      e.preventDefault();
      lastPinchDist.current=dist(e.touches);
      lastPinchZoom.current=zoom;
    }
    function onMove(e) {
      if (e.touches.length!==2||!lastPinchDist.current) return;
      e.preventDefault();
      const newZoom = Math.min(4,Math.max(1,lastPinchZoom.current*(dist(e.touches)/lastPinchDist.current)));
      setZoom(newZoom);
    }
    function onEnd() { lastPinchDist.current=null; }
    outer.addEventListener("touchstart",onStart,{passive:false});
    outer.addEventListener("touchmove",onMove,{passive:false});
    outer.addEventListener("touchend",onEnd);
    return ()=>{ outer.removeEventListener("touchstart",onStart); outer.removeEventListener("touchmove",onMove); outer.removeEventListener("touchend",onEnd); };
  },[zoom]);

  const weekDates = useMemo(()=>getWeekDates(weekOffset),[weekOffset]);
  const mesStr = useMemo(()=>{
    const d=new Date(); d.setMonth(d.getMonth()+mesOffset);
    const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0");
    return `${y}-${m}`;
  },[mesOffset]);
  const mesLabel = useMemo(()=>{ const[y,m]=mesStr.split("-"); return new Date(parseInt(y),parseInt(m)-1,1).toLocaleDateString("es-AR",{month:"long",year:"numeric"}); },[mesStr]);

  const colorMap = useMemo(()=>{
    const map={}; let idx=0;
    reservas.forEach(r=>{ if(r.profesional&&!map[r.profesional]){map[r.profesional]=COLORES_PROF[idx%COLORES_PROF.length];idx++;} });
    return map;
  },[reservas]);

  const profesionales = useMemo(()=>esAdmin?Object.keys(colorMap):usuario?.nombre?[usuario.nombre]:[],[colorMap,esAdmin,usuario]);
  const todayKey = useMemo(()=>dateKey(new Date()),[]);
  const horasRange = Array.from({length:14},(_,i)=>i+8);

  function hayConflicto(consultorio,fecha,hi,hf,excId=null) {
    const key=dateKey(fecha),dow=fecha.getDay();
    return reservas.some(r=>{
      if(r.id===excId||r.consultorio!==consultorio) return false;
      const ok=r.fecha===key||(r.repeteSemanal&&new Date(r.fecha+"T12:00:00").getDay()===dow&&new Date(r.fecha+"T12:00:00")<=fecha);
      return ok&&hi<r.horaFin&&hf>r.horaInicio;
    });
  }

  const puedeEditarFn = useCallback((r)=>esAdmin||r.profesional===usuario?.nombre,[esAdmin,usuario]);

  function resetFlujo() { setPaso(null);setFlujoDia(null);setFlujoConsultorio(null);setFlujoHoras([]); }

  const onToggleHora = useCallback((consultorio, fecha, hora) => {
    const misma = flujoDia && dateKey(flujoDia)===dateKey(fecha) && flujoConsultorio===consultorio;
    if (misma) {
      setFlujoHoras(prev=>prev.includes(hora)?prev.filter(h=>h!==hora):[...prev,hora].sort((a,b)=>a-b));
      setPaso("horas");
    } else {
      setFlujoDia(fecha); setFlujoConsultorio(consultorio);
      setFlujoHoras([hora]); setPaso("horas");
    }
  },[flujoDia, flujoConsultorio]);

  const onSeleccionarDia = useCallback((fecha)=>{
    if(esPublico){onLogin();return;}
    setFlujoDia(fecha);setFlujoConsultorio(null);setFlujoHoras([]);setPaso("consultorio");
  },[esPublico,onLogin]);

  const onClickReserva = useCallback((r)=>setPopupReserva(r),[]);

  const onOpenEditar = useCallback((r)=>{
    setEditandoReserva(r);
    setForm({profesional:r.profesional,horaInicio:r.horaInicio,horaFin:r.horaFin,repeteSemanal:r.repeteSemanal});
    setErrorSolapamiento("");
  },[]);

  // Asociar reserva a usuario registrado — actualiza la reserva y notifica al usuario
  async function asociarUsuarioAReserva(reserva, emailUsuario) {
    try {
      const usuarioData = usuarios?.find(u => u.email === emailUsuario);
      // Actualizar la reserva con el email asociado y nombre del usuario
      await actualizarReserva(reserva.id, {
        ...reserva,
        profesional: usuarioData?.nombre || reserva.profesional,
        emailAsociado: emailUsuario,
      });
      // Notificar al usuario en su Tab Inicio
      await addDoc(collection(db,"notificaciones"), {
        para: emailUsuario,
        paraNombre: usuarioData?.nombre || emailUsuario,
        de: usuario?.email || "admin",
        deNombre: usuario?.nombre || "Admin",
        tipo: "reserva_asignada",
        reservaId: reserva.id || null,
        consultorio: reserva.consultorio,
        fecha: reserva.fecha,
        horaInicio: reserva.horaInicio,
        horaFin: reserva.horaFin,
        mensaje: `Se te asignó una reserva en ${reserva.consultorio} el ${new Date(reserva.fecha+"T12:00:00").toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long"})} de ${reserva.horaInicio}:00 a ${reserva.horaFin}:00.`,
        leida: false,
        creadoEn: serverTimestamp(),
      });
      showToast(`Reserva asociada a ${usuarioData?.nombre || emailUsuario} ✓`);
    } catch(e) {
      showToast("Error al asociar","warn");
    }
  }
  async function enviarNotificacion(reserva, mensaje, emailDestino) {
    try {
      await addDoc(collection(db,"notificaciones"), {
        para: emailDestino || reserva.profesional,
        paraNombre: reserva.profesional,
        de: usuario?.email || "admin",
        deNombre: usuario?.nombre || "Admin",
        tipo: "admin_reserva",
        reservaId: reserva.id || null,
        consultorio: reserva.consultorio,
        fecha: reserva.fecha,
        horaInicio: reserva.horaInicio,
        horaFin: reserva.horaFin,
        mensaje,
        leida: false,
        creadoEn: serverTimestamp(),
      });
      showToast("Notificación enviada ✓");
    } catch(e) {
      showToast("Error al enviar notificación","warn");
    }
  }

  async function confirmarReserva() {
    if(!flujoDia||!flujoConsultorio||flujoHoras.length===0) return;
    const hi=Math.min(...flujoHoras),hf=Math.max(...flujoHoras)+1;
    const prof=esAdmin?form.profesional:usuario?.nombre;
    if(!prof?.trim()) return;
    if(hayConflicto(flujoConsultorio,flujoDia,hi,hf)){setErrorSolapamiento("⚠️ Hay un conflicto en ese horario.");return;}
    await agregarReserva({profesional:prof.trim(),consultorio:flujoConsultorio,fecha:dateKey(flujoDia),horaInicio:hi,horaFin:hf,repeteSemanal:form.repeteSemanal,creadoPor:usuario?.email});
    showToast("Reserva guardada ✓");
    setModal(null);setErrorSolapamiento("");resetFlujo();
    setForm({profesional:"",horaInicio:8,horaFin:9,repeteSemanal:false});
  }

  async function guardarEdicion() {
    const r=editandoReserva;
    if(!form.profesional.trim()||form.horaFin<=form.horaInicio) return;
    if(hayConflicto(r.consultorio,new Date(r.fecha+"T12:00:00"),parseInt(form.horaInicio),parseInt(form.horaFin),r.id)){setErrorSolapamiento("⚠️ Ese horario ya está ocupado.");return;}
    await actualizarReserva(r.id,{...r,profesional:form.profesional.trim(),horaInicio:parseInt(form.horaInicio),horaFin:parseInt(form.horaFin),repeteSemanal:form.repeteSemanal});
    showToast("Reserva actualizada ✓");setEditandoReserva(null);setErrorSolapamiento("");
  }

  async function borrarReserva(id) { await eliminarReserva(id);setConfirmDelete(null);showToast("Reserva eliminada","warn"); }

  const inp={width:"100%",padding:"10px 12px",borderRadius:10,border:"1px solid rgba(124,106,255,0.2)",fontSize:13,marginBottom:12,boxSizing:"border-box",outline:"none",background:"rgba(14,12,28,0.8)",color:"white"};
  const lbl={display:"block",fontSize:11,fontWeight:700,color:"#a0a8c0",marginBottom:4,textTransform:"uppercase",letterSpacing:.5};

  const pasoActivo = paso!==null;
  const diaLabel = flujoDia?flujoDia.toLocaleDateString("es-AR",{weekday:"short",day:"numeric",month:"short"}):null;
  const consLabel = flujoConsultorio?`C${CONSULTORIOS.indexOf(flujoConsultorio)+3}`:null;
  const horasLabel = flujoHoras.length>0?(()=>{const hi=Math.min(...flujoHoras),hf=Math.max(...flujoHoras)+1;return`${hi}:00–${hf}:00 (${flujoHoras.length}h)`;})():null;
  const stickyVisible = scrollY > 80;

  const grilaProps = {
    weekDates, zoom, lineaPct, todayKey,
    reservas, colorMap, flujoHoras, flujoDia, flujoConsultorio, paso,
    esPublico, puedeEditarFn,
    onToggleHora, onLogin, onClickReserva, onSeleccionarDia,
  };

  return (
    <div ref={outerRef} style={{ height:"100vh", overflowY:"auto", overflowX:"hidden", background:"#000" }} className="tab-content">

      {/* STICKY BAR */}
      <div style={{ position:"fixed", top:0, left:0, right:0, zIndex:50, background:stickyVisible?"rgba(0,0,0,0.92)":"transparent", backdropFilter:stickyVisible?"blur(24px)":"none", WebkitBackdropFilter:stickyVisible?"blur(24px)":"none", borderBottom:stickyVisible?"1px solid rgba(124,106,255,0.15)":"none", transition:"all 0.3s", padding:stickyVisible?"10px 20px":"0", height:stickyVisible?44:0, overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontSize:14, fontWeight:800, color:"white" }}>Reservas</span>
        <span style={{ fontSize:11, color:"#7c6aff", fontWeight:700, letterSpacing:2 }}>GRINS</span>
      </div>

      {/* HERO HEADER */}
      <div style={{ background:"linear-gradient(180deg,#0a0a14 0%,#000 100%)", padding:"54px 20px 20px" }}>
        <div style={{ textAlign:"center", marginBottom:16 }}>
          <img src="/logohead.jpeg" alt="GRINS" style={{ height:36, objectFit:"contain", opacity:0.9 }}/>
        </div>
        <div style={{ background:"rgba(14,12,28,0.7)", borderRadius:16, padding:"14px 16px", border:"1px solid rgba(124,106,255,0.15)" }}>
          <div style={{ fontSize:13, fontWeight:800, color:"white", marginBottom:10 }}>Cómo reservar</div>
          {[{n:"1",c:"#667eea",t:"Tocá una celda libre — detecta día y consultorio solo"},{n:"2",c:"#7c6aff",t:"Seleccioná todas las horas que necesitás"},{n:"3",c:"#38a169",t:"Tocá + para confirmar"}].map(s=>(
            <div key={s.n} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
              <div style={{ width:22, height:22, borderRadius:"50%", background:`linear-gradient(135deg,${s.c},${s.c}99)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:"white", flexShrink:0 }}>{s.n}</div>
              <span style={{ fontSize:12, color:"#a0a8c0" }}>{s.t}</span>
            </div>
          ))}
          <div style={{ marginTop:8, padding:"7px 10px", background:"rgba(124,106,255,0.08)", borderRadius:10, fontSize:10, color:"#4a5270" }}>
            🤏 Pellizco para hacer zoom · tocá un bloque reservado para ver detalles
          </div>
        </div>
      </div>

      {/* NAV SEMANA */}
      {!verPagos && (
        <div style={{ padding:"10px 14px 8px", background:"#000", position:"sticky", top:0, zIndex:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <button onClick={()=>setWeekOffset(w=>w-1)} style={{ width:32, height:32, borderRadius:9, border:"1px solid rgba(124,106,255,0.2)", background:"rgba(14,12,28,0.8)", cursor:"pointer", color:"white", fontSize:15, display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>
            <span style={{ flex:1, textAlign:"center", fontWeight:700, fontSize:11, color:"#a0a8c0" }}>
              {weekDates[0].toLocaleDateString("es-AR",{day:"numeric",month:"short"})} – {weekDates[5].toLocaleDateString("es-AR",{day:"numeric",month:"short"})}
            </span>
            <button onClick={()=>setWeekOffset(w=>w+1)} style={{ width:32, height:32, borderRadius:9, border:"1px solid rgba(124,106,255,0.2)", background:"rgba(14,12,28,0.8)", cursor:"pointer", color:"white", fontSize:15, display:"flex", alignItems:"center", justifyContent:"center" }}>›</button>
            <button onClick={()=>setWeekOffset(0)} style={{ padding:"0 10px", height:32, borderRadius:9, border:"1px solid rgba(124,106,255,0.2)", background:"rgba(14,12,28,0.8)", cursor:"pointer", color:"#a0a8c0", fontSize:10, fontWeight:600 }}>Hoy</button>
          </div>
        </div>
      )}

      {/* AGENDA */}
      {!verPagos && (
        <div style={{ paddingBottom:220 }}>
          <Grilla {...grilaProps}/>
        </div>
      )}

      {/* PAGOS */}
      {verPagos && !esPublico && (
        <div style={{ padding:"16px 14px 220px" }}>
          <div style={{ background:"rgba(14,12,28,0.9)", borderRadius:18, marginBottom:18, overflow:"hidden", border:"1px solid rgba(124,106,255,0.2)" }}>
            <div style={{ height:3, background:"linear-gradient(90deg,#667eea,#764ba2)" }}/>
            <div style={{ padding:"14px 16px" }}>
              <div style={{ fontSize:13, fontWeight:800, color:"white", marginBottom:2 }}>💳 Datos de pago</div>
              <div style={{ fontSize:11, color:"#4a5270", marginBottom:14 }}>Patricio Grinschpun · DNI 32.669.760</div>
              {[
                {icon:"S",color:"#ec0000",nombre:"Banco Santander",rows:[["Alias CBU","patogrins"],["Cuenta Pesos","740-352653/8"],["CBU","0720740488000035265386"]]},
                {icon:"MP",color:"#009ee3",nombre:"Mercado Pago",rows:[["Alias","patogrins.mp"]]},
                {icon:"#",color:"#4a5270",nombre:"CVU",rows:[["CVU","0000003100019986606962"]]},
              ].map(banco=>(
                <div key={banco.nombre} style={{ background:"rgba(255,255,255,0.03)", borderRadius:12, padding:"10px 14px", marginBottom:8, border:"1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                    <div style={{ width:28, height:28, borderRadius:8, background:banco.color, display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{ fontSize:9, fontWeight:900, color:"white" }}>{banco.icon}</span></div>
                    <span style={{ fontSize:12, fontWeight:700, color:"white" }}>{banco.nombre}</span>
                  </div>
                  {banco.rows.map(([label,value])=>(
                    <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                      <span style={{ fontSize:10, color:"#4a5270" }}>{label}</span>
                      <span style={{ fontSize:11, fontWeight:700, color:"#a0a8c0", fontFamily:"monospace" }}>{value}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
            <button onClick={()=>setMesOffset(m=>m-1)} style={{ width:34, height:34, borderRadius:10, border:"1px solid rgba(124,106,255,0.2)", background:"rgba(14,12,28,0.8)", cursor:"pointer", color:"white", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>‹</button>
            <span style={{ flex:1, textAlign:"center", fontWeight:700, fontSize:13, color:"white", textTransform:"capitalize" }}>{mesLabel}</span>
            <button onClick={()=>setMesOffset(m=>m+1)} style={{ width:34, height:34, borderRadius:10, border:"1px solid rgba(124,106,255,0.2)", background:"rgba(14,12,28,0.8)", cursor:"pointer", color:"white", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>›</button>
            <button onClick={()=>setMesOffset(0)} style={{ padding:"0 10px", height:34, borderRadius:10, border:"1px solid rgba(124,106,255,0.2)", background:"rgba(14,12,28,0.8)", cursor:"pointer", color:"#a0a8c0", fontSize:11 }}>Hoy</button>
            {esAdmin&&<button onClick={()=>exportarCSV(profesionales,reservas,mesStr)} style={{ padding:"0 12px", height:34, borderRadius:10, border:"none", background:"linear-gradient(135deg,#667eea,#764ba2)", color:"white", fontSize:11, fontWeight:700, cursor:"pointer" }}>⬇ CSV</button>}
          </div>
          {esAdmin&&profesionales.length>0&&(()=>{
            const total=profesionales.reduce((a,p)=>a+calcPagos(reservas,p,mesStr).totalMes,0);
            return <div style={{ background:"rgba(14,12,28,0.9)", borderRadius:14, padding:"14px 18px", marginBottom:14, display:"flex", justifyContent:"space-between", border:"1px solid rgba(124,106,255,0.15)" }}><span style={{ color:"#a0a8c0", fontWeight:700, fontSize:12 }}>Total {mesLabel}</span><span style={{ color:"white", fontWeight:900, fontSize:20 }}>{fmtCurrency(total)}</span></div>;
          })()}
          {profesionales.map(prof=>{
            const{totalMes,detalle}=calcPagos(reservas,prof,mesStr);
            const col=colorMap[prof]||COLORES_PROF[0];
            return (
              <div key={prof} style={{ background:"rgba(14,12,28,0.8)", borderRadius:14, marginBottom:12, overflow:"hidden", border:"1px solid rgba(124,106,255,0.1)" }}>
                <div style={{ background:col.bg, padding:"11px 16px", display:"flex", justifyContent:"space-between" }}>
                  <span style={{ color:"white", fontWeight:800, fontSize:14 }}>👤 {prof}</span>
                  <span style={{ color:"white", fontWeight:900, fontSize:18 }}>{fmtCurrency(totalMes)}</span>
                </div>
                {detalle.length===0?<p style={{ padding:"12px 16px", color:"#4a5270", fontSize:12, margin:0 }}>Sin reservas este mes.</p>:(
                  <div style={{ padding:10 }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                      <thead><tr style={{ color:"#4a5270" }}>{["Consultorio","Fecha","Horario","Tipo","Horas","Monto"].map(h=><th key={h} style={{ textAlign:h==="Monto"||h==="Horas"?"right":"left", padding:"4px 6px", fontWeight:600 }}>{h}</th>)}</tr></thead>
                      <tbody>{detalle.map(d=>(
                        <tr key={d.id} style={{ borderTop:"1px solid rgba(124,106,255,0.08)" }}>
                          <td style={{ padding:"5px 6px", color:"white" }}>{d.consultorio}</td>
                          <td style={{ padding:"5px 6px", color:"#a0a8c0" }}>{new Date(d.fecha+"T12:00:00").toLocaleDateString("es-AR",{day:"numeric",month:"short"})}</td>
                          <td style={{ padding:"5px 6px", color:"white" }}>{d.horaInicio}:00–{d.horaFin}:00</td>
                          <td style={{ padding:"5px 6px" }}><span style={{ background:"rgba(124,106,255,0.15)", color:"#7c6aff", borderRadius:4, padding:"1px 7px", fontSize:10, fontWeight:700 }}>{d.tipo}</span></td>
                          <td style={{ padding:"5px 6px", textAlign:"right", color:"#a0a8c0" }}>{d.horas}h{d.tipo==="Semanal"?` × ${d.occ}`:""}</td>
                          <td style={{ padding:"5px 6px", textAlign:"right", fontWeight:800, color:"white" }}>{fmtCurrency(d.montoMes)}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* FOOTER AGENDA */}
      {!verPagos && (
        <div style={{ position:"fixed", bottom:90, left:"50%", transform:"translateX(-50%)", zIndex:60, display:"flex", flexDirection:"column", alignItems:"center", gap:6, width:"calc(100% - 32px)", maxWidth:340 }}>
          <div style={{ display:"flex", alignItems:"center", width:"100%", background:"rgba(10,10,20,0.92)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", border:"1px solid rgba(124,106,255,0.2)", borderRadius:22, padding:"8px 12px", boxShadow:"0 8px 32px rgba(0,0,0,0.4)", position:"relative", minHeight:66 }}>
            <div style={{ flex:1, minWidth:0, paddingRight:60 }}>
              {!pasoActivo ? (
                <p style={{ margin:0, fontSize:10, color:"#4a5270" }}>Tocá una celda libre para reservar</p>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  {[{n:"1",label:diaLabel||"Elegí un día",done:!!diaLabel,color:"#667eea"},{n:"2",label:consLabel?flujoConsultorio:"Elegí consultorio",done:!!consLabel,color:"#7c6aff"},{n:"3",label:horasLabel||"Seleccioná horarios",done:!!horasLabel,color:"#38a169"}].map(s=>(
                    <div key={s.n} style={{ display:"flex", alignItems:"center", gap:5 }}>
                      <div style={{ width:15, height:15, borderRadius:"50%", background:s.done?`linear-gradient(135deg,${s.color},${s.color}99)`:"rgba(124,106,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, fontWeight:800, color:"white", flexShrink:0 }}>{s.n}</div>
                      <span style={{ fontSize:10, color:s.done?"white":"#4a5270", fontWeight:s.done?700:400, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {pasoActivo && (
              <div style={{ position:"absolute", left:"50%", transform:"translateX(calc(-50% - 34px))" }}>
                <button onClick={resetFlujo} style={{ width:28, height:28, borderRadius:"50%", background:"rgba(239,83,80,0.15)", border:"1.5px solid rgba(239,83,80,0.4)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ef5350" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            )}
            <div style={{ position:"absolute", left:"50%", transform:"translateX(-50%)" }}>
              <button onClick={()=>{ if(!pasoActivo||flujoHoras.length===0) return; setForm({profesional:esAdmin?"":usuario?.nombre||"",horaInicio:Math.min(...flujoHoras),horaFin:Math.max(...flujoHoras)+1,repeteSemanal:false}); setModal("confirmar");setErrorSolapamiento(""); }}
                style={{ width:50, height:50, borderRadius:"50%", border:"none", background:flujoHoras.length>0?"linear-gradient(135deg,#667eea,#764ba2)":"rgba(124,106,255,0.15)", color:flujoHoras.length>0?"white":"#4a5270", fontSize:26, cursor:flujoHoras.length>0?"pointer":"not-allowed", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:flujoHoras.length>0?"0 4px 16px rgba(124,106,255,0.5)":"none", transition:"all 0.2s" }}>+</button>
            </div>
            <div style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", display:"flex", flexDirection:"column", alignItems:"center", gap:4, width:56 }}>
              <div style={{ display:"flex", width:56 }}>
                {["1×","2×","3×","4×"].map((z,i)=>(
                  <span key={i} style={{ fontSize:7, color:Math.round(zoom-1)===i?"#7c6aff":"#3a3a5a", fontWeight:Math.round(zoom-1)===i?800:500, flex:1, textAlign:"center" }}>{z}</span>
                ))}
              </div>
              <input type="range" min={1} max={4} step={0.05} value={zoom}
                onChange={e=>{
                  const el=outerRef.current;
                  const scrollTop=el?.scrollTop||0, clientH=el?.clientHeight||window.innerHeight, scrollH=el?.scrollHeight||1;
                  const centerPct=scrollH>clientH?(scrollTop+clientH/2)/scrollH:0.5;
                  setZoom(Number(e.target.value));
                  requestAnimationFrame(()=>requestAnimationFrame(()=>{ if(el) el.scrollTop=Math.max(0,centerPct*el.scrollHeight-clientH/2); }));
                }}
                style={{ width:56, height:4, cursor:"pointer", accentColor:"#7c6aff", borderRadius:4, outline:"none", WebkitAppearance:"none", background:`linear-gradient(to right,#7c6aff ${(zoom-1)/3*100}%,rgba(124,106,255,0.2) ${(zoom-1)/3*100}%)` }}
              />
            </div>
          </div>
          <button onClick={()=>setVerPagos(true)} style={{ width:"100%", background:"rgba(14,12,28,0.85)", backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)", border:"1px solid rgba(124,106,255,0.18)", borderRadius:16, padding:"9px", color:"#a0a8c0", fontSize:11, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a0a8c0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
            Mis reservas
          </button>
        </div>
      )}

      {verPagos && (
        <div style={{ position:"fixed", bottom:90, left:"50%", transform:"translateX(-50%)", zIndex:60, width:"calc(100% - 32px)", maxWidth:340 }}>
          <button onClick={()=>setVerPagos(false)} style={{ width:"100%", padding:"10px", borderRadius:16, border:"1px solid rgba(124,106,255,0.25)", background:"rgba(14,12,28,0.9)", backdropFilter:"blur(16px)", color:"#7c6aff", fontWeight:700, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c6aff" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            Volver a la agenda
          </button>
        </div>
      )}

      {/* POPUP RESERVA */}
      {popupReserva && (
        <PopupReserva
          reserva={popupReserva} colorMap={colorMap} usuarios={usuarios}
          esAdmin={esAdmin}
          puedeEditar={puedeEditarFn(popupReserva)}
          onClose={()=>setPopupReserva(null)}
          onEditar={(r)=>{onOpenEditar(r);setPopupReserva(null);}}
          onEliminar={(id)=>{setConfirmDelete(id);setPopupReserva(null);}}
          onNotificar={(r)=>{setModalNotificar(r);setPopupReserva(null);}}
          onAsociarUsuario={asociarUsuarioAReserva}
        />
      )}

      {/* MODAL NOTIFICAR */}
      {modalNotificar && (
        <ModalNotificar
          reserva={modalNotificar} usuarios={usuarios}
          onClose={()=>setModalNotificar(null)}
          onEnviar={enviarNotificacion}
        />
      )}

      {/* MODAL CONFIRMAR */}
      {modal==="confirmar" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:2000 }}>
          <div style={{ background:"#0a0a14", borderRadius:"24px 24px 0 0", padding:"20px 20px 44px", width:"100%", maxWidth:500, border:"1px solid rgba(124,106,255,0.2)", animation:"slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}>
            <div style={{ width:36, height:4, borderRadius:2, background:"rgba(255,255,255,0.1)", margin:"0 auto 16px" }}/>
            <h3 style={{ margin:"0 0 3px", fontSize:17, fontWeight:800, color:"white" }}>Confirmar reserva</h3>
            <p style={{ margin:"0 0 14px", fontSize:12, color:"#a0a8c0" }}>Revisá los detalles antes de confirmar</p>
            <div style={{ background:"rgba(124,106,255,0.08)", borderRadius:14, padding:"12px 16px", marginBottom:14, border:"1px solid rgba(124,106,255,0.15)" }}>
              {[["📅 Día",flujoDia?.toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long"})],["🏢 Consultorio",flujoConsultorio],["⏰ Horario",flujoHoras.length>0?`${Math.min(...flujoHoras)}:00 – ${Math.max(...flujoHoras)+1}:00`:""],["🕐 Duración",`${flujoHoras.length} hora${flujoHoras.length>1?"s":""}`],["💰 Total",fmtCurrency(flujoHoras.length*HORA_PRECIO)]].map(([l,v])=>(
                <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid rgba(124,106,255,0.08)" }}>
                  <span style={{ fontSize:12, color:"#a0a8c0" }}>{l}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:"white" }}>{v}</span>
                </div>
              ))}
            </div>
            <label style={lbl}>Profesional</label>
            {esAdmin?<><input list="plist" value={form.profesional} onChange={e=>setForm(f=>({...f,profesional:e.target.value}))} placeholder="Nombre del/la profesional" style={inp}/><datalist id="plist">{Object.keys(colorMap).map(p=><option key={p} value={p}/>)}</datalist></>:<div style={{...inp,color:"#a0a8c0",marginBottom:12}}>{form.profesional}</div>}
            <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", marginBottom:16 }}>
              <input type="checkbox" checked={form.repeteSemanal} onChange={e=>setForm(f=>({...f,repeteSemanal:e.target.checked}))} style={{ width:16, height:16 }}/>
              <span style={{ fontSize:13, color:"white" }}>Repetir semanalmente</span>
            </label>
            {errorSolapamiento&&<div style={{ background:"rgba(239,83,80,0.1)", border:"1px solid rgba(239,83,80,0.3)", borderRadius:8, padding:"8px 12px", marginBottom:12, fontSize:12, color:"#ef5350", fontWeight:600 }}>{errorSolapamiento}</div>}
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>{setModal(null);setErrorSolapamiento("");}} style={{ flex:1, padding:12, borderRadius:12, border:"1px solid rgba(124,106,255,0.2)", background:"transparent", cursor:"pointer", fontSize:13, color:"#a0a8c0", fontWeight:600 }}>Cancelar</button>
              <button onClick={confirmarReserva} disabled={esAdmin&&!form.profesional.trim()} style={{ flex:2, padding:12, borderRadius:12, border:"none", fontWeight:800, fontSize:13, cursor:"pointer", color:"white", background:"linear-gradient(135deg,#667eea,#764ba2)" }}>✓ Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR */}
      {editandoReserva && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:2000 }}>
          <div style={{ background:"#0a0a14", borderRadius:"24px 24px 0 0", padding:"20px 20px 44px", width:"100%", maxWidth:500, border:"1px solid rgba(124,106,255,0.2)", animation:"slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}>
            <div style={{ width:36, height:4, borderRadius:2, background:"rgba(255,255,255,0.1)", margin:"0 auto 16px" }}/>
            <h3 style={{ margin:"0 0 3px", fontSize:17, fontWeight:800, color:"white" }}>Editar reserva</h3>
            <p style={{ margin:"0 0 16px", fontSize:12, color:"#a0a8c0" }}>{editandoReserva.consultorio} · {new Date(editandoReserva.fecha+"T12:00:00").toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long"})}</p>
            <label style={lbl}>Profesional</label>
            {esAdmin?<><input list="plist2" value={form.profesional} onChange={e=>setForm(f=>({...f,profesional:e.target.value}))} style={inp}/><datalist id="plist2">{Object.keys(colorMap).map(p=><option key={p} value={p}/>)}</datalist></>:<div style={{...inp,color:"#a0a8c0"}}>{form.profesional}</div>}
            {esAdmin&&<><label style={lbl}>Consultorio</label><select value={editandoReserva.consultorio} onChange={e=>setEditandoReserva(r=>({...r,consultorio:e.target.value}))} style={inp}>{CONSULTORIOS.map(c=><option key={c} value={c}>{c}</option>)}</select></>}
            <div style={{ display:"flex", gap:10 }}>
              <div style={{ flex:1 }}><label style={lbl}>Desde</label><select value={form.horaInicio} onChange={e=>setForm(f=>({...f,horaInicio:parseInt(e.target.value),horaFin:Math.max(parseInt(e.target.value)+1,f.horaFin)}))} style={inp}>{horasRange.slice(0,-1).map(h=><option key={h} value={h}>{h}:00</option>)}</select></div>
              <div style={{ flex:1 }}><label style={lbl}>Hasta</label><select value={form.horaFin} onChange={e=>setForm(f=>({...f,horaFin:parseInt(e.target.value)}))} style={inp}>{horasRange.filter(h=>h>form.horaInicio).map(h=><option key={h} value={h}>{h}:00</option>)}</select></div>
            </div>
            <div style={{ background:"rgba(124,106,255,0.08)", borderRadius:10, padding:"10px 14px", marginBottom:12, display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontSize:13, color:"#a0a8c0" }}>{form.horaFin-form.horaInicio}h × ${HORA_PRECIO.toLocaleString("es-AR")}</span>
              <span style={{ fontWeight:800, color:"white" }}>{fmtCurrency((form.horaFin-form.horaInicio)*HORA_PRECIO)}</span>
            </div>
            <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", marginBottom:18 }}>
              <input type="checkbox" checked={form.repeteSemanal} onChange={e=>setForm(f=>({...f,repeteSemanal:e.target.checked}))} style={{ width:16, height:16 }}/>
              <span style={{ fontSize:13, color:"white" }}>Repetir semanalmente</span>
            </label>
            {errorSolapamiento&&<div style={{ background:"rgba(239,83,80,0.1)", border:"1px solid rgba(239,83,80,0.3)", borderRadius:8, padding:"8px 12px", marginBottom:12, fontSize:12, color:"#ef5350", fontWeight:600 }}>{errorSolapamiento}</div>}
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>{setEditandoReserva(null);setErrorSolapamiento("");}} style={{ flex:1, padding:12, borderRadius:12, border:"1px solid rgba(124,106,255,0.2)", background:"transparent", cursor:"pointer", fontSize:13, color:"#a0a8c0", fontWeight:600 }}>Cancelar</button>
              <button onClick={guardarEdicion} disabled={!form.profesional.trim()} style={{ flex:2, padding:12, borderRadius:12, border:"none", fontWeight:800, fontSize:13, cursor:"pointer", color:"white", background:"linear-gradient(135deg,#667eea,#764ba2)" }}>Actualizar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ELIMINAR */}
      {confirmDelete && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:2000 }}>
          <div style={{ background:"#0a0a14", borderRadius:"24px 24px 0 0", padding:"20px 20px 44px", width:"100%", maxWidth:500, textAlign:"center", border:"1px solid rgba(124,106,255,0.2)" }}>
            <div style={{ width:36, height:4, borderRadius:2, background:"rgba(255,255,255,0.1)", margin:"0 auto 16px" }}/>
            <div style={{ fontSize:36, marginBottom:10 }}>🗑️</div>
            <h3 style={{ margin:"0 0 8px", color:"white", fontSize:16, fontWeight:800 }}>¿Eliminar esta reserva?</h3>
            <p style={{ margin:"0 0 20px", color:"#a0a8c0", fontSize:13 }}>Esta acción no se puede deshacer.</p>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setConfirmDelete(null)} style={{ flex:1, padding:12, borderRadius:12, border:"1px solid rgba(124,106,255,0.2)", background:"transparent", cursor:"pointer", fontSize:13, fontWeight:600, color:"#a0a8c0" }}>Cancelar</button>
              <button onClick={()=>borrarReserva(confirmDelete)} style={{ flex:1, padding:12, borderRadius:12, border:"none", background:"#ef4444", color:"white", cursor:"pointer", fontSize:13, fontWeight:800 }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp { from { transform:translateY(100%); opacity:0; } to { transform:none; opacity:1; } }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:14px; height:14px; border-radius:50%; background:#7c6aff; cursor:pointer; box-shadow:0 0 6px rgba(124,106,255,0.6); }
        input[type=range]::-webkit-slider-runnable-track { height:4px; border-radius:4px; }
      `}</style>
    </div>
  );
}
