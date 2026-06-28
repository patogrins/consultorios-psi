import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";

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

function tiempoRelativo(seconds) {
  if (!seconds) return "";
  const diff = Math.floor(Date.now() / 1000 - seconds);
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
  return `Hace ${Math.floor(diff / 86400)} d`;
}

function Tag({ label }) {
  return <span style={{ background: "rgba(14,12,28,0.9)", color: "#a0a8c0", border: "1px solid rgba(124,106,255,0.15)", borderRadius: 8, padding: "2px 8px", fontSize: 10, fontWeight: 600 }}>{label}</span>;
}

// ── PILA TINDER ───────────────────────────────────────────────────────────────
function PilaTinder({ derivaciones, usuario, perfiles, onInteresa, onArchivar }) {
  const [idx, setIdx] = useState(0);
  const [respondidas, setRespondidas] = useState({}); // id → "interesa" | "archivada"
  const cardRef = useRef(null);
  const startX = useRef(null);
  const [offsetX, setOffsetX] = useState(0);
  const [swipeDir, setSwipeDir] = useState(null);
  const [animating, setAnimating] = useState(null); // "right" | "left"
  const THRESHOLD = 80;

  // Separar respondidas de pendientes
  const pendientes = derivaciones.filter(d => !respondidas[d.id]);
  const todasRespondidas = pendientes.length === 0;

  function onTouchStart(e) { startX.current = e.touches[0].clientX; }
  function onTouchMove(e) {
    if (startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    setOffsetX(dx);
    setSwipeDir(dx > 20 ? "right" : dx < -20 ? "left" : null);
  }
  function onTouchEnd() {
    if (offsetX > THRESHOLD) triggerSwipe("right");
    else if (offsetX < -THRESHOLD) triggerSwipe("left");
    else { setOffsetX(0); setSwipeDir(null); }
    startX.current = null;
  }

  function triggerSwipe(dir) {
    setAnimating(dir);
    setTimeout(() => {
      const d = pendientes[0];
      if (!d) return;
      if (dir === "right") { onInteresa(d); setRespondidas(r => ({ ...r, [d.id]: "interesa" })); }
      else { onArchivar(d); setRespondidas(r => ({ ...r, [d.id]: "archivada" })); }
      setOffsetX(0); setSwipeDir(null); setAnimating(null);
    }, 300);
  }

  if (todasRespondidas) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
      <h3 style={{ margin: "0 0 8px", color: "white", fontSize: 18, fontWeight: 800 }}>¡Revisaste todas!</h3>
      <p style={{ margin: 0, color: "#4a5270", fontSize: 13 }}>No hay más propuestas por ahora.</p>
      <button onClick={() => setRespondidas({})} style={{ marginTop: 20, padding: "9px 20px", borderRadius: 20, border: "1px solid rgba(124,106,255,0.3)", background: "transparent", color: "#7c6aff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
        Ver de nuevo
      </button>
    </div>
  );

  const d = pendientes[0];
  const siguiente = pendientes[1];
  const yaInteresado = d.interesadosEmails?.includes(usuario.email);
  const inicial = d.derivadoPor?.[0]?.toUpperCase() || "?";
  const rotation = offsetX * 0.04;
  const translateX = animating === "right" ? 400 : animating === "left" ? -400 : offsetX;
  const opacity = animating ? 0 : Math.max(0.4, 1 - Math.abs(offsetX) / 250);

  return (
    <div style={{ padding: "12px 16px 20px", position: "relative" }}>
      {/* Indicadores swipe laterales */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, padding: "0 4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: swipeDir === "left" ? 1 : 0.3, transition: "opacity 0.2s" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(239,83,80,0.15)", border: "1.5px solid #ef5350", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 12, color: "#ef5350" }}>✕</span>
          </div>
          <span style={{ fontSize: 10, color: "#ef5350", fontWeight: 600 }}>Archivar</span>
        </div>
        <span style={{ fontSize: 10, color: "#4a5270" }}>{pendientes.length} restante{pendientes.length !== 1 ? "s" : ""}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: swipeDir === "right" ? 1 : 0.3, transition: "opacity 0.2s" }}>
          <span style={{ fontSize: 10, color: "#66bb6a", fontWeight: 600 }}>Me interesa</span>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(102,187,106,0.15)", border: "1.5px solid #66bb6a", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 12, color: "#66bb6a" }}>♥</span>
          </div>
        </div>
      </div>

      {/* Pila de cards */}
      <div style={{ position: "relative", height: 380 }}>
        {/* Card de fondo (siguiente) */}
        {siguiente && (
          <div style={{ position: "absolute", inset: 0, borderRadius: 20, background: "rgba(14,12,28,0.7)", border: "1px solid rgba(124,106,255,0.1)", transform: "scale(0.95) translateY(8px)", zIndex: 1 }} />
        )}

        {/* Card principal */}
        <div ref={cardRef}
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
          style={{ position: "absolute", inset: 0, background: "rgba(14,12,28,0.95)", borderRadius: 20, border: `1px solid ${swipeDir === "right" ? "rgba(102,187,106,0.5)" : swipeDir === "left" ? "rgba(239,83,80,0.5)" : "rgba(124,106,255,0.25)"}`, overflow: "hidden", zIndex: 2, transform: `translateX(${translateX}px) rotate(${rotation}deg)`, opacity, transition: animating ? "transform 0.3s ease, opacity 0.3s ease" : "border 0.15s", cursor: "grab", userSelect: "none", touchAction: "none" }}>

          {/* Barra top */}
          <div style={{ height: 3, background: "linear-gradient(90deg,#667eea,#764ba2)" }} />

          {/* Indicador swipe overlay */}
          {swipeDir === "right" && (
            <div style={{ position: "absolute", top: 16, left: 16, zIndex: 5, background: "rgba(102,187,106,0.9)", borderRadius: 8, padding: "4px 12px", border: "2px solid #66bb6a", transform: "rotate(-12deg)" }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: "white" }}>♥ ME INTERESA</span>
            </div>
          )}
          {swipeDir === "left" && (
            <div style={{ position: "absolute", top: 16, right: 16, zIndex: 5, background: "rgba(239,83,80,0.9)", borderRadius: 8, padding: "4px 12px", border: "2px solid #ef5350", transform: "rotate(12deg)" }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: "white" }}>ARCHIVAR ✕</span>
            </div>
          )}

          <div style={{ padding: "16px" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#667eea22,#764ba222)", border: "1px solid rgba(124,106,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🧠</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "white" }}>{d.especialidad}</div>
                  <div style={{ fontSize: 11, color: "#4a5270" }}>por {d.derivadoPor}</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 9, color: "#4a5270" }}>{tiempoRelativo(d.creadoEn?.seconds)}</span>
                {yaInteresado && <div style={{ marginTop: 3, fontSize: 9, background: "rgba(102,187,106,0.15)", color: "#66bb6a", borderRadius: 6, padding: "1px 6px", fontWeight: 700 }}>Ya te postulaste</div>}
              </div>
            </div>

            {/* Nota */}
            {d.nota && <p style={{ margin: "0 0 12px", fontSize: 13, color: "#e2e8f0", lineHeight: 1.6, padding: "10px 12px", background: "rgba(124,106,255,0.06)", borderRadius: 10, borderLeft: "2px solid rgba(124,106,255,0.4)" }}>"{d.nota}"</p>}

            {/* Tags */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
              <Tag label={`📍 ${d.modalidad}`} />
              {d.genero !== "Indistinto" && <Tag label={`${d.genero === "Femenino" ? "👩" : "👨"} ${d.genero}`} />}
              {d.edad !== "Indistinto" && <Tag label={`🎂 ${d.edad}`} />}
              {d.dias?.length > 0 && <Tag label={`📅 ${d.dias.join(" · ")}`} />}
              {d.franjas?.length > 0 && <Tag label={`⏰ ${d.franjas.join(" · ")}`} />}
            </div>

            {/* Botones */}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => triggerSwipe("left")} style={{ flex: 1, padding: "12px", borderRadius: 14, border: "1px solid rgba(239,83,80,0.3)", background: "rgba(239,83,80,0.08)", color: "#ef5350", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <span style={{ fontSize: 16 }}>✕</span> Archivar
              </button>
              <button onClick={() => triggerSwipe("right")} style={{ flex: 2, padding: "12px", borderRadius: 14, border: "none", background: yaInteresado ? "rgba(102,187,106,0.15)" : "linear-gradient(135deg,#38a169,#2d8a5e)", color: yaInteresado ? "#66bb6a" : "white", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <span style={{ fontSize: 16 }}>♥</span> {yaInteresado ? "Ya te postulaste" : "Me interesa"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hint */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 10, opacity: 0.4 }}>
        <span style={{ fontSize: 10, color: "#ef5350" }}>← Archivar</span>
        <span style={{ fontSize: 9, color: "#3a3a5a" }}>· deslizá para elegir ·</span>
        <span style={{ fontSize: 10, color: "#66bb6a" }}>Me interesa →</span>
      </div>

      {/* Lista respondidas */}
      {Object.keys(respondidas).length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#4a5270", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Respondidas esta sesión</div>
          {Object.entries(respondidas).map(([id, resp]) => {
            const der = derivaciones.find(x => x.id === id);
            if (!der) return null;
            return (
              <div key={id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "rgba(14,12,28,0.6)", borderRadius: 12, marginBottom: 8, border: `1px solid ${resp === "interesa" ? "rgba(102,187,106,0.2)" : "rgba(255,255,255,0.06)"}` }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: resp === "interesa" ? "rgba(102,187,106,0.15)" : "rgba(255,255,255,0.05)", border: `1.5px solid ${resp === "interesa" ? "#66bb6a" : "#3a3a5a"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                  {resp === "interesa" ? "♥" : "✕"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: resp === "interesa" ? "white" : "#4a5270" }}>🧠 {der.especialidad}</div>
                  <div style={{ fontSize: 10, color: "#4a5270" }}>por {der.derivadoPor}</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: resp === "interesa" ? "#66bb6a" : "#4a5270" }}>
                  {resp === "interesa" ? "Me interesa" : "Archivada"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── MIS DERIVACIONES ──────────────────────────────────────────────────────────
function MisDerivaciones({ derivaciones, usuario, perfiles, esAdmin, onAsignar, onCerrar, onEliminar }) {
  const [expandida, setExpandida] = useState(null);
  const [matchModal, setMatchModal] = useState(null); // { derivacion, asignado }

  const mias = derivaciones.filter(d => d.derivadoPorEmail === usuario.email);

  if (mias.length === 0) return (
    <div style={{ padding: "32px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>
      <p style={{ margin: 0, color: "#4a5270", fontSize: 13 }}>No publicaste derivaciones aún.</p>
    </div>
  );

  async function handleAsignar(d, nombre, email) {
    await onAsignar(d, nombre, email);
    const perfilAsignado = perfiles.find(p => p.email === email);
    setMatchModal({ derivacion: d, asignado: { nombre, email, fotoUrl: perfilAsignado?.fotoUrl, especialidad: perfilAsignado?.especialidad } });
    setExpandida(null);
  }

  return (
    <div style={{ padding: "12px 14px 20px" }}>

      {/* MODAL MATCH */}
      {matchModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "rgba(14,12,28,0.98)", borderRadius: 24, padding: "32px 24px", width: "100%", maxWidth: 360, textAlign: "center", border: "1px solid rgba(124,106,255,0.3)", boxShadow: "0 0 60px rgba(124,106,255,0.2)" }}>
            {/* Confetti animado */}
            <div style={{ fontSize: 32, marginBottom: 20 }}>🎉</div>

            {/* Avatares conectados */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: avatarColor(usuario.nombre), overflow: "hidden", border: "3px solid rgba(124,106,255,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "white" }}>
                {usuario.fotoUrl ? <img src={usuario.fotoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : usuario.nombre?.[0]?.toUpperCase()}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 0, margin: "0 -4px", zIndex: 1 }}>
                <div style={{ width: 20, height: 1.5, background: "rgba(124,106,255,0.4)", borderTop: "1.5px dashed rgba(124,106,255,0.4)" }} />
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#667eea,#764ba2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>✓</div>
                <div style={{ width: 20, height: 1.5, background: "rgba(124,106,255,0.4)", borderTop: "1.5px dashed rgba(124,106,255,0.4)" }} />
              </div>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: avatarColor(matchModal.asignado.nombre), overflow: "hidden", border: "3px solid rgba(124,106,255,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "white" }}>
                {matchModal.asignado.fotoUrl ? <img src={matchModal.asignado.fotoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : matchModal.asignado.nombre?.[0]?.toUpperCase()}
              </div>
            </div>

            <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800, color: "white" }}>¡Derivación asignada!</h2>
            <p style={{ margin: "0 0 20px", fontSize: 14, color: "#a0a8c0", lineHeight: 1.5 }}>
              Vos y <strong style={{ color: "white" }}>{matchModal.asignado.nombre}</strong> están conectados para este caso.
            </p>

            <div style={{ background: "rgba(124,106,255,0.08)", borderRadius: 14, padding: "12px 16px", marginBottom: 20, border: "1px solid rgba(124,106,255,0.15)", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>🔔</span>
              <span style={{ fontSize: 12, color: "#a0a8c0", lineHeight: 1.5, textAlign: "left" }}>Ambos recibirán una notificación en Inicio para coordinar el contacto.</span>
            </div>

            <button onClick={() => setMatchModal(null)} style={{ width: "100%", padding: 13, borderRadius: 14, border: "none", background: "linear-gradient(135deg,#667eea,#764ba2)", color: "white", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
              ¡Genial!
            </button>
          </div>
        </div>
      )}

      {mias.map(d => {
        const sinInteresados = !d.interesados?.length;
        const conInteresados = d.interesados?.length > 0 && d.estado !== "asignada";
        const asignada = d.estado === "asignada";
        const cerrada = d.estado === "cerrada";
        const isExp = expandida === d.id;
        const tiempoPublicado = tiempoRelativo(d.creadoEn?.seconds);

        return (
          <div key={d.id} style={{ background: "rgba(14,12,28,0.9)", borderRadius: 18, marginBottom: 12, overflow: "hidden", border: `1px solid ${asignada ? "rgba(102,187,106,0.3)" : conInteresados ? "rgba(124,106,255,0.35)" : "rgba(124,106,255,0.12)"}` }}>

            {/* Barra estado */}
            <div style={{ height: 3, background: asignada ? "linear-gradient(90deg,#38a169,#2d8a5e)" : conInteresados ? "linear-gradient(90deg,#667eea,#764ba2)" : cerrada ? "rgba(255,255,255,0.08)" : "rgba(124,106,255,0.2)" }} />

            <div style={{ padding: "14px 16px" }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: cerrada ? "#4a5270" : "white" }}>🧠 {d.especialidad}</div>
                  <div style={{ fontSize: 10, color: "#4a5270", marginTop: 2 }}>{tiempoPublicado} · {d.modalidad}</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 20, padding: "3px 10px", background: asignada ? "rgba(102,187,106,0.12)" : conInteresados ? "rgba(124,106,255,0.15)" : cerrada ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.05)", color: asignada ? "#66bb6a" : conInteresados ? "#a78bfa" : "#4a5270", border: `1px solid ${asignada ? "rgba(102,187,106,0.3)" : conInteresados ? "rgba(124,106,255,0.3)" : "rgba(255,255,255,0.08)"}` }}>
                  {asignada ? "✓ Asignada" : conInteresados ? `${d.interesados.length} postulante${d.interesados.length > 1 ? "s" : ""}` : cerrada ? "Cerrada" : "Sin postulantes"}
                </span>
              </div>

              {/* Sin interesados */}
              {sinInteresados && !cerrada && (
                <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 10, marginBottom: 10, border: "1px dashed rgba(255,255,255,0.06)" }}>
                  <p style={{ margin: 0, fontSize: 12, color: "#4a5270", fontStyle: "italic" }}>Aún sin postulantes. Esperá a que otros profesionales respondan.</p>
                </div>
              )}

              {/* Con interesados — miniaturas */}
              {conInteresados && (
                <button onClick={() => setExpandida(isExp ? null : d.id)} style={{ width: "100%", background: "transparent", border: "none", cursor: "pointer", padding: 0, marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "rgba(124,106,255,0.06)", borderRadius: 12, border: "1px solid rgba(124,106,255,0.15)" }}>
                    <div style={{ display: "flex" }}>
                      {(d.interesadosEmails || []).slice(0, 3).map((email, i) => {
                        const p = perfiles.find(x => x.email === email);
                        const nombre = d.interesados[i] || email;
                        return (
                          <div key={email} style={{ width: 32, height: 32, borderRadius: "50%", background: avatarColor(nombre), overflow: "hidden", border: "2px solid rgba(0,0,0,0.5)", marginLeft: i > 0 ? -8 : 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "white" }}>
                            {p?.fotoUrl ? <img src={p.fotoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : nombre[0]?.toUpperCase()}
                          </div>
                        );
                      })}
                      {d.interesados.length > 3 && <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(124,106,255,0.2)", border: "2px solid rgba(0,0,0,0.5)", marginLeft: -8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#7c6aff", fontWeight: 700 }}>+{d.interesados.length - 3}</div>}
                    </div>
                    <span style={{ fontSize: 12, color: "#a0a8c0", flex: 1, textAlign: "left" }}>Ver postulantes</span>
                    <span style={{ fontSize: 14, color: "#7c6aff" }}>{isExp ? "▲" : "▼"}</span>
                  </div>
                </button>
              )}

              {/* Postulantes expandidos */}
              {isExp && conInteresados && (
                <div style={{ marginBottom: 10 }}>
                  {(d.interesadosEmails || []).map((email, idx) => {
                    const p = perfiles.find(x => x.email === email);
                    const nombre = d.interesados[idx] || email;
                    const inicial = nombre[0]?.toUpperCase();
                    return (
                      <div key={email} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "rgba(14,12,28,0.8)", borderRadius: 14, marginBottom: 8, border: "1px solid rgba(124,106,255,0.12)" }}>
                        <div style={{ width: 44, height: 44, borderRadius: "50%", background: avatarColor(nombre), overflow: "hidden", border: "2px solid rgba(124,106,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "white", flexShrink: 0 }}>
                          {p?.fotoUrl ? <img src={p.fotoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : inicial}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: "white" }}>{nombre}</div>
                          {p?.especialidad && <div style={{ fontSize: 11, color: "#7c6aff", marginTop: 1 }}>{p.especialidad}</div>}
                          {p?.bio && <div style={{ fontSize: 11, color: "#4a5270", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.bio}</div>}
                          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                            {p?.telefono && <a href={`tel:${p.telefono}`} style={{ fontSize: 10, color: "#4fc3f7", textDecoration: "none" }}>📞 {p.telefono}</a>}
                            <a href={`mailto:${email}`} style={{ fontSize: 10, color: "#4fc3f7", textDecoration: "none" }}>✉ email</a>
                          </div>
                        </div>
                        <button onClick={() => handleAsignar(d, nombre, email)} style={{ padding: "8px 14px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#38a169,#2d8a5e)", color: "white", fontWeight: 700, fontSize: 11, cursor: "pointer", flexShrink: 0 }}>
                          Designar
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Asignada */}
              {asignada && (
                <div style={{ padding: "10px 12px", background: "rgba(102,187,106,0.08)", borderRadius: 10, marginBottom: 10, border: "1px solid rgba(102,187,106,0.2)", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14 }}>🔗</span>
                  <span style={{ fontSize: 12, color: "#66bb6a", fontWeight: 600 }}>Asignada a {d.asignadoA}</span>
                </div>
              )}

              {/* Acciones */}
              {!cerrada && !asignada && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => onCerrar(d)} style={{ flex: 1, padding: "8px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#4a5270", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>Cerrar</button>
                  {esAdmin && <button onClick={() => onEliminar(d.id)} style={{ flex: 1, padding: "8px", borderRadius: 10, border: "1px solid rgba(239,83,80,0.25)", background: "rgba(239,83,80,0.06)", color: "#ef5350", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>Eliminar</button>}
                </div>
              )}
              {(cerrada || asignada) && esAdmin && (
                <button onClick={() => onEliminar(d.id)} style={{ width: "100%", padding: "8px", borderRadius: 10, border: "1px solid rgba(239,83,80,0.25)", background: "rgba(239,83,80,0.06)", color: "#ef5350", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>🗑 Eliminar</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── CONEXIONES ────────────────────────────────────────────────────────────────
function Conexiones({ derivaciones, usuario, perfiles }) {
  const [filtro, setFiltro] = useState("todas");

  const conexiones = derivaciones.filter(d =>
    d.estado === "asignada" && (d.derivadoPorEmail === usuario.email || d.asignadoEmail === usuario.email)
  );

  const filtradas = conexiones.filter(d => {
    if (filtro === "derive") return d.derivadoPorEmail === usuario.email;
    if (filtro === "recibi") return d.asignadoEmail === usuario.email;
    return true;
  });

  if (conexiones.length === 0) return (
    <div style={{ padding: "32px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 40, marginBottom: 10 }}>🔗</div>
      <p style={{ margin: 0, color: "#4a5270", fontSize: 13 }}>Aún no tenés conexiones activas.</p>
    </div>
  );

  return (
    <div style={{ padding: "12px 14px 20px" }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {[["todas", "Todas"], ["derive", "Derivé"], ["recibi", "Recibí"]].map(([v, l]) => (
          <button key={v} onClick={() => setFiltro(v)} style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${filtro === v ? "#7c6aff" : "rgba(124,106,255,0.2)"}`, background: filtro === v ? "linear-gradient(135deg,#667eea,#764ba2)" : "transparent", color: filtro === v ? "white" : "#a0a8c0", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{l}</button>
        ))}
      </div>

      {filtradas.map(d => {
        const esMia = d.derivadoPorEmail === usuario.email;
        const otroEmail = esMia ? d.asignadoEmail : d.derivadoPorEmail;
        const otroNombre = esMia ? d.asignadoA : d.derivadoPor;
        const otroPerfil = perfiles.find(p => p.email === otroEmail);
        const inicial = otroNombre?.[0]?.toUpperCase() || "?";

        return (
          <div key={d.id} style={{ background: "rgba(14,12,28,0.9)", borderRadius: 16, marginBottom: 10, overflow: "hidden", border: "1px solid rgba(102,187,106,0.2)" }}>
            <div style={{ height: 3, background: "linear-gradient(90deg,#38a169,#2d8a5e)" }} />
            <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: avatarColor(otroNombre || ""), overflow: "hidden", border: "2px solid rgba(102,187,106,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "white", flexShrink: 0 }}>
                {otroPerfil?.fotoUrl ? <img src={otroPerfil.fotoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : inicial}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "white" }}>{otroNombre}</div>
                {otroPerfil?.especialidad && <div style={{ fontSize: 11, color: "#7c6aff", marginTop: 1 }}>{otroPerfil.especialidad}</div>}
                <div style={{ fontSize: 11, color: "#4a5270", marginTop: 2 }}>
                  {esMia ? "Derivaste →" : "← Recibiste"} · 🧠 {d.especialidad}
                </div>
              </div>
              <div style={{ display: "flex", flex: "column", gap: 6, flexShrink: 0 }}>
                {otroPerfil?.telefono && <a href={`tel:${otroPerfil.telefono}`} style={{ display: "block", fontSize: 10, color: "#4fc3f7", textDecoration: "none", textAlign: "center" }}>📞</a>}
                <a href={`mailto:${otroEmail}`} style={{ display: "block", fontSize: 10, color: "#4fc3f7", textDecoration: "none", textAlign: "center" }}>✉</a>
              </div>
            </div>
            <div style={{ padding: "8px 16px 12px", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11 }}>🔗</span>
              <span style={{ fontSize: 11, color: "#66bb6a", fontWeight: 600 }}>En contacto por derivación</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
export default function Derivaciones({ usuario, t, esAdmin }) {
  const [derivaciones, setDerivaciones] = useState([]);
  const [perfiles, setPerfiles] = useState([]);
  const [tab, setTab] = useState("propuestas");
  const [mostrarForm, setMostrarForm] = useState(false);
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

  function archivarLocal(d) {
    const nueva = [...archivadas, d.id];
    setArchivadas(nueva);
    try { localStorage.setItem(`grins_arch_${usuario?.email}`, JSON.stringify(nueva)); } catch {}
  }

  async function meInteresa(d) {
    if (d.derivadoPorEmail === usuario.email || d.interesadosEmails?.includes(usuario.email)) return;
    await updateDoc(doc(db, "derivaciones", d.id), {
      interesados: [...(d.interesados || []), usuario.nombre],
      interesadosEmails: [...(d.interesadosEmails || []), usuario.email],
      estado: "con_interesados"
    });
  }

  async function asignar(d, nombre, email) {
    await updateDoc(doc(db, "derivaciones", d.id), { asignadoA: nombre, asignadoEmail: email, estado: "asignada" });
    await addDoc(collection(db, "notificaciones"), { para: email, de: usuario.email, deNombre: usuario.nombre, tipo: "derivacion_asignada", derivacionId: d.id, especialidad: d.especialidad, leida: false, creadoEn: serverTimestamp() });
    await addDoc(collection(db, "notificaciones"), { para: d.derivadoPorEmail, de: email, deNombre: nombre, tipo: "derivacion_match", derivacionId: d.id, especialidad: d.especialidad, leida: false, creadoEn: serverTimestamp() });
  }

  async function cerrar(d) { await updateDoc(doc(db, "derivaciones", d.id), { estado: "cerrada" }); }
  async function eliminar(id) { await deleteDoc(doc(db, "derivaciones", id)); }

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
    <button key={label} onClick={onClick} style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${active ? "#7c6aff" : "rgba(124,106,255,0.2)"}`, background: active ? "linear-gradient(135deg,#667eea,#764ba2)" : "rgba(14,12,28,0.8)", color: active ? "white" : "#a0a8c0", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{label}</button>
  );

  const inp = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(124,106,255,0.2)", fontSize: 13, marginBottom: 12, boxSizing: "border-box", outline: "none", background: "rgba(14,12,28,0.8)", color: "white" };
  const lbl = { display: "block", fontSize: 11, fontWeight: 700, color: "#a0a8c0", marginBottom: 6, textTransform: "uppercase", letterSpacing: .5 };

  // Propuestas: de otros, disponibles y no archivadas
  const propuestas = derivaciones.filter(d =>
    d.derivadoPorEmail !== usuario.email &&
    d.estado === "disponible" &&
    !archivadas.includes(d.id)
  );

  // Badge contadores
  const badgePropuestas = propuestas.length;
  const badgeMias = derivaciones.filter(d => d.derivadoPorEmail === usuario.email && d.interesados?.length > 0 && d.estado !== "asignada").length;
  const badgeConexiones = derivaciones.filter(d => d.estado === "asignada" && (d.derivadoPorEmail === usuario.email || d.asignadoEmail === usuario.email)).length;

  const tabs = [
    { id: "propuestas", label: "Propuestas", badge: badgePropuestas },
    { id: "mias", label: "Mis deriv.", badge: badgeMias },
    { id: "conexiones", label: "Conexiones", badge: badgeConexiones },
  ];

  return (
    <div>
      {/* HEADER + TABS */}
      <div style={{ padding: "14px 14px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "white" }}>Derivaciones</h2>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#4a5270" }}>Red de derivaciones GRINS</p>
          </div>
          <button onClick={() => setMostrarForm(f => !f)} style={{ padding: "8px 16px", borderRadius: 20, border: mostrarForm ? "1px solid rgba(124,106,255,0.2)" : "none", background: mostrarForm ? "rgba(14,12,28,0.8)" : "linear-gradient(135deg,#667eea,#764ba2)", color: "white", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
            {mostrarForm ? "Cancelar" : "+ Nueva"}
          </button>
        </div>

        {/* TABS */}
        <div style={{ display: "flex", background: "rgba(14,12,28,0.8)", borderRadius: 12, padding: 3, border: "1px solid rgba(124,106,255,0.15)", marginBottom: 4 }}>
          {tabs.map(({ id, label, badge }) => (
            <button key={id} onClick={() => setTab(id)} style={{ flex: 1, padding: "8px 4px", borderRadius: 9, border: "none", cursor: "pointer", fontWeight: tab === id ? 700 : 500, fontSize: 11, background: tab === id ? "linear-gradient(135deg,#667eea,#764ba2)" : "transparent", color: tab === id ? "white" : "#a0a8c0", transition: "all 0.2s", position: "relative" }}>
              {label}
              {badge > 0 && <span style={{ position: "absolute", top: 2, right: 6, width: 16, height: 16, borderRadius: "50%", background: "#ef5350", color: "white", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{badge > 9 ? "9+" : badge}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* FORM NUEVA DERIVACIÓN */}
      {mostrarForm && (
        <div style={{ margin: "0 14px 12px", background: "rgba(14,12,28,0.9)", borderRadius: 18, padding: 18, border: "1px solid rgba(124,106,255,0.2)" }}>
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

      {/* CONTENIDO POR TAB */}
      {tab === "propuestas" && (
        propuestas.length === 0 ? (
          <div style={{ padding: "32px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>✨</div>
            <p style={{ margin: 0, color: "#4a5270", fontSize: 13 }}>No hay propuestas disponibles ahora.</p>
          </div>
        ) : (
          <PilaTinder derivaciones={propuestas} usuario={usuario} perfiles={perfiles} onInteresa={meInteresa} onArchivar={archivarLocal} />
        )
      )}

      {tab === "mias" && (
        <MisDerivaciones derivaciones={derivaciones} usuario={usuario} perfiles={perfiles} esAdmin={esAdmin} onAsignar={asignar} onCerrar={cerrar} onEliminar={eliminar} />
      )}

      {tab === "conexiones" && (
        <Conexiones derivaciones={derivaciones} usuario={usuario} perfiles={perfiles} />
      )}
    </div>
  );
}
