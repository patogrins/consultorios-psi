import { useMemo } from "react";

function dateKey(date) { return date.toISOString().slice(0, 10); }
function formatCurrency(n) { return "$" + n.toLocaleString("es-AR"); }

export default function TabPerfil({ usuario, esAdmin, esPublico, t, reservas, onLogin, onLogout }) {

  const mesStr = new Date().toISOString().slice(0, 7);

  const misReservas = useMemo(() => {
    if (!usuario) return [];
    return reservas.filter(r => r.profesional === usuario.nombre);
  }, [reservas, usuario]);

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

  const montoMes = horasMes * 3500;

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
      <p style={{ margin: "0 0 24px", fontSize: 14, color: t.textoSuave, textAlign: "center" }}>Iniciá sesión para ver tu perfil y estadísticas.</p>
      <button onClick={onLogin} style={{ padding: "10px 24px", borderRadius: 24, border: "none", background: "linear-gradient(135deg,#667eea,#764ba2)", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
        Iniciar sesión →
      </button>
    </div>
  );

  const inicial = usuario.nombre?.[0]?.toUpperCase() || "?";

  return (
    <div className="tab-content" style={{ minHeight: "100vh", background: t.bg }}>

      {/* HEADER */}
      <div style={{ padding: "56px 20px 24px", background: "linear-gradient(180deg,#0d0d1a 0%,#000 100%)" }}>
        <img src="/IMG_0050.jpeg" alt="GRINS" style={{ height: 28, objectFit: "contain", marginBottom: 20, opacity: 0.8 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,#667eea,#764ba2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800, color: "white", flexShrink: 0 }}>
            {inicial}
          </div>
          <div>
            <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: "white" }}>{usuario.nombre}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: t.textoSuave }}>{usuario.email}</span>
              {esAdmin && <span style={{ background: "linear-gradient(135deg,#667eea,#764ba2)", color: "white", borderRadius: 20, padding: "2px 10px", fontSize: 10, fontWeight: 700 }}>👑 Admin</span>}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "20px 16px" }}>

        {/* STATS */}
        {!esAdmin && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
            {[
              { label: "Horas este mes", value: horasMes, suffix: "h" },
              { label: "Facturado", value: formatCurrency(montoMes), suffix: "" },
              { label: "Reservas activas", value: misReservas.length, suffix: "" },
            ].map(({ label, value, suffix }) => (
              <div key={label} style={{ background: t.bgCard, borderRadius: 14, padding: "14px 12px", border: `1px solid ${t.borde}`, textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: t.texto, marginBottom: 4 }}>{value}{suffix}</div>
                <div style={{ fontSize: 10, color: t.textoMuy, lineHeight: 1.3 }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* PRÓXIMA RESERVA */}
        {!esAdmin && proximaReserva && (
          <div style={{ background: t.bgCard, borderRadius: 16, padding: "16px", marginBottom: 16, border: `1px solid ${t.borde}`, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(135deg,#667eea,#764ba2)" }} />
            <div style={{ fontSize: 11, fontWeight: 700, color: t.acento, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Próxima reserva</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: t.texto }}>{proximaReserva.consultorio}</div>
                <div style={{ fontSize: 12, color: t.textoSuave, marginTop: 3 }}>
                  {new Date(proximaReserva.fecha + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
                </div>
                <div style={{ fontSize: 12, color: t.textoSuave }}>{proximaReserva.horaInicio}:00 – {proximaReserva.horaFin}:00</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 900, fontSize: 16, color: t.texto }}>{formatCurrency((proximaReserva.horaFin - proximaReserva.horaInicio) * 3500)}</div>
                {proximaReserva.repeteSemanal && <div style={{ fontSize: 10, color: t.acento, marginTop: 4 }}>🔄 Semanal</div>}
              </div>
            </div>
          </div>
        )}

        {/* INFO CUENTA */}
        <div style={{ background: t.bgCard, borderRadius: 16, overflow: "hidden", marginBottom: 16, border: `1px solid ${t.borde}` }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${t.borde}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: t.textoMuy, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Cuenta</div>
            {[
              { label: "Nombre", value: usuario.nombre },
              { label: "Email", value: usuario.email },
              { label: "Rol", value: esAdmin ? "Administrador" : "Profesional" },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${t.borde}` }}>
                <span style={{ fontSize: 13, color: t.textoSuave }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: t.texto }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* PRÓXIMAMENTE */}
        <div style={{ background: t.bgCard, borderRadius: 16, padding: "16px", marginBottom: 16, border: `1px solid ${t.borde}`, opacity: 0.6 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.textoMuy, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Próximamente</div>
          {["Foto de perfil", "Especialidad y bio", "Redes y contacto", "Cambiar contraseña"].map(item => (
            <div key={item} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${t.borde}` }}>
              <span style={{ fontSize: 13, color: t.textoSuave }}>{item}</span>
              <span style={{ fontSize: 10, color: t.acento, fontWeight: 600 }}>pronto</span>
            </div>
          ))}
        </div>

        {/* CERRAR SESIÓN */}
        <button onClick={onLogout} style={{ width: "100%", padding: 14, borderRadius: 14, border: `1px solid #3d1515`, background: "rgba(239,68,68,0.08)", color: "#ef4444", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Cerrar sesión
        </button>

      </div>
    </div>
  );
}
