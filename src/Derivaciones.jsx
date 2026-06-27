import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDoc } from "firebase/firestore";

const ESPECIALIDADES = ["Pareja", "Infanto-juvenil", "Duelo", "Adicciones", "Grupal", "Adultos", "Familiar", "Trauma", "Ansiedad", "Otro"];
const MODALIDADES = ["Presencial", "Online", "Ambas"];
const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const FRANJAS = ["Mañana", "Tarde", "Noche"];

function avatarColor(nombre) {
  const colores = ["linear-gradient(135deg,#667eea,#764ba2)", "linear-gradient(135deg,#f093fb,#f5576c)", "linear-gradient(135deg,#4facfe,#00f2fe)", "linear-gradient(135deg,#43e97b,#38f9d7)", "linear-gradient(135deg,#fa709a,#fee140)", "linear-gradient(135deg,#a18cd1,#fbc2eb)", "linear-gradient(135deg,#fda085,#f6d365)"];
  let hash = 0;
  for (let i = 0; i < (nombre || "").length; i++) hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
  return colores[Math.abs(hash) % colores.length];
}

// ── Componente swipe card ─────────────────────────────────────────────────────
function SwipeCard({ derivacion, usuario, colorMap, onInteresa, onArchivar, onVer }) {
  const cardRef = useRef(null);
  const startX = useRef(null);
  const currentX = useRef(0);
  const [swipeDir, setSwipeDir] = useState(null); // "right" | "left" | null
  const [offsetX, setOffsetX] = useState(0);
  const THRESHOLD = 80;

  function onTouchStart(e) { startX.current = e.touches[0].clientX; }
  function onTouchMove(e) {
    if (startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    currentX.current = dx;
    setOffsetX(dx);
    setSwipeDir(dx > 20 ? "right" : dx < -20 ? "left" : null);
  }
  function onTouchEnd() {
    if (currentX.current > THRESHOLD) { onInteresa(); }
    else if (currentX.current < -THRESHOLD) { onArchivar(); }
    startX.current = null; currentX.current = 0;
    setOffsetX(0); setSwipeDir(null);
  }

  const d = derivacion;
  const esMia = d.derivadoPorEmail === usuario.email;
  const yaInteresado = d.interesadosEmails?.includes(usuario.email);
  const fueAsignado = d.asignadoEmail === usuario.email;
  const inicial = d.derivadoPor?.[0]?.toUpperCase() || "?";
  const rotation = offsetX * 0.05;
  const opacity = Math.max(0.5, 1 - Math.abs(offsetX) / 300);

  const ESTADOS = {
    disponible: { label: "Disponible", color: "#66bb6a", bg: "rgba(102,187,106,0.12)" },
    con_interesados: { label: "Con interesados", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
    asignada: { label: "Asignada ✓", color: "#7c6aff", bg: "rgba(124,106,255,0.12)" },
    cerrada: { label: "Cerrada", color: "#4a5270", bg: "rgba(74,82,112,0.1)" },
  };
  const est = ESTADOS[d.estado] || ESTADOS.disponible;

  return (
    <div ref={cardRef}
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      onClick={() => Math.abs(offsetX) < 10 && onVer()}
      style={{ background: "rgba(14,12,28,0.9)", borderRadius: 20, border: `1px solid ${d.estado === "disponible" ? "rgba(124,106,255,0.25)" : "rgba(124,106,255,0.1)"}`, overflow: "hidden", cursor: "pointer", userSelect: "none", transform: `translateX(${offsetX}px) rotate(${rotation}deg)`, opacity, transition: offsetX === 0 ? "transform 0.3s, opacity 0.3s" : "none", position: "relative" }}>

      {/* Indicadores swipe */}
      {swipeDir === "right" && (
        <div style={{ position: "absolute", inset: 0, borderRadius: 20, border: "2px solid #66bb6a", background: "rgba(102,187,106,0.08)", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "flex-start", padding: "0 20px", pointerEvents: "none" }}>
          <span style={{ fontSize: 28, fontWeight: 800, color: "#66bb6a", opacity: Math.min(Math.abs(offsetX) / THRESHOLD, 1) }}>✓</span>
        </div>
      )}
      {swipeDir === "left" && (
        <div style={{ position: "absolute", inset: 0, borderRadius: 20, border: "2px solid #ef5350", background: "rgba(239,83,80,0.08)", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0 20px", pointerEvents: "none" }}>
          <span style={{ fontSize: 28, fontWeight: 800, color: "#ef5350", opacity: Math.min(Math.abs(offsetX) / THRESHOLD, 1) }}>✕</span>
        </div>
      )}

      {/* Barra superior */}
      <div style={{ height: 3, background: d.estado === "disponible" ? "linear-gradient(90deg,#667eea,#764ba2)" : "rgba(124,106,255,0.2)" }} />

      <div style={{ padding: "14px 16px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: avatarColor(d.derivadoPor), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "white", flexShrink: 0 }}>
              {inicial}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "white" }}>🧠 {d.especialidad}</div>
              <div style={{ fontSize: 11, color: "#4a5270" }}>por {d.derivadoPor}</div>
            </div>
          </div>
          <span style={{ background: est.bg, color: est.color, borderRadius: 20, padding: "3px 10px", fontSize: 10, fontWeight: 700, border: `1px solid ${est.color}33`, whiteSpace: "nowrap", flexShrink: 0 }}>{est.label}</span>
        </div>

        {/* Tags */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
          <Tag label={`📍 ${d.modalidad}`} />
          {d.genero !== "Indistinto" && <Tag label={`${d.genero === "Femenino" ? "👩" : "👨"} ${d.genero}`} />}
          {d.edad !== "Indistinto" && <Tag label={`🎂 ${d.edad}`} />}
          {d.dias?.length > 0 && <Tag label={`📅 ${d.dias.slice(0, 2).join(" · ")}${d.dias.length > 2 ? "…" : ""}`} />}
          {d.franjas?.length > 0 && <Tag label={`⏰ ${d.franjas.join(" · ")}`} />}
        </div>

        {d.nota && <p style={{ margin: "0 0 10px", fontSize: 12, color: "#a0a8c0", fontStyle: "italic", lineHeight: 1.5, padding: "8px 10px", background: "rgba(124,106,255,0.06)", borderRadius: 8, borderLeft: "2px solid rgba(124,106,255,0.3)" }}>"{d.nota}"</p>}

        {/* Vinculación activa */}
        {(fueAsignado || (esMia && d.estado === "asignada")) && (
          <div style={{ background: "rgba(124,106,255,0.1)", borderRadius: 10, padding: "8px 12px", marginBottom: 10, border: "1px solid rgba(124,106,255,0.2)", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>🔗</span>
            <span style={{ fontSize: 11, color: "#a78bfa", fontWeight: 600 }}>En contacto por derivación</span>
          </div>
        )}

        {/* Acciones */}
        {!esMia && d.estado === "disponible" && (
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button onClick={e => { e.stopPropagation(); onArchivar(); }} style={{ flex: 1, padding: "9px", borderRadius: 12, border: "1px solid rgba(239,83,80,0.3)", background: "rgba(239,83,80,0.08)", color: "#ef5350", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
              ✕ Archivar
            </button>
            <button onClick={e => { e.stopPropagation(); onInteresa(); }} style={{ flex: 2, padding: "9px", borderRadius: 12, border: "none", background: yaInteresado ? "rgba(102,187,106,0.15)" : "linear-gradient(135deg,#667eea,#764ba2)", color: yaInteresado ? "#66bb6a" : "white", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
              {yaInteresado ? "✓ Te anotaste" : "🙋 Me interesa"}
            </button>
          </div>
        )}

        {esMia && <div style={{ fontSize: 10, color: "#4a5270", textAlign: "center", marginTop: 4 }}>Tu derivación · tocá para ver postulantes</div>}
        {!esMia && d.estado !== "disponible" && <div style={{ fontSize: 10, color: "#4a5270", textAlign: "center", marginTop: 4 }}>Tocá para ver detalles</div>}

        {/* Hint swipe */}
        {!esMia && d.estado === "disponible" && (
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, opacity: 0.4 }}>
            <span style={{ fontSize: 9, color: "#ef5350" }}>← Archivar</span>
            <span style={{ fontSize: 9, color: "#a0a8c0" }}>deslizá</span>
            <span style={{ fontSize: 9, color: "#66bb6a" }}>Me interesa →</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Tag({ label }) {
  return <span style={{ background: "rgba(14,12,28,0.9)", color: "#a0a8c0", border: "1px solid rgba(124,106,255,0.15)", borderRadius: 8, padding: "2px 8px", fontSize: 10, fontWeight: 600 }}>{label}</span>;
}

// ── Componente detalle derivación ─────────────────────────────────────────────
function DetalleDerivacion({ d, usuario, perfiles, esAdmin, onVolver, onAsignar, onCerrar, onEliminar }) {
  const esMia = d.derivadoPorEmail === usuario.email;
  const fueAsignado = d.asignadoEmail === usuario.email;

  return (
    <div style={{ padding: "16px 14px 100px" }}>
      <button onClick={onVolver} style={{ background: "none", border: "none", color: "#7c6aff", cursor: "pointer", fontSize: 13, fontWeight: 600, marginBottom: 14, display: "flex", alignItems: "center", gap: 6, padding: 0 }}>
        ← Volver
      </button>

      <div style={{ background: "rgba(14,12,28,0.9)", borderRadius: 20, overflow: "hidden", border: "1px solid rgba(124,106,255,0.2)", marginBottom: 12 }}>
        <div style={{ height: 3, background: "linear-gradient(90deg,#667eea,#764ba2)" }} />
        <div style={{ padding: "16px" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "white", marginBottom: 4 }}>🧠 {d.especialidad}</div>
          <div style={{ fontSize: 12, color: "#4a5270", marginBottom: 12 }}>Publicado por {d.derivadoPor}</div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            <Tag label={`📍 ${d.modalidad}`} />
            {d.genero !== "Indistinto" && <Tag label={`${d.genero === "Femenino" ? "👩" : "👨"} ${d.genero}`} />}
            {d.edad !== "Indistinto" && <Tag label={`🎂 ${d.edad}`} />}
            {d.dias?.length > 0 && d.dias.map(dia => <Tag key={dia} label={dia} />)}
            {d.franjas?.length > 0 && d.franjas.map(f => <Tag key={f} label={`⏰ ${f}`} />)}
          </div>

          {d.nota && <p style={{ margin: 0, fontSize: 13, color: "#a0a8c0", fontStyle: "italic", lineHeight: 1.6, padding: "10px 12px", background: "rgba(124,106,255,0.06)", borderRadius: 10, borderLeft: "2px solid rgba(124,106,255,0.3)" }}>"{d.nota}"</p>}
        </div>
      </div>

      {/* Info asignación para el asignado */}
      {fueAsignado && d.estado === "asignada" && (
        <div style={{ background: "rgba(124,106,255,0.1)", borderRadius: 16, padding: "14px 16px", marginBottom: 12, border: "1px solid rgba(124,106,255,0.25)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.8 }}>✅ Te asignaron esta derivación</div>
          <p style={{ margin: "0 0 10px", fontSize: 12, color: "#a0a8c0" }}>Contactate con quien deriva:</p>
          {[{ label: "Profesional", value: d.derivadoPor }, { label: "Email", value: d.derivadoPorEmail, link: `mailto:${d.derivadoPorEmail}` }].map(({ label, value, link }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid rgba(124,106,255,0.08)" }}>
              <span style={{ fontSize: 12, color: "#4a5270" }}>{label}</span>
              {link ? <a href={link} style={{ fontSize: 12, color: "#7c6aff", fontWeight: 600, textDecoration: "none" }}>{value}</a> : <span style={{ fontSize: 12, color: "white", fontWeight: 600 }}>{value}</span>}
            </div>
          ))}
          {perfiles.find(p => p.email === d.derivadoPorEmail)?.telefono && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0" }}>
              <span style={{ fontSize: 12, color: "#4a5270" }}>Teléfono</span>
              <a href={`tel:${perfiles.find(p => p.email === d.derivadoPorEmail).telefono}`} style={{ fontSize: 12, color: "#7c6aff", fontWeight: 600, textDecoration: "none" }}>
                📞 {perfiles.find(p => p.email === d.derivadoPorEmail).telefono}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Postulantes para quien deriva */}
      {esMia && d.interesados?.length > 0 && (
        <div style={{ background: "rgba(14,12,28,0.8)", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(124,106,255,0.15)", marginBottom: 12 }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(124,106,255,0.08)" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#a0a8c0", textTransform: "uppercase", letterSpacing: 0.8 }}>
              {d.interesados.length} postulante{d.interesados.length > 1 ? "s" : ""}
            </span>
          </div>
          {(d.interesadosEmails || []).map((email, idx) => {
            const perfil = perfiles.find(p => p.email === email);
            const nombre = d.interesados[idx] || email;
            const inicial = nombre[0]?.toUpperCase();
            return (
              <div key={email} style={{ padding: "12px 16px", borderBottom: "1px solid rgba(124,106,255,0.06)", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: avatarColor(nombre), overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "white", flexShrink: 0 }}>
                  {perfil?.fotoUrl ? <img src={perfil.fotoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : inicial}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "white" }}>{nombre}</div>
                  {perfil?.especialidad && <div style={{ fontSize: 11, color: "#7c6aff" }}>{perfil.especialidad}</div>}
                  <div style={{ display: "flex", gap: 8, marginTop: 3 }}>
                    <a href={`mailto:${email}`} style={{ fontSize: 10, color: "#4fc3f7", textDecoration: "none" }}>✉ {email}</a>
                    {perfil?.telefono && <a href={`tel:${perfil.telefono}`} style={{ fontSize: 10, color: "#4fc3f7", textDecoration: "none" }}>📞 {perfil.telefono}</a>}
                  </div>
                </div>
                {d.estado !== "asignada" && (
                  <button onClick={() => onAsignar(d, nombre, email)} style={{ padding: "7px 14px", borderRadius: 20, border: "none", background: "linear-gradient(135deg,#43e97b,#38f9d7)", color: "#1a4731", fontWeight: 700, fontSize: 11, cursor: "pointer", flexShrink: 0 }}>
                    Asignar
                  </button>
                )}
                {d.asignadoEmail === email && (
                  <span style={{ fontSize: 10, color: "#7c6aff", fontWeight: 700, background: "rgba(124,106,255,0.15)", borderRadius: 20, padding: "3px 10px" }}>✓ Asignado</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info asignado para quien deriva */}
      {esMia && d.estado === "asignada" && d.asignadoA && (
        <div style={{ background: "rgba(102,187,106,0.1)", borderRadius: 14, padding: "12px 16px", marginBottom: 12, border: "1px solid rgba(102,187,106,0.25)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#66bb6a", marginBottom: 6 }}>✅ Derivación asignada a {d.asignadoA}</div>
          {perfiles.find(p => p.email === d.asignadoEmail)?.telefono && (
            <a href={`tel:${perfiles.find(p => p.email === d.asignadoEmail).telefono}`} style={{ fontSize: 12, color: "#4fc3f7", textDecoration: "none" }}>📞 {perfiles.find(p => p.email === d.asignadoEmail).telefono}</a>
          )}
        </div>
      )}

      {/* Acciones */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {esMia && d.estado !== "cerrada" && (
          <button onClick={() => onCerrar(d)} style={{ flex: 1, padding: "10px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#a0a8c0", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
            Cerrar sin asignar
          </button>
        )}
        {esAdmin && (
          <button onClick={() => onEliminar(d.id)} style={{ flex: 1, padding: "10px", borderRadius: 12, border: "1px solid rgba(239,83,80,0.3)", background: "rgba(239,83,80,0.08)", color: "#ef5350", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
            🗑 Eliminar
          </button>
        )}
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Derivaciones({ usuario, t, esAdmin }) {
  const [derivaciones, setDerivaciones] = useState([]);
  const [perfiles, setPerfiles] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [filtro, setFiltro] = useState("disponibles");
  const [detalle, setDetalle] = useState(null);
  const [archivadas, setArchivadas] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`grins_arch_${usuario?.email}`) || "[]"); } catch { return []; }
  });
  const [form, setForm] = useState({ especialidad: "", otraEspecialidad: "", modalidad: "Ambas", dias: [], franjas: [], genero: "Indistinto", edad: "Indistinto", nota: "" });

  useEffect(() => {
    const u1 = onSnapshot(collection(db, "derivaciones"), snap => {
      const data = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      data.sort((a, b) => (b.creadoEn?.seconds || 0) - (a.creadoEn?.seconds || 0));
      setDerivaciones(data);
    });
    const u2 = onSnapshot(collection(db, "usuarios"), snap => {
      setPerfiles(snap.docs.map(d => ({ ...d.data(), email: d.id })));
    });
    return () => { u1(); u2(); };
  }, []);

  function toggleArr(arr, val) { return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]; }

  function archivarLocal(id) {
    const nueva = [...archivadas, id];
    setArchivadas(nueva);
    try { localStorage.setItem(`grins_arch_${usuario?.email}`, JSON.stringify(nueva)); } catch {}
  }

  async function meInteresa(d) {
    if (d.derivadoPorEmail === usuario.email || d.interesadosEmails?.includes(usuario.email)) return;
    await updateDoc(doc(db, "derivaciones", d.id), {
      interesados: [...(d.interesados || []), usuario.nombre],
      interesadosEmails: [...(d.interesadosEmails || []), usuario.email],
    });
  }

  async function asignar(d, nombre, email) {
    await updateDoc(doc(db, "derivaciones", d.id), { asignadoA: nombre, asignadoEmail: email, estado: "asignada" });
    // Crear notificaciones
    await addDoc(collection(db, "notificaciones"), { para: email, de: usuario.email, deNombre: usuario.nombre, tipo: "derivacion_asignada", derivacionId: d.id, especialidad: d.especialidad, leida: false, creadoEn: serverTimestamp() });
    await addDoc(collection(db, "notificaciones"), { para: d.derivadoPorEmail, de: email, deNombre: nombre, tipo: "derivacion_match", derivacionId: d.id, especialidad: d.especialidad, leida: false, creadoEn: serverTimestamp() });
    setDetalle(null);
  }

  async function cerrar(d) { await updateDoc(doc(db, "derivaciones", d.id), { estado: "cerrada" }); setDetalle(null); }
  async function eliminar(id) { await deleteDoc(doc(db, "derivaciones", id)); setDetalle(null); }

  async function publicar() {
    if (!form.especialidad) return;
    const esp = form.especialidad === "Otro" ? form.otraEspecialidad || "Otro" : form.especialidad;
    await addDoc(collection(db, "derivaciones"), {
      especialidad: esp, modalidad: form.modalidad, dias: form.dias, franjas: form.franjas,
      genero: form.genero, edad: form.edad, nota: form.nota.trim(),
      estado: "disponible", derivadoPor: usuario.nombre, derivadoPorEmail: usuario.email,
      interesados: [], interesadosEmails: [], asignadoA: null, asignadoEmail: null, creadoEn: serverTimestamp()
    });
    setForm({ especialidad: "", otraEspecialidad: "", modalidad: "Ambas", dias: [], franjas: [], genero: "Indistinto", edad: "Indistinto", nota: "" });
    setMostrarForm(false);
  }

  const chip = (label, active, onClick) => (
    <button key={label} onClick={onClick} style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${active ? "#7c6aff" : "rgba(124,106,255,0.2)"}`, background: active ? "linear-gradient(135deg,#667eea,#764ba2)" : "rgba(14,12,28,0.8)", color: active ? "white" : "#a0a8c0", fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>{label}</button>
  );

  const inp = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(124,106,255,0.2)", fontSize: 13, marginBottom: 12, boxSizing: "border-box", outline: "none", background: "rgba(14,12,28,0.8)", color: "white" };
  const lbl = { display: "block", fontSize: 11, fontWeight: 700, color: "#a0a8c0", marginBottom: 6, textTransform: "uppercase", letterSpacing: .5 };

  const derivFiltradas = derivaciones.filter(d => {
    if (filtro === "disponibles") return d.estado === "disponible" && !archivadas.includes(d.id);
    if (filtro === "mias") return d.derivadoPorEmail === usuario.email;
    if (filtro === "cerradas") return d.estado === "cerrada" || archivadas.includes(d.id);
    if (filtro === "interesado") return d.interesadosEmails?.includes(usuario.email);
    return true;
  });

  if (detalle) {
    const d = derivaciones.find(x => x.id === detalle) || detalle;
    return <DetalleDerivacion d={d} usuario={usuario} perfiles={perfiles} esAdmin={esAdmin} onVolver={() => setDetalle(null)} onAsignar={asignar} onCerrar={cerrar} onEliminar={eliminar} />;
  }

  return (
    <div style={{ padding: "16px 14px 100px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "white" }}>Derivaciones</h2>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "#4a5270" }}>Red de derivaciones GRINS</p>
        </div>
        <button onClick={() => setMostrarForm(f => !f)} style={{ padding: "8px 16px", borderRadius: 20, border: mostrarForm ? "1px solid rgba(124,106,255,0.2)" : "none", background: mostrarForm ? "rgba(14,12,28,0.8)" : "linear-gradient(135deg,#667eea,#764ba2)", color: "white", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
          {mostrarForm ? "Cancelar" : "+ Nueva"}
        </button>
      </div>

      {/* FORM */}
      {mostrarForm && (
        <div style={{ background: "rgba(14,12,28,0.9)", borderRadius: 18, padding: 18, marginBottom: 16, border: "1px solid rgba(124,106,255,0.2)" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.1)", margin: "0 auto 16px" }} />
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 800, color: "white" }}>Nueva derivación</h3>

          <label style={lbl}>Especialidad requerida</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>{ESPECIALIDADES.map(e => chip(e, form.especialidad === e, () => setForm(f => ({ ...f, especialidad: e }))))}</div>
          {form.especialidad === "Otro" && <input value={form.otraEspecialidad} onChange={e => setForm(f => ({ ...f, otraEspecialidad: e.target.value }))} placeholder="Especificá la especialidad" style={inp} />}

          <label style={lbl}>Modalidad</label>
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>{MODALIDADES.map(m => chip(m, form.modalidad === m, () => setForm(f => ({ ...f, modalidad: m }))))}</div>

          <label style={lbl}>Días disponibles</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>{DIAS.map(d => chip(d, form.dias.includes(d), () => setForm(f => ({ ...f, dias: toggleArr(f.dias, d) }))))}</div>

          <label style={lbl}>Franjas horarias</label>
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>{FRANJAS.map(f => chip(f, form.franjas.includes(f), () => setForm(fr => ({ ...fr, franjas: toggleArr(fr.franjas, f) }))))}</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={lbl}>Género</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{["Indistinto", "Femenino", "Masculino"].map(g => chip(g, form.genero === g, () => setForm(f => ({ ...f, genero: g }))))}</div>
            </div>
            <div>
              <label style={lbl}>Franja etaria</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{["Indistinto", "Joven", "Adulto"].map(e => chip(e, form.edad === e, () => setForm(f => ({ ...f, edad: e }))))}</div>
            </div>
          </div>

          <label style={lbl}>Nota clínica (sin datos del paciente)</label>
          <textarea value={form.nota} onChange={e => setForm(f => ({ ...f, nota: e.target.value }))} placeholder="Contexto clínico sin datos identificatorios..." rows={3} style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} />

          <button onClick={publicar} disabled={!form.especialidad} style={{ width: "100%", padding: 13, borderRadius: 12, border: "none", background: form.especialidad ? "linear-gradient(135deg,#667eea,#764ba2)" : "rgba(255,255,255,0.05)", color: "white", fontWeight: 800, fontSize: 13, cursor: form.especialidad ? "pointer" : "not-allowed" }}>
            Publicar derivación
          </button>
        </div>
      )}

      {/* FILTROS */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", paddingBottom: 2 }}>
        {[["disponibles", "🟢 Disponibles"], ["mias", "Mis derivaciones"], ["interesado", "Me interesa"], ["cerradas", "Cerradas"]].map(([v, l]) => chip(l, filtro === v, () => setFiltro(v)))}
      </div>

      {/* LISTA */}
      {derivFiltradas.length === 0 && (
        <div style={{ background: "rgba(14,12,28,0.6)", borderRadius: 16, padding: 32, textAlign: "center", border: "1px solid rgba(124,106,255,0.08)" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🔄</div>
          <p style={{ margin: 0, fontSize: 13, color: "#4a5270" }}>
            {filtro === "disponibles" ? "No hay derivaciones disponibles." : filtro === "mias" ? "No publicaste derivaciones aún." : "Nada por acá."}
          </p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {derivFiltradas.map(d => (
          <SwipeCard key={d.id} derivacion={d} usuario={usuario} colorMap={{}}
            onInteresa={() => meInteresa(d)}
            onArchivar={() => archivarLocal(d.id)}
            onVer={() => setDetalle(d.id)}
          />
        ))}
      </div>
    </div>
  );
}
