if (seleccionado) {
    const dias = diasQueAsiste(seleccionado.email, seleccionado.nombre);
    const actividad = nivelActividad(seleccionado.email, seleccionado.nombre);
    const inicial = seleccionado.nombre?.[0]?.toUpperCase() || "?";
    
    // 1. DEFINIMOS 'esMio' ACÁ PARA QUE NO SE ROMPA LA APP
    const esMio = seleccionado.email === usuario?.email;

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

            {/* 2. EL BOTÓN NUEVO AGREGADO JUSTO ANTES DEL LINK */}
            {!esMio && (
              <button onClick={() => {
                window.dispatchEvent(new CustomEvent("abrirChatConexion", { detail: { email: seleccionado.email } }));
              }} style={{ width: "100%", padding: "10px 16px", borderRadius: 12, border: "1px solid rgba(124,106,255,0.2)", background: "rgba(124,106,255,0.1)", color: "#7c6aff", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 10 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                Enviar mensaje
              </button>
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
