import { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";

const PREGUNTAS = [
  { q:"¿Cuál es el hito histórico que marca el paso de la psicología de la filosofía a una ciencia independiente?", opciones:[{text:"La publicación de los estudios sobre la histeria de Freud en 1895.",ok:false,r:"Ese es el inicio del psicoanálisis, no de la psicología experimental."},{text:"La fundación del primer laboratorio de psicología experimental por Wundt en 1879.",ok:true,r:"Wilhelm Wundt en Alemania adoptó la observación científica, separándola de la filosofía."},{text:"El manifiesto conductista de John B. Watson en 1913.",ok:false,r:"Esto marca el inicio del conductismo, pero la psicología ya era ciencia desde Wundt."},{text:"Las reflexiones de Aristóteles sobre los sentidos y la observación.",ok:false,r:"Aristóteles pertenece a la etapa pre-científica (filosófica) de la psicología."}]},
  { q:"Si un DT felicita públicamente a un jugador por realizar un repliegue defensivo correcto, ¿qué concepto del conductismo está aplicando?", opciones:[{text:"Condicionamiento Clásico de Pavlov.",ok:false,r:"Pavlov se enfoca en asociaciones de estímulos reflejos, no en consecuencias de actos voluntarios."},{text:"Filtro Atenuador de Treisman.",ok:false,r:"Este es un concepto de la psicología cognitiva sobre la atención."},{text:"Refuerzo Positivo de Skinner.",ok:true,r:"B.F. Skinner propuso que las consecuencias positivas aumentan la probabilidad de repetir una conducta."},{text:"Amnesia Anterógrada.",ok:false,r:"Esto es una patología de la memoria donde no se pueden formar nuevos recuerdos."}]},
  { q:"Un ala está conduciendo la pelota mientras mira de reojo el movimiento de su pivot. ¿Qué característica de la atención está utilizando?", opciones:[{text:"Atención Exógena.",ok:false,r:"La exógena es involuntaria, captada por ruidos o estímulos externos imprevistos."},{text:"Atención Divisible y Alternante.",ok:true,r:"En futsal, el jugador debe repartir su atención entre tareas o saltar de un foco a otro velozmente."},{text:"Filtro Temprano de Broadbent.",ok:false,r:"Broadbent sugiere bloquear lo irrelevante, no dividir la atención entre dos estímulos necesarios."},{text:"Memoria Sensorial Pre-atencional.",ok:false,r:"Esta es una fase previa a la atención que retiene datos por milisegundos."}]},
  { q:"Según el caso del paciente H.M., ¿qué sistema de memoria permite que un jugador aprenda un gesto técnico (como pisar la pelota) mediante la repetición constante?", opciones:[{text:"Memoria Explícita Semántica.",ok:false,r:"La semántica guarda conceptos y reglas, no habilidades motoras."},{text:"Memoria Episódica.",ok:false,r:"La episódica guarda vivencias y recuerdos personales."},{text:"Memoria Implícita Procedimental.",ok:true,r:"Es automática, motora y no depende del hipocampo; se consolida con la práctica física."},{text:"Memoria de Trabajo.",ok:false,r:"Esta memoria es de muy corta duración para decisiones inmediatas."}]},
  { q:"En el Psicoanálisis, ¿cuál es la instancia psíquica que actúa como mediador entre los impulsos primitivos y las normas morales?", opciones:[{text:"El Ello.",ok:false,r:"El Ello es solo la reserva de pulsiones primitivas."},{text:"El Superyó.",ok:false,r:"El Superyó representa la ley, el deber ser y la culpa."},{text:"El Inconsciente.",ok:false,r:"Es el sistema donde se aloja lo reprimido, no una instancia mediadora."},{text:"El Yo.",ok:true,r:"El Yo debe equilibrar las demandas del Ello, el Superyó y la realidad exterior."}]},
  { q:"Un jugador acepta una decisión táctica grupal que cree incorrecta solo por miedo a la desaprobación de sus compañeros. ¿Qué fenómeno estudió Solomon Asch aquí?", opciones:[{text:"La obediencia a la autoridad.",ok:false,r:"Ese fue el estudio de Milgram sobre órdenes directas."},{text:"La conformidad y presión de grupo.",ok:true,r:"Asch demostró que los sujetos pueden negar su percepción para encajar en la masa."},{text:"El estado agéntico.",ok:false,r:"Es el estado donde uno se siente instrumento de un líder, no de sus pares."},{text:"El autoboicot por Thanatos.",ok:false,r:"Este es un concepto psicoanalítico de pulsión destructiva."}]},
  { q:"Según el experimento de Milgram, ¿por qué un jugador podría ejecutar una conducta violenta si el DT se lo ordena?", opciones:[{text:"Debido al fenómeno de Vicary.",ok:false,r:"Vicary se refería a publicidad subliminal (fraude)."},{text:"Por entrar en un 'estado agéntico'.",ok:true,r:"El sujeto deja de sentirse responsable moralmente y se ve como un instrumento del DT."},{text:"Por la mutua representación interna.",ok:false,r:"Este es un concepto de cohesión grupal, no de obediencia ciega."},{text:"Por el Filtro Atenuador.",ok:false,r:"Nuevamente, este es un concepto de atención cognitiva."}]},
  { q:"¿Qué elemento de la definición de Pichon Rivière se refiere a que un ala sabe a qué velocidad pica su pivot sin tener que mirarlo?", opciones:[{text:"Constantes de tiempo y espacio.",ok:false,r:"Esto se refiere a la regularidad de los entrenamientos."},{text:"Tarea implícita.",ok:false,r:"Es la resolución de ansiedades grupales."},{text:"Mutua representación interna.",ok:true,r:"Es el reconocimiento y anticipación mutua grabada en la mente de los integrantes."},{text:"Asunción de roles.",ok:false,r:"Es la toma de una función específica en el grupo."}]},
  { q:"En un vestuario, ¿qué nombre recibe el rol del jugador que canaliza toda la tensión, culpa o frustración del grupo tras una derrota?", opciones:[{text:"Saboteador.",ok:false,r:"El saboteador se opone activamente a la tarea por miedo al cambio."},{text:"Chivo Emisario.",ok:true,r:"Es el integrante en el que el grupo deposita sus fallas para 'limpiarse' a sí mismo."},{text:"Portavoz.",ok:false,r:"El portavoz es el termómetro que dice lo que el grupo siente pero no sabe expresar."},{text:"Líder Sabio.",ok:false,r:"El sabio es el que teoriza para evitar la experiencia directa."}]},
  { q:"¿Cuál es la diferencia fundamental entre el enfoque Conductista y el Cognitivista?", opciones:[{text:"El conductismo estudia la mente interna y el cognitivismo la conducta.",ok:false,r:"Es exactamente al revés."},{text:"El conductismo usa el psicoanálisis y el cognitivismo las neurociencias.",ok:false,r:"Son escuelas independientes del psicoanálisis."},{text:"El conductismo se enfoca en Estímulo-Respuesta, y el cognitivismo en el procesamiento intermedio.",ok:true,r:"El cognitivismo abre la 'caja negra' para entender la atención, memoria y pensamiento."},{text:"No hay diferencias, ambas son parte de la filosofía.",ok:false,r:"Ambas son ramas científicas con modelos de aprendizaje opuestos."}]},
];

const MAX_INTENTOS = 2;

// ── PANTALLA BLOQUEADA ────────────────────────────────────────────────────────
function PantallaBloqueada({ nombre, onVolver }) {
  return (
    <div style={{ minHeight:"100vh", background:"#000", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"32px 20px", textAlign:"center" }}>
      <div style={{ fontSize:52, marginBottom:16 }}>🔒</div>
      <h2 style={{ margin:"0 0 8px", fontSize:20, fontWeight:800, color:"white" }}>Límite de intentos alcanzado</h2>
      <p style={{ margin:"0 0 6px", fontSize:14, color:"#a0a8c0" }}>Hola <strong style={{color:"white"}}>{nombre}</strong>,</p>
      <p style={{ margin:"0 0 24px", fontSize:13, color:"#4a5270", lineHeight:1.6, maxWidth:320 }}>
        Ya utilizaste tus {MAX_INTENTOS} intentos disponibles para esta evaluación. No es posible volver a rendirla.
      </p>
      <div style={{ background:"rgba(124,106,255,0.08)", border:"1px solid rgba(124,106,255,0.2)", borderRadius:16, padding:"16px 20px", marginBottom:28, maxWidth:320 }}>
        <p style={{ margin:0, fontSize:13, color:"#a0a8c0", lineHeight:1.6 }}>
          Si creés que hubo algún tipo de error, comunicate con el profesor.
        </p>
      </div>
      <button onClick={onVolver} style={{ padding:"12px 28px", borderRadius:24, border:"1px solid rgba(124,106,255,0.25)", background:"transparent", color:"#7c6aff", fontWeight:700, fontSize:13, cursor:"pointer" }}>
        ← Volver al inicio
      </button>
    </div>
  );
}

// ── PANTALLA DE REGISTRO ──────────────────────────────────────────────────────
function PantallaRegistro({ onIniciar }) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [verificando, setVerificando] = useState(false);

  function validarEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

  async function handleIniciar() {
    if (!nombre.trim()) { setError("Por favor ingresá tu nombre completo."); return; }
    if (!validarEmail(email)) { setError("Por favor ingresá un email válido."); return; }
    setError(""); setVerificando(true);
    try {
      const q = query(
        collection(db, "quiz_resultados"),
        where("email", "==", email.trim().toLowerCase()),
        where("quiz", "==", "psicologia_deporte_atfa_2026")
      );
      const snap = await getDocs(q);
      onIniciar(nombre.trim(), email.trim().toLowerCase(), snap.size);
    } catch(e) {
      setError("Error al verificar. Intentá de nuevo.");
    }
    setVerificando(false);
  }

  const inp = { width:"100%", padding:"13px 16px", borderRadius:12, border:"1px solid rgba(124,106,255,0.2)", background:"rgba(14,12,28,0.8)", color:"white", fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit" };

  return (
    <div style={{ minHeight:"100vh", background:"#000", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"32px 20px" }}>
      <div style={{ width:"100%", maxWidth:380 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ fontSize:52, marginBottom:12 }}>🧠</div>
          <h1 style={{ margin:"0 0 8px", fontSize:22, fontWeight:800, color:"white" }}>Evaluación</h1>
          <p style={{ margin:0, fontSize:13, color:"#4a5270" }}>Psicología del Deporte · ATFA 2026</p>
        </div>
        <div style={{ background:"rgba(14,12,28,0.8)", borderRadius:20, padding:"24px", border:"1px solid rgba(124,106,255,0.15)", marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#7c6aff", textTransform:"uppercase", letterSpacing:1, marginBottom:16 }}>Antes de comenzar</div>
          <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#a0a8c0", marginBottom:6, textTransform:"uppercase", letterSpacing:.5 }}>Nombre completo</label>
          <input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Lic. Nombre Apellido" style={{...inp, marginBottom:14}}/>
          <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#a0a8c0", marginBottom:6, textTransform:"uppercase", letterSpacing:.5 }}>Email</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleIniciar()} placeholder="tu@email.com" style={inp}/>
          {error && <div style={{ marginTop:10, fontSize:12, color:"#ef5350", fontWeight:600 }}>⚠ {error}</div>}
        </div>
        <div style={{ background:"rgba(124,106,255,0.06)", borderRadius:14, padding:"12px 16px", marginBottom:20, border:"1px solid rgba(124,106,255,0.12)" }}>
          <div style={{ fontSize:12, color:"#a0a8c0", lineHeight:1.7 }}>
            📋 <strong style={{color:"white"}}>10 preguntas</strong> de opción múltiple<br/>
            🔁 Tenés <strong style={{color:"white"}}>{MAX_INTENTOS} intentos</strong> para mejorar tu nota<br/>
            💾 Tu resultado queda registrado
          </div>
        </div>
        <button onClick={handleIniciar} disabled={verificando}
          style={{ width:"100%", padding:"14px", borderRadius:14, border:"none", background:verificando?"rgba(124,106,255,0.3)":"linear-gradient(135deg,#667eea,#764ba2)", color:"white", fontWeight:800, fontSize:15, cursor:verificando?"not-allowed":"pointer", boxShadow:"0 4px 20px rgba(124,106,255,0.4)" }}>
          {verificando ? "Verificando..." : "Comenzar evaluación →"}
        </button>
      </div>
    </div>
  );
}

// ── RESULTADO ─────────────────────────────────────────────────────────────────
function Resultado({ score, intento, nombre, onReintentar, onVolver, guardando, intentosRestantes }) {
  let msg, color, emoji;
  if (score >= 9)      { msg="Dominio total del factor humano y cognitivo.";                 color="#38a169"; emoji="🏆"; }
  else if (score >= 7) { msg="Muy bien. Comprendés las bases para liderar un plantel.";      color="#667eea"; emoji="⭐"; }
  else if (score >= 4) { msg="Aprobado, pero repasá los conceptos de psicología social.";   color="#e6a817"; emoji="📚"; }
  else                 { msg="Necesitás volver a leer el material.";                          color="#ef5350"; emoji="📖"; }
  const radio=52, circ=2*Math.PI*radio, offset=circ-(score/PREGUNTAS.length)*circ;
  return (
    <div style={{ minHeight:"100vh", background:"#000", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"32px 20px", textAlign:"center" }}>
      <div style={{ fontSize:48, marginBottom:12 }}>{emoji}</div>
      <h2 style={{ margin:"0 0 4px", fontSize:22, fontWeight:800, color:"white" }}>Evaluación finalizada</h2>
      <p style={{ margin:"0 0 6px", fontSize:13, color:"#4a5270" }}>Intento {intento} de {MAX_INTENTOS}</p>
      <p style={{ margin:"0 0 24px", fontSize:12, color:"#7c6aff", fontWeight:600 }}>{nombre}</p>
      <div style={{ position:"relative", width:140, height:140, marginBottom:20 }}>
        <svg width="140" height="140" style={{ transform:"rotate(-90deg)" }}>
          <circle cx="70" cy="70" r={radio} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10"/>
          <circle cx="70" cy="70" r={radio} fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition:"stroke-dashoffset 1s ease" }}/>
        </svg>
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize:36, fontWeight:900, color:"white" }}>{score}</span>
          <span style={{ fontSize:11, color:"#4a5270" }}>de {PREGUNTAS.length}</span>
        </div>
      </div>
      <div style={{ background:`${color}18`, border:`1px solid ${color}44`, borderRadius:14, padding:"12px 20px", marginBottom:24, maxWidth:320 }}>
        <p style={{ margin:0, fontSize:13, color, fontWeight:700 }}>{msg}</p>
      </div>
      {guardando && <p style={{ fontSize:12, color:"#4a5270", marginBottom:12 }}>💾 Guardando resultado...</p>}
      <div style={{ display:"flex", flexDirection:"column", gap:10, width:"100%", maxWidth:320 }}>
        {intentosRestantes > 0 && (
          <button onClick={onReintentar} style={{ padding:"13px", borderRadius:14, border:"none", background:"linear-gradient(135deg,#667eea,#764ba2)", color:"white", fontWeight:800, fontSize:14, cursor:"pointer", boxShadow:"0 4px 16px rgba(124,106,255,0.4)" }}>
            🔁 Segundo intento ({intentosRestantes} restante{intentosRestantes>1?"s":""})
          </button>
        )}
        <button onClick={onVolver} style={{ padding:"13px", borderRadius:14, border:"1px solid rgba(124,106,255,0.2)", background:"transparent", color:"#a0a8c0", fontWeight:700, fontSize:13, cursor:"pointer" }}>
          ← Volver al inicio
        </button>
      </div>
    </div>
  );
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
export default function QuizPsicologia({ onVolver }) {
  const [etapa, setEtapa] = useState("registro"); // registro | bloqueado | quiz | resultado
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [intento, setIntento] = useState(1);
  const [idx, setIdx] = useState(0);
  const [scoreActual, setScoreActual] = useState(0);
  const [seleccionado, setSeleccionado] = useState(null);
  const [respondido, setRespondido] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Ocultar tab bar para que no solape con el botón Siguiente
  useEffect(() => {
    const tabBar = document.querySelector(".tab-bar-bottom") || document.querySelector("[class*='tab-bar']");
    if (tabBar) { tabBar.style.display = "none"; }
    return () => { if (tabBar) tabBar.style.display = ""; };
  }, []);

  function iniciarQuiz(nom, mail, intentosUsados) {
    setNombre(nom); setEmail(mail);
    if (intentosUsados >= MAX_INTENTOS) { setEtapa("bloqueado"); return; }
    setIntento(intentosUsados + 1);
    resetQuiz(); setEtapa("quiz");
  }

  function resetQuiz() { setIdx(0); setScoreActual(0); setSeleccionado(null); setRespondido(false); }

  function elegir(i) {
    if (respondido) return;
    setSeleccionado(i); setRespondido(true);
    if (PREGUNTAS[idx].opciones[i].ok) setScoreActual(s => s+1);
  }

  async function siguiente() {
    if (idx < PREGUNTAS.length-1) {
      setIdx(i=>i+1); setSeleccionado(null); setRespondido(false);
    } else {
      setGuardando(true);
      try {
        await addDoc(collection(db,"quiz_resultados"), {
          nombre, email, score: scoreActual,
          totalPreguntas: PREGUNTAS.length,
          porcentaje: Math.round((scoreActual/PREGUNTAS.length)*100),
          intento, fecha: serverTimestamp(),
          fechaISO: new Date().toISOString(),
          quiz: "psicologia_deporte_atfa_2026",
        });
      } catch(e) { console.error(e); }
      setGuardando(false); setEtapa("resultado");
    }
  }

  function reintentar() { resetQuiz(); setIntento(i=>i+1); setEtapa("quiz"); }

  if (etapa==="registro")  return <PantallaRegistro onIniciar={iniciarQuiz}/>;
  if (etapa==="bloqueado") return <PantallaBloqueada nombre={nombre} onVolver={onVolver}/>;
  if (etapa==="resultado") return (
    <Resultado score={scoreActual} intento={intento} nombre={nombre}
      onReintentar={reintentar} onVolver={onVolver}
      guardando={guardando} intentosRestantes={MAX_INTENTOS - intento}/>
  );

  const p = PREGUNTAS[idx];
  const pct = ((idx+1)/PREGUNTAS.length)*100;

  return (
    <div style={{ minHeight:"100vh", background:"#000", paddingBottom:60 }}>
      <div style={{ background:"linear-gradient(180deg,#0a0816,#000)", padding:"54px 20px 20px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <button onClick={onVolver} style={{ background:"rgba(255,255,255,0.06)", border:"none", borderRadius:20, padding:"6px 14px", color:"#a0a8c0", fontWeight:700, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a0a8c0" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            Volver
          </button>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:11, color:"#4a5270" }}>Intento {intento}/{MAX_INTENTOS}</span>
            <span style={{ fontSize:12, fontWeight:700, color:"#7c6aff" }}>{idx+1}/{PREGUNTAS.length}</span>
            <span style={{ fontSize:12, fontWeight:700, color:"#a0a8c0" }}>⭐ {scoreActual}</span>
          </div>
        </div>
        <div style={{ height:4, background:"rgba(255,255,255,0.06)", borderRadius:4, overflow:"hidden", marginBottom:16 }}>
          <div style={{ height:"100%", width:`${pct}%`, background:"linear-gradient(90deg,#667eea,#764ba2)", borderRadius:4, transition:"width 0.4s ease" }}/>
        </div>
        <div style={{ fontSize:10, fontWeight:700, color:"#7c6aff", textTransform:"uppercase", letterSpacing:1.5, marginBottom:8 }}>Psicología del Deporte · ATFA 2026</div>
        <h2 style={{ margin:0, fontSize:16, fontWeight:800, color:"white", lineHeight:1.45 }}>{p.q}</h2>
      </div>

      <div style={{ padding:"16px", display:"flex", flexDirection:"column", gap:10 }}>
        {p.opciones.map((op,i) => {
          let bg="rgba(14,12,28,0.85)", border="rgba(124,106,255,0.12)", color="white", icon=null;
          if (respondido) {
            if (op.ok)                { bg="rgba(56,161,105,0.15)"; border="#38a169"; color="#66bb6a"; icon="✓"; }
            else if (i===seleccionado){ bg="rgba(239,83,80,0.15)";  border="#ef5350"; color="#ef5350"; icon="✕"; }
            else                      { bg="rgba(14,12,28,0.4)"; color="#3a3a5a"; }
          }
          return (
            <button key={i} onClick={()=>elegir(i)} disabled={respondido}
              style={{ width:"100%", padding:"14px 16px", borderRadius:14, border:`1px solid ${border}`, background:bg, color, fontWeight:600, fontSize:13, textAlign:"left", cursor:respondido?"default":"pointer", display:"flex", alignItems:"center", gap:12, transition:"all 0.2s", lineHeight:1.4 }}>
              <div style={{ width:24, height:24, borderRadius:"50%", background:icon==="✓"?"rgba(56,161,105,0.3)":icon==="✕"?"rgba(239,83,80,0.3)":"rgba(255,255,255,0.06)", border:`1px solid ${icon==="✓"?"#38a169":icon==="✕"?"#ef5350":"rgba(255,255,255,0.1)"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, flexShrink:0, color:icon==="✓"?"#66bb6a":icon==="✕"?"#ef5350":"#4a5270" }}>
                {icon||String.fromCharCode(65+i)}
              </div>
              {op.text}
            </button>
          );
        })}
      </div>

      {respondido && (
        <div style={{ padding:"0 16px 60px", animation:"fadeUp 0.3s ease" }}>
          <div style={{ background:p.opciones[seleccionado].ok?"rgba(56,161,105,0.1)":"rgba(239,83,80,0.1)", border:`1px solid ${p.opciones[seleccionado].ok?"rgba(56,161,105,0.3)":"rgba(239,83,80,0.3)"}`, borderRadius:14, padding:"14px 16px", marginBottom:12 }}>
            <div style={{ fontSize:13, fontWeight:800, color:p.opciones[seleccionado].ok?"#66bb6a":"#ef5350", marginBottom:6 }}>
              {p.opciones[seleccionado].ok?"✓ ¡Correcto!":"✕ Incorrecto"}
            </div>
            <div style={{ fontSize:12, color:"#a0a8c0", lineHeight:1.6 }}>{p.opciones[seleccionado].r}</div>
          </div>
          <button onClick={siguiente} style={{ width:"100%", padding:"14px", borderRadius:14, border:"none", background:"linear-gradient(135deg,#667eea,#764ba2)", color:"white", fontWeight:800, fontSize:14, cursor:"pointer", boxShadow:"0 4px 16px rgba(124,106,255,0.4)" }}>
            {idx===PREGUNTAS.length-1?"Ver resultado final →":"Siguiente pregunta →"}
          </button>
        </div>
      )}
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
