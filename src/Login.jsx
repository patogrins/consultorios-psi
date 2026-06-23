import { useState } from "react";
import { loginUser, registerUser } from "./firebase";

export default function Login({ onVolver }) {
  const [modo, setModo] = useState("login"); // login | registro
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) { setError("Completá email y contraseña"); return; }
    setCargando(true); setError("");
    try { await loginUser(email.trim(), password.trim()); }
    catch (e) {
      setError("Email o contraseña incorrectos");
      setCargando(false);
    }
  }

  async function handleRegistro() {
    if (!nombre.trim()) { setError("Ingresá tu nombre"); return; }
    if (!email.trim()) { setError("Ingresá tu email"); return; }
    if (password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres"); return; }
    if (password !== confirmar) { setError("Las contraseñas no coinciden"); return; }
    setCargando(true); setError("");
    try { await registerUser(email.trim(), password.trim(), nombre.trim()); }
    catch (e) {
      if (e.code === "auth/email-already-in-use") setError("Ese email ya está registrado");
      else if (e.code === "auth/invalid-email") setError("Email inválido");
      else setError("Error al registrarse. Intentá de nuevo.");
      setCargando(false);
    }
  }

  const inputStyle = {
    width: "100%", padding: "12px 14px", borderRadius: 12,
    border: "1px solid #1e2235", fontSize: 14,
    marginBottom: 12, boxSizing: "border-box",
    background: "#111318", color: "#f0f0f0", outline: "none",
    fontFamily: "inherit"
  };

  return (
    <div style={{ minHeight: "100vh", background: "#000000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>

      {/* LOGO */}
      <div style={{ background: "#000", padding: "20px 32px", borderRadius: 20, marginBottom: 28, border: "1px solid #1e2235" }}>
        <img src="/IMG_0050.jpeg" alt="GRINS" style={{ height: 60, objectFit: "contain" }} />
      </div>

      {/* CARD */}
      <div style={{ background: "#111318", borderRadius: 24, padding: 28, width: "100%", maxWidth: 380, boxShadow: "0 24px 60px rgba(0,0,0,0.5)", border: "1px solid #1e2235" }}>

        {/* TABS LOGIN / REGISTRO */}
        <div style={{ display: "flex", background: "#0a0a0a", borderRadius: 12, padding: 4, marginBottom: 24, border: "1px solid #1e2235" }}>
          {[["login", "Iniciar sesión"], ["registro", "Registrarse"]].map(([m, label]) => (
            <button key={m} onClick={() => { setModo(m); setError(""); }} style={{
              flex: 1, padding: "8px", borderRadius: 8, border: "none",
              background: modo === m ? "linear-gradient(135deg,#667eea,#764ba2)" : "transparent",
              color: modo === m ? "white" : "#4a5270",
              fontWeight: modo === m ? 700 : 500, fontSize: 13, cursor: "pointer",
              transition: "all 0.2s"
            }}>{label}</button>
          ))}
        </div>

        {modo === "registro" && (
          <>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#a0a8c0", marginBottom: 4, textTransform: "uppercase", letterSpacing: .5 }}>Nombre completo</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder="Tu nombre y apellido" style={inputStyle} />
          </>
        )}

        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#a0a8c0", marginBottom: 4, textTransform: "uppercase", letterSpacing: .5 }}>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="tu@email.com" style={inputStyle} />

        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#a0a8c0", marginBottom: 4, textTransform: "uppercase", letterSpacing: .5 }}>Contraseña</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && modo === "login" && handleLogin()}
          placeholder="••••••••" style={inputStyle} />

        {modo === "registro" && (
          <>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#a0a8c0", marginBottom: 4, textTransform: "uppercase", letterSpacing: .5 }}>Confirmar contraseña</label>
            <input type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleRegistro()}
              placeholder="••••••••" style={{ ...inputStyle, marginBottom: 20 }} />
          </>
        )}

        {error && (
          <div style={{ background: "#2d1010", border: "1px solid #ef444444", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#fc8181", fontWeight: 600 }}>
            {error}
          </div>
        )}

        <button
          onClick={modo === "login" ? handleLogin : handleRegistro}
          disabled={cargando}
          style={{ width: "100%", padding: 14, borderRadius: 14, border: "none", background: cargando ? "#2d2d3a" : "linear-gradient(135deg,#667eea,#764ba2)", color: "white", fontWeight: 800, fontSize: 14, cursor: cargando ? "not-allowed" : "pointer", marginBottom: 16, transition: "all 0.2s" }}>
          {cargando ? "Procesando..." : modo === "login" ? "Ingresar →" : "Crear cuenta →"}
        </button>

        {onVolver && (
          <button onClick={onVolver} style={{ width: "100%", padding: 11, borderRadius: 12, border: "1px solid #1e2235", background: "transparent", color: "#4a5270", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            ← Volver sin iniciar sesión
          </button>
        )}
      </div>

      {modo === "registro" && (
        <p style={{ marginTop: 16, fontSize: 11, color: "#4a5270", textAlign: "center", maxWidth: 300, lineHeight: 1.5 }}>
          Al registrarte aceptás formar parte de la red de profesionales GRINS.
        </p>
      )}
    </div>
  );
}
