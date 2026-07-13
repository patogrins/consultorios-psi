import React, { useState } from 'react';

const questions = [
  {
    q: "¿Cuál es el hito histórico que marca el paso de la psicología de la filosofía a una ciencia independiente?[cite: 1]",
    options: [
      { text: "La publicación de los estudios sobre la histeria de Freud en 1895.[cite: 1]", isCorrect: false, rationale: "Ese es el inicio del psicoanálisis, no de la psicología experimental.[cite: 1]" },
      { text: "La fundación del primer laboratorio de psicología experimental por Wundt en 1879.[cite: 1]", isCorrect: true, rationale: "Wilhelm Wundt en Alemania adoptó la observación científica, separándola de la filosofía.[cite: 1]" },
      { text: "El manifiesto conductista de John B. Watson en 1913.[cite: 1]", isCorrect: false, rationale: "Esto marca el inicio del conductismo, pero la psicología ya era ciencia desde Wundt.[cite: 1]" },
      { text: "Las reflexiones de Aristóteles sobre los sentidos y la observación.[cite: 1]", isCorrect: false, rationale: "Aristóteles pertenece a la etapa pre-científica (filosófica) de la psicología.[cite: 1]" }
    ]
  },
  {
    q: "Si un DT felicita públicamente a un jugador por realizar un repliegue defensivo correcto, ¿qué concepto del conductismo está aplicando?[cite: 1]",
    options: [
      { text: "Condicionamiento Clásico de Pavlov.[cite: 1]", isCorrect: false, rationale: "Pavlov se enfoca en asociaciones de estímulos reflejos, no en consecuencias de actos voluntarios.[cite: 1]" },
      { text: "Filtro Atenuador de Treisman.[cite: 1]", isCorrect: false, rationale: "Este es un concepto de la psicología cognitiva sobre la atención.[cite: 1]" },
      { text: "Refuerzo Positivo de Skinner.[cite: 1]", isCorrect: true, rationale: "B.F. Skinner propuso que las consecuencias positivas aumentan la probabilidad de repetir una conducta.[cite: 1]" },
      { text: "Amnesia Anterógrada.[cite: 1]", isCorrect: false, rationale: "Esto es una patología de la memoria donde no se pueden formar nuevos recuerdos.[cite: 1]" }
    ]
  },
  {
    q: "Un ala está conduciendo la pelota mientras mira de reojo el movimiento de su pivot. ¿Qué característica de la atención está utilizando?[cite: 1]",
    options: [
      { text: "Atención Exógena.[cite: 1]", isCorrect: false, rationale: "La exógena es involuntaria, captada por ruidos o estímulos externos imprevistos.[cite: 1]" },
      { text: "Atención Divisible y Alternante.[cite: 1]", isCorrect: true, rationale: "En futsal, el jugador debe repartir su atención entre tareas o saltar de un foco a otro velozmente.[cite: 1]" },
      { text: "Filtro Temprano de Broadbent.[cite: 1]", isCorrect: false, rationale: "Broadbent sugiere bloquear lo irrelevante, no dividir la atención entre dos estímulos necesarios.[cite: 1]" },
      { text: "Memoria Sensorial Pre-atencional.[cite: 1]", isCorrect: false, rationale: "Esta es una fase previa a la atención que retiene datos por milisegundos.[cite: 1]" }
    ]
  },
  {
    q: "Según el caso del paciente H.M., ¿qué sistema de memoria permite que un jugador aprenda un gesto técnico (como pisar la pelota) mediante la repetición constante?[cite: 1]",
    options: [
      { text: "Memoria Explícita Semántica.[cite: 1]", isCorrect: false, rationale: "La semántica guarda conceptos y reglas, no habilidades motoras.[cite: 1]" },
      { text: "Memoria Episódica.[cite: 1]", isCorrect: false, rationale: "La episódica guarda vivencias y recuerdos personales.[cite: 1]" },
      { text: "Memoria Implícita Procedimental.[cite: 1]", isCorrect: true, rationale: "Es automática, motora y no depende del hipocampo; se consolida con la práctica física.[cite: 1]" },
      { text: "Memoria de Trabajo.[cite: 1]", isCorrect: false, rationale: "Esta memoria es de muy corta duración para decisiones inmediatas.[cite: 1]" }
    ]
  },
  {
    q: "En el Psicoanálisis, ¿cuál es la instancia psíquica que actúa como mediador entre los impulsos primitivos y las normas morales?[cite: 1]",
    options: [
      { text: "El Ello.[cite: 1]", isCorrect: false, rationale: "El Ello es solo la reserva de pulsiones primitivas.[cite: 1]" },
      { text: "El Superyó.[cite: 1]", isCorrect: false, rationale: "El Superyó representa la ley, el deber ser y la culpa.[cite: 1]" },
      { text: "El Inconsciente.[cite: 1]", isCorrect: false, rationale: "Es el sistema donde se aloja lo reprimido, no una instancia mediadora.[cite: 1]" },
      { text: "El Yo.[cite: 1]", isCorrect: true, rationale: "El Yo debe equilibrar las demandas del Ello, el Superyó y la realidad exterior.[cite: 1]" }
    ]
  },
  {
    q: "Un jugador acepta una decisión táctica grupal que cree incorrecta solo por miedo a la desaprobación de sus compañeros. ¿Qué fenómeno estudió Solomon Asch aquí?[cite: 1]",
    options: [
      { text: "La obediencia a la autoridad.[cite: 1]", isCorrect: false, rationale: "Ese fue el estudio de Milgram sobre órdenes directas.[cite: 1]" },
      { text: "La conformidad y presión de grupo.[cite: 1]", isCorrect: true, rationale: "Asch demostró que los sujetos pueden negar su percepción para encajar en la masa.[cite: 1]" },
      { text: "El estado agéntico.[cite: 1]", isCorrect: false, rationale: "Es el estado donde uno se siente instrumento de un líder, no de sus pares.[cite: 1]" },
      { text: "El autoboicot por Thanatos.[cite: 1]", isCorrect: false, rationale: "Este es un concepto psicoanalítico de pulsión destructiva.[cite: 1]" }
    ]
  },
  {
    q: "Según el experimento de Milgram, ¿por qué un jugador podría ejecutar una conducta violenta si el DT se lo ordena?[cite: 1]",
    options: [
      { text: "Debido al fenómeno de Vicary.[cite: 1]", isCorrect: false, rationale: "Vicary se refería a publicidad subliminal (fraude).[cite: 1]" },
      { text: "Por entrar en un 'estado agéntico'.[cite: 1]", isCorrect: true, rationale: "El sujeto deja de sentirse responsable moralmente y se ve como un instrumento del DT.[cite: 1]" },
      { text: "Por la mutua representación interna.[cite: 1]", isCorrect: false, rationale: "Este es un concepto de cohesión grupal, no de obediencia ciega.[cite: 1]" },
      { text: "Por el Filtro Atenuador.[cite: 1]", isCorrect: false, rationale: "Nuevamente, este es un concepto de atención cognitiva.[cite: 1]" }
    ]
  },
  {
    q: "¿Qué elemento de la definición de Pichon Rivière se refiere a que un ala sabe a qué velocidad pica su pivot sin tener que mirarlo?[cite: 1]",
    options: [
      { text: "Constantes de tiempo y espacio.[cite: 1]", isCorrect: false, rationale: "Esto se refiere a la regularidad de los entrenamientos.[cite: 1]" },
      { text: "Tarea implícita.[cite: 1]", isCorrect: false, rationale: "Es la resolución de ansiedades grupales.[cite: 1]" },
      { text: "Mutua representación interna.[cite: 1]", isCorrect: true, rationale: "Es el reconocimiento y anticipación mutua grabada en la mente de los integrantes.[cite: 1]" },
      { text: "Asunción de roles.[cite: 1]", isCorrect: false, rationale: "Es la toma de una función específica en el grupo.[cite: 1]" }
    ]
  },
  {
    q: "En un vestuario, ¿qué nombre recibe el rol del jugador que canaliza toda la tensión, culpa o frustración del grupo tras una derrota?[cite: 1]",
    options: [
      { text: "Saboteador.[cite: 1]", isCorrect: false, rationale: "El saboteador se opone activamente a la tarea por miedo al cambio.[cite: 1]" },
      { text: "Chivo Emisario.[cite: 1]", isCorrect: true, rationale: "Es el integrante en el que el grupo deposita sus fallas para 'limpiarse' a sí mismo.[cite: 1]" },
      { text: "Portavoz.[cite: 1]", isCorrect: false, rationale: "El portavoz es el termómetro que dice lo que el grupo siente pero no sabe expresar.[cite: 1]" },
      { text: "Líder Sabio.[cite: 1]", isCorrect: false, rationale: "El sabio es el que teoriza para evitar la experiencia directa.[cite: 1]" }
    ]
  },
  {
    q: "¿Cuál es la diferencia fundamental entre el enfoque Conductista y el Cognitivista?[cite: 1]",
    options: [
      { text: "El conductismo estudia la mente interna y el cognitivismo la conducta.[cite: 1]", isCorrect: false, rationale: "Es exactamente al revés.[cite: 1]" },
      { text: "El conductismo usa el psicoanálisis y el cognitivismo las neurociencias.[cite: 1]", isCorrect: false, rationale: "Son escuelas independientes del psicoanálisis.[cite: 1]" },
      { text: "El conductismo se enfoca en Estímulo-Respuesta, y el cognitivismo en el procesamiento intermedio.[cite: 1]", isCorrect: true, rationale: "El cognitivismo abre la 'caja negra' para entender la atención, memoria y pensamiento.[cite: 1]" },
      { text: "No hay diferencias, ambas son parte de la filosofía.[cite: 1]", isCorrect: false, rationale: "Ambas son ramas científicas con modelos de aprendizaje opuestos.[cite: 1]" }
    ]
  }
];

