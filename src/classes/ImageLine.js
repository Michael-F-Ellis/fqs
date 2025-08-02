import { lineProblems } from './LineProblem.js';

export class ImageLine {
  static imageResizeListeners = new WeakMap();

  constructor(text) {
    this.text = text.trim();
    this.wellFormed = false;

    const parts = this.text.split(/\s+/);
    try {
      this.url = new URL(parts[0]);
      if (!this.url.href.match(/\.(jpg|jpeg|png|gif|svg)$/i)) {
        lineProblems.add(`invalid image URL: ${parts[0]}`);
        return;
      }
    } catch (e) {
      lineProblems.add(`invalid image URL: ${parts[0]}`);
      return;
    }

    this.scale = parts[1] ? parseFloat(parts[1]) : 0.9;
    if (isNaN(this.scale) || this.scale <= 0) {
      lineProblems.add("image scale must be a positive number");
      return;
    }
    this.wellFormed = true;
  }

  render(svg) {
    if (!this.wellFormed) return null;

    const imageContainer = document.createElement('div');
    imageContainer.className = 'image-line'; // Class for toggling
    svg.parentNode.appendChild(imageContainer);

    const img = document.createElement('img');
    img.src = this.url.href;

    const rescaleImage = () => {
      const viewportWidth = window.innerWidth;
      img.style.width = `${viewportWidth * this.scale}px`;
      img.style.height = 'auto';
    };

    img.onload = rescaleImage;
    window.addEventListener('resize', rescaleImage);

    ImageLine.imageResizeListeners.set(imageContainer, rescaleImage);

    imageContainer.appendChild(img);

    return imageContainer;
  }
}