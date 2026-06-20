import { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";

const ESPECIALIDADES = ["Pareja", "Infanto-juvenil", "Duelo", "Adicciones", "Grupal", "Adultos", "Familiar", "Trauma", "Ansiedad", "Otro"];
const MODALIDADES = ["Presencial", "Online", "Ambas"];
const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const FRANJAS = ["Mañana", "Tarde", "Noche"];

export default function Derivaciones({ usuario, t, modoOscuro }) {
  const [derivaciones, setDerivaciones] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [filtro, setFiltro] = useState("todas");
  const [form, setForm] = useState({
    especialidad: "", otraEspecialidad: "",
    modalidad: "Ambas",
    dias: [], franjas: [],
    genero: "Indistinto", edad: "Indistinto",
    nota: ""
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "derivaciones"), snap => {
      const data = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      data.sort((a, b) => (b.creadoEn?.seconds || 0) - (a.creadoEn?.seconds || 0));
      setDerivaciones(data);
    });
    return () => unsub();
  }, []);

  function toggleArr(arr, val) {
    return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
  }

  async function publicar() {
    if (!form.especialidad) return;
    const esp = form.especialidad === "Otro" ? form.otraEspecialidad || "Otro" : form.especialidad;
    await addDoc(collection(db, "derivaciones"), {
      especialidad: esp,
      modalidad: form.modalidad,
      dias: form.dias,
      franjas: form.franjas,
      genero: form.genero,
      edad: form.edad,
      nota: form.nota.trim(),
      estado: "disponible",
      derivadoPor: usuario.nombre,
      derivadoPorEmail: usuario.email,
      interesados: [],
      asignadoA: null,
      creadoEn: serverTimestamp()
    });
    setForm({ especialidad: "", otraEspecialidad: "", modalidad: "Ambas", dias: [], franjas: [], genero: "Indistinto", edad: "Indistinto", nota: "" });
    setMostrarForm(false);
  }

  async function meInteresa(d) {
    if (d.derivadoPorEmail === usuario.email) return;
    if (d.interesados?.includes(usuario.nombre)) return;
    await updateDoc(doc(db, "derivaciones", d.id), {
      interesados: [...(d.interesados || []), usuario.nombre],
      estado: "con_interesados"
    });
  }

  async function asignar(d, nombre) {
    await updateDoc(doc(db, "derivaciones", d.id), {
      asignadoA: nombre,
      estado: "asignada"
    });
  }

  async function cerrar(d) {
    await updateDoc(doc(db, "derivaciones", d.id), { estado: "cerrada" });
  }

  const esMia = d => d.derivadoPorEmail === usuario.email;
  const yaInteresado = d => d.interesados?.includes(usuario.nombre);

  const ESTADOS = {
    disponible: { label: "Disponible", color: "#38a169", bg: modoOscuro ? "rgba(56,161,105,0.15)" : "#f0fff4" },
    con_interesados: { label: "Con interesados", color: "#d69e2e", bg: modoOscuro ? "rgba(214,158,46,0.15)" : "#fffff0" },
    asignada: { label: "Asignada ✓", color: "#4299e1", bg: modoOscuro ? "rgba(66,153,225,0.15)" : "#ebf8ff" },
    cerrada: { label: "Cerrada", color: "#718096", bg: modoOscuro ? "rgba(113,128,150,0.15)" : "#f7fafc" },
  };

  const derivFiltradas = derivaciones.filter(d => {
    if (filtro === "todas") return d.estado !== "cerrada";
    if (filtro === "mias") return esMia(d) && d.estado !== "cerrada";
    if (filtro === "disponibles") return d.estado === "disponible";
    if (filtro === "cerradas") return d.estado === "cerrada";
    return true;
  });

  const chip = (label, active, onClick) => (
    <button key={label} onClick={onClick} style={{
      padding: "4px 10px", borderRadius: 20, border: `1px solid ${active ? "#667eea" : t.borde}`,
      background: active ? "linear-gradient(135deg,#667eea,#764ba2)" : t.cardBg,
      color: active ? "white" : t.textoSuave, fontSize: 11, fontWeight: 600, cursor: "pointer"
    }}>{label}</button>
  );

  return (
    <div style={{ padding: "16px 12px" }}>

      {/* Botón nueva derivación */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: t.texto }}>🔄 Derivaciones</h2>
        <button onClick={() => setMostrarForm(f => !f)} style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#667eea,#764ba2)", color: "white", fontWeight: 800, fontSize: 12, cursor: "pointer" }}>
          {mostrarForm ? "Cancelar" : "+ Nueva derivación"}
        </button>
      </div>

      {/* Formulario nueva derivación */}
      {mostrarForm && (
        <div style={{ background: t.cardBg, borderRadius: 14, padding: 18, marginBottom: 18, border: `1px solid ${t.borde}`, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 800, color: t.texto }}>Nueva derivación</h3>

          <label style={lbl(t)}>Especialidad requerida</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            {ESPECIALIDADES.map(e => chip(e, form.especialidad === e, () => setForm(f => ({ ...f, especialidad: e }))))}
          </div>
          {form.especialidad === "Otro" && (
            <input value={form.otraEspecialidad} onChange={e => setForm(f => ({ ...f, otraEspecialidad: e.target.value }))}
              placeholder="Especificá la especialidad" style={inp(t)} />
          )}

          <label style={lbl(t)}>Modalidad</label>
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {MODALIDADES.map(m => chip(m, form.modalidad === m, () => setForm(f => ({ ...f, modalidad: m }))))}
          </div>

          <label style={lbl(t)}>Disponibilidad — Días</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            {DIAS.map(d => chip(d, form.dias.includes(d), () => setForm(f => ({ ...f, dias: toggleArr(f.dias, d) }))))}
          </div>

          <label style={lbl(t)}>Disponibilidad — Franjas horarias</label>
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {FRANJAS.map(f => chip(f, form.franjas.includes(f), () => setForm(fr => ({ ...fr, franjas: toggleArr(fr.franjas, f) }))))}
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <label style={lbl(t)}>Género del profesional</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {["Indistinto", "Femenino", "Masculino"].map(g => chip(g, form.genero === g, () => setForm(f => ({ ...f, genero: g }))))}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={lbl(t)}>Edad del profesional</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {["Indistinto", "Joven", "Adulto"].map(e => chip(e, form.edad === e, () => setForm(f => ({ ...f, edad: e }))))}
              </div>
            </div>
          </div>

          <label style={lbl(t)}>Nota clínica breve (opcional, sin datos del paciente)</label>
          <textarea value={form.nota} onChange={e => setForm(f => ({ ...f, nota: e.target.value }))}
            placeholder="Ej: paciente con dificultades de regulación emocional, busca trabajo focalizado..."
            rows={3} style={{ ...inp(t), resize: "vertical", fontFamily: "inherit" }} />

          <button onClick={publicar} disabled={!form.especialidad}
            style={{ width: "100%", padding: 11, borderRadius: 10, border: "none", background: form.especialidad ? "linear-gradient(135deg,#667eea,#764ba2)" : "#4a5568", color: "white", fontWeight: 800, fontSize: 13, cursor: form.especialidad ? "pointer" : "not-allowed" }}>
            Publicar derivación
          </button>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {[["todas", "Todas"], ["disponibles", "Disponibles"], ["mias", "Mis derivaciones"], ["cerradas", "Cerradas"]].map(([v, l]) => chip(l, filtro === v, () => setFiltro(v)))}
      </div>

      {/* Lista */}
      {derivFiltradas.length === 0 && (
        <div style={{ background: t.cardBg, borderRadius: 12, padding: 32, textAlign: "center", color: t.textoMuy }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🔄</div>
          <p style={{ margin: 0, fontSize: 13 }}>No hay derivaciones en esta categoría.</p>
        </div>
      )}

      {derivFiltradas.map(d => {
        const est = ESTADOS[d.estado] || ESTADOS.disponible;
        const puedoInteresarme = !esMia(d) && d.estado === "disponible" && !yaInteresado(d);
        const yaMe = yaInteresado(d);
        return (
          <div key={d.id} style={{ background: t.cardBg, borderRadius: 14, marginBottom: 14, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", border: `1px solid ${t.borde}` }}>
            {/* Header */}
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${t.borde}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontWeight: 800, fontSize: 15, color: t.texto }}>🧠 {d.especialidad}</span>
                <span style={{ marginLeft: 8, fontSize: 11, color: t.textoSuave }}>por {d.derivadoPor}</span>
              </div>
              <span style={{ background: est.bg, color: est.color, borderRadius: 20, padding: "2px 10px", fontSize: 10, fontWeight: 700, border: `1px solid ${est.color}` }}>{est.label}</span>
            </div>

            {/* Cuerpo */}
            <div style={{ padding: "12px 16px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                <Tag label={`📍 ${d.modalidad}`} t={t} />
                {d.genero !== "Indistinto" && <Tag label={`${d.genero === "Femenino" ? "👩" : "👨"} ${d.genero}`} t={t} />}
                {d.edad !== "Indistinto" && <Tag label={`🎂 ${d.edad}`} t={t} />}
                {d.dias?.length > 0 && <Tag label={`📅 ${d.dias.join(" · ")}`} t={t} />}
                {d.franjas?.length > 0 && <Tag label={`⏰ ${d.franjas.join(" · ")}`} t={t} />}
              </div>
              {d.nota && <p style={{ margin: "0 0 10px", fontSize: 12, color: t.textoSuave, fontStyle: "italic", lineHeight: 1.5 }}>"{d.nota}"</p>}

              {/* Interesados (solo visible para quien derivó) */}
              {esMia(d) && d.interesados?.length > 0 && d.estado !== "asignada" && (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: t.textoSuave, textTransform: "uppercase" }}>Interesados:</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {d.interesados.map(nombre => (
                      <button key={nombre} onClick={() => asignar(d, nombre)}
                        style={{ padding: "5px 12px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#43e97b,#38f9d7)", color: "#1a4731", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
                        ✓ Asignar a {nombre}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Asignada a */}
              {d.estado === "asignada" && (
                <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: "#4299e1" }}>✅ Asignada a {d.asignadoA}</p>
              )}

              {/* Acciones */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {puedoInteresarme && (
                  <button onClick={() => meInteresa(d)}
                    style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#667eea,#764ba2)", color: "white", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                    🙋 Me interesa
                  </button>
                )}
                {yaMe && (
                  <span style={{ padding: "7px 14px", borderRadius: 8, background: modoOscuro ? "rgba(66,153,225,0.15)" : "#ebf8ff", color: "#4299e1", fontWeight: 700, fontSize: 12 }}>
                    ✓ Te anotaste
                  </span>
                )}
                {esMia(d) && d.estado !== "cerrada" && (
                  <button onClick={() => cerrar(d)}
                    style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${t.borde}`, background: "transparent", color: t.textoSuave, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                    Cerrar derivación
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Tag({ label, t }) {
  return <span style={{ background: t.thBg, color: t.textoSuave, border: `1px solid ${t.borde}`, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{label}</span>;
}

function lbl(t) {
  return { display: "block", fontSize: 11, fontWeight: 700, color: t.textoSuave, marginBottom: 6, textTransform: "uppercase", letterSpacing: .5 };
}

function inp(t) {
  return { width: "100%", padding: "9px 11px", borderRadius: 8, border: `1px solid ${t.inputBorde}`, fontSize: 13, marginBottom: 14, boxSizing: "border-box", outline: "none", background: t.inputBg, color: t.texto };
}
