import { createSpeciesGallery } from "./imageUtils.js";

export function initCompareMode({ speciesList, softwoodGroupIds, elements }) {
  let woodFilter = "all";

  function isSoftwood(species) {
    return softwoodGroupIds.includes(species.groupId);
  }

  function filteredSpecies() {
    if (woodFilter === "softwood") return speciesList.filter(isSoftwood);
    if (woodFilter === "hardwood")
      return speciesList.filter((s) => !isSoftwood(s));
    return speciesList;
  }

  function populateSelect(select, list, preferredIndex) {
    const previousValue = select.value;
    const sorted = [...list].sort((a, b) =>
      a.commonName.localeCompare(b.commonName),
    );
    select.innerHTML = "";
    sorted.forEach((s) => {
      const option = document.createElement("option");
      option.value = s.id;
      option.textContent = s.commonName;
      select.appendChild(option);
    });

    const stillPresent = sorted.some((s) => s.id === previousValue);
    if (stillPresent) {
      select.value = previousValue;
    } else if (sorted.length > 0) {
      select.selectedIndex = Math.min(preferredIndex, sorted.length - 1);
    }
  }

  function renderCard(species) {
    const card = document.createElement("div");
    card.className = "compare-card";

    const gallery = createSpeciesGallery(
      species,
      `${species.commonName} leaves`,
    );
    card.appendChild(gallery);

    const h2 = document.createElement("h2");
    h2.textContent = species.commonName;
    card.appendChild(h2);

    const latin = document.createElement("p");
    latin.className = "latin-name";
    const em = document.createElement("em");
    em.textContent = species.latinName;
    latin.appendChild(em);
    if (species.phonetic) {
      const phonetic = document.createElement("span");
      phonetic.className = "phonetic";
      phonetic.textContent = ` (${species.phonetic})`;
      latin.appendChild(phonetic);
    }
    card.appendChild(latin);

    const genus = document.createElement("p");
    genus.className = "compare-genus";
    genus.textContent = `Genus: ${species.genus}`;
    card.appendChild(genus);

    return card;
  }

  function renderComparison() {
    const list = filteredSpecies();
    const speciesA = list.find((s) => s.id === elements.selectA.value);
    const speciesB = list.find((s) => s.id === elements.selectB.value);

    elements.results.innerHTML = "";
    if (!speciesA || !speciesB) return;

    const grid = document.createElement("div");
    grid.className = "compare-grid";
    grid.appendChild(renderCard(speciesA));
    grid.appendChild(renderCard(speciesB));
    elements.results.appendChild(grid);
  }

  function applyFilter() {
    const list = filteredSpecies();
    populateSelect(elements.selectA, list, 0);
    populateSelect(elements.selectB, list, 1);
    renderComparison();
  }

  function start() {
    woodFilter = "all";
    elements.filterRadios.forEach((radio) => {
      radio.checked = radio.value === "all";
    });
    applyFilter();
  }

  elements.compareBtn.addEventListener("click", renderComparison);
  elements.selectA.addEventListener("change", renderComparison);
  elements.selectB.addEventListener("change", renderComparison);
  elements.filterRadios.forEach((radio) => {
    radio.addEventListener("change", (event) => {
      woodFilter = event.target.value;
      applyFilter();
    });
  });

  return { start };
}
