import { useState } from "react";
import { loginUser } from "./firebase";

export default function Login({ modoOscuro, onVolver }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const t = modoOscuro
    ? { bg: "#0f1117", card: "#1e2130", texto: "#e2e8f0", suave: "#a0aec0", borde: "#2d3748", input: "#2d3748" }
    : { bg: "#f0f4f8", card: "white", texto: "#1a202c", suave: "#718096", borde: "#e2e8f0", input: "white" };

  async function handleLogin() {
    if (!email.trim() || !password.trim()) { setError("Completá email y contraseña"); return; }
    setCargando(true); setError("");
    try { await loginUser(email.trim(), password.trim()); }
    catch (e) { setError("Email o contraseña incorrectos"); setCargando(false); }
  }

  return (
    <div style={{ minHeight: "100vh", background: t.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#1a1a1a", padding: "24px 32px", borderRadius: 16, marginBottom: 32, textAlign: "center" }}>
        <img src="/IMG_0050.jpeg" alt="GRINS" style={{ height: 70, objectFit: "contain" }} />
      </div>
      <div style={{ background: t.card, borderRadius: 18, padding: 28, width: "100%", maxWidth: 360, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
        <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 800, color: t.texto, textAlign: "center" }}>Iniciar sesión</h2>
        <p style={{ margin: "0 0 24px", fontSize: 12, color: t.suave, textAlign: "center" }}>Ingresá con tu cuenta de GRINS</p>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: t.suave, marginBottom: 4, textTransform: "uppercase", letterSpacing: .5 }}>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com"
          style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${t.borde}`, fontSize: 13, marginBottom: 14, boxSizing: "border-box", background: t.input, color: t.texto, outline: "none" }} />
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: t.suave, marginBottom: 4, textTransform: "uppercase", letterSpacing: .5 }}>Contraseña</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} placeholder="••••••••"
          style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${t.borde}`, fontSize: 13, marginBottom: 20, boxSizing: "border-box", background: t.input, color: t.texto, outline: "none" }} />
        {error && <div style={{ background: "#fff5f5", border: "1px solid #fc8181", borderRadius: 8, padding: "8px 12px", marginBottom: 16, fontSize: 12, color: "#c53030", textAlign: "center" }}>{error}</div>}
        <button onClick={handleLogin} disabled={cargando}
          style={{ width: "100%", padding: 12, borderRadius: 10, border: "none", background: cargando ? "#4a5568" : "linear-gradient(135deg,#667eea,#764ba2)", color: "white", fontWeight: 800, fontSize: 14, cursor: cargando ? "not-allowed" : "pointer", marginBottom: 12 }}>
          {cargando ? "Ingresando..." : "Ingresar"}
        </button>
        {onVolver && (
          <button onClick={onVolver} style={{ width: "100%", padding: 10, borderRadius: 10, border: `1px solid ${t.borde}`, background: "transparent", color: t.suave, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            ← Volver sin iniciar sesión
          </button>
        )}
      </div>
    </div>
  );
}