export default function FutsalPsychologyQuiz() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOptionIdx, setSelectedOptionIdx] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleOptionClick = (idx) => {
    if (answered) return;
    setSelectedOptionIdx(idx);
    setAnswered(true);

    if (questions[currentQuestion].options[idx].isCorrect) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedOptionIdx(null);
      setAnswered(false);
    } else {
      setShowResults(true);
    }
  };

  const restartQuiz = () => {
    setCurrentQuestion(0);
    setScore(0);
    setSelectedOptionIdx(null);
    setAnswered(false);
    setShowResults(false);
  };

  const getPerformanceMessage = (grade) => {
    if (grade >= 9) return { text: "Excelente. Tienes un dominio total del factor humano y cognitivo.[cite: 1]", color: "text-green-600" };
    if (grade >= 7) return { text: "Muy bien. Comprendes las bases para liderar un plantel competitivo.[cite: 1]", color: "text-blue-600" };
    if (grade >= 4) return { text: "Aprobado, pero te sugiero repasar los conceptos de psicología social.[cite: 1]", color: "text-yellow-600" };
    return { text: "Es necesario volver a leer el manual para gestionar mejor el vestuario.[cite: 1]", color: "text-red-600" };
  };

  if (showResults) {
    const performance = getPerformanceMessage(score);
    return (
      <div className="max-w-3xl mx-auto py-10 px-4">
        <div className="bg-white p-10 rounded-xl shadow-xl text-center">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">¡Examen Finalizado!</h2>
          <p className="text-gray-600 mb-6">Tu calificación final según el Manual de Lectura:[cite: 1]</p>
          <div className="inline-block p-8 rounded-full bg-blue-100 text-blue-900 text-6xl font-black mb-8 border-4 border-blue-900">
            {score}/10
          </div>
          <div className={`text-xl font-medium mb-8 ${performance.color}`}>
            {performance.text}
          </div>
          <button
            onClick={restartQuiz}
            className="bg-gray-800 text-white px-8 py-3 rounded-full hover:bg-gray-700 transition font-bold"
          >
            Reiniciar Evaluación
          </button>
        </div>
      </div>
    );
  }

  const qData = questions[currentQuestion];

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      {/* Header */}
      <div className="bg-blue-900 text-white p-8 rounded-t-xl shadow-lg mb-1">
        <h1 className="text-3xl font-bold mb-2 font-sans">Evaluación de Psicología del Deporte</h1>
        <p className="text-blue-100 italic">Material para Directores Técnicos de Futsal - ATFA 2026[cite: 1]</p>
      </div>

      <div className="bg-white p-8 rounded-b-xl shadow-lg">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Pregunta {currentQuestion + 1} de {questions.length}</span>
            <span>Puntaje: {score}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Question Content */}
        <div>
          <h2 className="text-xl font-semibold mb-6 text-gray-800">
            {currentQuestion + 1}. {qData.q}
          </h2>
          <div className="space-y-3">
            {qData.options.map((opt, idx) => {
              let btnClass = "w-full text-left p-4 border-2 border-gray-200 rounded-lg transition flex justify-between items-center ";
              
              if (!answered) {
                btnClass += "hover:border-blue-500 hover:bg-blue-50";
              } else {
                if (opt.isCorrect) {
                  btnClass += "bg-green-100 border-green-500 text-green-900 font-medium";
                } else if (idx === selectedOptionIdx) {
                  btnClass += "bg-red-100 border-red-500 text-red-900";
                } else {
                  btnClass += "opacity-60 cursor-not-allowed";
                }
              }

              return (
                <button
                  key={idx}
                  disabled={answered}
                  onClick={() => handleOptionClick(idx)}
                  className={btnClass}
                >
                  <span>{opt.text}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Feedback Area */}
        {answered && (
          <div className="mt-8 transition-opacity duration-300">
            <div
              className={`p-4 rounded-lg mb-4 font-medium border ${
                qData.options[selectedOptionIdx].isCorrect
                  ? 'bg-green-100 text-green-800 border-green-200'
                  : 'bg-red-100 text-red-800 border-red-200'
              }`}
            >
              {qData.options[selectedOptionIdx].isCorrect ? '¡CORRECTO!' : 'INCORRECTO'}
            </div>
            <p className="text-gray-600 text-sm italic mb-6">
              {qData.options[selectedOptionIdx].rationale}
            </p>
            <button
              onClick={handleNext}
              className="w-full bg-blue-900 text-white py-3 rounded-lg font-bold hover:bg-blue-800 transition"
            >
              {currentQuestion === questions.length - 1 ? 'Ver Resultado Final' : 'Siguiente Pregunta'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}