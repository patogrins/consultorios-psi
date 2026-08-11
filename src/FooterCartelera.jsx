// ── FOOTER CARTELERA ──────────────────────────────────────────────────────────
export default function FooterCartelera({ onNueva, onArchivo, onMeInteresa, onMisFichas, esHorizontal=false }) {
  if (esHorizontal) {
    // En horizontal: columna angosta pegada a la derecha, con los mismos botones
    return (
      <div style={{position:"fixed",top:"50%",right:20,transform:"translateY(-50%)",zIndex:60,display:"flex",flexDirection:"column",alignItems:"center",gap:8,width:70}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,width:"100%",background:"rgba(10,10,20,0.92)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",border:"1px solid rgba(124,106,255,0.2)",borderRadius:22,padding:"10px 6px",boxShadow:"0 8px 32px rgba(0,0,0,0.4)"}}>
          <button onClick={onNueva} style={{width:52,height:52,borderRadius:"50%",border:"none",background:"linear-gradient(135deg,#667eea,#764ba2)",color:"white",fontSize:28,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 4px 16px rgba(124,106,255,0.5)"}}>+</button>
          <button onClick={onArchivo} style={{background:"transparent",border:"none",color:"#a0a8c0",fontSize:9,fontWeight:600,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"4px 0",width:"100%"}}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#a0a8c0" strokeWidth="1.8" strokeLinecap="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
            Archivo
          </button>
          <button onClick={onMeInteresa} style={{background:"transparent",border:"none",color:"#a0a8c0",fontSize:9,fontWeight:600,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"4px 0",width:"100%"}}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#a0a8c0" strokeWidth="1.8" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
            Me interesa
          </button>
        </div>
        <button onClick={onMisFichas} style={{width:"100%",background:"rgba(14,12,28,0.85)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",border:"1px solid rgba(124,106,255,0.18)",borderRadius:16,padding:"9px 4px",color:"#a0a8c0",fontSize:9,fontWeight:700,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#a0a8c0" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Mis fichas
        </button>
      </div>
    );
  }
  return (
    <div style={{position:"fixed",bottom:90,left:"50%",transform:"translateX(-50%)",zIndex:60,display:"flex",flexDirection:"column",alignItems:"center",gap:6,width:"calc(100% - 24px)",maxWidth:360}}>
      <div style={{display:"flex",alignItems:"center",width:"100%",gap:6,background:"rgba(10,10,20,0.92)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",border:"1px solid rgba(124,106,255,0.2)",borderRadius:22,padding:"8px 10px",boxShadow:"0 8px 32px rgba(0,0,0,0.4)"}}>
        <button onClick={onArchivo} style={{flex:1,background:"transparent",border:"none",color:"#a0a8c0",fontSize:10,fontWeight:600,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"4px 0"}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a0a8c0" strokeWidth="1.8" strokeLinecap="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
          Archivo
        </button>
        <button onClick={onNueva} style={{width:52,height:52,borderRadius:"50%",border:"none",background:"linear-gradient(135deg,#667eea,#764ba2)",color:"white",fontSize:28,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 4px 16px rgba(124,106,255,0.5)"}}>+</button>
        <button onClick={onMeInteresa} style={{flex:1,background:"transparent",border:"none",color:"#a0a8c0",fontSize:10,fontWeight:600,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"4px 0"}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a0a8c0" strokeWidth="1.8" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
          Me interesa
        </button>
      </div>
      <button onClick={onMisFichas} style={{width:"100%",background:"rgba(14,12,28,0.85)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",border:"1px solid rgba(124,106,255,0.18)",borderRadius:16,padding:"9px",color:"#a0a8c0",fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a0a8c0" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        Mis fichas
      </button>
    </div>
  );
}
