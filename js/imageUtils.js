export function createSpeciesImage(species, altText) {
  if (species.image) {
    const img = document.createElement("img");
    img.src = species.image;
    img.alt = altText;
    img.addEventListener("error", () => {
      img.replaceWith(createImagePlaceholder());
    });
    return img;
  }
  return createImagePlaceholder();
}

export function createImagePlaceholder() {
  const div = document.createElement("div");
  div.className = "image-placeholder";
  div.textContent = "Photo coming soon";
  return div;
}
