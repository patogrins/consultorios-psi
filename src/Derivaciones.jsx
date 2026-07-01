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
      texto: texto.trim(), autorEmail: usuario.email, autorNombre: usuario.nombre, creadoEn: serverTimestamp()
    });
    setTexto("");
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000", zIndex: 5000, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "54px 16px 14px", background: "linear-gradient(180deg,#0a0a14 0%,#000000 100%)", borderBottom: "1px solid rgba(124,106,255,0.15)", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <button onClick={onCerrar} style={{ background: "none", border: "none", color: "white", fontSize: 22, cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: avatarColor(otroNombre || ""), overflow: "hidden", border: "1.5px solid rgba(124,106,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "white", flexShrink: 0 }}>
          {otroPerfil?.fotoUrl ? <img src={otroPerfil.fotoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : inicial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "white" }}>{otroNombre}</div>
          {otroPerfil?.especialidad && <div style={{ fontSize: 11, color: "#7c6aff" }}>{otroPerfil.especialidad}</div>}
        </div>
      </div>

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

// ── PILA DE CARTAS ANIMADA ────────────────────────────────────────────────────
function CarteleraLoop({ fichas, usuario, archivadas, onInteresa, onArchivar, marcadasInteresa }) {
  const [idx, setIdx] = useState(0);
  const [animState, setAnimState] = useState(null); // { dir: "left"|"right"|"up"|"down", type: "exit"|"enter" }
  const [swipingDir, setSwipingDir] = useState(null);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const startX = useRef(null);
  const startY = useRef(null);
  const isAnimating = useRef(false);
  const THRESHOLD_H = 80;
  const THRESHOLD_V = 60;

  // Solo salen del loop las archivadas
  const fichasLoop = useMemo(() =>
    fichas.filter(f => !archivadas.has(f.id)),
    [fichas, archivadas]
  );

  useEffect(() => {
    if (idx >= fichasLoop.length && fichasLoop.length > 0) setIdx(0);
  }, [fichasLoop.length]);

  if (fichasLoop.length === 0) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", textAlign: "center", minHeight: "50vh" }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>📌</div>
      <h3 style={{ margin: "0 0 8px", color: "white", fontSize: 18, fontWeight: 800 }}>Cartelera al día</h3>
      <p style={{ margin: 0, color: "#4a5270", fontSize: 13 }}>No hay fichas disponibles.</p>
    </div>
  );

  const currentIdx = idx % fichasLoop.length;
  const nextIdx = (currentIdx + 1) % fichasLoop.length;
  const prevIdx = (currentIdx - 1 + fichasLoop.length) % fichasLoop.length;
  const ficha = fichasLoop[currentIdx];
  const yaInteresado = marcadasInteresa.has(ficha.id) || ficha.interesadosEmails?.includes(usuario.email);

  function triggerAnim(dir, tipo) {
    if (isAnimating.current) return;
    isAnimating.current = true;
    setAnimState({ dir, tipo });
    setOffsetX(0); setOffsetY(0); setSwipingDir(null);

    setTimeout(() => {
      if (tipo === "interesa") {
        onInteresa(ficha);
      } else if (tipo === "archivar") {
        onArchivar(ficha);
      }

      if (dir === "up" || dir === "right-exit") {
        setIdx(i => (i + 1) % fichasLoop.length);
      } else if (dir === "down" || dir === "left-exit") {
        setIdx(i => (i - 1 + fichasLoop.length) % fichasLoop.length);
      }

      setAnimState(null);
      isAnimating.current = false;
    }, 340);
  }

  function onTouchStart(e) {
    if (isAnimating.current || e.touches.length !== 1) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  }

  function onTouchMove(e) {
    if (startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    if (Math.abs(dx) > Math.abs(dy)) {
      setOffsetX(dx); setOffsetY(0);
      setSwipingDir(dx > 20 ? "right" : dx < -20 ? "left" : null);
    } else {
      setOffsetY(dy); setOffsetX(0); setSwipingDir(null);
    }
  }

  function onTouchEnd() {
    if (Math.abs(offsetX) > THRESHOLD_H) {
      if (offsetX > 0) triggerAnim("right-exit", "interesa");
      else triggerAnim("left-exit", "archivar");
    } else if (offsetY > THRESHOLD_V) {
      triggerAnim("down", null);
    } else if (offsetY < -THRESHOLD_V) {
      triggerAnim("up", null);
    } else {
      setOffsetX(0); setOffsetY(0); setSwipingDir(null);
    }
    startX.current = null; startY.current = null;
  }

  // Transformaciones CSS para la animación de salida
  function getCardTransform() {
    if (animState) {
      if (animState.dir === "right-exit") return "translateX(120%) rotate(20deg)";
      if (animState.dir === "left-exit") return "translateX(-120%) rotate(-20deg)";
      if (animState.dir === "up") return "translateY(-80%) scale(0.9)";
      if (animState.dir === "down") return "translateY(80%) scale(0.9)";
    }
    const rotation = offsetX * 0.04;
    return `translate(${offsetX}px, ${offsetY}px) rotate(${rotation}deg)`;
  }

  function getCardOpacity() {
    if (animState) return 0;
    return Math.max(0.4, 1 - Math.abs(offsetX) / 260);
  }

  return (
    <div style={{ padding: "10px 16px 16px" }}>

      {/* Hints swipe */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, padding: "0 4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: swipingDir === "left" ? 1 : 0.3, transition: "opacity 0.2s" }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(239,83,80,0.15)", border: "1.5px solid #ef5350", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 11, color: "#ef5350" }}>✕</span>
          </div>
          <span style={{ fontSize: 9, color: "#ef5350", fontWeight: 600 }}>Archivar</span>
        </div>
        <span style={{ fontSize: 10, color: "#4a5270" }}>{currentIdx + 1} / {fichasLoop.length}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: swipingDir === "right" ? 1 : 0.3, transition: "opacity 0.2s" }}>
          <span style={{ fontSize: 9, color: "#66bb6a", fontWeight: 600 }}>Me interesa</span>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(102,187,106,0.15)", border: "1.5px solid #66bb6a", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 11, color: "#66bb6a" }}>♥</span>
          </div>
        </div>
      </div>

      {/* PILA DE CARTAS */}
      <div style={{ position: "relative", height: 420 }}>

        {/* Carta más atrás (prevIdx) — muy achicada */}
        <div style={{
          position: "absolute", inset: 8,
          borderRadius: 22,
          background: "rgba(14,12,28,0.4)",
          border: "1px solid rgba(124,106,255,0.06)",
          transform: "scale(0.88) translateY(-18px)",
          zIndex: 1,
          transition: "all 0.3s ease"
        }} />

        {/* Carta del medio (nextIdx) — ligeramente achicada */}
        <div style={{
          position: "absolute", inset: 4,
          borderRadius: 22,
          background: "rgba(14,12,28,0.65)",
          border: "1px solid rgba(124,106,255,0.1)",
          transform: animState ? "scale(1) translateY(0)" : "scale(0.94) translateY(-9px)",
          zIndex: 2,
          transition: "all 0.32s cubic-bezier(0.34,1.56,0.64,1)"
        }} />

        {/* Carta activa */}
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{
            position: "absolute", inset: 0,
            zIndex: 3,
            background: "rgba(14,12,28,0.98)",
            borderRadius: 22,
            overflow: "hidden",
            border: `1px solid ${
              swipingDir === "right" ? "rgba(102,187,106,0.6)" :
              swipingDir === "left" ? "rgba(239,83,80,0.6)" :
              yaInteresado ? "rgba(102,187,106,0.3)" :
              "rgba(124,106,255,0.25)"
            }`,
            transform: getCardTransform(),
            opacity: getCardOpacity(),
            transition: animState
              ? "transform 0.34s cubic-bezier(0.4,0,0.2,1), opacity 0.34s ease"
              : "border 0.15s",
            cursor: "grab",
            userSelect: "none",
            touchAction: "none",
            boxShadow: yaInteresado
              ? "0 0 0 1.5px rgba(102,187,106,0.4), 0 12px 40px rgba(0,0,0,0.4)"
              : "0 12px 40px rgba(0,0,0,0.4)"
          }}>

          {/* Barra superior de color */}
          <div style={{ height: 3, background: yaInteresado ? "linear-gradient(90deg,#38a169,#4fc3f7)" : "linear-gradient(90deg,#667eea,#764ba2)" }} />

          {/* Sello overlay durante swipe */}
          {swipingDir === "right" && (
            <div style={{ position: "absolute", top: 18, left: 16, zIndex: 10, background: "rgba(56,161,105,0.92)", borderRadius: 10, padding: "5px 14px", border: "2px solid #66bb6a", transform: "rotate(-12deg)", backdropFilter: "blur(4px)" }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: "white" }}>♥ ME INTERESA</span>
            </div>
          )}
          {swipingDir === "left" && (
            <div style={{ position: "absolute", top: 18, right: 16, zIndex: 10, background: "rgba(239,83,80,0.92)", borderRadius: 10, padding: "5px 14px", border: "2px solid #ef5350", transform: "rotate(12deg)", backdropFilter: "blur(4px)" }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: "white" }}>ARCHIVAR ✕</span>
            </div>
          )}

          {/* Sello permanente si ya le dio "me interesa" */}
          {yaInteresado && !swipingDir && (
            <div style={{ position: "absolute", top: 14, right: 14, zIndex: 8, background: "rgba(56,161,105,0.15)", borderRadius: 20, padding: "3px 10px", border: "1px solid rgba(102,187,106,0.4)" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#66bb6a" }}>♥ Te postulaste</span>
            </div>
          )}

          <div style={{ padding: 18, height: "calc(100% - 3px)", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg,#667eea22,#764ba222)", border: "1px solid rgba(124,106,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19 }}>📌</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "white" }}>{ficha.especialidad}</div>
                  <div style={{ fontSize: 11, color: "#4a5270" }}>por {ficha.derivadoPor}</div>
                </div>
              </div>
              <span style={{ fontSize: 9, color: "#4a5270" }}>{tiempoRelativo(ficha.creadoEn?.seconds)}</span>
            </div>

            {ficha.nota && (
              <p style={{ margin: "0 0 14px", fontSize: 13, color: "#e2e8f0", lineHeight: 1.6, padding: "10px 12px", background: "rgba(124,106,255,0.06)", borderRadius: 10, borderLeft: "2px solid rgba(124,106,255,0.4)", maxHeight: 100, overflowY: "auto" }}>
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

            {/* Botones */}
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={() => triggerAnim("left-exit", "archivar")} style={{ flex: 1, padding: "12px", borderRadius: 14, border: "1px solid rgba(239,83,80,0.3)", background: "rgba(239,83,80,0.08)", color: "#ef5350", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <span>✕</span> Archivar
              </button>
              <button onClick={() => triggerAnim("right-exit", "interesa")} style={{ flex: 2, padding: "12px", borderRadius: 14, border: "none", background: yaInteresado ? "rgba(56,161,105,0.15)" : "linear-gradient(135deg,#38a169,#2d8a5e)", color: yaInteresado ? "#66bb6a" : "white", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <span>♥</span> {yaInteresado ? "Ya te postulaste" : "Me interesa"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hints navegación */}
      <div style={{ textAlign: "center", marginTop: 10, opacity: 0.3 }}>
        <span style={{ fontSize: 9, color: "#a0a8c0" }}>↑↓ navegá · ← archivar · → me interesa</span>
      </div>
    </div>
  );
}

// ── VISTA ARCHIVO ─────────────────────────────────────────────────────────────
function VistaArchivo({ fichas, archivadas, onDesarchivar }) {
  const fichasArchivadas = fichas.filter(f => archivadas.has(f.id));

  if (fichasArchivadas.length === 0) return (
    <div style={{ padding: "32px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 40, marginBottom: 10 }}>📂</div>
      <p style={{ margin: 0, color: "#4a5270", fontSize: 13 }}>El archivo está vacío.</p>
    </div>
  );

  return (
    <div style={{ padding: "12px 14px 20px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#a0a8c0", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
        {fichasArchivadas.length} ficha{fichasArchivadas.length !== 1 ? "s" : ""} archivada{fichasArchivadas.length !== 1 ? "s" : ""}
      </div>
      {fichasArchivadas.map(f => (
        <div key={f.id} style={{ background: "rgba(14,12,28,0.7)", borderRadius: 14, marginBottom: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)", opacity: 0.75 }}>
          <div style={{ height: 2, background: "rgba(255,255,255,0.08)" }} />
          <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 22 }}>📌</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#a0a8c0" }}>{f.especialidad}</div>
              <div style={{ fontSize: 10, color: "#4a5270" }}>por {f.derivadoPor} · {tiempoRelativo(f.creadoEn?.seconds)}</div>
            </div>
            <button onClick={() => onDesarchivar(f.id)} style={{ padding: "6px 12px", borderRadius: 20, border: "1px solid rgba(124,106,255,0.2)", background: "rgba(124,106,255,0.08)", color: "#7c6aff", fontSize: 10, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
              ↩ Recuperar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── MIS PUBLICACIONES ─────────────────────────────────────────────────────────
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
    setMatchModal({ derivacion: d, asignado: { nombre, email, fotoUrl: perfilAsignado?.fotoUrl } });
    setExpandida(null);
  }

  return (
    <div style={{ padding: "12px 14px 20px" }}>
      {matchModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "rgba(14,12,28,0.98)", borderRadius: 24, padding: "32px 24px", width: "100%", maxWidth: 360, textAlign: "center", border: "1px solid rgba(124,106,255,0.3)" }}>
            <div style={{ fontSize: 32, marginBottom: 20 }}>🎉</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <div style={{ width: 60, height: 60, borderRadius: "50%", background: avatarColor(usuario.nombre), overflow: "hidden", border: "3px solid rgba(124,106,255,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "white" }}>
                {usuario.fotoUrl ? <img src={usuario.fotoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : usuario.nombre?.[0]?.toUpperCase()}
              </div>
              <div style={{ display: "flex", alignItems: "center", margin: "0 6px" }}>
                <div style={{ width: 18, borderTop: "1.5px dashed rgba(124,106,255,0.4)" }} />
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#667eea,#764ba2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>✓</div>
                <div style={{ width: 18, borderTop: "1.5px dashed rgba(124,106,255,0.4)" }} />
              </div>
              <div style={{ width: 60, height: 60, borderRadius: "50%", background: avatarColor(matchModal.asignado.nombre), overflow: "hidden", border: "3px solid rgba(124,106,255,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "white" }}>
                {matchModal.asignado.fotoUrl ? <img src={matchModal.asignado.fotoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : matchModal.asignado.nombre?.[0]?.toUpperCase()}
              </div>
            </div>
            <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 800, color: "white" }}>¡Ficha asignada!</h2>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#a0a8c0", lineHeight: 1.5 }}>Vos y <strong style={{ color: "white" }}>{matchModal.asignado.nombre}</strong> están conectados para este caso.</p>
            <div style={{ background: "rgba(124,106,255,0.08)", borderRadius: 12, padding: "10px 14px", marginBottom: 16, border: "1px solid rgba(124,106,255,0.15)", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>🔔</span>
              <span style={{ fontSize: 11, color: "#a0a8c0" }}>Ambos reciben notificación en Inicio.</span>
            </div>
            <button onClick={() => setMatchModal(null)} style={{ width: "100%", padding: 13, borderRadius: 14, border: "none", background: "linear-gradient(135deg,#667eea,#764ba2)", color: "white", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>¡Genial!</button>
          </div>
        </div>
      )}

      {mias.map(d => {
        const conInteresados = d.interesados?.length > 0 && d.estado !== "asignada";
        const asignada = d.estado === "asignada";
        const cerrada = d.estado === "cerrada";
        const isExp = expandida === d.id;

        return (
          <div key={d.id} style={{ background: "rgba(14,12,28,0.9)", borderRadius: 18, marginBottom: 12, overflow: "hidden", border: `1px solid ${asignada ? "rgba(102,187,106,0.3)" : conInteresados ? "rgba(124,106,255,0.35)" : "rgba(124,106,255,0.12)"}` }}>
            <div style={{ height: 3, background: asignada ? "linear-gradient(90deg,#38a169,#2d8a5e)" : conInteresados ? "linear-gradient(90deg,#667eea,#764ba2)" : "rgba(124,106,255,0.15)" }} />
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

              {!d.interesados?.length && !cerrada && (
                <div style={{ padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, marginBottom: 10, border: "1px dashed rgba(255,255,255,0.06)" }}>
                  <p style={{ margin: 0, fontSize: 11, color: "#4a5270", fontStyle: "italic" }}>Aún sin postulantes.</p>
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
                          <div key={email} style={{ width: 30, height: 30, borderRadius: "50%", background: avatarColor(nombre), overflow: "hidden", border: "2px solid rgba(0,0,0,0.5)", marginLeft: i > 0 ? -8 : 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "white" }}>
                            {p?.fotoUrl ? <img src={p.fotoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : nombre[0]?.toUpperCase()}
                          </div>
                        );
                      })}
                    </div>
                    <span style={{ fontSize: 12, color: "#a0a8c0", flex: 1, textAlign: "left" }}>Ver postulantes</span>
                    <span style={{ fontSize: 13, color: "#7c6aff" }}>{isExp ? "▲" : "▼"}</span>
                  </div>
                </button>
              )}

              {isExp && conInteresados && (
                <div style={{ marginBottom: 10 }}>
                  {(d.interesadosEmails || []).map((email, idx) => {
                    const p = perfiles.find(x => x.email === email);
                    const nombre = d.interesados[idx] || email;
                    return (
                      <div key={email} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", background: "rgba(14,12,28,0.8)", borderRadius: 14, marginBottom: 8, border: "1px solid rgba(124,106,255,0.12)" }}>
                        <div style={{ width: 42, height: 42, borderRadius: "50%", background: avatarColor(nombre), overflow: "hidden", border: "2px solid rgba(124,106,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 800, color: "white", flexShrink: 0 }}>
                          {p?.fotoUrl ? <img src={p.fotoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : nombre[0]?.toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: "white" }}>{nombre}</div>
                          {p?.especialidad && <div style={{ fontSize: 11, color: "#7c6aff" }}>{p.especialidad}</div>}
                          {p?.bio && <div style={{ fontSize: 10, color: "#4a5270", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.bio}</div>}
                        </div>
                        <button onClick={() => handleAsignar(d, nombre, email)} style={{ padding: "8px 12px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#38a169,#2d8a5e)", color: "white", fontWeight: 700, fontSize: 11, cursor: "pointer", flexShrink: 0 }}>Designar</button>
                      </div>
                    );
                  })}
                </div>
              )}

              {asignada && (
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <div style={{ flex: 1, padding: "9px 12px", background: "rgba(102,187,106,0.08)", borderRadius: 9, border: "1px solid rgba(102,187,106,0.2)", display: "flex", alignItems: "center", gap: 7 }}>
                    <span>🔗</span>
                    <span style={{ fontSize: 12, color: "#66bb6a", fontWeight: 600 }}>Asignada a {d.asignadoA}</span>
                  </div>
                  <button onClick={() => onAbrirChat(d.id, d.asignadoA, d.asignadoEmail)} style={{ padding: "0 12px", borderRadius: 9, border: "1px solid rgba(124,106,255,0.25)", background: "rgba(124,106,255,0.1)", color: "#a78bfa", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
                    💬
                  </button>
                </div>
              )}

              {!cerrada && !asignada && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => onCerrar(d)} style={{ flex: 1, padding: "8px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.07)", background: "transparent", color: "#4a5270", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>Cerrar</button>
                  {esAdmin && <button onClick={() => onEliminar(d.id)} style={{ flex: 1, padding: "8px", borderRadius: 9, border: "1px solid rgba(239,83,80,0.25)", background: "rgba(239,83,80,0.06)", color: "#ef5350", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>Eliminar</button>}
                </div>
              )}
              {(cerrada || asignada) && esAdmin && (
                <button onClick={() => onEliminar(d.id)} style={{ width: "100%", padding: "8px", borderRadius: 9, border: "1px solid rgba(239,83,80,0.25)", background: "rgba(239,83,80,0.06)", color: "#ef5350", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>🗑 Eliminar</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── CONEXIONES ────────────────────────────────────────────────────────────────
function Conexiones({ derivaciones, usuario, perfiles, chatInicial, onChatInicialUsado, onAbrirChat }) {
  const [filtro, setFiltro] = useState("todas");
  const [perfilVista, setPerfilVista] = useState(null);

  const conexiones = derivaciones.filter(d =>
    d.estado === "asignada" && (d.derivadoPorEmail === usuario.email || d.asignadoEmail === usuario.email)
  );

  useEffect(() => {
    if (!chatInicial) return;
    const c = conexiones.find(d => d.derivadoPorEmail === chatInicial || d.asignadoEmail === chatInicial);
    if (c) {
      const otroEmail = c.derivadoPorEmail === usuario.email ? c.asignadoEmail : c.derivadoPorEmail;
      const otroNombre = c.derivadoPorEmail === usuario.email ? c.asignadoA : c.derivadoPor;
      onAbrirChat(c.id, otroNombre, otroEmail);
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
        <button onClick={() => setPerfilVista(null)} style={{ background: "none", border: "none", color: "#7c6aff", cursor: "pointer", fontSize: 13, fontWeight: 600, marginBottom: 14, display: "flex", alignItems: "center", gap: 6, padding: 0 }}>← Volver</button>
        <div style={{ background: "rgba(14,12,28,0.9)", borderRadius: 20, overflow: "hidden", border: "1px solid rgba(124,106,255,0.2)" }}>
          <div style={{ background: "linear-gradient(180deg,#0a0a18,#0d0d20)", padding: "28px 20px 20px", textAlign: "center" }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: avatarColor(perfilVista.nombre), overflow: "hidden", border: "3px solid rgba(124,106,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 800, color: "white", margin: "0 auto 12px" }}>
              {perfilVista.fotoUrl ? <img src={perfilVista.fotoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : inicial}
            </div>
            <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800, color: "white" }}>{perfilVista.nombre}</h2>
            {perfilVista.especialidad && <div style={{ fontSize: 13, color: "#7c6aff", fontWeight: 600, marginBottom: 8 }}>{perfilVista.especialidad}</div>}
            <span style={{ fontSize: 11, color: "#66bb6a", background: "rgba(102,187,106,0.12)", borderRadius: 20, padding: "3px 12px", border: "1px solid rgba(102,187,106,0.3)" }}>🔗 Conexión activa</span>
          </div>
          <div style={{ padding: "16px 20px" }}>
            {perfilVista.bio && <div style={{ marginBottom: 14 }}><div style={{ fontSize: 10, color: "#4a5270", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Bio</div><p style={{ margin: 0, fontSize: 13, color: "#a0a8c0", lineHeight: 1.6 }}>{perfilVista.bio}</p></div>}
            {perfilVista.telefono && <div style={{ marginBottom: 14 }}><div style={{ fontSize: 10, color: "#4a5270", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Contacto</div><a href={`tel:${perfilVista.telefono}`} style={{ fontSize: 13, color: "#4fc3f7", textDecoration: "none", fontWeight: 600 }}>📞 {perfilVista.telefono}</a></div>}
            <a href={`mailto:${perfilVista.email}`} style={{ display: "block", textAlign: "center", background: "rgba(124,106,255,0.1)", borderRadius: 12, padding: "10px 16px", border: "1px solid rgba(124,106,255,0.2)", textDecoration: "none", color: "#7c6aff", fontSize: 13, fontWeight: 600 }}>✉ Enviar email</a>
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
            <div style={{ padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer" }} onClick={() => derivadorPerfil && setPerfilVista(derivadorPerfil)}>
                  <div style={{ width: 50, height: 50, borderRadius: "50%", background: avatarColor(d.derivadoPor || ""), overflow: "hidden", border: `2px solid ${d.derivadoPorEmail === usuario.email ? "rgba(124,106,255,0.6)" : "rgba(102,187,106,0.3)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, fontWeight: 800, color: "white" }}>
                    {derivadorPerfil?.fotoUrl ? <img src={derivadorPerfil.fotoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : d.derivadoPor?.[0]?.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 9, color: d.derivadoPorEmail === usuario.email ? "#a78bfa" : "#4a5270", fontWeight: 700, maxWidth: 58, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {d.derivadoPorEmail === usuario.email ? "Vos" : d.derivadoPor}
                  </div>
                  <div style={{ fontSize: 7, color: "#3a3a5a", fontWeight: 600, textTransform: "uppercase" }}>deriva</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", margin: "0 10px", paddingBottom: 20 }}>
                  <div style={{ width: 14, height: 1, background: "linear-gradient(90deg,rgba(102,187,106,0),rgba(102,187,106,0.6))" }} />
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#38a169,#2d8a5e)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 8px rgba(102,187,106,0.4)" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                  <div style={{ width: 14, height: 1, background: "linear-gradient(90deg,rgba(102,187,106,0.6),rgba(102,187,106,0))" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer" }} onClick={() => asignadoPerfil && setPerfilVista(asignadoPerfil)}>
                  <div style={{ width: 50, height: 50, borderRadius: "50%", background: avatarColor(d.asignadoA || ""), overflow: "hidden", border: `2px solid ${d.asignadoEmail === usuario.email ? "rgba(124,106,255,0.6)" : "rgba(102,187,106,0.3)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, fontWeight: 800, color: "white" }}>
                    {asignadoPerfil?.fotoUrl ? <img src={asignadoPerfil.fotoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : d.asignadoA?.[0]?.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 9, color: d.asignadoEmail === usuario.email ? "#a78bfa" : "#4a5270", fontWeight: 700, maxWidth: 58, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {d.asignadoEmail === usuario.email ? "Vos" : d.asignadoA}
                  </div>
                  <div style={{ fontSize: 7, color: "#3a3a5a", fontWeight: 600, textTransform: "uppercase" }}>recibe</div>
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
  const [vista, setVista] = useState(vistaInicial || "cartelera");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [chatAbierto, setChatAbierto] = useState(null);
  // Archivadas: Set de ids (fuera del loop)
  const [archivadas, setArchivadas] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(`grins_arch_${usuario?.email}`) || "[]")); } catch { return new Set(); }
  });
  // Marcadas "me interesa" (siguen en el loop pero con sello)
  const [marcadasInteresa, setMarcadasInteresa] = useState(new Set());

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

  function archivarFicha(ficha) {
    const nueva = new Set(archivadas).add(ficha.id);
    setArchivadas(nueva);
    try { localStorage.setItem(`grins_arch_${usuario?.email}`, JSON.stringify([...nueva])); } catch {}
  }

  function desarchivarFicha(id) {
    const nueva = new Set(archivadas);
    nueva.delete(id);
    setArchivadas(nueva);
    try { localStorage.setItem(`grins_arch_${usuario?.email}`, JSON.stringify([...nueva])); } catch {}
  }

  async function meInteresa(ficha) {
    if (ficha.derivadoPorEmail === usuario.email || ficha.interesadosEmails?.includes(usuario.email)) return;
    setMarcadasInteresa(prev => new Set(prev).add(ficha.id));
    await updateDoc(doc(db, "derivaciones", ficha.id), {
      interesados: [...(ficha.interesados || []), usuario.nombre],
      interesadosEmails: [...(ficha.interesadosEmails || []), usuario.email],
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

  const fichasCartelera = derivaciones.filter(d =>
    d.derivadoPorEmail !== usuario.email && d.estado === "disponible"
  );

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
    <div style={{ paddingBottom: vista === "cartelera" ? 160 : 20 }}>

      {/* FORM NUEVA FICHA */}
      {mostrarForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 3000 }}>
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

      {/* VISTAS */}
      {vista === "cartelera" && (
        <CarteleraLoop
          fichas={fichasCartelera}
          usuario={usuario}
          archivadas={archivadas}
          marcadasInteresa={marcadasInteresa}
          onInteresa={meInteresa}
          onArchivar={archivarFicha}
        />
      )}

      {vista === "archivo" && (
        <VistaArchivo fichas={fichasCartelera} archivadas={archivadas} onDesarchivar={desarchivarFicha} />
      )}

      {vista === "misPublicaciones" && (
        <MisPublicaciones derivaciones={derivaciones} usuario={usuario} perfiles={perfiles} esAdmin={esAdmin} onAsignar={asignar} onCerrar={cerrar} onEliminar={eliminar} onAbrirChat={abrirChat} />
      )}

      {vista === "conexiones" && (
        <Conexiones derivaciones={derivaciones} usuario={usuario} perfiles={perfiles} chatInicial={chatInicial} onChatInicialUsado={onChatInicialUsado} onAbrirChat={abrirChat} />
      )}

      {/* FOOTER CARTELERA: [Archivo] — [+] — [Mis publicaciones] */}
      {vista === "cartelera" && (
        <div style={{ position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)", zIndex: 60, display: "flex", alignItems: "center", gap: 0, background: "rgba(10,10,20,0.92)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(124,106,255,0.2)", borderRadius: 32, padding: "6px 6px 6px 6px", boxShadow: "0 8px 30px rgba(0,0,0,0.4)" }}>

          {/* ARCHIVO */}
          <button onClick={() => setVista("archivo")} style={{ background: "transparent", border: "none", color: "#a0a8c0", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "8px 16px", borderRadius: 26, whiteSpace: "nowrap" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a0a8c0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>
            </svg>
            <span style={{ fontSize: 9 }}>Archivo</span>
            {archivadas.size > 0 && <span style={{ position: "absolute", top: 2, right: 10, width: 14, height: 14, borderRadius: "50%", background: "#4a5270", color: "white", fontSize: 8, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{archivadas.size}</span>}
          </button>

          {/* + NUEVA FICHA */}
          <button onClick={() => setMostrarForm(true)} style={{ width: 50, height: 50, borderRadius: "50%", border: "none", background: "linear-gradient(135deg,#667eea,#764ba2)", color: "white", fontSize: 26, fontWeight: 300, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, margin: "0 6px", boxShadow: "0 4px 20px rgba(124,106,255,0.5)" }}>
            +
          </button>

          {/* MIS PUBLICACIONES */}
          <button onClick={() => setVista("misPublicaciones")} style={{ background: "transparent", border: "none", color: "#a0a8c0", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "8px 16px", borderRadius: 26, whiteSpace: "nowrap", position: "relative" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a0a8c0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
            </svg>
            <span style={{ fontSize: 9 }}>Mis fichas</span>
            {(() => {
              const conPost = derivaciones.filter(d => d.derivadoPorEmail === usuario.email && d.interesados?.length > 0 && d.estado !== "asignada").length;
              return conPost > 0 ? <span style={{ position: "absolute", top: 2, right: 10, width: 14, height: 14, borderRadius: "50%", background: "#7c6aff", color: "white", fontSize: 8, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{conPost}</span> : null;
            })()}
          </button>
        </div>
      )}

      {/* BOTÓN VOLVER cuando no estamos en cartelera */}
      {vista !== "cartelera" && vista !== "conexiones" && (
        <div style={{ padding: "12px 14px 0" }}>
          <button onClick={() => setVista("cartelera")} style={{ background: "none", border: "none", color: "#7c6aff", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, padding: 0, marginBottom: 8 }}>
            ← Volver a la cartelera
          </button>
        </div>
      )}
    </div>
  );
}
