import { createSpeciesGallery } from "./imageUtils.js";

function groupByGenus(speciesList) {
  const map = new Map();
  for (const s of speciesList) {
    if (!map.has(s.genus)) map.set(s.genus, []);
    map.get(s.genus).push(s);
  }
  const groups = Array.from(map.entries()).map(([genus, species]) => ({
    genus,
    species: [...species].sort((a, b) =>
      a.commonName.localeCompare(b.commonName),
    ),
  }));
  groups.sort((a, b) => a.genus.localeCompare(b.genus));
  return groups;
}

const DECKS = {
  species: {
    namespace: undefined,
    buildItems: (speciesList) => speciesList,
    getId: (item) => item.id,
    imageFor: (item) => item,
    frontHint: "Tap to reveal name",
    frontContent: () => null,
    backTitle: (item) => item.commonName,
    backSubtitle: (item) => ({
      latin: item.latinName,
      phonetic: item.phonetic,
    }),
  },
  genus: {
    namespace: "genus",
    buildItems: (speciesList) => groupByGenus(speciesList),
    getId: (item) => item.genus,
    imageFor: (item) => ({
      images: item.species.map((s) => s.images?.[0]).filter(Boolean),
    }),
    frontHint: "Tap to reveal genus",
    frontContent: (item) => item.species.map((s) => s.commonName).join(", "),
    backTitle: (item) => item.genus,
    backSubtitle: (item) =>
      item.species.map((s) => ({ latin: s.latinName, phonetic: s.phonetic })),
  },
};

export function initFlashcardMode({ speciesList, progress, elements }) {
  let currentDeck = DECKS.species;
  let items = [];
  let filtered = [];
  let index = 0;
  let flipped = false;
  let filterMode = "all";

  function applyFilter() {
    filtered =
      filterMode === "all"
        ? [...items]
        : items.filter(
            (item) =>
              progress.getStatus(
                currentDeck.getId(item),
                currentDeck.namespace,
              ) === filterMode,
          );
    index = 0;
    flipped = false;
    render();
  }

  function shuffle() {
    for (let i = filtered.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
    }
    index = 0;
    flipped = false;
    render();
  }

  function render() {
    if (filtered.length === 0) {
      elements.card.innerHTML =
        '<p class="empty-msg">No species in this filter yet.</p>';
      elements.progressLabel.textContent = "";
      elements.answerControls.classList.add("hidden");
      return;
    }

    const item = filtered[index];
    elements.progressLabel.textContent = `${index + 1} / ${filtered.length}`;
    elements.card.innerHTML = "";

    const face = document.createElement("div");
    face.className = "flashcard-face";
    face.tabIndex = 0;

    if (!flipped) {
      const gallery = createSpeciesGallery(
        currentDeck.imageFor(item),
        "Tree leaves",
      );
      face.appendChild(gallery);

      const frontText = currentDeck.frontContent(item);
      if (frontText) {
        const names = document.createElement("p");
        names.className = "front-names";
        names.textContent = frontText;
        face.appendChild(names);
      }
      const hint = document.createElement("p");
      hint.className = "tap-hint";
      hint.textContent = currentDeck.frontHint;
      face.appendChild(hint);
      elements.answerControls.classList.add("hidden");
    } else {
      const gallery = createSpeciesGallery(
        currentDeck.imageFor(item),
        `${currentDeck.backTitle(item)} example`,
      );
      face.appendChild(gallery);

      const h2 = document.createElement("h2");
      h2.textContent = currentDeck.backTitle(item);
      face.appendChild(h2);

      const subtitle = currentDeck.backSubtitle(item);
      if (Array.isArray(subtitle)) {
        const ul = document.createElement("ul");
        ul.className = "latin-list";
        subtitle.forEach((name) => {
          const li = document.createElement("li");
          const em = document.createElement("em");
          em.textContent = name.latin;
          li.appendChild(em);
          if (name.phonetic) {
            const phonetic = document.createElement("span");
            phonetic.className = "phonetic";
            phonetic.textContent = ` (${name.phonetic})`;
            li.appendChild(phonetic);
          }
          ul.appendChild(li);
        });
        face.appendChild(ul);
      } else {
        const latin = document.createElement("p");
        latin.className = "latin-name";
        const em = document.createElement("em");
        em.textContent = subtitle.latin;
        latin.appendChild(em);
        if (subtitle.phonetic) {
          const phonetic = document.createElement("span");
          phonetic.className = "phonetic";
          phonetic.textContent = ` (${subtitle.phonetic})`;
          latin.appendChild(phonetic);
        }
        face.appendChild(latin);
      }
      elements.answerControls.classList.remove("hidden");
    }

    face.addEventListener("click", () => {
      flipped = !flipped;
      render();
    });

    elements.card.appendChild(face);
  }

  function goNext() {
    flipped = false;
    index = (index + 1) % filtered.length;
    render();
  }

  function goPrev() {
    flipped = false;
    index = (index - 1 + filtered.length) % filtered.length;
    render();
  }

  function start(deckType = "species") {
    currentDeck = DECKS[deckType] || DECKS.species;
    items = currentDeck.buildItems(speciesList);
    filterMode = "all";
    elements.filterRadios.forEach((radio) => {
      radio.checked = radio.value === "all";
    });
    applyFilter();
  }

  elements.knewItBtn.addEventListener("click", () => {
    if (filtered.length === 0) return;
    progress.setStatus(
      currentDeck.getId(filtered[index]),
      "known",
      currentDeck.namespace,
    );
    goNext();
  });

  elements.stillLearningBtn.addEventListener("click", () => {
    if (filtered.length === 0) return;
    progress.setStatus(
      currentDeck.getId(filtered[index]),
      "learning",
      currentDeck.namespace,
    );
    goNext();
  });

  elements.nextBtn.addEventListener("click", goNext);
  elements.prevBtn.addEventListener("click", goPrev);
  elements.shuffleBtn.addEventListener("click", shuffle);
  elements.filterRadios.forEach((radio) => {
    radio.addEventListener("change", (event) => {
      filterMode = event.target.value;
      applyFilter();
    });
  });

  return { start };
}
