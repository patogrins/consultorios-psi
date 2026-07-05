import { useState, useMemo, useRef, useEffect } from "react";

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

function getWeekDates(offset = 0) {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i); return d;
  });
}

function dateKey(date) { return date.toISOString().slice(0, 10); }
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
    rows.push([prof,"","","","TOTAL","","",calcPagos(reservas,prof,mesStr).totalMes].join(""),"");
  });
  const blob = new Blob([rows.join("\n")],{type:"text/csv"});
  const a = document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`pagos_${mesStr}.csv`; a.click();
}

function getLineaPct() {
  const n = new Date();
  return Math.max(0,Math.min(((n.getHours()-8)*60+n.getMinutes())/(14*60),1));
}

export default function TabReservas({ usuario, esAdmin, esPublico, reservas=[], agregarReserva, actualizarReserva, eliminarReserva, showToast, onLogin }) {
  const [zoom, setZoom] = useState(1);
  const [weekOffset, setWeekOffset] = useState(0);
  const [mesOffset, setMesOffset] = useState(0);
  const [diaSelIdx, setDiaSelIdx] = useState(() => { const d=new Date().getDay(); return d===0?0:d-1; });
  const [consultorioSel, setConsultorioSel] = useState(0);

  // Flujo guiado
  const [paso, setPaso] = useState(null);
  const [flujoDia, setFlujoDia] = useState(null);
  const [flujoConsultorio, setFlujoConsultorio] = useState(null);
  const [flujoHoras, setFlujoHoras] = useState([]);

  const [verPagos, setVerPagos] = useState(false);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ profesional:"", horaInicio:8, horaFin:9, repeteSemanal:false });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [errorSolapamiento, setErrorSolapamiento] = useState("");
  const [editandoReserva, setEditandoReserva] = useState(null);
  const [lineaPct, setLineaPct] = useState(getLineaPct());
  const [scrollY, setScrollY] = useState(0);

  const pinchRef = useRef(null);
  const lastDist = useRef(null);
  const scrollPosRef = useRef(0);

  function cambiarZoom(z) {
    if (pinchRef.current) scrollPosRef.current = pinchRef.current.scrollTop;
    setZoom(z);
  }
  useEffect(() => {
    if (pinchRef.current && scrollPosRef.current > 0) pinchRef.current.scrollTop = scrollPosRef.current;
  }, [zoom]);

  useEffect(() => { const i=setInterval(()=>setLineaPct(getLineaPct()),60000); return()=>clearInterval(i); },[]);

  useEffect(() => {
    const meta = document.querySelector("meta[name=viewport]");
    if (meta) meta.content = "width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no";
    return () => { if (meta) meta.content="width=device-width,initial-scale=1"; };
  },[]);

  // Scroll listener para sticky bar
  useEffect(() => {
    const el = pinchRef.current; if (!el) return;
    const onScroll = () => setScrollY(el.scrollTop);
    el.addEventListener("scroll", onScroll, { passive:true });
    return () => el.removeEventListener("scroll", onScroll);
  },[]);

  // Pinch zoom
  useEffect(() => {
    const el = pinchRef.current; if (!el) return;
    function dist(t) { const dx=t[0].clientX-t[1].clientX,dy=t[0].clientY-t[1].clientY; return Math.sqrt(dx*dx+dy*dy); }
    function onStart(e) { if (e.touches.length===2){e.preventDefault();lastDist.current=dist(e.touches);} }
    function onMove(e) {
      if (e.touches.length!==2||!lastDist.current) return;
      e.preventDefault();
      const d=dist(e.touches),delta=d-lastDist.current;
      if (Math.abs(delta)>25) { cambiarZoom(prev=>delta>0?Math.min(prev+1,4):Math.max(prev-1,1)); lastDist.current=null; }
    }
    function onEnd() { lastDist.current=null; }
    el.addEventListener("touchstart",onStart,{passive:false});
    el.addEventListener("touchmove",onMove,{passive:false});
    el.addEventListener("touchend",onEnd);
    return ()=>{ el.removeEventListener("touchstart",onStart); el.removeEventListener("touchmove",onMove); el.removeEventListener("touchend",onEnd); };
  },[]);

  const weekDates = useMemo(()=>getWeekDates(weekOffset),[weekOffset]);
  const mesStr = useMemo(()=>{ const d=new Date(); d.setMonth(d.getMonth()+mesOffset); return d.toISOString().slice(0,7); },[mesOffset]);
  const mesLabel = useMemo(()=>{ const[y,m]=mesStr.split("-"); return new Date(parseInt(y),parseInt(m)-1,1).toLocaleDateString("es-AR",{month:"long",year:"numeric"}); },[mesStr]);

  const colorMap = useMemo(()=>{
    const map={}; let idx=0;
    reservas.forEach(r=>{ if(r.profesional&&!map[r.profesional]){map[r.profesional]=COLORES_PROF[idx%COLORES_PROF.length];idx++;} });
    return map;
  },[reservas]);

  const profesionales = useMemo(()=>esAdmin?Object.keys(colorMap):usuario?.nombre?[usuario.nombre]:[],[colorMap,esAdmin,usuario]);
  const todayKey = dateKey(new Date());
  const horaActual = new Date().getHours();
  const horasRange = Array.from({length:14},(_,i)=>i+8);

  function hayConflicto(consultorio,fecha,hi,hf,excId=null) {
    const key=dateKey(fecha),dow=fecha.getDay();
    return reservas.some(r=>{
      if(r.id===excId||r.consultorio!==consultorio) return false;
      const ok=r.fecha===key||(r.repeteSemanal&&new Date(r.fecha+"T12:00:00").getDay()===dow&&new Date(r.fecha+"T12:00:00")<=fecha);
      return ok&&hi<r.horaFin&&hf>r.horaInicio;
    });
  }
  function puedeEditar(r) { return esAdmin||r.profesional===usuario?.nombre; }

  function getReservasBloque(consultorio,fecha,hora) {
    const key=dateKey(fecha),dow=fecha.getDay();
    return reservas.filter(r=>{
      if(r.consultorio!==consultorio||hora<r.horaInicio||hora>=r.horaFin) return false;
      if(r.fecha===key) return true;
      if(r.repeteSemanal){const o=new Date(r.fecha+"T12:00:00");return o.getDay()===dow&&o<=fecha;}
      return false;
    });
  }

  function resetFlujo() { setPaso(null);setFlujoDia(null);setFlujoConsultorio(null);setFlujoHoras([]); }

  function seleccionarDia(fecha) {
    if(esPublico){onLogin();return;}
    setFlujoDia(fecha);setFlujoConsultorio(null);setFlujoHoras([]);
    setDiaSelIdx(weekDates.findIndex(d=>dateKey(d)===dateKey(fecha)));
    setPaso("consultorio");cambiarZoom(3);
  }
  function seleccionarConsultorio(ci) {
    if(!flujoDia) return;
    setFlujoConsultorio(CONSULTORIOS[ci]);setFlujoHoras([]);
    setConsultorioSel(ci);setPaso("horas");cambiarZoom(4);
  }
  function toggleHora(hora) {
    if(!flujoConsultorio||!flujoDia) return;
    if(getReservasBloque(flujoConsultorio,flujoDia,hora).length>0) return;
    setFlujoHoras(prev=>prev.includes(hora)?prev.filter(h=>h!==hora):[...prev,hora].sort((a,b)=>a-b));
  }

  async function confirmarReserva() {
    if(!flujoDia||!flujoConsultorio||flujoHoras.length===0) return;
    const hi=Math.min(...flujoHoras),hf=Math.max(...flujoHoras)+1;
    const prof=esAdmin?form.profesional:usuario?.nombre;
    if(!prof?.trim()) return;
    if(hayConflicto(flujoConsultorio,flujoDia,hi,hf)){setErrorSolapamiento("⚠️ Hay un conflicto en ese horario.");return;}
    await agregarReserva({profesional:prof.trim(),consultorio:flujoConsultorio,fecha:dateKey(flujoDia),horaInicio:hi,horaFin:hf,repeteSemanal:form.repeteSemanal,creadoPor:usuario?.email});
    showToast("Reserva guardada ✓");
    setModal(null);setErrorSolapamiento("");resetFlujo();cambiarZoom(1);
    setForm({profesional:"",horaInicio:8,horaFin:9,repeteSemanal:false});
  }

  function openEditar(r) {
    if(!puedeEditar(r)) return;
    setEditandoReserva(r);
    setForm({profesional:r.profesional,horaInicio:r.horaInicio,horaFin:r.horaFin,repeteSemanal:r.repeteSemanal});
    setErrorSolapamiento("");
  }
  async function guardarEdicion() {
    const r=editandoReserva;
    if(!form.profesional.trim()||form.horaFin<=form.horaInicio) return;
    if(hayConflicto(r.consultorio,new Date(r.fecha+"T12:00:00"),parseInt(form.horaInicio),parseInt(form.horaFin),r.id)){setErrorSolapamiento("⚠️ Ese horario ya está ocupado.");return;}
    await actualizarReserva(r.id,{...r,profesional:form.profesional.trim(),horaInicio:parseInt(form.horaInicio),horaFin:parseInt(form.horaFin),repeteSemanal:form.repeteSemanal});
    showToast("Reserva actualizada ✓");setEditandoReserva(null);setErrorSolapamiento("");
  }
  async function borrarReserva(id) { await eliminarReserva(id);setConfirmDelete(null);showToast("Reserva eliminada","warn"); }

  const inp = {width:"100%",padding:"10px 12px",borderRadius:10,border:"1px solid rgba(124,106,255,0.2)",fontSize:13,marginBottom:12,boxSizing:"border-box",outline:"none",background:"rgba(14,12,28,0.8)",color:"white"};
  const lbl = {display:"block",fontSize:11,fontWeight:700,color:"#a0a8c0",marginBottom:4,textTransform:"uppercase",letterSpacing:.5};

  const diaActual = weekDates[Math.min(diaSelIdx,weekDates.length-1)];
  const consultorioActual = CONSULTORIOS[consultorioSel];
  const pasoActivo = paso!==null;
  const diaLabel = flujoDia?flujoDia.toLocaleDateString("es-AR",{weekday:"short",day:"numeric",month:"short"}):null;
  const consLabel = flujoConsultorio?`C${CONSULTORIOS.indexOf(flujoConsultorio)+3}`:null;
  const horasLabel = flujoHoras.length>0?(()=>{const hi=Math.min(...flujoHoras),hf=Math.max(...flujoHoras)+1;return`${hi}:00 – ${hf}:00 (${flujoHoras.length}h)`;})():null;

  const stickyVisible = scrollY > 80;

  // ── Encabezado compartido Z1/Z2/Z3/Z4 ─────────────────────────────────────
  // Z1/Z2: cabecera por día con sub-fila consultorios
  // Z3: un día visible, cabecera igual que Z1/Z2 pero solo ese día
  // Z4: un día + un consultorio, misma estética

  function CabeceraDia({ fecha, colSpan=3, isActive=false }) {
    const isToday = dateKey(fecha)===todayKey;
    const esDiaFlujo = flujoDia&&dateKey(fecha)===dateKey(flujoDia);
    return (
      <th colSpan={colSpan}
        onClick={()=>paso===null&&seleccionarDia(fecha)}
        style={{background:esDiaFlujo?"rgba(124,106,255,0.25)":isToday?"rgba(124,106,255,0.12)":"rgba(0,0,0,0.7)",color:esDiaFlujo?"#a78bfa":isToday?"#a78bfa":"white",fontSize:11,fontWeight:800,padding:"7px 0",textAlign:"center",borderLeft:"2px solid rgba(255,255,255,0.08)",borderBottom:"1px solid rgba(255,255,255,0.08)",cursor:paso===null?"pointer":"default",transition:"background 0.2s",minWidth:colSpan*36}}>
        <div style={{fontSize:9,color:esDiaFlujo?"#a78bfa":isToday?"#a78bfa":"#a0a8c0",fontWeight:600}}>{DIAS_SEMANA[fecha.getDay()]}</div>
        <div style={{fontSize:14}}>{fecha.getDate()}</div>
        {paso===null&&<div style={{fontSize:7,color:"rgba(124,106,255,0.4)",marginTop:1}}>reservar</div>}
      </th>
    );
  }

  function CabeceraConsultorio({ c, ci, ancho }) {
    const esFlujoC = flujoConsultorio===c;
    const clickeable = paso==="consultorio";
    return (
      <th onClick={()=>clickeable&&seleccionarConsultorio(ci)}
        style={{background:esFlujoC?"rgba(124,106,255,0.18)":"rgba(0,0,0,0.6)",color:esFlujoC?"#a78bfa":"#4a5270",fontSize:8,fontWeight:700,padding:"3px 1px",textAlign:"center",borderLeft:"1px solid rgba(255,255,255,0.06)",borderBottom:"1px solid rgba(255,255,255,0.06)",width:ancho,cursor:clickeable?"pointer":"default",transition:"all 0.2s"}}>
        C{ci+3}
        {esFlujoC&&<span style={{color:"#a78bfa"}}> ✓</span>}
      </th>
    );
  }

  // ── Celda ──────────────────────────────────────────────────────────────────
  function Celda({ consultorio, fecha, hora, showName, cellHeight=26 }) {
    const bloques = getReservasBloque(consultorio,fecha,hora);
    const libre = bloques.length===0;
    const esFlujoActivo = paso==="horas"&&flujoConsultorio===consultorio&&flujoDia&&dateKey(fecha)===dateKey(flujoDia);
    const seleccionada = esFlujoActivo&&flujoHoras.includes(hora);
    return (
      <div
        onClick={()=>{ if(esFlujoActivo&&libre) toggleHora(hora); }}
        style={{height:cellHeight,padding:1,borderBottom:"1px solid rgba(255,255,255,0.04)",position:"relative",cursor:libre?"pointer":"default",background:seleccionada?"rgba(124,106,255,0.28)":"transparent",transition:"background 0.1s"}}>
        {seleccionada&&libre&&<div style={{position:"absolute",inset:1,borderRadius:3,border:"2px solid rgba(124,106,255,0.8)",pointerEvents:"none"}}/>}
        {bloques.map(r=>{
          const col=colorMap[r.profesional]||COLORES_PROF[0];
          const esInicio=hora===r.horaInicio;
          return (
            <div key={r.id} style={{height:"100%",background:col.bg,borderRadius:esInicio?"4px 4px 1px 1px":"1px",padding:"1px 3px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              {esInicio&&showName&&<span style={{fontSize:8,fontWeight:700,color:"white",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"65%"}}>{r.profesional}</span>}
              {esInicio&&showName&&puedeEditar(r)&&!esPublico&&(
                <span style={{display:"flex",gap:1,flexShrink:0}}>
                  <button onClick={e=>{e.stopPropagation();openEditar(r);}} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"white",cursor:"pointer",borderRadius:2,padding:"0 2px",fontSize:7}}>✎</button>
                  <button onClick={e=>{e.stopPropagation();setConfirmDelete(r.id);}} style={{background:"rgba(255,255,255,0.15)",border:"none",color:"white",cursor:"pointer",borderRadius:2,padding:"0 2px",fontSize:7}}>✕</button>
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ── Grilla Z1/Z2 (semana completa, misma estética) ─────────────────────────
  function Grilla({ dias, showName, cellHeight=22, colWidth=36 }) {
    const lineaTop = lineaPct * cellHeight * HORAS.length;
    const hoyEnDias = dias.some(f=>dateKey(f)===todayKey);
    return (
      <div style={{overflowX:"auto",overflowY:"auto",maxHeight:"calc(100vh - 200px)",position:"relative"}}>
        <table style={{borderCollapse:"collapse",minWidth:36+dias.length*3*colWidth}}>
          <thead>
            <tr>
              <th style={{width:36,background:"rgba(0,0,0,0.8)",position:"sticky",left:0,zIndex:5,borderBottom:"1px solid rgba(255,255,255,0.08)"}}/>
              {dias.map(fecha=><CabeceraDia key={dateKey(fecha)} fecha={fecha} colSpan={3}/>)}
            </tr>
            <tr>
              <th style={{width:36,background:"rgba(0,0,0,0.8)",position:"sticky",left:0,zIndex:5,borderBottom:"1px solid rgba(255,255,255,0.06)"}}/>
              {dias.map(fecha=>CONSULTORIOS.map((c,ci)=>(
                <CabeceraConsultorio key={`${dateKey(fecha)}-${c}`} c={c} ci={ci} ancho={colWidth}/>
              )))}
            </tr>
          </thead>
          <tbody>
            {HORAS.map(hora=>(
              <tr key={hora}>
                <td style={{padding:"0 6px 0 0",textAlign:"right",fontSize:9,color:"rgba(255,255,255,0.5)",fontWeight:600,background:"rgba(0,0,0,0.7)",position:"sticky",left:0,zIndex:2,borderRight:"1px solid rgba(255,255,255,0.06)",verticalAlign:"middle",height:cellHeight}}>{hora}h</td>
                {dias.map(fecha=>CONSULTORIOS.map((c,ci)=>(
                  <td key={`${dateKey(fecha)}-${c}-${hora}`} style={{padding:0,borderLeft:ci===0?"2px solid rgba(255,255,255,0.07)":"1px solid rgba(255,255,255,0.03)",width:colWidth}}>
                    <Celda consultorio={c} fecha={fecha} hora={hora} showName={showName} cellHeight={cellHeight}/>
                  </td>
                )))}
              </tr>
            ))}
          </tbody>
        </table>
        {hoyEnDias&&<div style={{position:"absolute",top:70+lineaTop,left:0,right:0,zIndex:10,pointerEvents:"none",display:"flex",alignItems:"center"}}><div style={{width:36,flexShrink:0}}/><div style={{flex:1,height:1.5,background:"white",opacity:0.7,boxShadow:"0 0 6px rgba(255,255,255,0.5)"}}/></div>}
      </div>
    );
  }

  // ── Grilla Z3: un día, misma estética que Z1/Z2 ────────────────────────────
  function GrillaUnDia({ fecha }) {
    const lineaTop = lineaPct * 36 * HORAS.length;
    const isToday = dateKey(fecha)===todayKey;
    const colWidth = Math.floor((window.innerWidth - 42) / 3);
    return (
      <div style={{overflowY:"auto",maxHeight:"calc(100vh - 220px)",position:"relative"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr>
              <th style={{width:42,background:"rgba(0,0,0,0.8)",borderBottom:"1px solid rgba(255,255,255,0.08)",position:"sticky",top:0,zIndex:3}}/>
              <CabeceraDia fecha={fecha} colSpan={3}/>
            </tr>
            <tr>
              <th style={{width:42,background:"rgba(0,0,0,0.8)",position:"sticky",top:0,zIndex:3,borderBottom:"1px solid rgba(255,255,255,0.06)"}}/>
              {CONSULTORIOS.map((c,ci)=><CabeceraConsultorio key={c} c={c} ci={ci} ancho={colWidth}/>)}
            </tr>
          </thead>
          <tbody>
            {HORAS.map(hora=>(
              <tr key={hora}>
                <td style={{padding:"0 6px 0 0",textAlign:"right",fontSize:9,color:"rgba(255,255,255,0.5)",fontWeight:600,background:"rgba(0,0,0,0.7)",borderRight:"1px solid rgba(255,255,255,0.06)",verticalAlign:"middle",height:36}}>{hora}h</td>
                {CONSULTORIOS.map((c,ci)=>(
                  <td key={c} style={{padding:0,borderLeft:ci===0?"2px solid rgba(255,255,255,0.07)":"1px solid rgba(255,255,255,0.03)"}}>
                    <Celda consultorio={c} fecha={fecha} hora={hora} showName={true} cellHeight={36}/>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {isToday&&<div style={{position:"absolute",top:74+lineaTop,left:0,right:0,zIndex:10,pointerEvents:"none",display:"flex",alignItems:"center"}}><div style={{width:42,flexShrink:0}}/><div style={{flex:1,height:2,background:"white",opacity:0.8,boxShadow:"0 0 8px rgba(255,255,255,0.6)"}}/></div>}
      </div>
    );
  }

  // ── Grilla Z4: un día, un consultorio, misma estética ──────────────────────
  function GrillaUnConsultorio({ fecha, consultorio }) {
    const lineaTop = lineaPct * 46 * HORAS.length;
    const isToday = dateKey(fecha)===todayKey;
    const ci = CONSULTORIOS.indexOf(consultorio);
    return (
      <div style={{overflowY:"auto",maxHeight:"calc(100vh - 250px)",position:"relative"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr>
              <th style={{width:42,background:"rgba(0,0,0,0.8)",borderBottom:"1px solid rgba(255,255,255,0.08)",position:"sticky",top:0,zIndex:3}}/>
              <CabeceraDia fecha={fecha} colSpan={1}/>
            </tr>
            <tr>
              <th style={{width:42,background:"rgba(0,0,0,0.8)",position:"sticky",top:0,zIndex:3,borderBottom:"1px solid rgba(255,255,255,0.06)"}}/>
              <CabeceraConsultorio c={consultorio} ci={ci} ancho={"100%"}/>
            </tr>
          </thead>
          <tbody>
            {HORAS.map(hora=>{
              const bloques=getReservasBloque(consultorio,fecha,hora);
              const libre=bloques.length===0;
              const sel=paso==="horas"&&flujoConsultorio===consultorio&&flujoDia&&dateKey(fecha)===dateKey(flujoDia)&&flujoHoras.includes(hora);
              return (
                <tr key={hora}>
                  <td style={{padding:"0 6px 0 0",textAlign:"right",fontSize:10,color:"rgba(255,255,255,0.5)",fontWeight:600,background:"rgba(0,0,0,0.7)",borderRight:"1px solid rgba(255,255,255,0.06)",verticalAlign:"middle",height:46,width:42}}>{hora}:00</td>
                  <td style={{padding:"3px 10px 3px 4px",position:"relative"}}
                    onClick={()=>libre&&paso==="horas"&&toggleHora(hora)}>
                    {sel&&libre&&<div style={{position:"absolute",inset:"3px 10px 3px 4px",borderRadius:10,border:"2px solid rgba(124,106,255,0.8)",background:"rgba(124,106,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}><span style={{fontSize:11,color:"#a78bfa",fontWeight:700}}>✓ Seleccionado</span></div>}
                    {bloques.length>0?bloques.map(r=>{
                      const esInicio=hora===r.horaInicio;
                      const col=colorMap[r.profesional]||COLORES_PROF[0];
                      return (
                        <div key={r.id} style={{height:40,borderRadius:esInicio?"10px 10px 4px 4px":"4px",background:col.bg,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 12px",cursor:"pointer",overflow:"hidden"}}>
                          {esInicio&&<>
                            <div>
                              <div style={{fontSize:13,fontWeight:800,color:"white"}}>{r.profesional}</div>
                              <div style={{fontSize:10,color:"rgba(255,255,255,0.7)"}}>{r.horaInicio}:00 – {r.horaFin}:00</div>
                            </div>
                            {puedeEditar(r)&&!esPublico&&(
                              <div style={{display:"flex",gap:5}}>
                                <button onClick={e=>{e.stopPropagation();openEditar(r);}} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"white",borderRadius:7,padding:"4px 9px",fontSize:11,cursor:"pointer"}}>✎</button>
                                <button onClick={e=>{e.stopPropagation();setConfirmDelete(r.id);}} style={{background:"rgba(255,255,255,0.15)",border:"none",color:"white",borderRadius:7,padding:"4px 9px",fontSize:11,cursor:"pointer"}}>✕</button>
                              </div>
                            )}
                          </>}
                        </div>
                      );
                    }):(
                      <div style={{height:40,borderRadius:10,border:`1px dashed ${paso==="horas"?"rgba(124,106,255,0.25)":"rgba(255,255,255,0.05)"}`,display:"flex",alignItems:"center",paddingLeft:12}}>
                        {paso==="horas"&&<span style={{fontSize:11,color:"rgba(124,106,255,0.35)"}}>Tocá para seleccionar</span>}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {isToday&&<div style={{position:"absolute",top:74+lineaTop,left:0,right:0,zIndex:10,pointerEvents:"none",display:"flex",alignItems:"center"}}><div style={{width:42,flexShrink:0}}/><div style={{flex:1,height:2,background:"white",opacity:0.8}}/></div>}
      </div>
    );
  }

  return (
    <div ref={pinchRef} style={{height:"100vh",overflowY:"auto",background:"#000"}} className="tab-content">

      {/* ══ STICKY BAR — aparece al scrollear (igual que TabInicio) ══ */}
      <div style={{position:"fixed",top:0,left:0,right:0,zIndex:50,background:stickyVisible?"rgba(0,0,0,0.92)":"transparent",backdropFilter:stickyVisible?"blur(24px)":"none",WebkitBackdropFilter:stickyVisible?"blur(24px)":"none",borderBottom:stickyVisible?"1px solid rgba(124,106,255,0.15)":"none",transition:"all 0.3s ease",padding:stickyVisible?"10px 20px":"0",height:stickyVisible?"auto":0,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontSize:14,fontWeight:800,color:"white"}}>Reservas</span>
        <span style={{fontSize:11,color:"#7c6aff",fontWeight:700,letterSpacing:2}}>GRINS</span>
      </div>

      {/* ══ HERO HEADER con instrucciones ══ */}
      <div style={{background:"linear-gradient(180deg,#0a0a14 0%,#000000 100%)",padding:"54px 20px 20px"}}>
        <div style={{textAlign:"center",marginBottom:16}}>
          <img src="/logohead.jpeg" alt="GRINS" style={{height:36,objectFit:"contain",opacity:0.9}}/>
        </div>
        <div style={{background:"rgba(14,12,28,0.7)",borderRadius:16,padding:"14px 16px",border:"1px solid rgba(124,106,255,0.15)",backdropFilter:"blur(12px)"}}>
          <div style={{fontSize:13,fontWeight:800,color:"white",marginBottom:10}}>Cómo reservar</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {[
              {n:"1",color:"#667eea",txt:"Tocá un día en la agenda"},
              {n:"2",color:"#7c6aff",txt:"Elegí el consultorio (C3, C4 o C5)"},
              {n:"3",color:"#38a169",txt:"Seleccioná las horas y tocá +"},
            ].map(s=>(
              <div key={s.n} style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:24,height:24,borderRadius:"50%",background:`linear-gradient(135deg,${s.color},${s.color}99)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"white",flexShrink:0}}>{s.n}</div>
                <span style={{fontSize:12,color:"#a0a8c0"}}>{s.txt}</span>
              </div>
            ))}
          </div>
          <div style={{marginTop:10,padding:"8px 10px",background:"rgba(124,106,255,0.08)",borderRadius:10,border:"1px solid rgba(124,106,255,0.1)"}}>
            <span style={{fontSize:10,color:"#4a5270"}}>🤏 Pellizco para hacer zoom · 📅 Navegá por semanas con las flechas</span>
          </div>
        </div>
      </div>

      {/* ══ NAV SEMANA ══ */}
      {!verPagos&&(
        <div style={{padding:"10px 14px 6px",background:"#000"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:zoom>=3?8:0}}>
            <button onClick={()=>setWeekOffset(w=>w-1)} style={{width:32,height:32,borderRadius:9,border:"1px solid rgba(124,106,255,0.2)",background:"rgba(14,12,28,0.8)",cursor:"pointer",color:"white",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
            <span style={{flex:1,textAlign:"center",fontWeight:700,fontSize:11,color:"#a0a8c0"}}>
              {weekDates[0].toLocaleDateString("es-AR",{day:"numeric",month:"short"})} – {weekDates[5].toLocaleDateString("es-AR",{day:"numeric",month:"short"})}
            </span>
            <button onClick={()=>setWeekOffset(w=>w+1)} style={{width:32,height:32,borderRadius:9,border:"1px solid rgba(124,106,255,0.2)",background:"rgba(14,12,28,0.8)",cursor:"pointer",color:"white",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
            <button onClick={()=>setWeekOffset(0)} style={{padding:"0 10px",height:32,borderRadius:9,border:"1px solid rgba(124,106,255,0.2)",background:"rgba(14,12,28,0.8)",cursor:"pointer",color:"#a0a8c0",fontSize:10,fontWeight:600}}>Hoy</button>
          </div>
          {zoom>=3&&(
            <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:2}}>
              {weekDates.map((fecha,idx)=>{
                const isToday=dateKey(fecha)===todayKey;
                const isSel=idx===diaSelIdx;
                return (
                  <button key={idx} onClick={()=>setDiaSelIdx(idx)} style={{flexShrink:0,padding:"5px 10px",borderRadius:10,border:"none",background:isSel?"linear-gradient(135deg,#667eea,#764ba2)":isToday?"rgba(124,106,255,0.15)":"rgba(14,12,28,0.8)",color:isSel?"white":isToday?"#a78bfa":"#a0a8c0",fontWeight:isSel?700:500,fontSize:11,cursor:"pointer",textAlign:"center"}}>
                    <div style={{fontSize:8}}>{DIAS_SEMANA[fecha.getDay()]}</div>
                    <div style={{fontSize:13,fontWeight:800}}>{fecha.getDate()}</div>
                  </button>
                );
              })}
            </div>
          )}
          {zoom===4&&(
            <div style={{display:"flex",gap:5,marginTop:6}}>
              {CONSULTORIOS.map((c,ci)=>(
                <button key={c} onClick={()=>setConsultorioSel(ci)} style={{flex:1,padding:"6px",borderRadius:9,border:"none",background:consultorioSel===ci?"linear-gradient(135deg,#667eea,#764ba2)":"rgba(14,12,28,0.8)",color:consultorioSel===ci?"white":"#a0a8c0",fontWeight:600,fontSize:11,cursor:"pointer"}}>C{ci+3}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ AGENDA ══ */}
      {!verPagos&&(
        <div style={{padding:"0 4px 220px"}}>
          {zoom===1&&<Grilla dias={weekDates} showName={false} cellHeight={22} colWidth={36}/>}
          {zoom===2&&<Grilla dias={weekDates} showName={true} cellHeight={26} colWidth={50}/>}
          {zoom===3&&<GrillaUnDia fecha={flujoDia||diaActual}/>}
          {zoom===4&&<GrillaUnConsultorio fecha={flujoDia||diaActual} consultorio={flujoConsultorio||consultorioActual}/>}
        </div>
      )}

      {/* ══ PAGOS ══ */}
      {verPagos&&!esPublico&&(
        <div style={{padding:"16px 14px 220px"}}>
          {/* Datos de pago */}
          <div style={{background:"rgba(14,12,28,0.9)",borderRadius:18,marginBottom:18,overflow:"hidden",border:"1px solid rgba(124,106,255,0.2)"}}>
            <div style={{height:3,background:"linear-gradient(90deg,#667eea,#764ba2)"}}/>
            <div style={{padding:"14px 16px"}}>
              <div style={{fontSize:13,fontWeight:800,color:"white",marginBottom:2}}>💳 Datos de pago</div>
              <div style={{fontSize:11,color:"#4a5270",marginBottom:14}}>Patricio Grinschpun · DNI 32.669.760</div>
              {[
                {icon:"S",color:"#ec0000",nombre:"Banco Santander",rows:[["Alias CBU","patogrins"],["Cuenta Pesos","740-352653/8"],["CBU","0720740488000035265386"]]},
                {icon:"MP",color:"#009ee3",nombre:"Mercado Pago",rows:[["Alias","patogrins.mp"]]},
                {icon:"#",color:"#4a5270",nombre:"CVU",rows:[["CVU","0000003100019986606962"]]},
              ].map(banco=>(
                <div key={banco.nombre} style={{background:"rgba(255,255,255,0.03)",borderRadius:12,padding:"10px 14px",marginBottom:8,border:"1px solid rgba(255,255,255,0.05)"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                    <div style={{width:28,height:28,borderRadius:8,background:banco.color,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:9,fontWeight:900,color:"white"}}>{banco.icon}</span></div>
                    <span style={{fontSize:12,fontWeight:700,color:"white"}}>{banco.nombre}</span>
                  </div>
                  {banco.rows.map(([label,value])=>(
                    <div key={label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                      <span style={{fontSize:10,color:"#4a5270"}}>{label}</span>
                      <span style={{fontSize:11,fontWeight:700,color:"#a0a8c0",fontFamily:"monospace"}}>{value}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Nav mes */}
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
            <button onClick={()=>setMesOffset(m=>m-1)} style={{width:34,height:34,borderRadius:10,border:"1px solid rgba(124,106,255,0.2)",background:"rgba(14,12,28,0.8)",cursor:"pointer",color:"white",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
            <span style={{flex:1,textAlign:"center",fontWeight:700,fontSize:13,color:"white",textTransform:"capitalize"}}>{mesLabel}</span>
            <button onClick={()=>setMesOffset(m=>m+1)} style={{width:34,height:34,borderRadius:10,border:"1px solid rgba(124,106,255,0.2)",background:"rgba(14,12,28,0.8)",cursor:"pointer",color:"white",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
            <button onClick={()=>setMesOffset(0)} style={{padding:"0 10px",height:34,borderRadius:10,border:"1px solid rgba(124,106,255,0.2)",background:"rgba(14,12,28,0.8)",cursor:"pointer",color:"#a0a8c0",fontSize:11}}>Hoy</button>
            {esAdmin&&<button onClick={()=>exportarCSV(profesionales,reservas,mesStr)} style={{padding:"0 12px",height:34,borderRadius:10,border:"none",background:"linear-gradient(135deg,#667eea,#764ba2)",color:"white",fontSize:11,fontWeight:700,cursor:"pointer"}}>⬇ CSV</button>}
          </div>
          {esAdmin&&profesionales.length>0&&(()=>{
            const total=profesionales.reduce((a,p)=>a+calcPagos(reservas,p,mesStr).totalMes,0);
            return <div style={{background:"rgba(14,12,28,0.9)",borderRadius:14,padding:"14px 18px",marginBottom:14,display:"flex",justifyContent:"space-between",border:"1px solid rgba(124,106,255,0.15)"}}><span style={{color:"#a0a8c0",fontWeight:700,fontSize:12}}>Total {mesLabel}</span><span style={{color:"white",fontWeight:900,fontSize:20}}>{fmtCurrency(total)}</span></div>;
          })()}
          {profesionales.map(prof=>{
            const{totalMes,detalle}=calcPagos(reservas,prof,mesStr);
            const col=colorMap[prof]||COLORES_PROF[0];
            return (
              <div key={prof} style={{background:"rgba(14,12,28,0.8)",borderRadius:14,marginBottom:12,overflow:"hidden",border:"1px solid rgba(124,106,255,0.1)"}}>
                <div style={{background:col.bg,padding:"11px 16px",display:"flex",justifyContent:"space-between"}}>
                  <span style={{color:"white",fontWeight:800,fontSize:14}}>👤 {prof}</span>
                  <span style={{color:"white",fontWeight:900,fontSize:18}}>{fmtCurrency(totalMes)}</span>
                </div>
                {detalle.length===0?<p style={{padding:"12px 16px",color:"#4a5270",fontSize:12,margin:0}}>Sin reservas este mes.</p>:(
                  <div style={{padding:10}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                      <thead><tr style={{color:"#4a5270"}}>{["Consultorio","Fecha","Horario","Tipo","Horas","Monto"].map(h=><th key={h} style={{textAlign:h==="Monto"||h==="Horas"?"right":"left",padding:"4px 6px",fontWeight:600}}>{h}</th>)}</tr></thead>
                      <tbody>{detalle.map(d=>(
                        <tr key={d.id} style={{borderTop:"1px solid rgba(124,106,255,0.08)"}}>
                          <td style={{padding:"5px 6px",color:"white"}}>{d.consultorio}</td>
                          <td style={{padding:"5px 6px",color:"#a0a8c0"}}>{new Date(d.fecha+"T12:00:00").toLocaleDateString("es-AR",{day:"numeric",month:"short"})}</td>
                          <td style={{padding:"5px 6px",color:"white"}}>{d.horaInicio}:00–{d.horaFin}:00</td>
                          <td style={{padding:"5px 6px"}}><span style={{background:"rgba(124,106,255,0.15)",color:"#7c6aff",borderRadius:4,padding:"1px 7px",fontSize:10,fontWeight:700}}>{d.tipo}</span></td>
                          <td style={{padding:"5px 6px",textAlign:"right",color:"#a0a8c0"}}>{d.horas}h{d.tipo==="Semanal"?` × ${d.occ}`:""}</td>
                          <td style={{padding:"5px 6px",textAlign:"right",fontWeight:800,color:"white"}}>{fmtCurrency(d.montoMes)}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                    <div style={{borderTop:"1px solid rgba(124,106,255,0.1)",marginTop:8,paddingTop:8,display:"flex",justifyContent:"space-between"}}>
                      <span style={{fontSize:11,color:"#4a5270"}}>${HORA_PRECIO.toLocaleString("es-AR")}/hora</span>
                      <span style={{fontWeight:900,color:"white",fontSize:13}}>Total: {fmtCurrency(totalMes)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══ FOOTER AGENDA ══ */}
      {!verPagos&&(
        <div style={{position:"fixed",bottom:90,left:"50%",transform:"translateX(-50%)",zIndex:60,display:"flex",flexDirection:"column",alignItems:"center",gap:6,width:"calc(100% - 32px)",maxWidth:340}}>

          {/* Fila superior */}
          <div style={{display:"flex",alignItems:"center",width:"100%",background:"rgba(10,10,20,0.92)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",border:"1px solid rgba(124,106,255,0.2)",borderRadius:22,padding:"8px 12px",boxShadow:"0 8px 32px rgba(0,0,0,0.4)",position:"relative",minHeight:66}}>

            {/* RESUMEN — izquierda */}
            <div style={{flex:1,minWidth:0,paddingRight:60}}>
              {!pasoActivo?(
                <p style={{margin:0,fontSize:10,color:"#4a5270"}}>Tocá un día para reservar</p>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:3}}>
                  {[
                    {n:"1",label:diaLabel||"Elegí un día",done:!!diaLabel,color:"#667eea"},
                    {n:"2",label:consLabel?flujoConsultorio:"Elegí consultorio",done:!!consLabel,color:"#7c6aff"},
                    {n:"3",label:horasLabel||"Seleccioná horarios",done:!!horasLabel,color:"#38a169"},
                  ].map(s=>(
                    <div key={s.n} style={{display:"flex",alignItems:"center",gap:5}}>
                      <div style={{width:15,height:15,borderRadius:"50%",background:s.done?`linear-gradient(135deg,${s.color},${s.color}99)`:"rgba(124,106,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:800,color:"white",flexShrink:0}}>{s.n}</div>
                      <span style={{fontSize:10,color:s.done?"white":"#4a5270",fontWeight:s.done?700:400,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* BOTÓN X — arriba derecha del resumen, solo si flujo activo */}
            {pasoActivo&&(
              <button onClick={resetFlujo} style={{position:"absolute",top:6,right:6,width:22,height:22,borderRadius:"50%",background:"rgba(239,83,80,0.15)",border:"1.5px solid rgba(239,83,80,0.4)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2}}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ef5350" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}

            {/* BOTÓN + CENTRO ABSOLUTO */}
            <div style={{position:"absolute",left:"50%",transform:"translateX(-50%)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <button
                onClick={()=>{
                  if(!pasoActivo||flujoHoras.length===0) return;
                  setForm({profesional:esAdmin?"":usuario?.nombre||"",horaInicio:Math.min(...flujoHoras),horaFin:Math.max(...flujoHoras)+1,repeteSemanal:false});
                  setModal("confirmar");setErrorSolapamiento("");
                }}
                style={{width:50,height:50,borderRadius:"50%",border:"none",background:flujoHoras.length>0?"linear-gradient(135deg,#667eea,#764ba2)":"rgba(124,106,255,0.15)",color:flujoHoras.length>0?"white":"#4a5270",fontSize:26,cursor:flujoHoras.length>0?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:flujoHoras.length>0?"0 4px 16px rgba(124,106,255,0.5)":"none",transition:"all 0.2s"}}>
                +
              </button>
            </div>

            {/* ZOOM — desde borde del + hasta el borde derecho del contenedor */}
            <div style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3,width:"calc(50% - 37px)"}}>
              <div style={{display:"flex",justifyContent:"space-between",width:"100%"}}>
                {[1,2,3,4].map(z=>(
                  <span key={z} style={{fontSize:8,color:zoom===z?"#7c6aff":"#3a3a5a",fontWeight:zoom===z?800:500,flex:1,textAlign:"center",transition:"color 0.2s"}}>{z}</span>
                ))}
              </div>
              <input
                type="range" min={1} max={4} step={1} value={zoom}
                onChange={e=>cambiarZoom(Number(e.target.value))}
                style={{width:"100%",height:4,cursor:"pointer",accentColor:"#7c6aff",borderRadius:4,outline:"none",WebkitAppearance:"none",background:`linear-gradient(to right,#7c6aff ${(zoom-1)/3*100}%,rgba(124,106,255,0.2) ${(zoom-1)/3*100}%)`}}
              />
            </div>
          </div>

          {/* Fila inferior: Mis reservas */}
          <button onClick={()=>setVerPagos(true)} style={{width:"100%",background:"rgba(14,12,28,0.85)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",border:"1px solid rgba(124,106,255,0.18)",borderRadius:16,padding:"9px",color:"#a0a8c0",fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a0a8c0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>
            Mis reservas
          </button>
        </div>
      )}

      {/* Volver desde pagos */}
      {verPagos&&(
        <div style={{position:"fixed",bottom:90,left:"50%",transform:"translateX(-50%)",zIndex:60,width:"calc(100% - 32px)",maxWidth:340}}>
          <button onClick={()=>setVerPagos(false)} style={{width:"100%",padding:"10px",borderRadius:16,border:"1px solid rgba(124,106,255,0.25)",background:"rgba(14,12,28,0.9)",backdropFilter:"blur(16px)",color:"#7c6aff",fontWeight:700,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c6aff" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            Volver a la agenda
          </button>
        </div>
      )}

      {/* ══ MODAL CONFIRMAR ══ */}
      {modal==="confirmar"&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:2000}}>
          <div style={{background:"#0a0a14",borderRadius:"24px 24px 0 0",padding:"20px 20px 44px",width:"100%",maxWidth:500,border:"1px solid rgba(124,106,255,0.2)",animation:"slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)"}}>
            <div style={{width:36,height:4,borderRadius:2,background:"rgba(255,255,255,0.1)",margin:"0 auto 16px"}}/>
            <h3 style={{margin:"0 0 3px",fontSize:17,fontWeight:800,color:"white"}}>Confirmar reserva</h3>
            <p style={{margin:"0 0 14px",fontSize:12,color:"#a0a8c0"}}>Revisá los detalles antes de confirmar</p>
            <div style={{background:"rgba(124,106,255,0.08)",borderRadius:14,padding:"12px 16px",marginBottom:14,border:"1px solid rgba(124,106,255,0.15)"}}>
              {[
                ["📅 Día",flujoDia?.toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long"})],
                ["🏢 Consultorio",flujoConsultorio],
                ["⏰ Horario",`${Math.min(...flujoHoras)}:00 – ${Math.max(...flujoHoras)+1}:00`],
                ["🕐 Duración",`${flujoHoras.length} hora${flujoHoras.length>1?"s":""}`],
                ["💰 Total",fmtCurrency(flujoHoras.length*HORA_PRECIO)],
              ].map(([l,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid rgba(124,106,255,0.08)"}}>
                  <span style={{fontSize:12,color:"#a0a8c0"}}>{l}</span>
                  <span style={{fontSize:12,fontWeight:700,color:"white"}}>{v}</span>
                </div>
              ))}
            </div>
            <label style={lbl}>Profesional</label>
            {esAdmin
              ?<><input list="plist" value={form.profesional} onChange={e=>setForm(f=>({...f,profesional:e.target.value}))} placeholder="Nombre del/la profesional" style={inp}/><datalist id="plist">{Object.keys(colorMap).map(p=><option key={p} value={p}/>)}</datalist></>
              :<div style={{...inp,color:"#a0a8c0",marginBottom:12}}>{form.profesional}</div>
            }
            <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",marginBottom:16}}>
              <input type="checkbox" checked={form.repeteSemanal} onChange={e=>setForm(f=>({...f,repeteSemanal:e.target.checked}))} style={{width:16,height:16}}/>
              <span style={{fontSize:13,color:"white"}}>Repetir semanalmente</span>
            </label>
            {errorSolapamiento&&<div style={{background:"rgba(239,83,80,0.1)",border:"1px solid rgba(239,83,80,0.3)",borderRadius:8,padding:"8px 12px",marginBottom:12,fontSize:12,color:"#ef5350",fontWeight:600}}>{errorSolapamiento}</div>}
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>{setModal(null);setErrorSolapamiento("");}} style={{flex:1,padding:12,borderRadius:12,border:"1px solid rgba(124,106,255,0.2)",background:"transparent",cursor:"pointer",fontSize:13,color:"#a0a8c0",fontWeight:600}}>Cancelar</button>
              <button onClick={confirmarReserva} disabled={esAdmin&&!form.profesional.trim()} style={{flex:2,padding:12,borderRadius:12,border:"none",fontWeight:800,fontSize:13,cursor:"pointer",color:"white",background:"linear-gradient(135deg,#667eea,#764ba2)"}}>✓ Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL EDITAR ══ */}
      {editandoReserva&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:2000}}>
          <div style={{background:"#0a0a14",borderRadius:"24px 24px 0 0",padding:"20px 20px 44px",width:"100%",maxWidth:500,border:"1px solid rgba(124,106,255,0.2)",animation:"slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)"}}>
            <div style={{width:36,height:4,borderRadius:2,background:"rgba(255,255,255,0.1)",margin:"0 auto 16px"}}/>
            <h3 style={{margin:"0 0 3px",fontSize:17,fontWeight:800,color:"white"}}>Editar reserva</h3>
            <p style={{margin:"0 0 16px",fontSize:12,color:"#a0a8c0"}}>{editandoReserva.consultorio} · {new Date(editandoReserva.fecha+"T12:00:00").toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long"})}</p>
            <label style={lbl}>Profesional</label>
            {esAdmin?<><input list="plist2" value={form.profesional} onChange={e=>setForm(f=>({...f,profesional:e.target.value}))} style={inp}/><datalist id="plist2">{Object.keys(colorMap).map(p=><option key={p} value={p}/>)}</datalist></>:<div style={{...inp,color:"#a0a8c0"}}>{form.profesional}</div>}
            {esAdmin&&(<><label style={lbl}>Consultorio</label><select value={editandoReserva.consultorio} onChange={e=>setEditandoReserva(r=>({...r,consultorio:e.target.value}))} style={inp}>{CONSULTORIOS.map(c=><option key={c} value={c}>{c}</option>)}</select></>)}
            <div style={{display:"flex",gap:10}}>
              <div style={{flex:1}}><label style={lbl}>Desde</label><select value={form.horaInicio} onChange={e=>setForm(f=>({...f,horaInicio:parseInt(e.target.value),horaFin:Math.max(parseInt(e.target.value)+1,f.horaFin)}))} style={inp}>{horasRange.slice(0,-1).map(h=><option key={h} value={h}>{h}:00</option>)}</select></div>
              <div style={{flex:1}}><label style={lbl}>Hasta</label><select value={form.horaFin} onChange={e=>setForm(f=>({...f,horaFin:parseInt(e.target.value)}))} style={inp}>{horasRange.filter(h=>h>form.horaInicio).map(h=><option key={h} value={h}>{h}:00</option>)}</select></div>
            </div>
            <div style={{background:"rgba(124,106,255,0.08)",borderRadius:10,padding:"10px 14px",marginBottom:12,display:"flex",justifyContent:"space-between",border:"1px solid rgba(124,106,255,0.12)"}}>
              <span style={{fontSize:13,color:"#a0a8c0"}}>{form.horaFin-form.horaInicio}h × ${HORA_PRECIO.toLocaleString("es-AR")}</span>
              <span style={{fontWeight:800,color:"white"}}>{fmtCurrency((form.horaFin-form.horaInicio)*HORA_PRECIO)}</span>
            </div>
            <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",marginBottom:18}}>
              <input type="checkbox" checked={form.repeteSemanal} onChange={e=>setForm(f=>({...f,repeteSemanal:e.target.checked}))} style={{width:16,height:16}}/>
              <span style={{fontSize:13,color:"white"}}>Repetir semanalmente</span>
            </label>
            {errorSolapamiento&&<div style={{background:"rgba(239,83,80,0.1)",border:"1px solid rgba(239,83,80,0.3)",borderRadius:8,padding:"8px 12px",marginBottom:12,fontSize:12,color:"#ef5350",fontWeight:600}}>{errorSolapamiento}</div>}
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>{setEditandoReserva(null);setErrorSolapamiento("");}} style={{flex:1,padding:12,borderRadius:12,border:"1px solid rgba(124,106,255,0.2)",background:"transparent",cursor:"pointer",fontSize:13,color:"#a0a8c0",fontWeight:600}}>Cancelar</button>
              <button onClick={guardarEdicion} disabled={!form.profesional.trim()} style={{flex:2,padding:12,borderRadius:12,border:"none",fontWeight:800,fontSize:13,cursor:"pointer",color:"white",background:"linear-gradient(135deg,#667eea,#764ba2)"}}>Actualizar</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL ELIMINAR ══ */}
      {confirmDelete&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:2000}}>
          <div style={{background:"#0a0a14",borderRadius:"24px 24px 0 0",padding:"20px 20px 44px",width:"100%",maxWidth:500,textAlign:"center",border:"1px solid rgba(124,106,255,0.2)"}}>
            <div style={{width:36,height:4,borderRadius:2,background:"rgba(255,255,255,0.1)",margin:"0 auto 16px"}}/>
            <div style={{fontSize:36,marginBottom:10}}>🗑️</div>
            <h3 style={{margin:"0 0 8px",color:"white",fontSize:16,fontWeight:800}}>¿Eliminar esta reserva?</h3>
            <p style={{margin:"0 0 20px",color:"#a0a8c0",fontSize:13}}>Esta acción no se puede deshacer.</p>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setConfirmDelete(null)} style={{flex:1,padding:12,borderRadius:12,border:"1px solid rgba(124,106,255,0.2)",background:"transparent",cursor:"pointer",fontSize:13,fontWeight:600,color:"#a0a8c0"}}>Cancelar</button>
              <button onClick={()=>borrarReserva(confirmDelete)} style={{flex:1,padding:12,borderRadius:12,border:"none",background:"#ef4444",color:"white",cursor:"pointer",fontSize:13,fontWeight:800}}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: none; opacity: 1; } }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:14px; height:14px; border-radius:50%; background:#7c6aff; cursor:pointer; box-shadow:0 0 6px rgba(124,106,255,0.6); }
        input[type=range]::-webkit-slider-runnable-track { height:4px; border-radius:4px; }
      `}</style>
    </div>
  );
}





