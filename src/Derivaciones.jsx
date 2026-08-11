import { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, runTransaction, arrayUnion, getDocs, writeBatch } from "firebase/firestore";
import { familiaDeSubtipo } from "./derivacionesHelpers";
import ChatFullscreen from "./ChatFullscreen";
import CarteleraLoop from "./CarteleraLoop";
import FormNuevaFicha from "./FormNuevaFicha";
import FooterCartelera from "./FooterCartelera";
import VistaArchivo from "./VistaArchivo";
import VistaMeInteresa from "./VistaMeInteresa";
import MisPublicaciones from "./MisPublicaciones";
import Conexiones from "./Conexiones";

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
export default function Derivaciones({ usuario, esAdmin, vistaInicial = "cartelera", chatInicial, onChatInicialUsado, chatGrupalInicial, onChatGrupalInicialUsado, esHorizontal=false }) {
  const [vista, setVista] = useState(vistaInicial);

  // Sincronizar cuando TabLazos cambia de sección (el componente no se desmonta)
  useEffect(() => {
    setVista(vistaInicial);
  }, [vistaInicial]);
  const [derivaciones, setDerivaciones] = useState([]);
  const [perfiles, setPerfiles] = useState([]);
  const [chatsDirectos, setChatsDirectos] = useState([]);
  const [filtro, setFiltro] = useState("todas");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [archivadas, setArchivadas] = useState([]);
  const [chatActivo, setChatActivo] = useState(null);

  // Llega desde una notificación de "grupo_minimo_alcanzado": abrir el chat
  // grupal de esa ficha directamente. Solo depende de chatGrupalInicial —
  // si dependiera de "derivaciones" (que cambia todo el tiempo por el
  // onSnapshot), este efecto se re-disparía en cada actualización y podía
  // consumir el evento antes de que el chat llegue a abrirse.
  useEffect(() => {
    if (!chatGrupalInicial) return;
    const ficha = derivaciones.find(d => d.id === chatGrupalInicial.derivacionId);
    setChatActivo({
      id: chatGrupalInicial.derivacionId,
      esGrupal: true,
      tituloGrupo: chatGrupalInicial.tituloFicha,
      participantes: ficha?.interesadosEmails || [],
    });
    onChatGrupalInicialUsado?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatGrupalInicial]);

  // Cargar IDs de fichas archivadas localmente
  useEffect(() => {
    if (!usuario?.email) return;
    try {
      const guardadas = localStorage.getItem(`grins_arch_${usuario.email}`);
      if (guardadas) setArchivadas(JSON.parse(guardadas));
    } catch (e) {
      console.error(e);
    }
  }, [usuario]);

  // Escuchar la colección de derivaciones en tiempo real
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "derivaciones"), (snap) => {
      setDerivaciones(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  // Escuchar la colección de usuarios (perfiles) en tiempo real
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "usuarios"), (snap) => {
      setPerfiles(snap.docs.map(d => ({ email: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Escuchar chats directos (originados desde Red o desde Reservas, sin
  // depender de una ficha asignada) para poder listarlos en Conexiones
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "chats_directos"), (snap) => {
      setChatsDirectos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Manejadores de acciones globales de Firebase
  const handlePublicar = async (nuevaFicha) => {
    await addDoc(collection(db, "derivaciones"), {
      ...nuevaFicha,
      derivadoPor: usuario.nombre,
      derivadoPorEmail: usuario.email,
      estado: "activa",
      interesados: [],
      interesadosEmails: [],
      creadoEn: serverTimestamp()
    });
  };

  const handleInteresa = async (ficha) => {
    if (ficha.derivadoPorEmail === usuario.email) return;

    // Usamos una transacción para leer y escribir el documento de forma
    // atómica. Esto evita que dos personas postulándose casi al mismo
    // tiempo se pisen entre sí (una sobrescribiendo el array de la otra)
    // y evita que el cálculo de "recién se alcanzó el mínimo" se haga
    // sobre datos locales desactualizados.
    const ref = doc(db, "derivaciones", ficha.id);
    let nuevosEmailsFinal = null;
    let minAlcanzadoAhora = false;
    let tituloFicha = ficha.titulo || ficha.subtipo || "Grupo";

    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists()) return;
        const data = snap.data();
        const emailsActuales = data.interesadosEmails || [];
        const internosActuales = data.interesados || [];

        if (emailsActuales.includes(usuario.email)) return; // ya estaba postulado

        const nuevosInternos = [...internosActuales, usuario.nombre];
        const nuevosEmails = [...emailsActuales, usuario.email];

        tx.update(ref, {
          interesados: nuevosInternos,
          interesadosEmails: nuevosEmails,
          // El estado no se toca acá: la ficha sigue viva en el loop
          // mientras no se llene el cupo máximo.
        });

        const min = data.minimoInteresados || 0;
        const yaEstabaAlcanzado = min > 0 && emailsActuales.length >= min;
        const ahoraAlcanzado = min > 0 && nuevosEmails.length >= min;

        nuevosEmailsFinal = nuevosEmails;
        tituloFicha = data.titulo || data.subtipo || "Grupo";
        minAlcanzadoAhora = ahoraAlcanzado && !yaEstabaAlcanzado;
      });
    } catch (e) {
      console.error("Error al postularse:", e);
      return;
    }

    // Recién acá, fuera de la transacción, notificamos. Como la transacción
    // garantiza que solo UN cliente puede ser quien "cruza el mínimo",
    // esta notificación se dispara una sola vez y con la lista completa
    // y actualizada de interesados.
    if (minAlcanzadoAhora && nuevosEmailsFinal) {
      const resultados = await Promise.allSettled(nuevosEmailsFinal.map(email =>
        addDoc(collection(db, "notificaciones"), {
          para: email,
          de: usuario.email,
          deNombre: usuario.nombre,
          tipo: "grupo_minimo_alcanzado",
          derivacionId: ficha.id,
          tituloFicha,
          leida: false,
          creadoEn: serverTimestamp(),
        })
      ));
      resultados.forEach((r, i) => {
        if (r.status === "rejected") {
          console.error(`No se pudo notificar a ${nuevosEmailsFinal[i]}:`, r.reason);
        }
      });
    }
  };

  const handleArchivar = (ficha) => {
    if (archivadas.includes(ficha.id)) return;
    const nuevas = [...archivadas, ficha.id];
    setArchivadas(nuevas);
    try {
      localStorage.setItem(`grins_arch_${usuario.email}`, JSON.stringify(nuevas));
    } catch {}
  };

  const handleQuitarInteres = async (id) => {
    const ficha = derivaciones.find(d => d.id === id);
    if (!ficha) return;
    await updateDoc(doc(db, "derivaciones", id), {
      interesados: (ficha.interesados || []).filter(n => n !== usuario.nombre),
      interesadosEmails: (ficha.interesadosEmails || []).filter(e => e !== usuario.email)
    });
  };

  const handleAsignar = async (ficha, nombreAsignado, emailAsignado) => {
    await updateDoc(doc(db, "derivaciones", ficha.id), {
      estado: "asignada",
      asignadoA: nombreAsignado,
      asignadoEmail: emailAsignado
    });
  };

  const handleCerrarFicha = async (ficha) => {
    await updateDoc(doc(db, "derivaciones", ficha.id), { estado: "cerrada" });
  };

  const handleEliminarFicha = async (id) => {
    await deleteDoc(doc(db, "derivaciones", id));
  };

  // Salir/borrar un chat: se oculta solo para quien lo pide. El chat real
  // (mensajes) solo se borra de la base de datos cuando TODOS los
  // participantes hicieron lo mismo. "tipo" distingue si el chat vive en
  // la colección "derivaciones" (grupal o asignación 1:1) o en
  // "chats_directos" (chat directo desde Red o desde una reserva).
  const handleOcultarChat = async (tipo, id, participantesEmails) => {
    const coleccion = tipo === "ficha" ? "derivaciones" : "chats_directos";
    const ref = doc(db, coleccion, id);

    // Agregar mi email a la lista de quienes ya salieron de este chat.
    await updateDoc(ref, { ocultoPara: arrayUnion(usuario.email) });

    // Revisar si con esto ya salieron todos los participantes. Si es así,
    // se borra el chat de verdad: los mensajes y, si corresponde, el
    // documento del chat directo.
    const yaOcultoPara = new Set(participantesEmails.filter(Boolean));
    // Leemos el doc recién actualizado para tener la lista completa y actual.
    const snap = await getDocs(collection(db, coleccion));
    const docActual = snap.docs.find(d => d.id === id);
    const ocultoParaActual = docActual?.data()?.ocultoPara || [];
    const todosSalieron = [...yaOcultoPara].every(email => ocultoParaActual.includes(email));

    if (todosSalieron) {
      try {
        const msgsSnap = await getDocs(collection(db, `chats_derivacion/${id}/mensajes`));
        const batch = writeBatch(db);
        msgsSnap.docs.forEach(m => batch.delete(m.ref));
        if (tipo === "directo") batch.delete(ref);
        await batch.commit();
      } catch (e) {
        console.error("Error al borrar el chat definitivamente:", e);
      }
    }
  };

  // Filtrar las fichas visibles de la cartelera activa
  const fichasVisibles = derivaciones.filter(d => {
    if (d.estado !== "activa") return false;
    if (archivadas.includes(d.id)) return false;
    // Ocultar si el cupo máximo está lleno
    if (d.maxParticipantes && (d.interesadosEmails?.length || 0) >= d.maxParticipantes) return false;
    if (filtro !== "todas" && familiaDeSubtipo(d.subtipo).id !== filtro) return false;
    return true;
  });

  return (
    <div style={{ minHeight: "100vh", background: "#05050a", color: "white", paddingBottom: 120 }}>
      {/* Selector de Pestañas Superiores (Cartelera / Conexiones) */}
      {vista === "cartelera" && (
        <CarteleraLoop
          fichas={fichasVisibles}
          filtro={filtro}
          setFiltro={setFiltro}
          usuario={usuario}
          onInteresa={handleInteresa}
          onArchivar={handleArchivar}
        />
      )}

      {vista === "archivo" && (
        <VistaArchivo
          archivadas={archivadas}
          setArchivadas={setArchivadas}
          derivaciones={derivaciones}
          usuario={usuario}
          esAdmin={esAdmin}
          onVolver={() => setVista("cartelera")}
          onEliminarDefinitivo={handleEliminarFicha}
        />
      )}

      {vista === "me_interesa" && (
        <VistaMeInteresa
          archivadas={archivadas}
          derivaciones={derivaciones}
          usuario={usuario}
          onVolver={() => setVista("cartelera")}
          onQuitarInteres={handleQuitarInteres}
          onAbrirChatGrupal={(d) => setChatActivo({ id: d.id, esGrupal: true, tituloGrupo: d.titulo || d.subtipo, participantes: d.interesadosEmails })}
        />
      )}

      {vista === "mis_fichas" && (
        <MisPublicaciones
          derivaciones={derivaciones}
          usuario={usuario}
          perfiles={perfiles}
          esAdmin={esAdmin}
          onAsignar={handleAsignar}
          onCerrar={handleCerrarFicha}
          onEliminar={handleEliminarFicha}
          onAbrirChat={(id, nombre, email) => setChatActivo({ id, nombre, email, esGrupal: false })}
          onAbrirChatGrupal={(d) => setChatActivo({ id: d.id, esGrupal: true, tituloGrupo: d.titulo || d.subtipo, participantes: d.interesadosEmails })}
          onVolver={() => setVista("cartelera")}
        />
      )}

      {vista === "conexiones" && (
        <Conexiones
          derivaciones={derivaciones}
          usuario={usuario}
          perfiles={perfiles}
          chatsDirectos={chatsDirectos}
          chatInicial={chatInicial}
          onChatInicialUsado={onChatInicialUsado}
          onAbrirChat={(id, nombre, email) => setChatActivo({ id, nombre, email, esGrupal: false })}
          onAbrirChatGrupal={(d) => setChatActivo({ id: d.id, esGrupal: true, tituloGrupo: d.titulo || d.subtipo, participantes: d.interesadosEmails })}
          onOcultarChat={handleOcultarChat}
        />
      )}

      {/* Footer solo en vistas sin su propio botón volver */}
      {["cartelera"].includes(vista) && (
        <FooterCartelera
          onNueva={() => setMostrarForm(true)}
          onArchivo={() => setVista("archivo")}
          onMeInteresa={() => setVista("me_interesa")}
          onMisFichas={() => setVista("mis_fichas")}
          esHorizontal={esHorizontal}
        />
      )}

      {/* Modal para Crear Nueva Ficha */}
      {mostrarForm && (
        <FormNuevaFicha
          usuario={usuario}
          onPublicar={handlePublicar}
          onCerrar={() => setMostrarForm(false)}
        />
      )}

      {/* Pantalla Completa de Mensajería Interactiva */}
      {chatActivo && (
        <ChatFullscreen
          derivacionId={chatActivo.id}
          usuario={usuario}
          otroNombre={chatActivo.nombre}
          otroEmail={chatActivo.email}
          otroPerfil={perfiles?.find(p => p.email === chatActivo.email)}
          esGrupal={chatActivo.esGrupal}
          tituloGrupo={chatActivo.tituloGrupo}
          participantes={chatActivo.participantes}
          onCerrar={() => setChatActivo(null)}
        />
      )}
    </div>
  );
}
