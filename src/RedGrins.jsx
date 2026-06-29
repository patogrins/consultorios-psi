import { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, onSnapshot } from "firebase/firestore";

function avatarColor(nombre) {
  const colores = ["linear-gradient(135deg,#667eea,#764ba2)", "linear-gradient(135deg,#f093fb,#f5576c)", "linear-gradient(135deg,#4facfe,#00f2fe)", "linear-gradient(135deg,#43e97b,#38f9d7)", "linear-gradient(135deg,#fa709a,#fee140)", "linear-gradient(135deg,#a18cd1,#fbc2eb)", "linear-gradient(135deg,#fda085,#f6d365)"];
  let hash = 0;
  for (let i = 0; i < (nombre || "").length; i++) hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
  return colores[Math.abs(hash) % colores.length];
}

function dateKey(date) { return date.toISOString().slice(0, 10); }

export default function RedGrins({ usuario, t, reservas = [] }) {
  const [perfiles, setPerfiles] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "usuarios"), snap => {
      const data = snap.docs.map(d => ({ ...d.data(), email: d.id }))
        .filter(u => u.nombre && u.rol !== "admin" || u.email === usuario?.email);
      setPerfiles(data);
    });
    return () => unsub();
  }, []);

  // Calcular días que asiste cada profesional desde reservas
  function diasQueAsiste(email, nombre) {
    const misReservas = reservas.filter(r => r.profesional === nombre || r.creadoPor === email);
    const dias = new Set();
    misReservas.forEach(r => {
      if (r.repeteSemanal) {
        const dow = new Date(r.fecha + "T12:00:00").getDay();
        dias.add(dow);
      } else {
        dias.add(new Date(r.fecha + "T12:00:00").getDay());
      }
    });
    const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    return [...dias].sort((a, b) => a - b).map(d => DIAS[d]);
  }

  function nivelActividad(email, nombre) {
    const misReservas = reservas.filter(r => r.profesional === nombre || r.creadoPor === email);
    const semanales = misReservas.filter(r => r.repeteSemanal).length;
    const unicas = misReservas.filter(r => !r.repeteSemanal).length;
    if (semanales >= 3) return { label: "Frecuente", color: "#66bb6a", bg: "rgba(102,187,106,0.12)" };
    if (semanales >= 1 || unicas >= 3) return { label: "Activo", color: "#4fc3f7", bg: "rgba(79,195,247,0.12)" };
    if (unicas >= 1) return { label: "Ocasional", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" };
    return { label: "Nuevo", color: "#a0a8c0", bg: "rgba(160,168,192,0.08)" };
  }

  const perfilesFiltrados = perfiles.filter(p =>
    p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.especialidad?.toLowerCase().includes(busqueda.toLowerCase())
  );

  if (seleccionado) {
    const dias = diasQueAsiste(seleccionado.email, seleccionado.nombre);
    const actividad = nivelActividad(seleccionado.email, seleccionado.nombre);
    const inicial = seleccionado.nombre?.[0]?.toUpperCase() || "?";
    return (
      <div style={{ padding: "16px 14px 100px" }}>
        <button onClick={() => setSeleccionado(null)} style={{ background: "none", border: "none", color: "#7c6aff", cursor: "pointer", fontSize: 13, fontWeight: 600, marginBottom: 14, display: "flex", alignItems: "center", gap: 6, padding: 0 }}>
          ← Volver a la red
        </button>

        {/* CARD GRANDE */}
        <div style={{ background: "rgba(14,12,28,0.9)", borderRadius: 20, overflow: "hidden", border: "1px solid rgba(124,106,255,0.2)", marginBottom: 14 }}>
          {/* Header con foto */}
          <div style={{ background: "linear-gradient(180deg,#0a0a18,#0d0d20)", padding: "28px 20px 20px", textAlign: "center" }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: avatarColor(seleccionado.nombre), overflow: "hidden", border: "3px solid rgba(124,106,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 800, color: "white", margin: "0 auto 12px", boxShadow: "0 0 30px rgba(124,106,255,0.2)" }}>
              {seleccionado.fotoUrl ? <img src={seleccionado.fotoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : inicial}
            </div>
            <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800, color: "white" }}>{seleccionado.nombre}</h2>
            {seleccionado.especialidad && <div style={{ fontSize: 13, color: "#7c6aff", fontWeight: 600, marginBottom: 6 }}>{seleccionado.especialidad}</div>}
            <span style={{ background: actividad.bg, color: actividad.color, borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 700, border: `1px solid ${actividad.color}33` }}>{actividad.label}</span>
          </div>

          <div style={{ padding: "16px 20px" }}>
            {seleccionado.bio && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: "#4a5270", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Bio</div>
                <p style={{ margin: 0, fontSize: 13, color: "#a0a8c0", lineHeight: 1.6 }}>{seleccionado.bio}</p>
              </div>
            )}

            {dias.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: "#4a5270", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Asiste a GRINS</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {dias.map(d => <span key={d} style={{ background: "rgba(124,106,255,0.12)", color: "#a78bfa", borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 600, border: "1px solid rgba(124,106,255,0.2)" }}>{d}</span>)}
                </div>
              </div>
            )}

            {seleccionado.telefono && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: "#4a5270", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Contacto</div>
                <a href={`tel:${seleccionado.telefono}`} style={{ fontSize: 13, color: "#4fc3f7", textDecoration: "none", fontWeight: 600 }}>📞 {seleccionado.telefono}</a>
              </div>
            )}

            <a href="https://www.grins.com.ar" target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "rgba(124,106,255,0.1)", borderRadius: 12, padding: "10px 16px", border: "1px solid rgba(124,106,255,0.2)", textDecoration: "none", marginTop: 4 }}>
              <img src="/logohead.jpeg" alt="GRINS" style={{ height: 20, objectFit: "contain", opacity: 0.8 }} />
              <span style={{ fontSize: 12, color: "#7c6aff", fontWeight: 600 }}>grins.com.ar</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 14px 100px" }}>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800, color: "white" }}>Red GRINS</h2>
        <p style={{ margin: "0 0 12px", fontSize: 11, color: "#4a5270" }}>{perfilesFiltrados.length} profesionales en la comunidad</p>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o especialidad..."
          style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(124,106,255,0.2)", background: "rgba(14,12,28,0.8)", color: "white", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
      </div>

      {perfilesFiltrados.length === 0 && (
        <div style={{ textAlign: "center", padding: 32, color: "#4a5270" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>👥</div>
          <p style={{ margin: 0, fontSize: 13 }}>No se encontraron profesionales</p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {perfilesFiltrados.map(p => {
          const dias = diasQueAsiste(p.email, p.nombre);
          const actividad = nivelActividad(p.email, p.nombre);
          const inicial = p.nombre?.[0]?.toUpperCase() || "?";
          const esMio = p.email === usuario?.email;

          return (
            <div key={p.email} onClick={() => setSeleccionado(p)}
              style={{ background: "rgba(14,12,28,0.8)", borderRadius: 16, overflow: "hidden", border: `1px solid ${esMio ? "rgba(124,106,255,0.4)" : "rgba(124,106,255,0.1)"}`, cursor: "pointer", transition: "transform 0.15s, border 0.15s", position: "relative" }}
              onTouchStart={e => e.currentTarget.style.transform = "scale(0.97)"}
              onTouchEnd={e => e.currentTarget.style.transform = "scale(1)"}>

              {esMio && <div style={{ position: "absolute", top: 8, right: 8, fontSize: 9, background: "rgba(124,106,255,0.2)", color: "#7c6aff", borderRadius: 6, padding: "2px 6px", fontWeight: 700 }}>Yo</div>}

              {/* Foto */}
              <div style={{ padding: "16px 16px 10px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: avatarColor(p.nombre), overflow: "hidden", border: "2px solid rgba(124,106,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "white", marginBottom: 8 }}>
                  {p.fotoUrl ? <img src={p.fotoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : inicial}
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "white", textAlign: "center", lineHeight: 1.2, marginBottom: 3 }}>{p.nombre}</div>
                {p.especialidad && <div style={{ fontSize: 10, color: "#7c6aff", fontWeight: 600, textAlign: "center" }}>{p.especialidad}</div>}
              </div>

              {/* Info */}
              <div style={{ padding: "0 12px 12px" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                  <span style={{ background: actividad.bg, color: actividad.color, borderRadius: 20, padding: "2px 8px", fontSize: 9, fontWeight: 700 }}>{actividad.label}</span>
                </div>
                {dias.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 3, justifyContent: "center" }}>
                    {dias.map(d => <span key={d} style={{ background: "rgba(255,255,255,0.05)", color: "#4a5270", borderRadius: 4, padding: "1px 5px", fontSize: 9, fontWeight: 600 }}>{d}</span>)}
                  </div>
                )}
              </div>

              {/* Logo GRINS */}
              <div style={{ borderTop: "1px solid rgba(124,106,255,0.08)", padding: "6px 12px", display: "flex", justifyContent: "center" }}>
                <a href="https://www.grins.com.ar" target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ opacity: 0.4 }}>
                  <img src="/logohead.jpeg" alt="GRINS" style={{ height: 14, objectFit: "contain" }} />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
