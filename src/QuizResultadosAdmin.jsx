import { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";

function formatFecha(ts) {
  if (!ts?.toDate) return "—";
  return ts.toDate().toLocaleDateString("es-AR", { day:"numeric", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" });
}

function getColor(score, total) {
  const pct = score / total;
  if (pct >= 0.9) return "#38a169";
  if (pct >= 0.7) return "#667eea";
  if (pct >= 0.4) return "#e6a817";
  return "#ef5350";
}

export default function QuizResultadosAdmin({ onVolver }) {
  const [resultados, setResultados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState("todos"); // todos | mejor
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    const q = query(collection(db, "quiz_resultados"), orderBy("fecha", "desc"));
    const unsub = onSnapshot(q, snap => {
      setResultados(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      setCargando(false);
    });
    return () => unsub();
  }, []);

  // Agrupar por email para mostrar mejor intento
  const porEmail = {};
  resultados.forEach(r => {
    if (!porEmail[r.email]) porEmail[r.email] = [];
    porEmail[r.email].push(r);
  });

  const mejoresPorEmail = Object.values(porEmail).map(arr => {
    return arr.reduce((best, r) => r.score > best.score ? r : best, arr[0]);
  }).sort((a, b) => b.score - a.score);

  const listaFiltrada = (filtro === "mejor" ? mejoresPorEmail : resultados)
    .filter(r => {
      if (!busqueda) return true;
      const b = busqueda.toLowerCase();
      return r.nombre?.toLowerCase().includes(b) || r.email?.toLowerCase().includes(b);
    });

  // Estadísticas generales
  const totalRendiciones = resultados.length;
  const totalParticipantes = Object.keys(porEmail).length;
  const promedio = resultados.length
    ? Math.round(resultados.reduce((a, r) => a + r.score, 0) / resultados.length * 10) / 10
    : 0;
  const aprobados = mejoresPorEmail.filter(r => r.score >= 4).length;

  return (
    <div style={{ minHeight:"100vh", background:"#000", paddingBottom:60 }}>

      {/* HEADER */}
      <div style={{ background:"linear-gradient(180deg,#0a0816,#000)", padding:"54px 20px 20px", borderBottom:"1px solid rgba(124,106,255,0.12)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <button onClick={onVolver} style={{ background:"rgba(255,255,255,0.06)", border:"none", borderRadius:20, padding:"6px 14px", color:"#a0a8c0", fontWeight:700, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a0a8c0" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            Volver
          </button>
          <span style={{ fontSize:11, color:"#7c6aff", fontWeight:700, letterSpacing:2 }}>ADMIN</span>
        </div>
        <h1 style={{ margin:"0 0 4px", fontSize:20, fontWeight:800, color:"white" }}>🧠 Resultados del Quiz</h1>
        <p style={{ margin:0, fontSize:12, color:"#4a5270" }}>Psicología del Deporte · ATFA 2026</p>
      </div>

      <div style={{ padding:"16px 14px" }}>

        {/* ESTADÍSTICAS */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
          {[
            { label:"Participantes", value:totalParticipantes, icon:"👥", color:"#667eea" },
            { label:"Rendiciones", value:totalRendiciones, icon:"📝", color:"#a18cd1" },
            { label:"Promedio", value:`${promedio}/10`, icon:"📊", color:"#f093fb" },
            { label:"Aprobados", value:`${aprobados}/${totalParticipantes}`, icon:"✅", color:"#38a169" },
          ].map(s => (
            <div key={s.label} style={{ background:"rgba(14,12,28,0.85)", borderRadius:14, padding:"12px 14px", border:`1px solid ${s.color}22` }}>
              <div style={{ fontSize:18, marginBottom:4 }}>{s.icon}</div>
              <div style={{ fontSize:20, fontWeight:900, color:s.color }}>{s.value}</div>
              <div style={{ fontSize:10, color:"#4a5270", fontWeight:600, textTransform:"uppercase", letterSpacing:.5 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* FILTROS Y BÚSQUEDA */}
        <div style={{ display:"flex", gap:8, marginBottom:12 }}>
          <input
            value={busqueda} onChange={e=>setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o email..."
            style={{ flex:1, padding:"9px 14px", borderRadius:20, border:"1px solid rgba(124,106,255,0.2)", background:"rgba(14,12,28,0.8)", color:"white", fontSize:12, outline:"none" }}
          />
        </div>
        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          {[["todos","Todos los intentos"],["mejor","Mejor intento"]].map(([v,l]) => (
            <button key={v} onClick={()=>setFiltro(v)}
              style={{ padding:"6px 14px", borderRadius:20, border:`1px solid ${filtro===v?"#7c6aff":"rgba(124,106,255,0.2)"}`, background:filtro===v?"rgba(124,106,255,0.2)":"transparent", color:filtro===v?"#a78bfa":"#4a5270", fontSize:11, fontWeight:700, cursor:"pointer" }}>
              {l}
            </button>
          ))}
        </div>

        {/* LISTA */}
        {cargando ? (
          <div style={{ textAlign:"center", padding:"40px 0", color:"#4a5270", fontSize:13 }}>Cargando resultados...</div>
        ) : listaFiltrada.length === 0 ? (
          <div style={{ textAlign:"center", padding:"40px 0" }}>
            <div style={{ fontSize:40, marginBottom:10 }}>📭</div>
            <p style={{ margin:0, color:"#4a5270", fontSize:13 }}>{busqueda ? "Sin resultados para esa búsqueda." : "Todavía no hay resultados registrados."}</p>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {listaFiltrada.map((r, i) => {
              const color = getColor(r.score, r.totalPreguntas || 10);
              const intentosUsuario = porEmail[r.email]?.length || 1;
              return (
                <div key={r.id} style={{ background:"rgba(14,12,28,0.85)", borderRadius:16, overflow:"hidden", border:`1px solid ${color}33` }}>
                  <div style={{ height:3, background:`linear-gradient(90deg,${color},${color}66)` }}/>
                  <div style={{ padding:"14px 16px" }}>
                    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:8 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:800, color:"white", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.nombre}</div>
                        <div style={{ fontSize:11, color:"#4a5270", marginTop:2 }}>{r.email}</div>
                      </div>
                      {/* Score circular */}
                      <div style={{ width:48, height:48, borderRadius:"50%", border:`2px solid ${color}`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", flexShrink:0, marginLeft:12, background:`${color}15` }}>
                        <span style={{ fontSize:16, fontWeight:900, color, lineHeight:1 }}>{r.score}</span>
                        <span style={{ fontSize:8, color:"#4a5270" }}>/{r.totalPreguntas||10}</span>
                      </div>
                    </div>

                    <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:6 }}>
                      <span style={{ fontSize:10, background:`${color}18`, color, border:`1px solid ${color}33`, borderRadius:20, padding:"2px 10px", fontWeight:700 }}>
                        {r.porcentaje}%
                      </span>
                      {filtro==="todos" && (
                        <span style={{ fontSize:10, background:"rgba(124,106,255,0.1)", color:"#a78bfa", border:"1px solid rgba(124,106,255,0.2)", borderRadius:20, padding:"2px 10px", fontWeight:700 }}>
                          Intento {r.intento}/{intentosUsuario}
                        </span>
                      )}
                      {r.esMejorIntento && filtro==="todos" && (
                        <span style={{ fontSize:10, background:"rgba(56,161,105,0.1)", color:"#66bb6a", border:"1px solid rgba(56,161,105,0.2)", borderRadius:20, padding:"2px 10px", fontWeight:700 }}>
                          ★ Mejor intento
                        </span>
                      )}
                      {filtro==="mejor" && intentosUsuario > 1 && (
                        <span style={{ fontSize:10, background:"rgba(255,255,255,0.05)", color:"#4a5270", borderRadius:20, padding:"2px 10px", fontWeight:600 }}>
                          {intentosUsuario} intentos
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize:10, color:"#3a3a5a" }}>{formatFecha(r.fecha)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
