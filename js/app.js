import { initKeyMode } from "./key.js";
import { initFlashcardMode } from "./flashcards.js";
import { initQuizMode } from "./quiz.js";
import { initCompareMode } from "./compare.js";
import { createSpeciesGallery, openLightbox } from "./imageUtils.js";
import * as progress from "./progress.js";
import * as quizHistory from "./quizHistory.js";
import * as customPhotos from "./customPhotos.js";

const KEY_CHARTS = {
  gymno: { title: "Gymnosperm Path", src: "UPDATEDGYMNOTREE.jpg" },
  angio: { title: "Angiosperm Path", src: "Angiosperms.jpg" },
};

// Gymnosperms (softwoods) plus all angiosperm (hardwood) groups — Groups
// 8-11 all have key logic and photos now.
const SOFTWOOD_GROUP_IDS = ["Group1", "Group3", "Group4", "Group5"];
const ACTIVE_GROUP_IDS = [
  ...SOFTWOOD_GROUP_IDS,
  "Group8",
  "Group9",
  "Group10",
  "Group11",
];

async function loadData() {
  const [speciesRes, keyTreeRes] = await Promise.all([
    fetch("data/species.json"),
    fetch("data/keyTree.json"),
  ]);
  const speciesList = await speciesRes.json();
  const keyTree = await keyTreeRes.json();
  return { speciesList, keyTree };
}

function showView(viewId) {
  document
    .querySelectorAll(".view")
    .forEach((el) => el.classList.add("hidden"));
  document.getElementById(viewId).classList.remove("hidden");
}

function updateStats(speciesList) {
  const stats = progress.getStats(speciesList.length);
  document.getElementById("stats-line").textContent =
    `${stats.known} known · ${stats.learning} learning · ${stats.new} new (out of ${stats.total})`;
}

function renderBrowseView(container, activeSpecies) {
  const map = new Map();
  for (const s of activeSpecies) {
    if (!map.has(s.genus)) map.set(s.genus, []);
    map.get(s.genus).push(s);
  }
  const groups = Array.from(map.entries())
    .map(([genus, species]) => ({
      genus,
      species: [...species].sort((a, b) =>
        a.commonName.localeCompare(b.commonName),
      ),
    }))
    .sort((a, b) => a.genus.localeCompare(b.genus));

  container.innerHTML = "";
  for (const group of groups) {
    const section = document.createElement("section");
    section.className = "genus-group";

    const h2 = document.createElement("h2");
    h2.textContent = group.genus;
    section.appendChild(h2);

    const ul = document.createElement("ul");
    for (const s of group.species) {
      const li = document.createElement("li");

      const names = document.createElement("p");
      names.textContent = `${s.commonName} — `;
      const em = document.createElement("em");
      em.textContent = s.latinName;
      names.appendChild(em);
      if (s.phonetic) {
        const phonetic = document.createElement("span");
        phonetic.className = "phonetic";
        phonetic.textContent = ` (${s.phonetic})`;
        names.appendChild(phonetic);
      }
      li.appendChild(names);

      const gallery = createSpeciesGallery(s, `${s.commonName} leaves`);
      li.appendChild(gallery);

      ul.appendChild(li);
    }
    section.appendChild(ul);

    container.appendChild(section);
  }
}

