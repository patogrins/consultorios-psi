import { useState } from "react";
import { FAMILIAS, MODALIDADES, DIAS, FRANJAS, ESPECIALIDADES } from "./derivacionesHelpers";

// ── FORM NUEVA FICHA ──────────────────────────────────────────────────────────
export default function FormNuevaFicha({ usuario, onPublicar, onCerrar }) {
  const [step, setStep] = useState("familia");
  const [familiaId, setFamiliaId] = useState(null);
  const [subtipo, setSubtipo] = useState(null);
  const [form, setForm] = useState({titulo:"",especialidad:"",otraEspecialidad:"",modalidad:"Ambas",dias:[],franjas:[],genero:"Indistinto",edad:"Indistinto",nota:"",minimoInteresados:"",maxParticipantes:""});
  const familia = FAMILIAS.find(f=>f.id===familiaId);
  function toggleArr(arr,val){ return arr.includes(val)?arr.filter(x=>x!==val):[...arr,val]; }
  const chip=(label,active,onClick,color)=>(
    <button key={label} onClick={onClick} style={{padding:"6px 14px",borderRadius:20,border:`1px solid ${active?(color||"#7c6aff"):"rgba(124,106,255,0.2)"}`,background:active?`${color||"#667eea"}22`:"transparent",color:active?(color||"#a78bfa"):"#a0a8c0",fontSize:11,fontWeight:600,cursor:"pointer",transition:"all 0.15s"}}>{label}</button>
  );
  const inp={width:"100%",padding:"10px 12px",borderRadius:10,border:"1px solid rgba(124,106,255,0.2)",fontSize:13,marginBottom:10,boxSizing:"border-box",outline:"none",background:"rgba(14,12,28,0.8)",color:"white",fontFamily:"inherit"};
  const lbl={display:"block",fontSize:10,fontWeight:700,color:"#a0a8c0",marginBottom:6,textTransform:"uppercase",letterSpacing:.5};
  async function publicar() {
    const esp=form.especialidad==="Otro"?form.otraEspecialidad||"Otro":form.especialidad;
    await onPublicar({familia:familiaId,subtipo,titulo:form.titulo.trim()||subtipo,especialidad:esp,modalidad:form.modalidad,dias:form.dias,franjas:form.franjas,genero:form.genero,edad:form.edad,nota:form.nota.trim(),minimoInteresados:familiaId!=="casos"?(parseInt(form.minimoInteresados)||null):null,maxParticipantes:familiaId!=="casos"?(parseInt(form.maxParticipantes)||null):null});
    onCerrar();
  }
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:3000}}>
      <div style={{background:"#0a0a14",borderRadius:"24px 24px 0 0",padding:"20px 20px 40px",width:"100%",maxWidth:520,border:"1px solid rgba(124,106,255,0.2)",maxHeight:"88vh",overflowY:"auto"}}>
        <div style={{width:36,height:4,borderRadius:2,background:"rgba(255,255,255,0.1)",margin:"0 auto 16px"}}/>
        {step==="familia"&&(
          <>
            <h3 style={{margin:"0 0 6px",fontSize:16,fontWeight:800,color:"white"}}>Nueva ficha</h3>
            <p style={{margin:"0 0 20px",fontSize:12,color:"#4a5270"}}>¿De qué tipo es?</p>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {FAMILIAS.map(f=>(
                <button key={f.id} onClick={()=>{setFamiliaId(f.id);setStep("subtipo");}} style={{width:"100%",padding:"18px 20px",borderRadius:18,border:`1px solid ${f.color}44`,background:`${f.color}11`,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:14}}>
                  <div style={{width:48,height:48,borderRadius:14,background:f.grad,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{f.emoji}</div>
                  <div><div style={{fontSize:16,fontWeight:800,color:"white"}}>{f.label}</div><div style={{fontSize:11,color:"#a0a8c0",marginTop:3}}>{f.tipos.join(" · ")}</div></div>
                </button>
              ))}
            </div>
            <button onClick={onCerrar} style={{width:"100%",marginTop:14,padding:"10px",borderRadius:12,border:"1px solid rgba(124,106,255,0.15)",background:"transparent",color:"#4a5270",fontWeight:600,fontSize:13,cursor:"pointer"}}>Cancelar</button>
          </>
        )}
        {step==="subtipo"&&familia&&(
          <>
            <button onClick={()=>setStep("familia")} style={{background:"none",border:"none",color:"#7c6aff",cursor:"pointer",fontSize:13,fontWeight:600,marginBottom:14,padding:0,display:"flex",alignItems:"center",gap:6}}>← {familia.label}</button>
            <h3 style={{margin:"0 0 20px",fontSize:16,fontWeight:800,color:"white"}}>¿Qué tipo de {familia.label.toLowerCase()}?</h3>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {familia.tipos.map(t=>(
                <button key={t} onClick={()=>{setSubtipo(t);setStep("detalle");}} style={{width:"100%",padding:"14px 18px",borderRadius:14,border:`1px solid ${familia.color}33`,background:`${familia.color}0e`,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:36,height:36,borderRadius:10,background:familia.grad,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{familia.emoji}</div>
                  <span style={{fontSize:15,fontWeight:700,color:"white"}}>{t}</span>
                </button>
              ))}
            </div>
            <button onClick={onCerrar} style={{width:"100%",marginTop:14,padding:"10px",borderRadius:12,border:"1px solid rgba(124,106,255,0.15)",background:"transparent",color:"#4a5270",fontWeight:600,fontSize:13,cursor:"pointer"}}>Cancelar</button>
          </>
        )}
        {step==="detalle"&&familia&&subtipo&&(
          <>
            <button onClick={()=>setStep("subtipo")} style={{background:"none",border:"none",color:"#7c6aff",cursor:"pointer",fontSize:13,fontWeight:600,marginBottom:14,padding:0,display:"flex",alignItems:"center",gap:6}}>← {subtipo}</button>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
              <div style={{width:36,height:36,borderRadius:10,background:familia.grad,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{familia.emoji}</div>
              <div><div style={{fontSize:15,fontWeight:800,color:"white"}}>{subtipo}</div><div style={{fontSize:10,color:familia.color,fontWeight:600}}>{familia.label}</div></div>
            </div>
            <label style={lbl}>Título (opcional)</label>
            <input value={form.titulo} onChange={e=>setForm(f=>({...f,titulo:e.target.value}))} placeholder={`Ej: ${subtipo}...`} style={inp}/>
            {familiaId==="casos"&&(
              <>
                <label style={lbl}>Especialidad buscada</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>{ESPECIALIDADES.map(e=>chip(e,form.especialidad===e,()=>setForm(f=>({...f,especialidad:e})),familia.color))}</div>
                {form.especialidad==="Otro"&&<input value={form.otraEspecialidad} onChange={e=>setForm(f=>({...f,otraEspecialidad:e.target.value}))} placeholder="Especificá" style={inp}/>}
                <label style={lbl}>Modalidad</label>
                <div style={{display:"flex",gap:6,marginBottom:10}}>{MODALIDADES.map(m=>chip(m,form.modalidad===m,()=>setForm(f=>({...f,modalidad:m})),familia.color))}</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:10}}>
                  <div><label style={lbl}>Género</label><div style={{display:"flex",flexDirection:"column",gap:5}}>{["Indistinto","Femenino","Masculino"].map(g=>chip(g,form.genero===g,()=>setForm(f=>({...f,genero:g})),familia.color))}</div></div>
                  <div><label style={lbl}>Franja etaria</label><div style={{display:"flex",flexDirection:"column",gap:5}}>{["Indistinto","Joven","Adulto"].map(e=>chip(e,form.edad===e,()=>setForm(f=>({...f,edad:e})),familia.color))}</div></div>
                </div>
              </>
            )}
            {familiaId!=="casos"&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:10}}>
                <div>
                  <label style={lbl}>Mínimo para realizarse</label>
                  <input type="number" min="1" max="100" value={form.minimoInteresados} onChange={e=>setForm(f=>({...f,minimoInteresados:e.target.value}))} placeholder="Ej: 3" style={inp}/>
                </div>
                <div>
                  <label style={lbl}>Cupo máximo</label>
                  <input type="number" min="1" max="500" value={form.maxParticipantes} onChange={e=>setForm(f=>({...f,maxParticipantes:e.target.value}))} placeholder="Ej: 10" style={inp}/>
                </div>
              </div>
            )}
            <label style={lbl}>Días disponibles</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>{DIAS.map(d=>chip(d,form.dias.includes(d),()=>setForm(f=>({...f,dias:toggleArr(f.dias,d)})),familia.color))}</div>
            <label style={lbl}>Franjas horarias</label>
            <div style={{display:"flex",gap:6,marginBottom:10}}>{FRANJAS.map(fr=>chip(fr,form.franjas.includes(fr),()=>setForm(f=>({...f,franjas:toggleArr(f.franjas,fr)})),familia.color))}</div>
            <label style={lbl}>Descripción / nota</label>
            <textarea value={form.nota} onChange={e=>setForm(f=>({...f,nota:e.target.value}))} placeholder="Describí brevemente..." rows={3} style={{...inp,resize:"vertical"}}/>
            <div style={{display:"flex",gap:10,marginTop:6}}>
              <button onClick={onCerrar} style={{flex:1,padding:13,borderRadius:12,border:"1px solid rgba(124,106,255,0.2)",background:"transparent",color:"#a0a8c0",fontWeight:600,fontSize:13,cursor:"pointer"}}>Cancelar</button>
              <button onClick={publicar} style={{flex:2,padding:13,borderRadius:12,border:"none",background:familia.grad,color:"white",fontWeight:800,fontSize:13,cursor:"pointer"}}>Publicar ficha</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
