import { useState } from "react";
import { loginUser, registerUser } from "./firebase";
import { db } from "./firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

const TERMINOS_TEXT = `TÉRMINOS Y CONDICIONES GENERALES DE USO — GRINS

1. Objeto
Los presentes Términos y Condiciones regulan el acceso y uso de los servicios, herramientas, espacios físicos e infraestructura ofrecidos por Grins, incluyendo —sin limitación— su plataforma digital, aplicación móvil, consultorios, espacios de encuentro y demás servicios asociados.

El acceso, registro o utilización de cualquiera de los servicios de Grins implica la aceptación plena, expresa e irrevocable de los presentes términos.

2. Alcance de la plataforma digital
Grins constituye una plataforma tecnológica destinada exclusivamente a facilitar la vinculación, el contacto, la comunicación y la generación de oportunidades de interacción, colaboración y derivación entre profesionales usuarios de la red, limitando su función al ofrecimiento de herramientas digitales de conexión entre dichos usuarios.

Grins no presta servicios profesionales, sanitarios, clínicos, terapéuticos, diagnósticos ni asistenciales de ninguna naturaleza, ni participa en la evaluación, selección, validación o supervisión del contenido de las interacciones mantenidas entre usuarios, más allá de posibilitar su contacto mediante herramientas tecnológicas.

3. Responsabilidad sobre información y datos sensibles
Toda información, documentación, dato personal, dato sensible y/o contenido relativo a pacientes que sea cargado, compartido, transmitido o divulgado dentro o a través de Grins será de exclusiva responsabilidad del usuario profesional que realice dicha acción.

Cada profesional declara conocer y aceptar las obligaciones legales, éticas y deontológicas inherentes al ejercicio de su profesión, incluyendo el deber de confidencialidad, secreto profesional, resguardo de historias clínicas y cumplimiento de la normativa vigente en materia de protección de datos personales.

Grins no ejerce control previo, auditoría, supervisión, validación ni monitoreo sobre la información intercambiada entre usuarios.

4. Exención de responsabilidad sobre prácticas profesionales
Grins, sus administradores, desarrolladores, representantes y/o titulares no garantizan, avalan, supervisan ni asumen responsabilidad alguna respecto de las prácticas profesionales, criterios clínicos, diagnósticos, tratamientos, intervenciones, derivaciones, recomendaciones o decisiones terapéuticas que pudieran surgir directa o indirectamente de los vínculos, contactos o interacciones entre usuarios.

Toda relación profesional establecida entre usuarios o entre profesionales y terceros será ajena a Grins y de exclusiva responsabilidad de quienes intervengan en ella.

5. Matrículas, habilitaciones y obligaciones legales
Cada usuario profesional declara y garantiza, bajo su exclusiva responsabilidad, mantener vigente y en regla toda matrícula profesional habilitante, certificación, autorización, seguro profesional, habilitación y cualquier otro requisito legal, administrativo o regulatorio exigible para el ejercicio lícito de su actividad.

Asimismo, será exclusiva responsabilidad de cada usuario el cumplimiento de obligaciones impositivas, arancelarias, colegiales, previsionales o de cualquier otra naturaleza vinculadas a su actividad profesional.

6. Uso de consultorios y espacios físicos
Los consultorios, salas e instalaciones ofrecidos por Grins son puestos a disposición exclusivamente en carácter de alquiler, cesión de uso temporal o prestación de infraestructura física para el desarrollo de actividades profesionales, académicas o institucionales.

Grins no participa, supervisa, controla ni interviene en las actividades desarrolladas dentro de dichos espacios, más allá de garantizar, dentro de parámetros razonables, condiciones generales de funcionamiento y disponibilidad de infraestructura.

7. Responsabilidad por actividades en el espacio
Toda actividad desarrollada dentro de los consultorios o espacios de Grins será de exclusiva responsabilidad del profesional o usuario que utilice las instalaciones.

Esto incluye —sin limitación— la atención de pacientes, realización de talleres, grupos, supervisiones, capacitaciones, almacenamiento de documentación, resguardo de datos sensibles y cualquier vínculo generado con terceros.

Grins queda expresamente eximido de responsabilidad por daños, perjuicios, conflictos, reclamos o contingencias derivados de dichas actividades, salvo dolo o culpa grave debidamente acreditada.

8. Disposiciones finales
Grins podrá modificar, actualizar o ampliar los presentes Términos y Condiciones en cualquier momento, entrando dichas modificaciones en vigencia desde su publicación o comunicación a los usuarios.

Cualquier controversia derivada de la interpretación o aplicación de estos términos se regirá por la legislación vigente de la República Argentina.`;

