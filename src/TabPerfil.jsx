import { useMemo, useState, useEffect, useRef } from "react";
import { db, updateUserProfile, uploadProfilePhoto } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

function formatCurrency(n) { return "$" + n.toLocaleString("es-AR"); }
function dateKey(date) { return date.toISOString().slice(0, 10); }

const ESPECIALIDADES = [
  "Psicología clínica", "Pareja y familia", "Infanto-juvenil", "Psicoanálisis",
  "TCC", "Gestalt", "Sistémica", "Trauma", "Adicciones", "Neuropsicología", "Otra"
];

function avatarColor(nombre) {
  const colores = [
    "linear-gradient(135deg,#667eea,#764ba2)",
    "linear-gradient(135deg,#f093fb,#f5576c)",
    "linear-gradient(135deg,#4facfe,#00f2fe)",
    "linear-gradient(135deg,#43e97b,#38f9d7)",
    "linear-gradient(135deg,#fa709a,#fee140)",
    "linear-gradient(135deg,#a18cd1,#fbc2eb)",
    "linear-gradient(135deg,#fda085,#f6d365)",
  ];
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
  return colores[Math.abs(hash) % colores.length];
}

export default function TabPerfil({ usuario, esAdmin, esPublico, t, reservas, onLogin, onLogout }) {
  const mesStr = new Date().toISOString().slice(0, 7);
  const [perfil, setPerfil] = useState({ nombre: "", telefono: "", bio: "", especialidad: "", fotoUrl: "" });
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [toast, setToast] = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    if (!usuario) return;
    getDoc(doc(db, "usuarios", usuario.email)).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        setPerfil({
          nombre: data.nombre || "",
          telefono: data.telefono || "",
          bio: data.bio || "",
          especialidad: data.especialidad || "",
          fotoUrl: data.fotoUrl || ""
        });
      }
    });
  }, [usuario]);

  function mostrarToast(msg, tipo = "ok") {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3000);
  }

  function abrirEdicion() {
    setForm({ ...perfil });
    setEditando(true);
  }

  async function guardar() {
    if (!form.nombre.trim()) { mostrarToast("El nombre no puede estar vacío", "err"); return; }
    setGuardando(true);
    await updateUserProfile(usuario.email, {
      nombre: form.nombre.trim(),
      telefono: form.telefono.trim(),
      bio: form.bio.trim(),
      especialidad: form.especialidad,
      email: usuario.email,
      rol: usuario.rol,
    });
    setPerfil(p => ({ ...p, nombre: form.nombre.trim(), telefono: form.telefono.trim(), bio: form.bio.trim(), especialidad: form.especialidad }));
    setGuardando(false);
    setEditando(false);
    mostrarToast("Perfil actualizado ✓");
  }

  async function handleFoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { mostrarToast("La foto no puede superar 5MB", "err"); return; }
    setSubiendoFoto(true);
    try {
      const url = await uploadProfilePhoto(usuario.email, file);
      setPerfil(p => ({ ...p, fotoUrl: url }));
      mostrarToast("Foto actualizada ✓");
    } catch (err) {
      console.error("Error Cloudinary:", err);
      mostrarToast(err.message || "Error al subir la foto", "err");
    }
    setSubiendoFoto(false);
  }

  const misReservas = useMemo(() => {
    if (!usuario) return [];
    return reservas.filter(r => r.profesional === perfil.nombre || r.profesional === usuario.nombre);
  }, [reservas, usuario, perfil.nombre]);

  const horasMes = useMemo(() => {
    return misReservas.reduce((acc, r) => {
      const horas = r.horaFin - r.horaInicio;
      if (r.repeteSemanal) {
        const [y, m] = mesStr.split("-").map(Number);
        const diasEnMes = new Date(y, m, 0).getDate();
        const orig = new Date(r.fecha + "T12:00:00");
        let cnt = 0;
        for (let d = 1; d <= diasEnMes; d++) {
          const dia = new Date(y, m - 1, d);
          if (dia.getDay() === orig.getDay() && dia >= orig) cnt++;
        }
        return acc + horas * cnt;
      } else if (r.fecha.startsWith(mesStr)) {
        return acc + horas;
      }
      return acc;
    }, 0);
  }, [misReservas, mesStr]);

  const proximaReserva = useMemo(() => {
    const hoy = dateKey(new Date());
    return misReservas
      .filter(r => r.fecha >= hoy || r.repeteSemanal)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
  }, [misReservas]);

  if (esPublico) return (
    <div className="tab-content" style={{ minHeight: "100vh", background: t.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <div style={{ width: 80, height: 80, borderRadius: "50%", background: t.bgCard, border: `2px solid ${t.borde}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, marginBottom: 20 }}>👤</div>
      <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800, color: t.texto }}>Tu perfil</h2>
      <p style={{ margin: "0 0 24px", fontSize: 14, color: t.textoSuave, textAlign: "center" }}>Iniciá sesión para ver tu perfil.</p>
      <button onClick={onLogin} style={{ padding: "10px 24px", borderRadius: 24, border: "none", background: t.acentoGrad, color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
        Iniciar sesión →
      </button>
    </div>
  );

  const nombreMostrado = perfil.nombre || usuario.nombre || "";
  const inicial = nombreMostrado[0]?.toUpperCase() || "?";
  const gradAvatar = avatarColor(nombreMostrado);

  const inputStyle = {
    width: "100%", padding: "11px 14px", borderRadius: 12,
    border: `1px solid ${t.borde}`, fontSize: 13, marginBottom: 12,
    boxSizing: "border-box", outline: "none",
    background: t.bgElevated, color: t.texto, fontFamily: "inherit"
  };
  const labelStyle = {
    display: "block", fontSize: 11, fontWeight: 700,
    color: t.textoSuave, marginBottom: 4,
    textTransform: "uppercase", letterSpacing: .5
  };

  return (
    <div className="tab-content" style={{ minHeight: "100vh", background: t.bg }}>

      {toast && (
        <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: toast.tipo === "err" ? "#7c2d12" : "#14532d", color: "white", padding: "10px 20px", borderRadius: 30, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
          {toast.msg}
        </div>
      )}

      {/* HEADER */}
      <div style={{ padding: "56px 20px 24px", background: "linear-gradient(180deg,#0d0d1a 0%,#000 100%)" }}>
        <img src="/IMG_0050.jpeg" alt="GRINS" style={{ height: 28, objectFit: "contain", marginBottom: 20, opacity: 0.8 }} />

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* FOTO */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: gradAvatar, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: "white", overflow: "hidden", border: "3px solid #1e2235" }}>
              {perfil.fotoUrl
                ? <img src={perfil.fotoUrl} alt="foto" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : inicial
              }
            </div>
            {subiendoFoto && (
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 22, height: 22, border: "2px solid rgba(255,255,255,0.2)", borderTop: "2px solid white", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              </div>
            )}
            <button onClick={() => fileRef.current?.click()} style={{ position: "absolute", bottom: 0, right: 0, width: 26, height: 26, borderRadius: "50%", background: t.acento, border: "2px solid #000", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 11, color: "white" }}>
              ✎
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFoto} style={{ display: "none" }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {nombreMostrado}
            </h1>
            {perfil.especialidad && (
              <div style={{ fontSize: 12, color: t.acento, fontWeight: 600, marginBottom: 3 }}>{perfil.especialidad}</div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: t.textoMuy }}>{usuario.email}</span>
              {esAdmin && <span style={{ background: t.acentoGrad, color: "white", borderRadius: 20, padding: "2px 10px", fontSize: 10, fontWeight: 700 }}>👑 Admin</span>}
            </div>
          </div>
        </div>

        {perfil.bio && !editando && (
          <p style={{ margin: "14px 0 0", fontSize: 13, color: t.textoSuave, lineHeight: 1.6, fontStyle: "italic" }}>
            "{perfil.bio}"
          </p>
        )}
      </div>

      <div style={{ padding: "16px" }}>

        {/* STATS */}
        {!esAdmin && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
            {[
              { label: "Horas este mes", value: `${horasMes}h` },
              { label: "Facturado", value: formatCurrency(horasMes * 3500) },
              { label: "Reservas", value: misReservas.length },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: t.bgCard, borderRadius: 14, padding: "14px 10px", border: `1px solid ${t.borde}`, textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: t.texto, marginBottom: 4 }}>{value}</div>
                <div style={{ fontSize: 10, color: t.textoMuy, lineHeight: 1.3 }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* PRÓXIMA RESERVA */}
        {!esAdmin && proximaReserva && (
          <div style={{ background: t.bgCard, borderRadius: 16, padding: 14, marginBottom: 16, border: `1px solid ${t.borde}`, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: t.acentoGrad }} />
            <div style={{ fontSize: 10, fontWeight: 700, color: t.acento, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Próxima reserva</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: t.texto }}>{proximaReserva.consultorio}</div>
                <div style={{ fontSize: 12, color: t.textoSuave, marginTop: 2 }}>
                  {new Date(proximaReserva.fecha + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
                </div>
                <div style={{ fontSize: 12, color: t.textoSuave }}>{proximaReserva.horaInicio}:00 – {proximaReserva.horaFin}:00</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 900, fontSize: 15, color: t.texto }}>{formatCurrency((proximaReserva.horaFin - proximaReserva.horaInicio) * 3500)}</div>
                {proximaReserva.repeteSemanal && <div style={{ fontSize: 10, color: t.acento, marginTop: 3 }}>🔄 Semanal</div>}
              </div>
            </div>
          </div>
        )}

        {/* PERFIL */}
        <div style={{ background: t.bgCard, borderRadius: 16, overflow: "hidden", marginBottom: 14, border: `1px solid ${t.borde}` }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${t.borde}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: t.textoMuy, textTransform: "uppercase", letterSpacing: 1 }}>Mi perfil</span>
            {!editando
              ? <button onClick={abrirEdicion} style={{ padding: "5px 14px", borderRadius: 20, border: `1px solid ${t.acento}`, background: "transparent", color: t.acento, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Editar</button>
              : <button onClick={() => setEditando(false)} style={{ padding: "5px 14px", borderRadius: 20, border: `1px solid ${t.borde}`, background: "transparent", color: t.textoSuave, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
            }
          </div>

          {!editando ? (
            <div style={{ padding: "12px 16px" }}>
              {[
                { label: "Nombre", value: nombreMostrado },
                { label: "Email", value: usuario.email },
                { label: "Teléfono", value: perfil.telefono || "No cargado" },
                { label: "Especialidad", value: perfil.especialidad || "No cargada" },
                { label: "Rol", value: esAdmin ? "Administrador" : "Profesional" },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${t.borde}` }}>
                  <span style={{ fontSize: 13, color: t.textoSuave }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: ["No cargado", "No cargada"].includes(value) ? t.textoMuy : t.texto, maxWidth: "60%", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
                </div>
              ))}
              {perfil.bio && (
                <div style={{ padding: "10px 0" }}>
                  <div style={{ fontSize: 11, color: t.textoSuave, marginBottom: 4 }}>Bio</div>
                  <p style={{ margin: 0, fontSize: 13, color: t.texto, lineHeight: 1.6 }}>{perfil.bio}</p>
                </div>
              )}
              {(!perfil.telefono || !perfil.especialidad) && (
                <div style={{ background: t.bgElevated, borderRadius: 10, padding: "10px 12px", marginTop: 8, border: `1px solid ${t.borde}` }}>
                  <p style={{ margin: 0, fontSize: 12, color: t.textoMuy, lineHeight: 1.5 }}>
                    💡 Completá tu perfil para que otros puedan contactarte en derivaciones.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: 16 }}>
              <label style={labelStyle}>Nombre completo</label>
              <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Tu nombre" style={inputStyle} />

              <label style={labelStyle}>Teléfono</label>
              <input value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} placeholder="+54 11 1234-5678" style={inputStyle} />

              <label style={labelStyle}>Especialidad</label>
              <select value={form.especialidad} onChange={e => setForm(f => ({ ...f, especialidad: e.target.value }))} style={inputStyle}>
                <option value="">Seleccioná una especialidad</option>
                {ESPECIALIDADES.map(e => <option key={e} value={e}>{e}</option>)}
              </select>

              <label style={labelStyle}>Bio breve</label>
              <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                placeholder="Contá algo sobre vos y tu práctica..."
                rows={3} style={{ ...inputStyle, resize: "vertical" }} />

              <button onClick={guardar} disabled={guardando} style={{ width: "100%", padding: 13, borderRadius: 12, border: "none", background: guardando ? t.bgElevated : t.acentoGrad, color: "white", fontWeight: 800, fontSize: 13, cursor: guardando ? "not-allowed" : "pointer" }}>
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          )}
        </div>

        {/* CERRAR SESIÓN */}
        <button onClick={onLogout} style={{ width: "100%", padding: 14, borderRadius: 14, border: "1px solid #3d1515", background: "rgba(239,68,68,0.08)", color: "#ef4444", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Cerrar sesión
        </button>

      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
