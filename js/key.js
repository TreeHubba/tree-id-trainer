import { createSpeciesImage, createSpeciesGallery } from "./imageUtils.js";

export function initKeyMode({ speciesList, keyTree, progress, elements }) {
  let path = [];
  let crumbs = [];
  let currentNodeId = keyTree.start;
  let view = "question"; // 'question' | 'candidates' | 'reveal'
  let lastResult = null;
  let lastCandidates = [];

  function matchesResult(species, result) {
    if (result.speciesId) return species.id === result.speciesId;
    if (species.groupId !== result.groupId) return false;
    if (result.genus && species.genus !== result.genus) return false;
    return true;
  }

  function renderBreadcrumb() {
    if (elements.breadcrumb) {
      elements.breadcrumb.textContent = crumbs.join(" \u203a ");
    }
  }

  function showOnly(activeEl) {
    elements.question.classList.toggle(
      "hidden",
      activeEl !== elements.question,
    );
    elements.candidates.classList.toggle(
      "hidden",
      activeEl !== elements.candidates,
    );
    elements.reveal.classList.toggle("hidden", activeEl !== elements.reveal);
  }

  function renderQuestion() {
    view = "question";
    renderBreadcrumb();
    showOnly(elements.question);
    const node = keyTree.nodes[currentNodeId];
    elements.question.innerHTML = "";

    const h2 = document.createElement("h2");
    h2.textContent = node.question;
    elements.question.appendChild(h2);

    if (node.hint) {
      const p = document.createElement("p");
      p.className = "hint";
      p.textContent = node.hint;
      elements.question.appendChild(p);
    }

    const optionsWrap = document.createElement("div");
    optionsWrap.className = "options";
    node.options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option-btn";
      btn.textContent = opt.label;
      btn.addEventListener("click", () => handleAnswer(opt));
      optionsWrap.appendChild(btn);
    });
    elements.question.appendChild(optionsWrap);
  }

  function handleAnswer(opt) {
    crumbs.push(opt.label);
    if (opt.result) {
      lastResult = opt.result;
      renderCandidates(opt.result);
    } else if (opt.next) {
      path.push(currentNodeId);
      currentNodeId = opt.next;
      renderQuestion();
    }
  }

  function renderCandidates(result) {
    const candidates = speciesList.filter((s) => matchesResult(s, result));
    lastCandidates = candidates;
    view = "candidates";
    renderBreadcrumb();
    showOnly(elements.candidates);
    elements.candidates.innerHTML = "";

    const heading = document.createElement("h2");
    heading.textContent =
      candidates.length > 1 ? "Which one matches your sample?" : "Match found";
    elements.candidates.appendChild(heading);

    const grid = document.createElement("div");
    grid.className = "candidate-grid";
    candidates.forEach((species) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "candidate-card";
      const img = createSpeciesImage(species, `${species.commonName} leaves`);
      const label = document.createElement("span");
      label.className = "candidate-label";
      label.textContent = "?";
      card.appendChild(img);
      card.appendChild(label);
      card.addEventListener("click", () => renderReveal(species));
      grid.appendChild(card);
    });
    elements.candidates.appendChild(grid);
  }

  function renderReveal(species) {
    view = "reveal";
    renderBreadcrumb();
    showOnly(elements.reveal);
    elements.reveal.innerHTML = "";

    const gallery = createSpeciesGallery(
      species,
      `${species.commonName} leaves`,
    );

    const h2 = document.createElement("h2");
    h2.textContent = species.commonName;

    const latin = document.createElement("p");
    latin.className = "latin-name";
    const em = document.createElement("em");
    em.textContent = species.latinName;
    latin.appendChild(em);

    const controls = document.createElement("div");
    controls.className = "reveal-controls";

    const knownBtn = document.createElement("button");
    knownBtn.type = "button";
    knownBtn.id = "mark-known";
    knownBtn.textContent = "Knew it ✓";
    knownBtn.addEventListener("click", () => {
      progress.setStatus(species.id, "known");
      resetToRoot();
    });

    const learningBtn = document.createElement("button");
    learningBtn.type = "button";
    learningBtn.id = "mark-learning";
    learningBtn.textContent = "Still learning ✗";
    learningBtn.addEventListener("click", () => {
      progress.setStatus(species.id, "learning");
      resetToRoot();
    });

    const tryAgainBtn = document.createElement("button");
    tryAgainBtn.type = "button";
    tryAgainBtn.id = "try-again";
    tryAgainBtn.textContent = "Try Again";
    tryAgainBtn.addEventListener("click", () => {
      renderCandidates(lastResult);
    });

    controls.appendChild(knownBtn);
    controls.appendChild(learningBtn);
    controls.appendChild(tryAgainBtn);

    elements.reveal.appendChild(gallery);
    elements.reveal.appendChild(h2);
    elements.reveal.appendChild(latin);
    elements.reveal.appendChild(controls);
  }

  function goBack() {
    if (view === "candidates") {
      crumbs.pop();
      renderQuestion();
      return;
    }
    if (view === "reveal") {
      renderCandidates(lastResult);
      return;
    }
    if (path.length === 0) return;
    crumbs.pop();
    currentNodeId = path.pop();
    renderQuestion();
  }

  function resetToRoot() {
    path = [];
    crumbs = [];
    currentNodeId = keyTree.start;
    lastResult = null;
    lastCandidates = [];
    renderQuestion();
  }

  elements.backBtn.addEventListener("click", goBack);
  elements.restartBtn.addEventListener("click", resetToRoot);

  return { start: resetToRoot };
}