export default function Login({ onLogin, onContinuarSinLogin }) {
  const [tab, setTab] = useState("login"); // "login" | "registro"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Términos
  const [mostrarTerminos, setMostrarTerminos] = useState(false);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [scrollTerminos, setScrollTerminos] = useState(0);
  const [terminosLeidos, setTerminosLeidos] = useState(false);

  function handleScrollTerminos(e) {
    const el = e.target;
    const pct = el.scrollTop / (el.scrollHeight - el.clientHeight);
    setScrollTerminos(pct);
    if (pct > 0.85) setTerminosLeidos(true);
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const user = await loginUser(email, password);
      onLogin(user);
    } catch (err) {
      setError(mensajeError(err.code));
    }
    setLoading(false);
  }

  async function handleRegistro(e) {
    e.preventDefault();
    if (!aceptaTerminos) { setError("Debés aceptar los Términos y Condiciones para continuar."); return; }
    if (!nombre.trim()) { setError("Ingresá tu nombre completo."); return; }
    setError(""); setLoading(true);
    try {
      const user = await registerUser(email, password, nombre.trim());

      // ── Guardar registro de aceptación en Firestore ──────────────────────
      // Colección: aceptaciones_tyc / doc: email del usuario
      await setDoc(doc(db, "aceptaciones_tyc", email.toLowerCase().trim()), {
        email: email.toLowerCase().trim(),
        nombre: nombre.trim(),
        fechaAceptacion: serverTimestamp(),
        // Guardamos también timestamp del cliente por si hay diferencia de zona
        fechaClienteISO: new Date().toISOString(),
        version: "v1.0 — Julio 2025",
        textoAceptado: "Declaro haber leído, comprendido y aceptado expresa y voluntariamente los Términos y Condiciones de Grins, reconociendo las responsabilidades profesionales y legales derivadas del uso de la plataforma y sus servicios.",
        userAgent: navigator.userAgent,
        // IP se puede obtener del lado del servidor si se agrega una Cloud Function,
        // por ahora guardamos lo que está disponible en el cliente
        plataforma: "Web/PWA",
      });

      onLogin(user);
    } catch (err) {
      setError(mensajeError(err.code));
    }
    setLoading(false);
  }

  function mensajeError(code) {
    switch (code) {
      case "auth/email-already-in-use": return "Ese email ya está registrado.";
      case "auth/invalid-email": return "Email inválido.";
      case "auth/weak-password": return "La contraseña debe tener al menos 6 caracteres.";
      case "auth/user-not-found": return "No existe una cuenta con ese email.";
      case "auth/wrong-password": return "Contraseña incorrecta.";
      case "auth/invalid-credential": return "Email o contraseña incorrectos.";
      case "auth/too-many-requests": return "Demasiados intentos. Esperá unos minutos.";
      default: return "Ocurrió un error. Intentá de nuevo.";
    }
  }

  const inp = {
    width: "100%", padding: "12px 14px", borderRadius: 12,
    border: "1px solid rgba(124,106,255,0.2)", fontSize: 14,
    background: "rgba(14,12,28,0.8)", color: "white",
    outline: "none", boxSizing: "border-box", marginBottom: 12,
    fontFamily: "inherit",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px 120px" }}>

      {/* Logo */}
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <img src="/logohead.jpeg" alt="GRINS" style={{ height: 48, objectFit: "contain" }} />
        <p style={{ margin: "10px 0 0", fontSize: 13, color: "#4a5270" }}>Consultorios para profesionales de la salud mental</p>
      </div>

      {/* Card */}
      <div style={{ width: "100%", maxWidth: 400, background: "rgba(14,12,28,0.9)", borderRadius: 24, border: "1px solid rgba(124,106,255,0.2)", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>

        {/* Tabs */}
        <div style={{ display: "flex", background: "rgba(0,0,0,0.4)", padding: 4 }}>
          {[["login", "Iniciar sesión"], ["registro", "Registrarse"]].map(([v, label]) => (
            <button key={v} onClick={() => { setTab(v); setError(""); setAceptaTerminos(false); setTerminosLeidos(false); }}
              style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, background: tab === v ? "linear-gradient(135deg,#667eea,#764ba2)" : "transparent", color: tab === v ? "white" : "#a0a8c0", transition: "all 0.2s" }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ padding: "24px 24px 28px" }}>

          {/* ── LOGIN ── */}
          {tab === "login" && (
            <form onSubmit={handleLogin}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#a0a8c0", marginBottom: 4, textTransform: "uppercase", letterSpacing: .5 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" required style={inp} />
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#a0a8c0", marginBottom: 4, textTransform: "uppercase", letterSpacing: .5 }}>Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={{ ...inp, marginBottom: 20 }} />
              {error && <div style={{ background: "rgba(239,83,80,0.1)", border: "1px solid rgba(239,83,80,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#ef5350", fontWeight: 600 }}>{error}</div>}
              <button type="submit" disabled={loading} style={{ width: "100%", padding: 13, borderRadius: 14, border: "none", background: "linear-gradient(135deg,#667eea,#764ba2)", color: "white", fontWeight: 800, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
                {loading ? "Ingresando..." : "Iniciar sesión"}
              </button>
            </form>
          )}

          {/* ── REGISTRO ── */}
          {tab === "registro" && (
            <form onSubmit={handleRegistro}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#a0a8c0", marginBottom: 4, textTransform: "uppercase", letterSpacing: .5 }}>Nombre completo</label>
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Lic. Nombre Apellido" required style={inp} />
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#a0a8c0", marginBottom: 4, textTransform: "uppercase", letterSpacing: .5 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" required style={inp} />
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#a0a8c0", marginBottom: 4, textTransform: "uppercase", letterSpacing: .5 }}>Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required style={{ ...inp, marginBottom: 20 }} />

              {/* ── BLOQUE TÉRMINOS Y CONDICIONES ── */}
              <div style={{ background: "rgba(124,106,255,0.06)", borderRadius: 14, border: "1px solid rgba(124,106,255,0.15)", marginBottom: 16, overflow: "hidden" }}>

                {/* Encabezado con botón ver */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderBottom: "1px solid rgba(124,106,255,0.1)" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "white" }}>📄 Términos y Condiciones</div>
                    <div style={{ fontSize: 10, color: "#4a5270", marginTop: 2 }}>Grins — Versión vigente</div>
                  </div>
                  <button type="button" onClick={() => setMostrarTerminos(v => !v)}
                    style={{ padding: "5px 12px", borderRadius: 20, border: "1px solid rgba(124,106,255,0.3)", background: mostrarTerminos ? "rgba(124,106,255,0.15)" : "transparent", color: "#7c6aff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                    {mostrarTerminos ? "Cerrar ▲" : "Leer ▼"}
                  </button>
                </div>

                {/* Texto de los T&C — expandible */}
                {mostrarTerminos && (
                  <div onScroll={handleScrollTerminos}
                    style={{ maxHeight: 220, overflowY: "auto", padding: "14px 16px", fontSize: 11, color: "#a0a8c0", lineHeight: 1.7, whiteSpace: "pre-wrap", background: "rgba(0,0,0,0.3)" }}>
                    {TERMINOS_TEXT}
                    <div style={{ marginTop: 16, padding: "10px 12px", background: "rgba(124,106,255,0.08)", borderRadius: 8, border: "1px solid rgba(124,106,255,0.15)", fontSize: 10, color: "#7c6aff", fontStyle: "italic" }}>
                      {terminosLeidos ? "✓ Llegaste al final del documento." : "↓ Desplazate para leer todo el documento."}
                    </div>
                  </div>
                )}

                {/* Checkbox de aceptación */}
                <div style={{ padding: "12px 14px" }}>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={aceptaTerminos}
                      onChange={e => setAceptaTerminos(e.target.checked)}
                      style={{ width: 18, height: 18, marginTop: 2, flexShrink: 0, accentColor: "#7c6aff" }}
                    />
                    <span style={{ fontSize: 11, color: aceptaTerminos ? "#a0a8c0" : "#4a5270", lineHeight: 1.5, transition: "color 0.2s" }}>
                      Declaro haber leído, comprendido y aceptado expresa y voluntariamente los{" "}
                      <button type="button" onClick={() => setMostrarTerminos(true)}
                        style={{ background: "none", border: "none", color: "#7c6aff", cursor: "pointer", fontSize: 11, padding: 0, fontWeight: 700, textDecoration: "underline" }}>
                        Términos y Condiciones de Grins
                      </button>
                      , reconociendo las responsabilidades profesionales y legales derivadas del uso de la plataforma y sus servicios.
                    </span>
                  </label>
                  {aceptaTerminos && (
                    <div style={{ marginTop: 8, fontSize: 10, color: "#38a169", display: "flex", alignItems: "center", gap: 5 }}>
                      <span>✓</span>
                      <span>Aceptación registrada — {new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })} {new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  )}
                </div>
              </div>

              {error && <div style={{ background: "rgba(239,83,80,0.1)", border: "1px solid rgba(239,83,80,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#ef5350", fontWeight: 600 }}>{error}</div>}

              <button type="submit" disabled={loading || !aceptaTerminos}
                style={{ width: "100%", padding: 13, borderRadius: 14, border: "none", background: !aceptaTerminos ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg,#667eea,#764ba2)", color: !aceptaTerminos ? "#4a5270" : "white", fontWeight: 800, fontSize: 14, cursor: !aceptaTerminos || loading ? "not-allowed" : "pointer", transition: "all 0.2s" }}>
                {loading ? "Registrando..." : !aceptaTerminos ? "Aceptá los términos para continuar" : "Crear cuenta →"}
              </button>
            </form>
          )}

        </div>
      </div>

      <p style={{ marginTop: 20, fontSize: 11, color: "#3a3a5a", textAlign: "center" }}>
        grins.com.ar · Consultorios para profesionales
      </p>

      <button
        onClick={() => onContinuarSinLogin ? onContinuarSinLogin() : onLogin(null)}
        style={{ marginTop: 14, background: "none", border: "none", color: "#4a5270", fontSize: 12, cursor: "pointer", textDecoration: "underline", padding: 0 }}>
        Continuar sin iniciar sesión →
      </button>
    </div>
  );
}