async function main() {
  const { speciesList, keyTree } = await loadData();
  let customPhotoMap = await customPhotos.getAllBySpecies();
  for (const s of speciesList) {
    const custom = customPhotoMap.get(s.id);
    if (custom && custom.length) {
      s.images = [...(s.images || []), ...custom.map((c) => c.url)];
    }
  }
  const activeSpecies = speciesList.filter((s) =>
    ACTIVE_GROUP_IDS.includes(s.groupId),
  );
  updateStats(activeSpecies);

  const keyMode = initKeyMode({
    speciesList: activeSpecies,
    keyTree,
    progress,
    elements: {
      question: document.getElementById("key-question"),
      candidates: document.getElementById("key-candidates"),
      reveal: document.getElementById("key-reveal"),
      breadcrumb: document.getElementById("key-breadcrumb"),
      backBtn: document.getElementById("key-back-btn"),
      restartBtn: document.getElementById("key-restart-btn"),
    },
  });

  const flashcardMode = initFlashcardMode({
    speciesList: activeSpecies,
    progress,
    elements: {
      card: document.getElementById("flashcard"),
      progressLabel: document.getElementById("flash-progress"),
      answerControls: document.getElementById("flash-answer-controls"),
      knewItBtn: document.getElementById("knew-it-btn"),
      stillLearningBtn: document.getElementById("still-learning-btn"),
      nextBtn: document.getElementById("next-card-btn"),
      prevBtn: document.getElementById("prev-card-btn"),
      shuffleBtn: document.getElementById("shuffle-btn"),
      filterRadios: document.querySelectorAll('input[name="filter"]'),
    },
  });

  document.getElementById("start-key-btn").addEventListener("click", () => {
    showView("key-view");
    keyMode.start();
  });

  document
    .getElementById("start-flashcards-btn")
    .addEventListener("click", () => {
      showView("flashcard-select-view");
    });

  document
    .getElementById("flashcards-species-btn")
    .addEventListener("click", () => {
      showView("flashcard-view");
      flashcardMode.start("species");
    });

  document
    .getElementById("flashcards-genus-btn")
    .addEventListener("click", () => {
      showView("flashcard-view");
      flashcardMode.start("genus");
    });

  document.getElementById("start-browse-btn").addEventListener("click", () => {
    showView("browse-view");
    renderBrowseView(document.getElementById("browse-list"), activeSpecies);
  });

  const compareMode = initCompareMode({
    speciesList,
    softwoodGroupIds: SOFTWOOD_GROUP_IDS,
    elements: {
      selectA: document.getElementById("compare-select-a"),
      selectB: document.getElementById("compare-select-b"),
      compareBtn: document.getElementById("compare-btn"),
      results: document.getElementById("compare-results"),
      filterRadios: document.querySelectorAll('input[name="woodFilter"]'),
    },
  });

  document.getElementById("start-compare-btn").addEventListener("click", () => {
    showView("compare-view");
    compareMode.start();
  });

  document.getElementById("compare-home-btn").addEventListener("click", () => {
    showView("home-view");
    updateStats(activeSpecies);
  });

  // Quiz mode intentionally spans ALL species (not just activeSpecies) since
  // it's meant to help prepare for a midterm covering the full course list.
  const quizMode = initQuizMode({
    speciesList,
    quizHistory,
    showView,
    elements: {
      typedCheckboxes: document.querySelectorAll('input[name="typedType"]'),
      mcEnableCheckbox: document.getElementById("quiz-mc-enable"),
      mcDirectionRadios: document.querySelectorAll('input[name="mcDirection"]'),
      setupError: document.getElementById("quiz-setup-error"),
      startBtn: document.getElementById("quiz-start-btn"),
      progressLabel: document.getElementById("quiz-progress"),
      questionEl: document.getElementById("quiz-question"),
      answerArea: document.getElementById("quiz-answer-area"),
      feedback: document.getElementById("quiz-feedback"),
      submitBtn: document.getElementById("quiz-submit-btn"),
      nextBtn: document.getElementById("quiz-next-btn"),
      scoreSummary: document.getElementById("quiz-score-summary"),
      breakdown: document.getElementById("quiz-breakdown"),
      retryBtn: document.getElementById("quiz-retry-btn"),
    },
  });

  document.getElementById("start-quiz-btn").addEventListener("click", () => {
    showView("quiz-setup-view");
    quizMode.start();
  });

  document
    .getElementById("quiz-setup-home-btn")
    .addEventListener("click", () => {
      showView("home-view");
      updateStats(activeSpecies);
    });

  document.getElementById("quiz-home-btn").addEventListener("click", () => {
    quizMode.cancel();
    showView("home-view");
    updateStats(activeSpecies);
  });

  document
    .getElementById("quiz-results-home-btn")
    .addEventListener("click", () => {
      showView("home-view");
      updateStats(activeSpecies);
    });

  document.getElementById("key-home-btn").addEventListener("click", () => {
    showView("home-view");
    updateStats(activeSpecies);
  });

  document.getElementById("flash-home-btn").addEventListener("click", () => {
    showView("home-view");
    updateStats(activeSpecies);
  });

  document
    .getElementById("flashcard-select-home-btn")
    .addEventListener("click", () => {
      showView("home-view");
      updateStats(activeSpecies);
    });

  document.getElementById("browse-home-btn").addEventListener("click", () => {
    showView("home-view");
    updateStats(activeSpecies);
  });

  function openKeyChart(chartKey) {
    const chart = KEY_CHARTS[chartKey];
    document.getElementById("chart-title").textContent = chart.title;

    const container = document.getElementById("chart-image-container");
    container.innerHTML = "";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chart-thumb-btn";
    btn.setAttribute("aria-label", `View larger: ${chart.title}`);

    const img = document.createElement("img");
    img.className = "chart-image";
    img.src = chart.src;
    img.alt = chart.title;
    btn.appendChild(img);

    btn.addEventListener("click", () => {
      openLightbox([chart.src], 0, chart.title);
    });

    container.appendChild(btn);
    showView("chart-view");
  }

  document.getElementById("start-charts-btn").addEventListener("click", () => {
    showView("chart-select-view");
  });

  document
    .getElementById("chart-select-home-btn")
    .addEventListener("click", () => {
      showView("home-view");
      updateStats(activeSpecies);
    });

  document.getElementById("chart-gymno-btn").addEventListener("click", () => {
    openKeyChart("gymno");
  });

  document.getElementById("chart-angio-btn").addEventListener("click", () => {
    openKeyChart("angio");
  });

  document.getElementById("chart-home-btn").addEventListener("click", () => {
    showView("home-view");
    updateStats(activeSpecies);
  });

  function renderAddPhotoThumbs(speciesId) {
    const container = document.getElementById("addphoto-list");
    container.innerHTML = "";
    const custom = customPhotoMap.get(speciesId) || [];
    if (custom.length === 0) {
      const p = document.createElement("p");
      p.className = "hint";
      p.textContent = "No photos added yet for this tree.";
      container.appendChild(p);
      return;
    }
    for (const photo of custom) {
      const wrapper = document.createElement("div");
      wrapper.className = "addphoto-thumb-wrapper";

      const img = document.createElement("img");
      img.className = "addphoto-thumb";
      img.src = photo.url;
      img.alt = "Added photo";
      wrapper.appendChild(img);

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "addphoto-delete-btn";
      delBtn.setAttribute("aria-label", "Delete photo");
      delBtn.textContent = "\u00d7";
      delBtn.addEventListener("click", async () => {
        await customPhotos.deletePhoto(photo.id);
        customPhotoMap.set(
          speciesId,
          (customPhotoMap.get(speciesId) || []).filter(
            (p) => p.id !== photo.id,
          ),
        );
        const species = speciesList.find((s) => s.id === speciesId);
        if (species) {
          species.images = species.images.filter((src) => src !== photo.url);
        }
        renderAddPhotoThumbs(speciesId);
      });
      wrapper.appendChild(delBtn);

      container.appendChild(wrapper);
    }
  }

  function populateAddPhotoSelect() {
    const select = document.getElementById("addphoto-species-select");
    select.innerHTML = "";
    const sorted = [...speciesList].sort((a, b) =>
      a.commonName.localeCompare(b.commonName),
    );
    for (const s of sorted) {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = s.commonName;
      select.appendChild(opt);
    }
  }

  document
    .getElementById("start-addphoto-btn")
    .addEventListener("click", () => {
      showView("addphoto-view");
      populateAddPhotoSelect();
      renderAddPhotoThumbs(
        document.getElementById("addphoto-species-select").value,
      );
    });

  document.getElementById("addphoto-home-btn").addEventListener("click", () => {
    showView("home-view");
    updateStats(activeSpecies);
  });

  document
    .getElementById("addphoto-species-select")
    .addEventListener("change", (event) => {
      renderAddPhotoThumbs(event.target.value);
    });

  document
    .getElementById("addphoto-save-btn")
    .addEventListener("click", async () => {
      const select = document.getElementById("addphoto-species-select");
      const fileInput = document.getElementById("addphoto-file-input");
      const file = fileInput.files[0];
      if (!file) return;

      const saveBtn = document.getElementById("addphoto-save-btn");
      saveBtn.disabled = true;
      saveBtn.textContent = "Saving...";
      try {
        const speciesId = select.value;
        const photo = await customPhotos.addPhoto(speciesId, file);
        if (!customPhotoMap.has(speciesId)) customPhotoMap.set(speciesId, []);
        customPhotoMap.get(speciesId).push(photo);

        const species = speciesList.find((s) => s.id === speciesId);
        if (species) {
          species.images = [...(species.images || []), photo.url];
        }

        fileInput.value = "";
        renderAddPhotoThumbs(speciesId);
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save Photo";
      }
    });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("service-worker.js")
        .then((registration) => {
          // Browsers (especially installed/home-screen PWAs on phones) only
          // check for a new service-worker.js occasionally on their own —
          // force an immediate check every time the app is opened so updates
          // land right away instead of waiting up to a day.
          registration.update();
        })
        .catch((err) => {
          console.warn("Service worker registration failed", err);
        });
    });

    // Once a new service worker takes over, the old cached JS/HTML already
    // running in memory is still stale — reload once to pick up the update.
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }
}

main().catch((err) => {
  console.error("Failed to start Tree ID Trainer", err);
  document.body.innerHTML =
    '<p style="padding:2rem">Failed to load app data. Check the console for details.</p>';
});
