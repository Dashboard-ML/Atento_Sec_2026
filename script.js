
const TOTAL_IMAGES = 119;
const imagePaths = Array.from({length: TOTAL_IMAGES}, (_, i) =>
  `imagenes/slide${String(i + 1).padStart(3, "0")}.png`
);

let savedData = JSON.parse(
  localStorage.getItem("atento_sec_2026")
) || {};


let courseIndex = savedData.courseIndex || 0;
let quizIndex = savedData.quizIndex || 0;

let participant = savedData.participant || {
  
  name:"",
  sap:""
};
let participanteId = savedData.participanteId || null;

let answers = savedData.answers || [];

function saveProgress(){

  localStorage.setItem(
      "atento_sec_2026",
      JSON.stringify({
          courseIndex,
          quizIndex,
          participant,
          participanteId,
          answers
      })
  );

}

const $ = (id) => document.getElementById(id);

async function guardarParticipante(){

  // Buscar si el SAP ya existe
  const { data: existente, error: errorBusqueda } =
      await supabaseClient
      .from("participantes")
      .select("*")
      .eq("sap", participant.sap)
      .maybeSingle();


  if(errorBusqueda){

      console.error(
          "Error buscando participante:",
          errorBusqueda
      );

      return false;

  }


  // Si ya existe, usamos ese registro
  if(existente){

      participanteId = existente.id;

      console.log(
          "Participante existente:",
          participanteId
      );

      saveProgress();

      return true;

  }


  // Si no existe, creamos uno nuevo
  const { data, error } =
      await supabaseClient
      .from("participantes")
      .insert([
          {
              nombre: participant.name,
              sap: participant.sap,
              fecha_inicio: new Date()
          }
      ])
      .select()
      .single();


  if(error){

      console.error(
          "Error creando participante:",
          error
      );

      return false;

  }


  participanteId = data.id;

  saveProgress();

  console.log(
      "Nuevo participante creado:",
      participanteId
  );


  return true;

}

async function guardarIntento(hits, score, resultado){

  try {

    // Validar que exista participante
    if(!participanteId){
      console.error("No existe participanteId");
      return false;
    }


    // Consultar intentos realizados por el participante
    const { data: intentosPrevios, error: errorIntentos } = await supabaseClient
      .from("intentos")
      .select("numero_intento")
      .eq("participante_id", participanteId);


    if(errorIntentos){
      console.error("Error consultando intentos previos:", errorIntentos);
      return false;
    }


    // Validar máximo de 3 intentos
    if(intentosPrevios.length >= 3){

      alert("Has alcanzado el máximo de 3 intentos permitidos.");
      
      return false;
    }


    // Calcular número de intento siguiente
    const numeroIntento = intentosPrevios.length + 1;


    // Guardar intento
    const { data, error } = await supabaseClient
      .from("intentos")
      .insert({

        participante_id: participanteId,
        numero_intento: numeroIntento,

        calificacion: score,

        resultado: resultado,
        
        total_preguntas: BANCO_PREGUNTAS.length,
        
        respuestas_correctas: hits

      })
      .select();


    if(error){

      console.error("Error guardando intento:", error);

      return false;
    }


    console.log("Intento guardado correctamente:", data);

    return true;


  } catch(error){

    console.error("Error inesperado guardando intento:", error);

    return false;
  }

}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  $(id).classList.add("active");
}

function renderCourseImage() {
  const img = $("courseImage");
  const fallback = $("imageFallback");
  const current = courseIndex + 1;

  $("courseCounter").textContent = `${current} / ${TOTAL_IMAGES}`;
  $("courseProgressText").textContent = `Contenido ${current} de ${TOTAL_IMAGES}`;
  $("courseProgress").style.width = `${(current / TOTAL_IMAGES) * 100}%`;
  $("btnPrev").disabled = courseIndex === 0;
  $("btnPrev").style.opacity = courseIndex === 0 ? ".45" : "1";

  fallback.classList.add("hidden");
  img.style.display = "block";
  img.src = imagePaths[courseIndex];

  img.onerror = () => {
    img.style.display = "none";
    fallback.classList.remove("hidden");
    $("fallbackTitle").textContent = `No se encontró slide${String(current).padStart(3, "0")}.png`;
    $("fallbackText").textContent = "Puedes seguir navegando y agregar esta imagen después dentro de la carpeta imagenes.";
  };
}

function openCourseModal() {
  $("courseModal").classList.add("open");
  $("courseModal").setAttribute("aria-hidden", "false");
}

function closeCourseModal() {
  $("courseModal").classList.remove("open");
  $("courseModal").setAttribute("aria-hidden", "true");
}

function validateParticipant() {
  const name = $("participantName").value.trim();
  const sap = $("participantSap").value.trim();

  $("nameError").textContent = "";
  $("sapError").textContent = "";

  let ok = true;
  if (!name) {
    $("nameError").textContent = "Ingresa tu nombre para continuar.";
    ok = false;
  }
  if (!sap) {
    $("sapError").textContent = "Ingresa tu SAP para continuar.";
    ok = false;
  }

  if (!ok) return false;

  participant = { name, sap };
  return true;
}

