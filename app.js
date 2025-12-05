const API = "https://fsquiz-backend.onrender.com";

let CURRENT_QUESTIONS = [];
let CURRENT_QUIZ_ID = null;
let LAST_RESULT = null;

// =======================
// LOAD EVENTS
// =======================
async function loadEvents() {
    const r = await fetch(API + "/api/events");
    const events = await r.json();
    const sel = document.getElementById("eventSelect");

    events.forEach(e => {
        const opt = document.createElement("option");
        opt.value = e.id;
        opt.textContent = `${e.short_name} – ${e.event_name}`;
        sel.appendChild(opt);
    });
}
loadEvents();

// =======================
// GENERATE QUIZ
// =======================
async function generateQuiz() {
    const eventId = eventSelect.value;
    const ys = yearStart.value;
    const ye = yearEnd.value;
    const cn = classSelect.value;
    const count = countInput.value;

    let url = `${API}/api/generateRange?eventId=${eventId}&yearStart=${ys}&yearEnd=${ye}&count=${count}`;
    if (cn) url += `&className=${cn}`;

    const r = await fetch(url);
    const data = await r.json();

    CURRENT_QUIZ_ID = data.quizId;
    CURRENT_QUESTIONS = data.questions;

    renderQuiz(CURRENT_QUESTIONS);

    submitButton.style.display = "block";
    pdfQuestionsButton.style.display = "block";
    pdfButton.style.display = "none";
}

// =======================
// RENDER QUIZ
// =======================
function renderQuiz(questions) {
    quizContainer.innerHTML = "";

    questions.forEach(q => {
        let div = document.createElement("div");
        div.className = "question";

        let html = `<h3>${q.text}</h3>`;

        q.images?.forEach(url => {
            html += `
            <div>
                <img src="${url}" style="max-width:100%; margin:10px 0;"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">
                <a href="${url}" target="_blank" style="display:none; font-size:12px;">Open image</a>
            </div>`;
        });

        html += `<div class="answers">`;

        if (q.answers.length <= 1) {
            html += `<input type="text" name="q_${q.id}" style="width:100%;">`;
        } else {
            q.answers.forEach(a => {
                html += `
                <label>
                    <input type="radio" name="q_${q.id}" value="${a.id}">
                    ${a.text}
                </label><br>`;
            });
        }

        html += `</div>`;
        div.innerHTML = html;
        quizContainer.appendChild(div);
    });
}

// =======================
// SUBMIT QUIZ
// =======================
async function submitQuiz() {
    const answers = CURRENT_QUESTIONS.map(q => {
        let sel = [];

        if (q.answers.length <= 1) {
            sel = [document.querySelector(`input[name="q_${q.id}"]`).value.trim()];
        } else {
            sel = [...document.querySelectorAll(`input[name="q_${q.id}"]:checked`)]
                .map(i => Number(i.value));
        }

        return { questionId: q.id, selected: sel };
    });

    const r = await fetch(API + "/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId: CURRENT_QUIZ_ID, answers })
    });

    LAST_RESULT = await r.json();
    renderResults(LAST_RESULT);

    pdfButton.style.display = "block";
}

// =======================
// RENDER RESULTS
// =======================
function getText(qid, aid) {
    const q = CURRENT_QUESTIONS.find(q => q.id === qid);
    if (!q) return aid;
    const a = q.answers.find(x => x.id === aid);
    return a ? a.text : aid;
}

function renderResults(result) {
    const box = document.getElementById("resultContainer");

    // Map id -> text
    const findAnswerText = (qId, aId) => {
        const q = CURRENT_QUESTIONS.find(x => x.id === qId);
        if (!q) return aId;
        const ans = q.answers?.find(a => a.id === aId);
        return ans ? ans.text : aId;
    };

    let html = `<h2>Results</h2>`;
    html += `<p>Score: ${result.score} / ${result.total}</p>`;
    html += `<ul>`;

    result.results.forEach(res => {
        const userText = res.userAnswers.map(a => findAnswerText(res.questionId, a)).join(", ");
        const correctText = res.correctAnswers.map(a => findAnswerText(res.questionId, a)).join(", ");

        html += `
            <li style="margin-bottom: 10px;">
                <strong>Question ID:</strong> ${res.questionId}<br>
                <strong>Your answer:</strong> ${userText}<br>
                <strong>Correct answer:</strong> ${correctText}<br>
                <strong>Correct:</strong> ${res.correct ? "YES" : "NO"}
            </li>
        `;
    });

    html += `</ul>`;
    box.innerHTML = html;
}


// =======================
// EXPORT PDF (QUESTIONS)
// =======================
async function exportQuestionsPDF() {
    const payload = { quizId: CURRENT_QUIZ_ID, questions: CURRENT_QUESTIONS };

    const r = await fetch(API + "/api/exportPDFQuestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const blob = await r.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `questions_${CURRENT_QUIZ_ID}.pdf`;
    a.click();

    URL.revokeObjectURL(url);
}

// =======================
// RESULTS PDF (TODO)
// =======================
async function exportPDF() {
    alert("Results PDF will be added later.");
}
