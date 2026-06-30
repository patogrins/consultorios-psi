import { useState, useEffect, useRef, useMemo } from "react";
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

// ── CHAT FULLSCREEN ESTILO WHATSAPP ──────────────────────────────────────────
function ChatFullscreen({ derivacionId, usuario, otroNombre, otroPerfil, onCerrar }) {
  const [msgs, setMsgs] = useState([]);
  const [texto, setTexto] = useState("");
  const endRef = useRef(null);
  const inicial = otroNombre?.[0]?.toUpperCase() || "?";

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, `chats_derivacion/${derivacionId}/mensajes`),
      snap => {
        const data = snap.docs.map(d => ({ ...d.data(), id: d.id }))
          .sort((a, b) => (a.creadoEn?.seconds || 0) - (b.creadoEn?.seconds || 0));
        setMsgs(data);
        setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
      }
    );
    return () => unsub();
  }, [derivacionId]);

  async function enviar() {
    if (!texto.trim()) return;
    await addDoc(collection(db, `chats_derivacion/${derivacionId}/mensajes`), {
      texto: texto.trim(),
      autorEmail: usuario.email,
      autorNombre: usuario.nombre,
      creadoEn: serverTimestamp()
    });
    setTexto("");
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000", zIndex: 5000, display: "flex", flexDirection: "column" }}>

      {/* HEADER CHAT */}
      <div style={{ padding: "54px 16px 14px", background: "linear-gradient(180deg,#0a0a14 0%,#000000 100%)", borderBottom: "1px solid rgba(124,106,255,0.15)", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <button onClick={onCerrar} style={{ background: "none", border: "none", color: "white", fontSize: 22, cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: avatarColor(otroNombre || ""), overflow: "hidden", border: "1.5px solid rgba(124,106,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "white", flexShrink: 0 }}>
          {otroPerfil?.fotoUrl ? <img src={otroPerfil.fotoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : inicial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{otroNombre}</div>
          {otroPerfil?.especialidad && <div style={{ fontSize: 11, color: "#7c6aff", fontWeight: 600 }}>{otroPerfil.especialidad}</div>}
        </div>
      </div>

      {/* MENSAJES */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        {msgs.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>💬</div>
            <p style={{ margin: 0, fontSize: 13, color: "#4a5270" }}>Empezá la conversación con {otroNombre}</p>
          </div>
        )}
        {msgs.map(m => {
          const esMio = m.autorEmail === usuario.email;
          const fecha = m.creadoEn?.toDate?.()?.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) || "";
          return (
            <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: esMio ? "flex-end" : "flex-start" }}>
              {!esMio && <div style={{ fontSize: 9, color: "#4a5270", marginBottom: 3, marginLeft: 4 }}>{m.autorNombre}</div>}
              <div style={{ maxWidth: "80%", padding: "10px 14px", borderRadius: esMio ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: esMio ? "linear-gradient(135deg,#667eea,#764ba2)" : "rgba(255,255,255,0.08)", color: "white", fontSize: 14, lineHeight: 1.4, wordBreak: "break-word" }}>
                {m.texto}
              </div>
              <div style={{ fontSize: 9, color: "#3a3a5a", marginTop: 3, marginLeft: esMio ? 0 : 4, marginRight: esMio ? 4 : 0 }}>{fecha}</div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* INPUT */}
      <div style={{ padding: "10px 12px", paddingBottom: "calc(10px + env(safe-area-inset-bottom))", borderTop: "1px solid rgba(124,106,255,0.1)", background: "rgba(10,10,20,0.95)", display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
        <input value={texto} onChange={e => setTexto(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && enviar()}
          placeholder={`Escribile a ${otroNombre}...`}
          style={{ flex: 1, padding: "11px 16px", borderRadius: 24, border: "1px solid rgba(124,106,255,0.2)", background: "rgba(255,255,255,0.05)", color: "white", fontSize: 14, outline: "none" }} />
        <button onClick={enviar} disabled={!texto.trim()} style={{ width: 42, height: 42, borderRadius: "50%", border: "none", background: texto.trim() ? "linear-gradient(135deg,#667eea,#764ba2)" : "rgba(255,255,255,0.05)", cursor: texto.trim() ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>
  );
}

// ── LOOP VERTICAL INFINITO DE FICHAS (CARTELERA) ─────────────────────────────
function CarteleraLoop({ fichas, usuario, onInteresa, onArchivar }) {
  const [respondidas, setRespondidas] = useState(new Set());
  const [idx, setIdx] = useState(0);
  const startY = useRef(null);
  const [offsetY, setOffsetY] = useState(0);
  const startX = useRef(null);
  const [offsetX, setOffsetX] = useState(0);
  const [swipeDir, setSwipeDir] = useState(null); // "left" | "right" para acción horizontal
  const [animandoVertical, setAnimandoVertical] = useState(null); // "up" | "down"
  const [animandoHorizontal, setAnimandoHorizontal] = useState(null); // "left" | "right"
  const THRESHOLD_V = 60;
  const THRESHOLD_H = 80;

  const disponibles = useMemo(() => fichas.filter(f => !respondidas.has(f.id)), [fichas, respondidas]);

  // Si el índice quedó fuera de rango (porque sacamos una ficha), lo ajustamos
  useEffect(() => {
    if (idx >= disponibles.length && disponibles.length > 0) setIdx(0);
  }, [disponibles.length]);

  if (disponibles.length === 0) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", textAlign: "center", minHeight: "50vh" }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>📌</div>
      <h3 style={{ margin: "0 0 8px", color: "white", fontSize: 18, fontWeight: 800 }}>Cartelera al día</h3>
      <p style={{ margin: 0, color: "#4a5270", fontSize: 13 }}>No hay fichas nuevas por ahora.</p>
    </div>
  );

  const ficha = disponibles[idx % disponibles.length];
  const yaInteresado = ficha.interesadosEmails?.includes(usuario.email);

  function siguienteIdx() { return (idx + 1) % disponibles.length; }
  function anteriorIdx() { return (idx - 1 + disponibles.length) % disponibles.length; }

  // Swipe vertical = navegar (loop), swipe horizontal = responder
  function onTouchStart(e) {
    if (e.touches.length !== 1) return;
    startY.current = e.touches[0].clientY;
    startX.current = e.touches[0].clientX;
  }
  function onTouchMove(e) {
    if (startY.current === null) return;
    const dy = e.touches[0].clientY - startY.current;
    const dx = e.touches[0].clientX - startX.current;
    if (Math.abs(dx) > Math.abs(dy)) {
      setOffsetX(dx);
      setOffsetY(0);
      setSwipeDir(dx > 20 ? "right" : dx < -20 ? "left" : null);
    } else {
      setOffsetY(dy);
      setOffsetX(0);
      setSwipeDir(null);
    }
  }
  function onTouchEnd() {
    if (Math.abs(offsetX) > THRESHOLD_H) {
      triggerHorizontal(offsetX > 0 ? "right" : "left");
    } else if (offsetY > THRESHOLD_V) {
      triggerVertical("down"); // swipe hacia abajo = ficha anterior
    } else if (offsetY < -THRESHOLD_V) {
      triggerVertical("up"); // swipe hacia arriba = ficha siguiente
    } else {
      setOffsetY(0); setOffsetX(0); setSwipeDir(null);
    }
    startY.current = null; startX.current = null;
  }

  function triggerVertical(dir) {
    setAnimandoVertical(dir);
    setTimeout(() => {
      setIdx(dir === "up" ? siguienteIdx() : anteriorIdx());
      setOffsetY(0); setAnimandoVertical(null);
    }, 220);
  }

  function triggerHorizontal(dir) {
    setAnimandoHorizontal(dir);
    setTimeout(() => {
      if (dir === "right") onInteresa(ficha);
      else onArchivar(ficha);
      setRespondidas(prev => new Set(prev).add(ficha.id));
      setOffsetX(0); setOffsetY(0); setSwipeDir(null); setAnimandoHorizontal(null);
    }, 260);
  }

  const translateY = animandoVertical === "up" ? -120 : animandoVertical === "down" ? 120 : offsetY;
  const translateX = animandoHorizontal === "right" ? 420 : animandoHorizontal === "left" ? -420 : offsetX;
  const rotation = offsetX * 0.035;
  const opacityV = animandoVertical ? 0 : 1 - Math.min(Math.abs(offsetY) / 200, 0.5);
  const opacityH = animandoHorizontal ? 0 : Math.max(0.4, 1 - Math.abs(offsetX) / 260);
  const opacity = Math.min(opacityV, opacityH);

  return (
    <div style={{ padding: "14px 16px 10px" }}>

      {/* Hints */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, padding: "0 4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: swipeDir === "left" ? 1 : 0.3, transition: "opacity 0.2s" }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(239,83,80,0.15)", border: "1.5px solid #ef5350", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 11, color: "#ef5350" }}>✕</span>
          </div>
          <span style={{ fontSize: 9, color: "#ef5350", fontWeight: 600 }}>Archivar</span>
        </div>
        <span style={{ fontSize: 10, color: "#4a5270" }}>{idx % disponibles.length + 1} / {disponibles.length}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: swipeDir === "right" ? 1 : 0.3, transition: "opacity 0.2s" }}>
          <span style={{ fontSize: 9, color: "#66bb6a", fontWeight: 600 }}>Me interesa</span>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(102,187,106,0.15)", border: "1.5px solid #66bb6a", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 11, color: "#66bb6a" }}>♥</span>
          </div>
        </div>
      </div>

      {/* Pila visual: ficha siguiente y anterior apenas asomadas, dan sensación de loop continuo */}
      <div style={{ position: "relative", height: 400, touchAction: "pan-y" }}>

        {/* Ficha "siguiente" asomando abajo */}
        <div style={{ position: "absolute", inset: 0, borderRadius: 22, background: "rgba(14,12,28,0.5)", border: "1px solid rgba(124,106,255,0.08)", transform: "scale(0.94) translateY(14px)", zIndex: 1 }} />
        {/* Ficha "anterior" asomando arriba */}
        <div style={{ position: "absolute", inset: 0, borderRadius: 22, background: "rgba(14,12,28,0.35)", border: "1px solid rgba(124,106,255,0.06)", transform: "scale(0.9) translateY(-14px)", zIndex: 0 }} />

        {/* Ficha activa */}
        <div
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
          style={{
            position: "absolute", inset: 0, zIndex: 2,
            background: "rgba(14,12,28,0.97)", borderRadius: 22, overflow: "hidden",
            border: `1px solid ${swipeDir === "right" ? "rgba(102,187,106,0.5)" : swipeDir === "left" ? "rgba(239,83,80,0.5)" : "rgba(124,106,255,0.25)"}`,
            transform: `translate(${translateX}px, ${translateY}px) rotate(${rotation}deg)`,
            opacity,
            transition: (animandoVertical || animandoHorizontal) ? "transform 0.22s ease, opacity 0.22s ease" : "border 0.15s",
            cursor: "grab", userSelect: "none", touchAction: "none",
            boxShadow: "0 12px 40px rgba(0,0,0,0.4)"
          }}>

          <div style={{ height: 3, background: "linear-gradient(90deg,#667eea,#764ba2)" }} />

          {/* Sellos overlay */}
          {swipeDir === "right" && (
            <div style={{ position: "absolute", top: 16, left: 16, zIndex: 5, background: "rgba(102,187,106,0.9)", borderRadius: 8, padding: "4px 12px", border: "2px solid #66bb6a", transform: "rotate(-12deg)" }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "white" }}>♥ ME INTERESA</span>
            </div>
          )}
          {swipeDir === "left" && (
            <div style={{ position: "absolute", top: 16, right: 16, zIndex: 5, background: "rgba(239,83,80,0.9)", borderRadius: 8, padding: "4px 12px", border: "2px solid #ef5350", transform: "rotate(12deg)" }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "white" }}>ARCHIVAR ✕</span>
            </div>
          )}

          <div style={{ padding: 16, height: "calc(100% - 3px)", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg,#667eea22,#764ba222)", border: "1px solid rgba(124,106,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19 }}>📌</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "white" }}>{ficha.especialidad}</div>
                  <div style={{ fontSize: 11, color: "#4a5270" }}>por {ficha.derivadoPor}</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 9, color: "#4a5270" }}>{tiempoRelativo(ficha.creadoEn?.seconds)}</span>
                {yaInteresado && <div style={{ marginTop: 3, fontSize: 9, background: "rgba(102,187,106,0.15)", color: "#66bb6a", borderRadius: 6, padding: "1px 6px", fontWeight: 700 }}>Ya te postulaste</div>}
              </div>
            </div>

            {ficha.nota && (
              <p style={{ margin: "0 0 12px", fontSize: 13, color: "#e2e8f0", lineHeight: 1.6, padding: "10px 12px", background: "rgba(124,106,255,0.06)", borderRadius: 10, borderLeft: "2px solid rgba(124,106,255,0.4)", overflowY: "auto", maxHeight: 110 }}>
                "{ficha.nota}"
              </p>
            )}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: "auto" }}>
              <Tag label={`📍 ${ficha.modalidad}`} />
              {ficha.genero !== "Indistinto" && <Tag label={`${ficha.genero === "Femenino" ? "👩" : "👨"} ${ficha.genero}`} />}
              {ficha.edad !== "Indistinto" && <Tag label={`🎂 ${ficha.edad}`} />}
              {ficha.dias?.length > 0 && <Tag label={`📅 ${ficha.dias.join(" · ")}`} />}
              {ficha.franjas?.length > 0 && <Tag label={`⏰ ${ficha.franjas.join(" · ")}`} />}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button onClick={() => triggerHorizontal("left")} style={{ flex: 1, padding: "11px", borderRadius: 14, border: "1px solid rgba(239,83,80,0.3)", background: "rgba(239,83,80,0.08)", color: "#ef5350", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <span>✕</span> Archivar
              </button>
              <button onClick={() => triggerHorizontal("right")} style={{ flex: 2, padding: "11px", borderRadius: 14, border: "none", background: yaInteresado ? "rgba(102,187,106,0.15)" : "linear-gradient(135deg,#38a169,#2d8a5e)", color: yaInteresado ? "#66bb6a" : "white", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <span>♥</span> {yaInteresado ? "Ya te postulaste" : "Me interesa"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hints navegación vertical */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, marginTop: 12, opacity: 0.35 }}>
        <span style={{ fontSize: 9, color: "#a0a8c0" }}>↑ deslizá arriba/abajo para ver más fichas ↓</span>
        <span style={{ fontSize: 9, color: "#a0a8c0" }}>← deslizá a los lados para responder →</span>
      </div>
    </div>
  );
}

// ── MIS PUBLICACIONES (antes "Mis derivaciones") ─────────────────────────────
function MisPublicaciones({ derivaciones, usuario, perfiles, esAdmin, onAsignar, onCerrar, onEliminar, onAbrirChat }) {
  const [expandida, setExpandida] = useState(null);
  const [matchModal, setMatchModal] = useState(null);

  const mias = derivaciones.filter(d => d.derivadoPorEmail === usuario.email);

  if (mias.length === 0) return (
    <div style={{ padding: "32px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>
      <p style={{ margin: 0, color: "#4a5270", fontSize: 13 }}>No publicaste fichas aún.</p>
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

      {matchModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "rgba(14,12,28,0.98)", borderRadius: 24, padding: "32px 24px", width: "100%", maxWidth: 360, textAlign: "center", border: "1px solid rgba(124,106,255,0.3)", boxShadow: "0 0 60px rgba(124,106,255,0.2)" }}>
            <div style={{ fontSize: 32, marginBottom: 20 }}>🎉</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: avatarColor(usuario.nombre), overflow: "hidden", border: "3px solid rgba(124,106,255,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "white" }}>
                {usuario.fotoUrl ? <img src={usuario.fotoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : usuario.nombre?.[0]?.toUpperCase()}
              </div>
              <div style={{ display: "flex", alignItems: "center", margin: "0 4px" }}>
                <div style={{ width: 20, borderTop: "1.5px dashed rgba(124,106,255,0.4)" }} />
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#667eea,#764ba2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>✓</div>
                <div style={{ width: 20, borderTop: "1.5px dashed rgba(124,106,255,0.4)" }} />
              </div>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: avatarColor(matchModal.asignado.nombre), overflow: "hidden", border: "3px solid rgba(124,106,255,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "white" }}>
                {matchModal.asignado.fotoUrl ? <img src={matchModal.asignado.fotoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : matchModal.asignado.nombre?.[0]?.toUpperCase()}
              </div>
            </div>
            <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800, color: "white" }}>¡Ficha asignada!</h2>
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

        return (
          <div key={d.id} style={{ background: "rgba(14,12,28,0.9)", borderRadius: 18, marginBottom: 12, overflow: "hidden", border: `1px solid ${asignada ? "rgba(102,187,106,0.3)" : conInteresados ? "rgba(124,106,255,0.35)" : "rgba(124,106,255,0.12)"}` }}>
            <div style={{ height: 3, background: asignada ? "linear-gradient(90deg,#38a169,#2d8a5e)" : conInteresados ? "linear-gradient(90deg,#667eea,#764ba2)" : cerrada ? "rgba(255,255,255,0.08)" : "rgba(124,106,255,0.2)" }} />

            <div style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: cerrada ? "#4a5270" : "white" }}>📌 {d.especialidad}</div>
                  <div style={{ fontSize: 10, color: "#4a5270", marginTop: 2 }}>{tiempoRelativo(d.creadoEn?.seconds)} · {d.modalidad}</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 20, padding: "3px 10px", background: asignada ? "rgba(102,187,106,0.12)" : conInteresados ? "rgba(124,106,255,0.15)" : "rgba(255,255,255,0.05)", color: asignada ? "#66bb6a" : conInteresados ? "#a78bfa" : "#4a5270", border: `1px solid ${asignada ? "rgba(102,187,106,0.3)" : conInteresados ? "rgba(124,106,255,0.3)" : "rgba(255,255,255,0.08)"}` }}>
                  {asignada ? "✓ Asignada" : conInteresados ? `${d.interesados.length} postulante${d.interesados.length > 1 ? "s" : ""}` : cerrada ? "Cerrada" : "Sin postulantes"}
                </span>
              </div>

              {sinInteresados && !cerrada && (
                <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 10, marginBottom: 10, border: "1px dashed rgba(255,255,255,0.06)" }}>
                  <p style={{ margin: 0, fontSize: 12, color: "#4a5270", fontStyle: "italic" }}>Aún sin postulantes. Esperá a que otros profesionales respondan.</p>
                </div>
              )}

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

              {isExp && conInteresados && (
                <div style={{ marginBottom: 10 }}>
                  {(d.interesadosEmails || []).map((email, idx) => {
                    const p = perfiles.find(x => x.email === email);
                    const nombre = d.interesados[idx] || email;
                    return (
                      <div key={email} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "rgba(14,12,28,0.8)", borderRadius: 14, marginBottom: 8, border: "1px solid rgba(124,106,255,0.12)" }}>
                        <div style={{ width: 44, height: 44, borderRadius: "50%", background: avatarColor(nombre), overflow: "hidden", border: "2px solid rgba(124,106,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "white", flexShrink: 0 }}>
                          {p?.fotoUrl ? <img src={p.fotoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : nombre[0]?.toUpperCase()}
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

              {asignada && (
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <div style={{ flex: 1, padding: "10px 12px", background: "rgba(102,187,106,0.08)", borderRadius: 10, border: "1px solid rgba(102,187,106,0.2)", display: "flex", alignItems: "center", gap: 8 }}>
                    <span>🔗</span>
                    <span style={{ fontSize: 12, color: "#66bb6a", fontWeight: 600 }}>Asignada a {d.asignadoA}</span>
                  </div>
                  <button onClick={() => onAbrirChat(d.id, d.asignadoA, d.asignadoEmail)} style={{ padding: "0 14px", borderRadius: 10, border: "1px solid rgba(124,106,255,0.25)", background: "rgba(124,106,255,0.1)", color: "#a78bfa", fontWeight: 700, fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                    💬 Chatear
                  </button>
                </div>
              )}

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

// ── CONEXIONES (sin cambios de lógica, chat ahora fullscreen) ────────────────
function Conexiones({ derivaciones, usuario, perfiles, chatInicial, onChatInicialUsado, onAbrirChat }) {
  const [filtro, setFiltro] = useState("todas");
  const [perfilVista, setPerfilVista] = useState(null);

  const conexiones = derivaciones.filter(d =>
    d.estado === "asignada" && (d.derivadoPorEmail === usuario.email || d.asignadoEmail === usuario.email)
  );

  useEffect(() => {
    if (!chatInicial) return;
    const conexion = conexiones.find(d =>
      d.derivadoPorEmail === chatInicial || d.asignadoEmail === chatInicial
    );
    if (conexion) {
      const otroEmail = conexion.derivadoPorEmail === usuario.email ? conexion.asignadoEmail : conexion.derivadoPorEmail;
      const otroNombre = conexion.derivadoPorEmail === usuario.email ? conexion.asignadoA : conexion.derivadoPor;
      onAbrirChat(conexion.id, otroNombre, otroEmail);
    }
    onChatInicialUsado?.();
  }, [chatInicial, conexiones]);

  const filtradas = conexiones.filter(d => {
    if (filtro === "derive") return d.derivadoPorEmail === usuario.email;
    if (filtro === "recibi") return d.asignadoEmail === usuario.email;
    return true;
  });

  if (perfilVista) {
    const inicial = perfilVista.nombre?.[0]?.toUpperCase() || "?";
    return (
      <div style={{ padding: "16px 14px 100px" }}>
        <button onClick={() => setPerfilVista(null)} style={{ background: "none", border: "none", color: "#7c6aff", cursor: "pointer", fontSize: 13, fontWeight: 600, marginBottom: 14, display: "flex", alignItems: "center", gap: 6, padding: 0 }}>
          ← Volver a conexiones
        </button>
        <div style={{ background: "rgba(14,12,28,0.9)", borderRadius: 20, overflow: "hidden", border: "1px solid rgba(124,106,255,0.2)" }}>
          <div style={{ background: "linear-gradient(180deg,#0a0a18,#0d0d20)", padding: "28px 20px 20px", textAlign: "center" }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: avatarColor(perfilVista.nombre), overflow: "hidden", border: "3px solid rgba(124,106,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 800, color: "white", margin: "0 auto 12px", boxShadow: "0 0 30px rgba(124,106,255,0.2)" }}>
              {perfilVista.fotoUrl ? <img src={perfilVista.fotoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : inicial}
            </div>
            <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800, color: "white" }}>{perfilVista.nombre}</h2>
            {perfilVista.especialidad && <div style={{ fontSize: 13, color: "#7c6aff", fontWeight: 600, marginBottom: 8 }}>{perfilVista.especialidad}</div>}
            <span style={{ fontSize: 11, color: "#66bb6a", background: "rgba(102,187,106,0.12)", borderRadius: 20, padding: "3px 12px", border: "1px solid rgba(102,187,106,0.3)" }}>🔗 Conexión activa</span>
          </div>
          <div style={{ padding: "16px 20px" }}>
            {perfilVista.bio && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: "#4a5270", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Bio</div>
                <p style={{ margin: 0, fontSize: 13, color: "#a0a8c0", lineHeight: 1.6 }}>{perfilVista.bio}</p>
              </div>
            )}
            {perfilVista.telefono && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: "#4a5270", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Contacto</div>
                <a href={`tel:${perfilVista.telefono}`} style={{ fontSize: 13, color: "#4fc3f7", textDecoration: "none", fontWeight: 600 }}>📞 {perfilVista.telefono}</a>
              </div>
            )}
            <a href={`mailto:${perfilVista.email}`} style={{ display: "block", textAlign: "center", background: "rgba(124,106,255,0.1)", borderRadius: 12, padding: "10px 16px", border: "1px solid rgba(124,106,255,0.2)", textDecoration: "none", color: "#7c6aff", fontSize: 13, fontWeight: 600 }}>
              ✉ Enviar email
            </a>
          </div>
        </div>
      </div>
    );
  }

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
        const derivadorPerfil = perfiles.find(p => p.email === d.derivadoPorEmail);
        const asignadoPerfil = perfiles.find(p => p.email === d.asignadoEmail);
        const otroEmail = d.derivadoPorEmail === usuario.email ? d.asignadoEmail : d.derivadoPorEmail;
        const otroNombre = d.derivadoPorEmail === usuario.email ? d.asignadoA : d.derivadoPor;

        return (
          <div key={d.id} style={{ background: "rgba(14,12,28,0.9)", borderRadius: 18, marginBottom: 12, overflow: "hidden", border: "1px solid rgba(102,187,106,0.2)" }}>
            <div style={{ height: 3, background: "linear-gradient(90deg,#38a169,#2d8a5e)" }} />

            <div style={{ padding: "16px 16px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 14 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer" }}
                  onClick={() => { if (derivadorPerfil) setPerfilVista(derivadorPerfil); }}>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: avatarColor(d.derivadoPor || ""), overflow: "hidden", border: `2px solid ${d.derivadoPorEmail === usuario.email ? "rgba(124,106,255,0.6)" : "rgba(102,187,106,0.3)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "white", boxShadow: d.derivadoPorEmail === usuario.email ? "0 0 12px rgba(124,106,255,0.3)" : "none" }}>
                    {derivadorPerfil?.fotoUrl ? <img src={derivadorPerfil.fotoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : d.derivadoPor?.[0]?.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 9, color: d.derivadoPorEmail === usuario.email ? "#a78bfa" : "#4a5270", fontWeight: 700, textAlign: "center", maxWidth: 60, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {d.derivadoPorEmail === usuario.email ? "Vos" : d.derivadoPor}
                  </div>
                  <div style={{ fontSize: 8, color: "#3a3a5a", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>deriva</div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 0, margin: "0 8px", paddingBottom: 20 }}>
                  <div style={{ width: 16, height: 1, background: "linear-gradient(90deg,rgba(102,187,106,0),rgba(102,187,106,0.6))" }} />
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#38a169,#2d8a5e)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 10px rgba(102,187,106,0.4)" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </div>
                    <div style={{ fontSize: 7, color: "#38a169", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>asignó</div>
                  </div>
                  <div style={{ width: 16, height: 1, background: "linear-gradient(90deg,rgba(102,187,106,0.6),rgba(102,187,106,0))" }} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer" }}
                  onClick={() => { if (asignadoPerfil) setPerfilVista(asignadoPerfil); }}>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: avatarColor(d.asignadoA || ""), overflow: "hidden", border: `2px solid ${d.asignadoEmail === usuario.email ? "rgba(124,106,255,0.6)" : "rgba(102,187,106,0.3)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "white", boxShadow: d.asignadoEmail === usuario.email ? "0 0 12px rgba(124,106,255,0.3)" : "none" }}>
                    {asignadoPerfil?.fotoUrl ? <img src={asignadoPerfil.fotoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : d.asignadoA?.[0]?.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 9, color: d.asignadoEmail === usuario.email ? "#a78bfa" : "#4a5270", fontWeight: 700, textAlign: "center", maxWidth: 60, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {d.asignadoEmail === usuario.email ? "Vos" : d.asignadoA}
                  </div>
                  <div style={{ fontSize: 8, color: "#3a3a5a", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>recibe</div>
                </div>
              </div>

              <div style={{ textAlign: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "white" }}>📌 {d.especialidad}</div>
                <div style={{ fontSize: 10, color: "#4a5270", marginTop: 2 }}>Ficha activa · {d.modalidad}</div>
              </div>

              <button onClick={() => onAbrirChat(d.id, otroNombre, otroEmail)} style={{ width: "100%", padding: "10px", borderRadius: 12, border: "1px solid rgba(124,106,255,0.2)", background: "rgba(124,106,255,0.08)", color: "#a78bfa", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                Chatear con {otroNombre}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
export default function Derivaciones({ usuario, t, esAdmin, chatInicial, onChatInicialUsado, vistaInicial }) {
  const [derivaciones, setDerivaciones] = useState([]);
  const [perfiles, setPerfiles] = useState([]);
  const [vista, setVista] = useState(vistaInicial || "cartelera"); // "cartelera" | "misPublicaciones"
  const [mostrarForm, setMostrarForm] = useState(false);
  const [chatAbierto, setChatAbierto] = useState(null); // { derivacionId, otroNombre, otroEmail }
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

  useEffect(() => { if (vistaInicial) setVista(vistaInicial); }, [vistaInicial]);

  function abrirChat(derivacionId, otroNombre, otroEmail) {
    setChatAbierto({ derivacionId, otroNombre, otroEmail });
  }

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

    await addDoc(collection(db, "notificaciones"), {
      para: email, de: usuario.email, deNombre: usuario.nombre,
      tipo: "derivacion_asignada", derivacionId: d.id, especialidad: d.especialidad,
      leida: false, creadoEn: serverTimestamp()
    });

    await addDoc(collection(db, "notificaciones"), {
      para: d.derivadoPorEmail, de: email, deNombre: nombre,
      tipo: "derivacion_match", derivacionId: d.id, especialidad: d.especialidad,
      leida: false, creadoEn: serverTimestamp()
    });
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

  const fichasCartelera = derivaciones.filter(d =>
    d.derivadoPorEmail !== usuario.email &&
    d.estado === "disponible" &&
    !archivadas.includes(d.id)
  );

  // Si el chat está abierto, lo mostramos fullscreen por encima de todo
  if (chatAbierto) {
    const otroPerfil = perfiles.find(p => p.email === chatAbierto.otroEmail);
    return (
      <ChatFullscreen
        derivacionId={chatAbierto.derivacionId}
        usuario={usuario}
        otroNombre={chatAbierto.otroNombre}
        otroPerfil={otroPerfil}
        onCerrar={() => setChatAbierto(null)}
      />
    );
  }

  return (
    <div>
      {/* FORM NUEVA FICHA — modal */}
      {mostrarForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 3000 }}>
          <div style={{ background: "#0a0a14", borderRadius: "24px 24px 0 0", padding: "20px 20px 40px", width: "100%", maxWidth: 520, border: "1px solid rgba(124,106,255,0.2)", maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.1)", margin: "0 auto 16px" }} />
            <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 800, color: "white" }}>Nueva ficha</h3>
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
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setMostrarForm(false)} style={{ flex: 1, padding: 13, borderRadius: 12, border: "1px solid rgba(124,106,255,0.2)", background: "transparent", color: "#a0a8c0", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Cancelar</button>
              <button onClick={publicar} disabled={!form.especialidad} style={{ flex: 2, padding: 13, borderRadius: 12, border: "none", background: form.especialidad ? "linear-gradient(135deg,#667eea,#764ba2)" : "rgba(255,255,255,0.05)", color: "white", fontWeight: 800, fontSize: 13, cursor: form.especialidad ? "pointer" : "not-allowed" }}>
                Publicar ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VISTA CARTELERA (loop infinito) */}
      {vista === "cartelera" && (
        <CarteleraLoop fichas={fichasCartelera} usuario={usuario} onInteresa={meInteresa} onArchivar={archivarLocal} />
      )}

      {/* VISTA MIS PUBLICACIONES */}
      {vista === "misPublicaciones" && (
        <MisPublicaciones derivaciones={derivaciones} usuario={usuario} perfiles={perfiles} esAdmin={esAdmin} onAsignar={asignar} onCerrar={cerrar} onEliminar={eliminar} onAbrirChat={abrirChat} />
      )}

      {/* VISTA CONEXIONES */}
      {vista === "conexiones" && (
        <Conexiones derivaciones={derivaciones} usuario={usuario} perfiles={perfiles} chatInicial={chatInicial} onChatInicialUsado={onChatInicialUsado} onAbrirChat={abrirChat} />
      )}

      {/* BARRA INFERIOR: + nueva ficha / revisar publicaciones — solo visible en vista cartelera */}
      {vista === "cartelera" && (
        <div style={{ position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)", zIndex: 60, display: "flex", alignItems: "center", gap: 10, background: "rgba(10,10,20,0.9)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(124,106,255,0.2)", borderRadius: 30, padding: "8px 10px 8px 18px", boxShadow: "0 8px 30px rgba(0,0,0,0.4)" }}>
          <button onClick={() => setVista("misPublicaciones")} style={{ background: "transparent", border: "none", color: "#a0a8c0", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, padding: "6px 4px", whiteSpace: "nowrap" }}>
            📂 Mis publicaciones
          </button>
          <button onClick={() => setMostrarForm(true)} style={{ width: 46, height: 46, borderRadius: "50%", border: "none", background: "linear-gradient(135deg,#667eea,#764ba2)", color: "white", fontSize: 24, fontWeight: 300, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 16px rgba(124,106,255,0.4)" }}>
            +
          </button>
        </div>
      )}
    </div>
  );
}