function renderQuestion() {
  const q = BANCO_PREGUNTAS[quizIndex];
  const selected = answers[quizIndex];

  $("questionBadge").textContent = `${quizIndex + 1} / ${BANCO_PREGUNTAS.length}`;
  $("questionTitle").textContent = `Pregunta ${quizIndex + 1}`;
  $("quizProgress").style.width = `${((quizIndex + 1) / BANCO_PREGUNTAS.length) * 100}%`;
  $("quizMessage").textContent = "";

  const body = $("questionBody");
  body.innerHTML = "";

  const title = document.createElement("div");
  title.className = "question-text";
  title.textContent = q.pregunta;
  body.appendChild(title);

  const options = document.createElement("div");
  options.className = "options";

  q.opciones.forEach((text, idx) => {
    const label = document.createElement("label");
    label.className = "option" + (selected === idx ? " selected" : "");

    const input = document.createElement("input");
    input.type = "radio";
    input.name = "quizAnswer";
    input.value = idx;
    input.checked = selected === idx;

    const span = document.createElement("span");
    span.textContent = text;

    input.addEventListener("change", () => {
      answers[quizIndex] = idx;
      saveProgress();
      document.querySelectorAll(".option").forEach(x => x.classList.remove("selected"));
      label.classList.add("selected");
      $("quizMessage").textContent = "";
    });

    label.appendChild(input);
    label.appendChild(span);
    options.appendChild(label);
  });

  body.appendChild(options);

  $("btnQuizPrev").disabled = quizIndex === 0;
  $("btnQuizPrev").style.opacity = quizIndex === 0 ? ".45" : "1";
  $("btnQuizNext").textContent =
    quizIndex === BANCO_PREGUNTAS.length - 1 ? "Finalizar evaluación" : "Continuar →";
}

function calculateResult() {
  let hits = 0;
  BANCO_PREGUNTAS.forEach((q, i) => {
    if (answers[i] === q.correcta) hits++;
  });

  const score = Math.round((hits / BANCO_PREGUNTAS.length) * 100);
  const passed = score >= 80;
  const resultado = passed ? "APROBADO" : "NO APROBADO";

guardarIntento(
  hits,
  score,
  resultado
);

  $("resultIcon").textContent = passed ? "✓" : "!";
  $("resultIcon").style.background = passed ? "#e7faf6" : "#fff3e8";
  $("resultIcon").style.color = passed ? "#00A79D" : "#c75c12";
  $("resultStatus").textContent = passed ? "APROBADO" : "NO APROBADO";
  $("scoreNumber").textContent = `${score}%`;
  $("resultName").textContent = participant.name;
  $("resultSap").textContent = participant.sap;
  $("resultHits").textContent = `${hits} / ${BANCO_PREGUNTAS.length}`;

  showScreen("screenResult");
}

$("btnStart").addEventListener("click", () => {
  courseIndex = 0;
  renderCourseImage();
  showScreen("screenCourse");
});

$("btnPrev").addEventListener("click", () => {
  if (courseIndex > 0) {
    courseIndex--;
    renderCourseImage();
  }
});

$("btnNext").addEventListener("click", () => {
  if (courseIndex < TOTAL_IMAGES - 1) {
    courseIndex++;

saveProgress();

renderCourseImage();
  } else {
    openCourseModal();
  }
});

$("btnOpenData").addEventListener("click", () => {
  closeCourseModal();
  showScreen("screenData");
  setTimeout(() => $("participantName").focus(), 0);
});

$("btnBeginQuiz").addEventListener("click", async () => {


  if (!validateParticipant()) return;


  const guardado = await guardarParticipante();


  if(!guardado){

      alert(
        "No se pudieron guardar tus datos"
      );

      return;

  }


  quizIndex = 0;

  renderQuestion();

  showScreen("screenQuiz");


});

$("btnQuizPrev").addEventListener("click", () => {
  if (quizIndex > 0) {
    quizIndex--;
    renderQuestion();
  }
});

$("btnQuizNext").addEventListener("click", () => {
  if (answers[quizIndex] === null || answers[quizIndex] === undefined) {
    $("quizMessage").textContent = "Selecciona una respuesta para continuar.";
    return;
  }

  if (quizIndex < BANCO_PREGUNTAS.length - 1) {
    quizIndex++;
    renderQuestion();
  } else {
    calculateResult();
  }
});

document.addEventListener("keydown", (event) => {
  if ($("screenCourse").classList.contains("active")) {
    if (event.key === "ArrowLeft" && courseIndex > 0) {
      courseIndex--;
      renderCourseImage();
    }
    if (event.key === "ArrowRight") {
      if (courseIndex < TOTAL_IMAGES - 1) {
        courseIndex++;
        renderCourseImage();
      } else {
        openCourseModal();
      }
    }
  }
});

$("btnAdmin").addEventListener("click", () => {

  window.location.href = "admin.html";

});
