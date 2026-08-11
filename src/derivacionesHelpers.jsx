// ── Constantes y helpers compartidos por todo el módulo de Derivaciones ──────
// Separados en su propio archivo para que cada componente grande
// (Cartelera, Conexiones, MisPublicaciones, etc.) pueda importar solo lo
// que necesita, sin depender de un único archivo gigante.

export const FAMILIAS = [
  { id:"casos",       label:"Casos",         emoji:"🧩", color:"#667eea", grad:"linear-gradient(135deg,#667eea,#764ba2)", tipos:["Derivación","Supervisión","Dispositivo"] },
  { id:"formacion",   label:"Formación",     emoji:"📚", color:"#f093fb", grad:"linear-gradient(135deg,#f093fb,#f5576c)", tipos:["Lectura","Mentoría","Clases"] },
  { id:"colaboracion",label:"Colaboración",  emoji:"🤝", color:"#43e97b", grad:"linear-gradient(135deg,#43e97b,#38f9d7)", tipos:["Proyecto","Taller","Red"] },
];
export const MODALIDADES = ["Presencial","Online","Ambas"];
export const DIAS = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
export const FRANJAS = ["Mañana","Tarde","Noche"];
export const ESPECIALIDADES = ["Pareja","Infanto-juvenil","Duelo","Adicciones","Grupal","Adultos","Familiar","Trauma","Ansiedad","Otro"];

export function familiaDeSubtipo(subtipo) {
  return FAMILIAS.find(f => f.tipos.includes(subtipo)) || FAMILIAS[0];
}

export function avatarColor(nombre) {
  const c = ["linear-gradient(135deg,#667eea,#764ba2)","linear-gradient(135deg,#f093fb,#f5576c)","linear-gradient(135deg,#4facfe,#00f2fe)","linear-gradient(135deg,#43e97b,#38f9d7)","linear-gradient(135deg,#fa709a,#fee140)","linear-gradient(135deg,#a18cd1,#fbc2eb)","linear-gradient(135deg,#fda085,#f6d365)"];
  let h = 0; for (let i=0;i<(nombre||"").length;i++) h=nombre.charCodeAt(i)+((h<<5)-h);
  return c[Math.abs(h)%c.length];
}

export function tiempoRelativo(s) {
  if (!s) return "";
  const d = Math.floor(Date.now()/1000-s);
  if (d<3600) return `Hace ${Math.floor(d/60)} min`;
  if (d<86400) return `Hace ${Math.floor(d/3600)} h`;
  return `Hace ${Math.floor(d/86400)} d`;
}

// ID determinístico para un chat directo entre dos personas, sin depender
// de que exista una ficha asignada entre ellas. Mismos dos emails, en
// cualquier orden, siempre generan el mismo id.
export function idChatDirecto(emailA, emailB) {
  const [a, b] = [emailA, emailB].sort();
  return `directo_${a}__${b}`;
}

export function Tag({ label, color }) {
  return <span style={{background:"rgba(14,12,28,0.9)",color:color||"#a0a8c0",border:`1px solid ${color?color+"44":"rgba(124,106,255,0.15)"}`,borderRadius:8,padding:"2px 8px",fontSize:10,fontWeight:600}}>{label}</span>;
}

export function FamiliaChip({ subtipo, small }) {
  const f = familiaDeSubtipo(subtipo);
  return <span style={{display:"inline-flex",alignItems:"center",gap:4,background:`${f.color}22`,color:f.color,border:`1px solid ${f.color}44`,borderRadius:20,padding:small?"1px 8px":"3px 10px",fontSize:small?9:11,fontWeight:700}}>{f.emoji} {subtipo}</span>;
}

export function FooterSubVista({ onVolver }) {
  return (
    <div style={{position:"fixed",bottom:20,left:"50%",transform:"translateX(-50%)",zIndex:60,width:260}}>
      <button onClick={onVolver} style={{width:"100%",padding:"9px",borderRadius:14,border:"1px solid rgba(124,106,255,0.25)",background:"rgba(14,12,28,0.92)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",color:"#7c6aff",fontWeight:700,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:"0 8px 24px rgba(0,0,0,0.4)"}}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c6aff" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        Volver a Cartelera
      </button>
    </div>
  );
}
