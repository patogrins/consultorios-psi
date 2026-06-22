import { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDoc } from "firebase/firestore";

const ESPECIALIDADES = ["Pareja", "Infanto-juvenil", "Duelo", "Adicciones", "Grupal", "Adultos", "Familiar", "Trauma", "Ansiedad", "Otro"];
const MODALIDADES = ["Presencial", "Online", "Ambas"];
const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const FRANJAS = ["Mañana", "Tarde", "Noche"];

export default function Derivaciones({ usuario, t, esAdmin }) {
  const [derivaciones, setDerivaciones] = useState([]);
  const [perfiles, setPerfiles] = useState({});
  const [mostrarForm, setMostrarForm] = useState(false);
  const [filtro, setFiltro] = useState("disponibles");
  const [expandida, setExpandida] = useState(null);
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

  // Cargar perfiles de interesados cuando cambian las derivaciones
  useEffect(() => {
    const emails = new Set();
    derivaciones.forEach(d => {
      if (d.derivadoPorEmail) emails.add(d.derivadoPorEmail);
      (d.interesadosEmails || []).forEach(e => emails.add(e));
    });
    emails.forEach(async email => {
      if (perfiles[email]) return;
      const snap = await getDoc(doc(db, "usuarios", email));
      if (snap.exists()) {
        setPerfiles(prev => ({ ...prev, [email]: snap.data() }));
      }
    });
  }, [derivaciones]);

  function toggleArr(arr, val) { return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]; }

  async function publicar() {
    if (!form.especialidad) return;
    const esp = form.especialidad === "Otro" ? form.otraEspecialidad || "Otro" : form.especialidad;
    await addDoc(collection(db, "derivaciones"), {
      especialidad: esp, modalidad: form.modalidad, dias: form.dias, franjas: form.franjas,
      genero: form.genero, edad: form.edad, nota: form.nota.trim(),
      estado: "disponible",
      derivadoPor: usuario.nombre,
      derivadoPorEmail: usuario.email,
      interesados: [],
      interesadosEmails: [],
      asignadoA: null,
      asignadoEmail: null,
      creadoEn: serverTimestamp()
    });
    setForm({ especialidad: "", otraEspecialidad: "", modalidad: "Ambas", dias: [], franjas: [], genero: "Indistinto", edad: "Indistinto", nota: "" });
    setMostrarForm(false);
  }

  async function meInteresa(d) {
    if (d.derivadoPorEmail === usuario.email) return;
    if (d.interesadosEmails?.includes(usuario.email)) return;
    await updateDoc(doc(db, "derivaciones", d.id), {
      interesados: [...(d.interesados || []), usuario.nombre],
      interesadosEmails: [...(d.interesadosEmails || []), usuario.email],
    });
  }

  async function asignar(d, nombre, email) {
    await updateDoc(doc(db, "derivaciones", d.id), {
      asignadoA: nombre,
      asignadoEmail: email,
      estado: "cerrada",
    });
  }

  async function cerrar(d) {
    await updateDoc(doc(db, "derivaciones", d.id), { estado: "cerrada" });
  }

  async function eliminar(id) {
    await deleteDoc(doc(db, "derivaciones", id));
  }

  const esMia = d => d.derivadoPorEmail === usuario.email;
  const yaInteresado = d => d.interesadosEmails?.includes(usuario.email);
  const fueAsignado = d => d.asignadoEmail === usuario.email;

  const derivFiltradas = derivaciones.filter(d => {
    if (filtro === "disponibles") return d.estado === "disponible";
    if (filtro === "cerradas") return d.estado === "cerrada";
    if (filtro === "mias") return esMia(d);
    return true;
  });

  const chip = (label, active, onClick) => (
    <button key={label} onClick={onClick} style={{
      padding: "5px 12px", borderRadius: 20,
      border: `1px solid ${active ? t.acento : t.borde}`,
      background: active ? t.acentoGrad : t.bgElevated,
      color: active ? "white" : t.textoSuave,
      fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s"
    }}>{label}</button>
  );

  const inp = { width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${t.borde}`, fontSize: 13, marginBottom: 14, boxSizing: "border-box", outline: "none", background: t.bgElevated, color: t.texto };
  const lbl = { display: "block", fontSize: 11, fontWeight: 700, color: t.textoSuave, marginBottom: 6, textTransform: "uppercase", letterSpacing: .5 };

  return (
    <div style={{ padding: "16px 14px" }}>

      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: t.texto }}>Derivaciones</h2>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: t.textoMuy }}>Red de derivaciones entre profesionales GRINS</p>
        </div>
        <button onClick={() => setMostrarForm(f => !f)} style={{
          padding: "8px 16px", borderRadius: 20, border: mostrarForm ? `1px solid ${t.borde}` : "none",
          background: mostrarForm ? t.bgElevated : t.acentoGrad,
          color: "white", fontWeight: 700, fontSize: 12, cursor: "pointer"
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

          <label style={lbl}>Nota clínica breve (opcional, sin datos del paciente)</label>
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
      <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto", paddingBottom: 2 }}>
        {[["disponibles", "🟢 Disponibles"], ["cerradas", "⚫ Cerradas"], ["mias", "Mis derivaciones"]].map(([v, l]) =>
          chip(l, filtro === v, () => setFiltro(v))
        )}
      </div>

      {/* LISTA VACÍA */}
      {derivFiltradas.length === 0 && (
        <div style={{ background: t.bgCard, borderRadius: 16, padding: 32, textAlign: "center", border: `1px solid ${t.borde}` }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🔄</div>
          <p style={{ margin: 0, fontSize: 13, color: t.textoMuy }}>
            {filtro === "disponibles" ? "No hay derivaciones disponibles." : filtro === "cerradas" ? "No hay derivaciones cerradas." : "No publicaste derivaciones aún."}
          </p>
        </div>
      )}

      {/* CARDS */}
      {derivFiltradas.map(d => {
        const cerrada = d.estado === "cerrada";
        const expanded = expandida === d.id;
        const puedoInteresarme = !esMia(d) && !cerrada && !yaInteresado(d);
        const yaMe = yaInteresado(d);
        const perfilDerivador = perfiles[d.derivadoPorEmail];

        return (
          <div key={d.id} style={{ background: t.bgCard, borderRadius: 18, marginBottom: 12, overflow: "hidden", border: `1px solid ${cerrada ? t.borde : t.acento + "44"}`, opacity: cerrada ? 0.75 : 1 }}>

            {/* Barra de color superior */}
            <div style={{ height: 3, background: cerrada ? t.borde : t.acentoGrad }} />

            {/* Header */}
            <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}
              onClick={() => setExpandida(expanded ? null : d.id)}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 800, fontSize: 15, color: t.texto }}>🧠 {d.especialidad}</span>
                  {cerrada && d.asignadoA && <span style={{ fontSize: 10, background: "rgba(124,106,255,0.15)", color: t.acento, borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>✅ Asignada</span>}
                  {cerrada && !d.asignadoA && <span style={{ fontSize: 10, background: t.bgElevated, color: t.textoMuy, borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>Cerrada</span>}
                </div>
                <div style={{ fontSize: 11, color: t.textoMuy }}>
                  por {d.derivadoPor} · {d.modalidad}
                  {d.interesados?.length > 0 && !cerrada && <span style={{ color: t.acento, marginLeft: 6 }}>· {d.interesados.length} interesado{d.interesados.length > 1 ? "s" : ""}</span>}
                </div>
              </div>
              <div style={{ color: t.textoMuy, fontSize: 14, marginLeft: 8, transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "none" }}>
                ▾
              </div>
            </div>

            {/* CUERPO EXPANDIDO */}
            {expanded && (
              <div style={{ padding: "0 16px 16px" }}>

                {/* Tags */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                  {d.genero !== "Indistinto" && <Tag label={`${d.genero === "Femenino" ? "👩" : "👨"} ${d.genero}`} t={t} />}
                  {d.edad !== "Indistinto" && <Tag label={`🎂 ${d.edad}`} t={t} />}
                  {d.dias?.length > 0 && <Tag label={`📅 ${d.dias.join(" · ")}`} t={t} />}
                  {d.franjas?.length > 0 && <Tag label={`⏰ ${d.franjas.join(" · ")}`} t={t} />}
                </div>

                {/* Nota */}
                {d.nota && (
                  <p style={{ margin: "0 0 12px", fontSize: 12, color: t.textoSuave, fontStyle: "italic", lineHeight: 1.6, padding: "10px 12px", background: t.bgElevated, borderRadius: 10, borderLeft: `3px solid ${t.acento}` }}>
                    "{d.nota}"
                  </p>
                )}

                {/* INFO ASIGNACIÓN — visible para el asignado */}
                {cerrada && d.asignadoA && fueAsignado(d) && (
                  <div style={{ background: "rgba(124,106,255,0.1)", border: `1px solid ${t.acento}44`, borderRadius: 12, padding: "12px 14px", marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: t.acento, marginBottom: 8, textTransform: "uppercase" }}>
                      ✅ Te asignaron esta derivación
                    </div>
                    <p style={{ margin: "0 0 8px", fontSize: 12, color: t.textoSuave }}>Contactate con quien deriva para coordinar:</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ color: t.textoSuave }}>Profesional</span>
                        <span style={{ fontWeight: 700, color: t.texto }}>{d.derivadoPor}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ color: t.textoSuave }}>Email</span>
                        <a href={`mailto:${d.derivadoPorEmail}`} style={{ fontWeight: 700, color: t.acento, textDecoration: "none" }}>{d.derivadoPorEmail}</a>
                      </div>
                      {perfilDerivador?.telefono && (
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                          <span style={{ color: t.textoSuave }}>Teléfono</span>
                          <a href={`tel:${perfilDerivador.telefono}`} style={{ fontWeight: 700, color: t.acento, textDecoration: "none" }}>{perfilDerivador.telefono}</a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* LISTA INTERESADOS — solo para quien derivó */}
                {esMia(d) && d.interesados?.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: t.textoSuave, textTransform: "uppercase" }}>
                      Interesados ({d.interesados.length})
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {(d.interesadosEmails || []).map((email, idx) => {
                        const perfil = perfiles[email];
                        const nombre = d.interesados[idx] || email;
                        return (
                          <div key={email} style={{ background: t.bgElevated, borderRadius: 12, padding: "10px 14px", border: `1px solid ${t.borde}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13, color: t.texto, marginBottom: 3 }}>{nombre}</div>
                              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                <a href={`mailto:${email}`} style={{ fontSize: 11, color: t.acento, textDecoration: "none" }}>✉ {email}</a>
                                {perfil?.telefono && (
                                  <a href={`tel:${perfil.telefono}`} style={{ fontSize: 11, color: t.acento, textDecoration: "none" }}>📞 {perfil.telefono}</a>
                                )}
                                {!perfil?.telefono && (
                                  <span style={{ fontSize: 11, color: t.textoMuy }}>Sin teléfono cargado</span>
                                )}
                              </div>
                            </div>
                            {!cerrada && (
                              <button onClick={() => asignar(d, nombre, email)} style={{
                                padding: "6px 12px", borderRadius: 20, border: "none",
                                background: "linear-gradient(135deg,#43e97b,#38f9d7)",
                                color: "#1a4731", fontWeight: 700, fontSize: 11, cursor: "pointer", flexShrink: 0, marginLeft: 8
                              }}>
                                Asignar
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* INFO ASIGNADO — visible para quien derivó */}
                {esMia(d) && cerrada && d.asignadoA && (
                  <div style={{ background: "rgba(56,161,105,0.1)", border: "1px solid rgba(56,161,105,0.3)", borderRadius: 12, padding: "10px 14px", marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#38a169", marginBottom: 6, textTransform: "uppercase" }}>Derivación asignada</div>
                    <div style={{ fontSize: 13, color: t.texto }}>Asignada a <strong>{d.asignadoA}</strong></div>
                    {perfiles[d.asignadoEmail]?.telefono && (
                      <a href={`tel:${perfiles[d.asignadoEmail].telefono}`} style={{ fontSize: 12, color: t.acento, textDecoration: "none", display: "block", marginTop: 4 }}>
                        📞 {perfiles[d.asignadoEmail].telefono}
                      </a>
                    )}
                  </div>
                )}

                {/* ACCIONES */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {puedoInteresarme && (
                    <button onClick={() => meInteresa(d)} style={{
                      padding: "8px 18px", borderRadius: 20, border: "none",
                      background: t.acentoGrad, color: "white", fontWeight: 700, fontSize: 12, cursor: "pointer"
                    }}>
                      🙋 Me interesa
                    </button>
                  )}
                  {yaMe && !cerrada && (
                    <span style={{ padding: "8px 14px", borderRadius: 20, background: t.acentoSuave, color: t.acento, fontWeight: 700, fontSize: 12 }}>
                      ✓ Te anotaste
                    </span>
                  )}
                  {esMia(d) && !cerrada && (
                    <button onClick={() => cerrar(d)} style={{
                      padding: "8px 14px", borderRadius: 20, border: `1px solid ${t.borde}`,
                      background: "transparent", color: t.textoSuave, fontWeight: 600, fontSize: 12, cursor: "pointer"
                    }}>
                      Cerrar sin asignar
                    </button>
                  )}
                  {esAdmin && (
                    <button onClick={() => eliminar(d.id)} style={{
                      padding: "8px 14px", borderRadius: 20, border: "1px solid #3d1515",
                      background: "rgba(239,68,68,0.08)", color: "#ef4444", fontWeight: 600, fontSize: 12, cursor: "pointer"
                    }}>
                      🗑 Eliminar
                    </button>
                  )}
                </div>
              </div>
            )}
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
