import { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";

const ESPECIALIDADES = ["Pareja", "Infanto-juvenil", "Duelo", "Adicciones", "Grupal", "Adultos", "Familiar", "Trauma", "Ansiedad", "Otro"];
const MODALIDADES = ["Presencial", "Online", "Ambas"];
const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const FRANJAS = ["Mañana", "Tarde", "Noche"];

export default function Derivaciones({ usuario, t }) {
  const [derivaciones, setDerivaciones] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [filtro, setFiltro] = useState("todas");
  const [form, setForm] = useState({
    especialidad: "", otraEspecialidad: "",
    modalidad: "Ambas", dias: [], franjas: [],
    genero: "Indistinto", edad: "Indistinto", nota: ""
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "derivaciones"), snap => {
      const data = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      data.sort((a, b) => (b.creadoEn?.seconds || 0) - (a.creadoEn?.seconds || 0));
      setDerivaciones(data);
    });
    return () => unsub();
  }, []);

  function toggleArr(arr, val) { return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]; }

  async function publicar() {
    if (!form.especialidad) return;
    const esp = form.especialidad === "Otro" ? form.otraEspecialidad || "Otro" : form.especialidad;
    await addDoc(collection(db, "derivaciones"), {
      especialidad: esp, modalidad: form.modalidad, dias: form.dias, franjas: form.franjas,
      genero: form.genero, edad: form.edad, nota: form.nota.trim(),
      estado: "disponible", derivadoPor: usuario.nombre, derivadoPorEmail: usuario.email,
      interesados: [], asignadoA: null, creadoEn: serverTimestamp()
    });
    setForm({ especialidad: "", otraEspecialidad: "", modalidad: "Ambas", dias: [], franjas: [], genero: "Indistinto", edad: "Indistinto", nota: "" });
    setMostrarForm(false);
  }

  async function meInteresa(d) {
    if (d.derivadoPorEmail === usuario.email || d.interesados?.includes(usuario.nombre)) return;
    await updateDoc(doc(db, "derivaciones", d.id), {
      interesados: [...(d.interesados || []), usuario.nombre], estado: "con_interesados"
    });
  }

  async function asignar(d, nombre) {
    await updateDoc(doc(db, "derivaciones", d.id), { asignadoA: nombre, estado: "asignada" });
  }

  async function cerrar(d) {
    await updateDoc(doc(db, "derivaciones", d.id), { estado: "cerrada" });
  }

  const esMia = d => d.derivadoPorEmail === usuario.email;
  const yaInteresado = d => d.interesados?.includes(usuario.nombre);

  const ESTADOS = {
    disponible: { label: "Disponible", color: "#38a169", bg: "rgba(56,161,105,0.12)" },
    con_interesados: { label: "Con interesados", color: "#d69e2e", bg: "rgba(214,158,46,0.12)" },
    asignada: { label: "Asignada ✓", color: "#7c6aff", bg: "rgba(124,106,255,0.12)" },
    cerrada: { label: "Cerrada", color: "#4a5270", bg: "rgba(74,82,112,0.12)" },
  };

  const chip = (label, active, onClick, disabled = false) => (
    <button key={label} onClick={onClick} disabled={disabled} style={{
      padding: "5px 12px", borderRadius: 20,
      border: `1px solid ${active ? t.acento : t.borde}`,
      background: active ? t.acentoGrad : t.bgElevated,
      color: active ? "white" : t.textoSuave,
      fontSize: 11, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1, transition: "all 0.15s"
    }}>{label}</button>
  );

  const derivFiltradas = derivaciones.filter(d => {
    if (filtro === "todas") return d.estado !== "cerrada";
    if (filtro === "mias") return esMia(d) && d.estado !== "cerrada";
    if (filtro === "disponibles") return d.estado === "disponible";
    if (filtro === "cerradas") return d.estado === "cerrada";
    return true;
  });

  const inp = { width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${t.borde}`, fontSize: 13, marginBottom: 14, boxSizing: "border-box", outline: "none", background: t.bgElevated, color: t.texto };
  const lbl = { display: "block", fontSize: 11, fontWeight: 700, color: t.textoSuave, marginBottom: 6, textTransform: "uppercase", letterSpacing: .5 };

  return (
    <div style={{ padding: "16px 14px" }}>

      {/* BOTÓN NUEVA */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: t.texto }}>Derivaciones</h2>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: t.textoMuy }}>Red de derivaciones entre profesionales GRINS</p>
        </div>
        <button onClick={() => setMostrarForm(f => !f)} style={{
          padding: "8px 16px", borderRadius: 20, border: "none",
          background: mostrarForm ? t.bgElevated : t.acentoGrad,
          color: "white", fontWeight: 700, fontSize: 12, cursor: "pointer",
          border: mostrarForm ? `1px solid ${t.borde}` : "none"
        }}>
          {mostrarForm ? "Cancelar" : "+ Nueva"}
        </button>
      </div>

      {/* FORMULARIO */}
      {mostrarForm && (
        <div style={{ background: t.bgCard, borderRadius: 18, padding: 18, marginBottom: 16, border: `1px solid ${t.borde}` }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: t.borde, margin: "0 auto 16px" }} />
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 800, color: t.texto }}>Nueva derivación</h3>

          <label style={lbl}>Especialidad requerida</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            {ESPECIALIDADES.map(e => chip(e, form.especialidad === e, () => setForm(f => ({ ...f, especialidad: e }))))}
          </div>
          {form.especialidad === "Otro" && (
            <input value={form.otraEspecialidad} onChange={e => setForm(f => ({ ...f, otraEspecialidad: e.target.value }))}
              placeholder="Especificá la especialidad" style={inp} />
          )}

          <label style={lbl}>Modalidad</label>
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {MODALIDADES.map(m => chip(m, form.modalidad === m, () => setForm(f => ({ ...f, modalidad: m }))))}
          </div>

          <label style={lbl}>Días disponibles</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            {DIAS.map(d => chip(d, form.dias.includes(d), () => setForm(f => ({ ...f, dias: toggleArr(f.dias, d) }))))}
          </div>

          <label style={lbl}>Franjas horarias</label>
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {FRANJAS.map(f => chip(f, form.franjas.includes(f), () => setForm(fr => ({ ...fr, franjas: toggleArr(fr.franjas, f) }))))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={lbl}>Género del profesional</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {["Indistinto", "Femenino", "Masculino"].map(g => chip(g, form.genero === g, () => setForm(f => ({ ...f, genero: g }))))}
              </div>
            </div>
            <div>
              <label style={lbl}>Franja etaria</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {["Indistinto", "Joven", "Adulto"].map(e => chip(e, form.edad === e, () => setForm(f => ({ ...f, edad: e }))))}
              </div>
            </div>
          </div>

          <label style={lbl}>Nota clínica breve (opcional)</label>
          <textarea value={form.nota} onChange={e => setForm(f => ({ ...f, nota: e.target.value }))}
            placeholder="Sin datos identificatorios del paciente..."
            rows={3} style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} />

          <button onClick={publicar} disabled={!form.especialidad} style={{
            width: "100%", padding: 13, borderRadius: 12, border: "none",
            background: form.especialidad ? t.acentoGrad : t.bgElevated,
            color: "white", fontWeight: 800, fontSize: 13,
            cursor: form.especialidad ? "pointer" : "not-allowed"
          }}>
            Publicar derivación
          </button>
        </div>
      )}

      {/* FILTROS */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", paddingBottom: 2 }}>
        {[["todas", "Todas"], ["disponibles", "Disponibles"], ["mias", "Mis derivaciones"], ["cerradas", "Cerradas"]].map(([v, l]) =>
          chip(l, filtro === v, () => setFiltro(v))
        )}
      </div>

      {/* LISTA */}
      {derivFiltradas.length === 0 && (
        <div style={{ background: t.bgCard, borderRadius: 16, padding: 32, textAlign: "center", border: `1px solid ${t.borde}` }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🔄</div>
          <p style={{ margin: 0, fontSize: 13, color: t.textoMuy }}>No hay derivaciones en esta categoría.</p>
        </div>
      )}

      {derivFiltradas.map(d => {
        const est = ESTADOS[d.estado] || ESTADOS.disponible;
        const puedoInteresarme = !esMia(d) && d.estado === "disponible" && !yaInteresado(d);
        const yaMe = yaInteresado(d);
        return (
          <div key={d.id} style={{ background: t.bgCard, borderRadius: 18, marginBottom: 12, overflow: "hidden", border: `1px solid ${t.borde}` }}>

            {/* Header card */}
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${t.borde}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontWeight: 800, fontSize: 15, color: t.texto }}>🧠 {d.especialidad}</span>
                <div style={{ fontSize: 11, color: t.textoMuy, marginTop: 2 }}>por {d.derivadoPor}</div>
              </div>
              <span style={{ background: est.bg, color: est.color, borderRadius: 20, padding: "3px 10px", fontSize: 10, fontWeight: 700, border: `1px solid ${est.color}33`, whiteSpace: "nowrap" }}>
                {est.label}
              </span>
            </div>

            {/* Body */}
            <div style={{ padding: "12px 16px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: d.nota ? 10 : 0 }}>
                <Tag label={`📍 ${d.modalidad}`} t={t} />
                {d.genero !== "Indistinto" && <Tag label={`${d.genero === "Femenino" ? "👩" : "👨"} ${d.genero}`} t={t} />}
                {d.edad !== "Indistinto" && <Tag label={`🎂 ${d.edad}`} t={t} />}
                {d.dias?.length > 0 && <Tag label={`📅 ${d.dias.join(" · ")}`} t={t} />}
                {d.franjas?.length > 0 && <Tag label={`⏰ ${d.franjas.join(" · ")}`} t={t} />}
              </div>

              {d.nota && (
                <p style={{ margin: "10px 0", fontSize: 12, color: t.textoSuave, fontStyle: "italic", lineHeight: 1.6, padding: "10px 12px", background: t.bgElevated, borderRadius: 10, borderLeft: `3px solid ${t.acento}` }}>
                  "{d.nota}"
                </p>
              )}

              {/* Interesados — solo para quien derivó */}
              {esMia(d) && d.interesados?.length > 0 && d.estado !== "asignada" && (
                <div style={{ marginTop: 10 }}>
                  <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: t.textoSuave, textTransform: "uppercase" }}>
                    {d.interesados.length} interesado{d.interesados.length > 1 ? "s" : ""}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {d.interesados.map(nombre => (
                      <button key={nombre} onClick={() => asignar(d, nombre)} style={{
                        padding: "6px 14px", borderRadius: 20, border: "none",
                        background: "linear-gradient(135deg,#43e97b,#38f9d7)",
                        color: "#1a4731", fontWeight: 700, fontSize: 12, cursor: "pointer"
                      }}>
                        ✓ Asignar a {nombre}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {d.estado === "asignada" && (
                <p style={{ margin: "10px 0 0", fontSize: 12, fontWeight: 700, color: t.acento }}>
                  ✅ Asignada a {d.asignadoA}
                </p>
              )}

              {/* Acciones */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                {puedoInteresarme && (
                  <button onClick={() => meInteresa(d)} style={{
                    padding: "8px 18px", borderRadius: 20, border: "none",
                    background: t.acentoGrad, color: "white", fontWeight: 700, fontSize: 12, cursor: "pointer"
                  }}>
                    🙋 Me interesa
                  </button>
                )}
                {yaMe && (
                  <span style={{ padding: "8px 14px", borderRadius: 20, background: t.acentoSuave, color: t.acento, fontWeight: 700, fontSize: 12 }}>
                    ✓ Te anotaste
                  </span>
                )}
                {esMia(d) && d.estado !== "cerrada" && (
                  <button onClick={() => cerrar(d)} style={{
                    padding: "8px 14px", borderRadius: 20, border: `1px solid ${t.borde}`,
                    background: "transparent", color: t.textoSuave, fontWeight: 600, fontSize: 12, cursor: "pointer"
                  }}>
                    Cerrar
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
  return (
    <span style={{ background: t.bgElevated, color: t.textoSuave, border: `1px solid ${t.borde}`, borderRadius: 8, padding: "3px 9px", fontSize: 11, fontWeight: 600 }}>
      {label}
    </span>
  );
}
