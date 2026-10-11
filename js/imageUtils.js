export function createSpeciesImage(species, altText) {
  const src = species.images?.[0];
  if (src) {
    const img = document.createElement("img");
    img.src = src;
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

export function createSpeciesGallery(species, altTextBase) {
  const images = species.images || [];
  if (images.length === 0) {
    return createImagePlaceholder();
  }

  const gallery = document.createElement("div");
  gallery.className = "photo-gallery";

  images.forEach((src, index) => {
    const altText = `${altTextBase} photo ${index + 1}`;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "gallery-thumb-btn";
    btn.setAttribute("aria-label", `View larger photo: ${altText}`);

    const thumb = document.createElement("img");
    thumb.className = "gallery-thumb";
    thumb.src = src;
    thumb.alt = altText;
    thumb.addEventListener("error", () => {
      btn.remove();
    });

    btn.appendChild(thumb);
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      openLightbox(images, index, altTextBase);
    });

    gallery.appendChild(btn);
  });

  return gallery;
}

let lightboxEl = null;
let lightboxImages = [];
let lightboxIndex = 0;
let lightboxAltBase = "";

function ensureLightbox() {
  if (lightboxEl) return lightboxEl;

  const overlay = document.createElement("div");
  overlay.className = "lightbox-overlay hidden";

  const img = document.createElement("img");
  img.className = "lightbox-img";
  img.addEventListener("click", (event) => event.stopPropagation());

  const prevBtn = document.createElement("button");
  prevBtn.type = "button";
  prevBtn.className = "lightbox-nav lightbox-prev";
  prevBtn.setAttribute("aria-label", "Previous photo");
  prevBtn.textContent = "\u2039";
  prevBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    showLightboxIndex(lightboxIndex - 1);
  });

  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.className = "lightbox-nav lightbox-next";
  nextBtn.setAttribute("aria-label", "Next photo");
  nextBtn.textContent = "\u203a";
  nextBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    showLightboxIndex(lightboxIndex + 1);
  });

  const counter = document.createElement("span");
  counter.className = "lightbox-counter";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "lightbox-close";
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.textContent = "\u00d7";
  closeBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    closeLightbox();
  });

  overlay.appendChild(img);
  overlay.appendChild(prevBtn);
  overlay.appendChild(nextBtn);
  overlay.appendChild(counter);
  overlay.appendChild(closeBtn);
  overlay.addEventListener("click", () => {
    closeLightbox();
  });

  document.body.appendChild(overlay);

  lightboxEl = { overlay, img, prevBtn, nextBtn, counter };
  return lightboxEl;
}

function showLightboxIndex(index) {
  if (lightboxImages.length === 0) return;
  lightboxIndex =
    ((index % lightboxImages.length) + lightboxImages.length) %
    lightboxImages.length;

  const { img, prevBtn, nextBtn, counter } = ensureLightbox();
  img.src = lightboxImages[lightboxIndex];
  img.alt = `${lightboxAltBase} photo ${lightboxIndex + 1}`;

  const hasMultiple = lightboxImages.length > 1;
  prevBtn.classList.toggle("hidden", !hasMultiple);
  nextBtn.classList.toggle("hidden", !hasMultiple);
  counter.classList.toggle("hidden", !hasMultiple);
  counter.textContent = `${lightboxIndex + 1} / ${lightboxImages.length}`;
}

export function openLightbox(images, startIndex, altTextBase) {
  lightboxImages = Array.isArray(images) ? images : [images];
  lightboxAltBase = altTextBase || "";
  const { overlay } = ensureLightbox();
  showLightboxIndex(startIndex || 0);
  overlay.classList.remove("hidden");
}

export function closeLightbox() {
  if (!lightboxEl) return;
  lightboxEl.overlay.classList.add("hidden");
}

document.addEventListener("keydown", (event) => {
  if (!lightboxEl || lightboxEl.overlay.classList.contains("hidden")) return;
  if (event.key === "Escape") {
    closeLightbox();
  } else if (event.key === "ArrowLeft") {
    showLightboxIndex(lightboxIndex - 1);
  } else if (event.key === "ArrowRight") {
    showLightboxIndex(lightboxIndex + 1);
  }
});
