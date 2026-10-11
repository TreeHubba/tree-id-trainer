import * as quizGenerator from "./quizGenerator.js";

export function initQuizMode({ speciesList, quizHistory, elements, showView }) {
  let questions = [];
  let currentIndex = 0;
  let score = 0;
  let maxScore = 0;
  let results = [];
  let selectedKeys = ["mcMatchLatin"];
  let awaitingNext = false;

  const TYPED_KEY_BY_VALUE = {
    genus: "genusTyped",
    sci: "sciTyped",
    common: "commonTyped",
  };

  function isLastQuestion() {
    return currentIndex >= questions.length - 1;
  }

  function primaryButtonLabel() {
    return isLastQuestion() ? "Finish" : "Next Question";
  }

  function recordGrade(question, grade) {
    score += grade.pointsEarned;
    maxScore += grade.maxPoints;
    results.push({ question, grade });
  }

  function getSelectedTypeKeys() {
    const keys = Array.from(elements.typedCheckboxes)
      .filter((cb) => cb.checked)
      .map((cb) => TYPED_KEY_BY_VALUE[cb.value]);

    if (elements.mcEnableCheckbox.checked) {
      const direction = Array.from(elements.mcDirectionRadios).find(
        (radio) => radio.checked,
      );
      keys.push(direction && direction.value === "common" ? "mcMatchCommon" : "mcMatchLatin");
    }

    return keys;
  }

  function startQuiz() {
    selectedKeys = getSelectedTypeKeys();
    questions = quizGenerator.buildQuestionPool(speciesList, selectedKeys);
    currentIndex = 0;
    score = 0;
    maxScore = 0;
    results = [];
    renderQuestion();
  }

  function renderQuestion() {
    awaitingNext = false;
    elements.feedback.classList.add("hidden");
    elements.feedback.innerHTML = "";
    elements.nextBtn.classList.add("hidden");

    const question = questions[currentIndex];
    elements.progressLabel.textContent = `Question ${currentIndex + 1} / ${questions.length}`;
    elements.questionEl.innerHTML = "";
    elements.answerArea.innerHTML = "";

    const promptEl = document.createElement("h2");
    promptEl.textContent = question.prompt;
    elements.questionEl.appendChild(promptEl);

    if (question.fields) {
      elements.submitBtn.classList.remove("hidden");
      elements.submitBtn.textContent = primaryButtonLabel();
      question.fields.forEach((field) => {
        const label = document.createElement("label");
        label.className = "quiz-field-label";
        label.textContent = field.label;
        const input = document.createElement("input");
        input.type = "text";
        input.className = "quiz-text-input";
        input.dataset.fieldKey = field.key;
        input.autocomplete = "off";
        label.appendChild(input);
        elements.answerArea.appendChild(label);
      });
    } else if (question.options) {
      elements.submitBtn.classList.add("hidden");
      const wrap = document.createElement("div");
      wrap.className = "options";
      question.options.forEach((opt) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "option-btn";
        btn.textContent = opt;
        btn.addEventListener("click", () => selectOption(opt, wrap));
        wrap.appendChild(btn);
      });
      elements.answerArea.appendChild(wrap);
    }
  }

  function selectOption(opt, wrap) {
    if (awaitingNext) return;
    const question = questions[currentIndex];
    const grade = quizGenerator.gradeQuestion(question, { selected: opt });
    recordGrade(question, grade);

    wrap.querySelectorAll(".option-btn").forEach((b) => {
      b.disabled = true;
      const isSelected = b.textContent === opt;
      const isCorrectOption = b.textContent === question.correctAnswer;
      if (isCorrectOption) {
        b.classList.add("correct");
      } else if (isSelected) {
        b.classList.add("incorrect");
      }
    });

    showFeedback(grade);
  }

  function collectResponse() {
    const response = {};
    elements.answerArea
      .querySelectorAll(".quiz-text-input")
      .forEach((input) => {
        response[input.dataset.fieldKey] = input.value;
      });
    return response;
  }

  function submitFieldsAnswer() {
    if (awaitingNext) return;
    const question = questions[currentIndex];
    const response = collectResponse();
    const grade = quizGenerator.gradeQuestion(question, response);
    recordGrade(question, grade);
    showFeedback(grade);
  }

  function showFeedback(grade) {
    awaitingNext = true;
    elements.feedback.classList.remove("hidden");
    elements.feedback.innerHTML = "";

    const isFull = grade.pointsEarned === grade.maxPoints;
    const isZero = grade.pointsEarned === 0;
    const verdict = document.createElement("p");
    verdict.className = isFull
      ? "quiz-correct"
      : isZero
        ? "quiz-incorrect"
        : "quiz-partial";
    verdict.textContent = `${grade.pointsEarned} / ${grade.maxPoints} points`;
    elements.feedback.appendChild(verdict);

    const correctP = document.createElement("p");
    correctP.textContent = `Correct answer: ${grade.correctAnswer}`;
    elements.feedback.appendChild(correctP);

    elements.submitBtn.classList.add("hidden");
    elements.nextBtn.textContent = primaryButtonLabel();
    elements.nextBtn.classList.remove("hidden");
  }

  function goToNextOrFinish() {
    currentIndex += 1;
    if (currentIndex >= questions.length) {
      finishQuiz();
    } else {
      renderQuestion();
    }
  }

  function finishQuiz() {
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    quizHistory.addAttempt({
      settings: {
        count: questions.length,
        questionTypes: selectedKeys,
      },
      score,
      maxScore,
      percentage,
      perQuestionResults: results.map((r) => ({
        prompt: r.question.prompt,
        type: r.question.type,
        pointsEarned: r.grade.pointsEarned,
        maxPoints: r.grade.maxPoints,
        correctAnswer: r.grade.correctAnswer,
      })),
    });
    renderResults(percentage);
    showView("quiz-results-view");
  }

  function renderResults(percentage) {
    elements.scoreSummary.textContent = `${score} / ${maxScore} points (${percentage}%)`;
    elements.breakdown.innerHTML = "";
    results.forEach((r, i) => {
      const item = document.createElement("div");
      item.className = "quiz-breakdown-item";

      const q = document.createElement("p");
      q.className = "quiz-breakdown-prompt";
      q.textContent = `${i + 1}. ${r.question.prompt}`;
      item.appendChild(q);

      if (r.grade.perField) {
        Object.values(r.grade.perField).forEach((info) => {
          const line = document.createElement("p");
          line.className = info.correct ? "quiz-correct" : "quiz-incorrect";
          line.textContent = `You answered "${info.userAnswer || "(blank)"}" — correct: "${info.correctAnswer}"`;
          item.appendChild(line);
        });
      } else {
        const line = document.createElement("p");
        line.className =
          r.grade.pointsEarned > 0 ? "quiz-correct" : "quiz-incorrect";
        line.textContent = `You answered "${r.grade.userAnswer || "(blank)"}" — correct: "${r.grade.correctAnswer}"`;
        item.appendChild(line);
      }

      const points = document.createElement("p");
      points.className = "quiz-breakdown-points";
      points.textContent = `${r.grade.pointsEarned} / ${r.grade.maxPoints} pts`;
      item.appendChild(points);

      elements.breakdown.appendChild(item);
    });
  }

  function cancel() {}

  elements.startBtn.addEventListener("click", () => {
    if (getSelectedTypeKeys().length === 0) {
      elements.setupError.classList.remove("hidden");
      return;
    }
    elements.setupError.classList.add("hidden");
    startQuiz();
    showView("quiz-view");
  });
  elements.submitBtn.addEventListener("click", submitFieldsAnswer);
  elements.nextBtn.addEventListener("click", goToNextOrFinish);
  elements.retryBtn.addEventListener("click", () => {
    startQuiz();
    showView("quiz-view");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const quizView = document.getElementById("quiz-view");
    if (!quizView || quizView.classList.contains("hidden")) return;

    if (!elements.nextBtn.classList.contains("hidden")) {
      event.preventDefault();
      goToNextOrFinish();
    } else if (!elements.submitBtn.classList.contains("hidden")) {
      event.preventDefault();
      submitFieldsAnswer();
    }
  });

  return { start: cancel, cancel };
}
