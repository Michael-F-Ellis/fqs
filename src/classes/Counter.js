import { appendSVGTextChild, appendSVGPathChild, appendSVGLineChild } from "../utils/svg.js";
// The Counter class is similar to the PerBeat class. It provides
// an automated method for rendering beat numbers above the beats.
// The constructor takes 2 arguments:
//    n, the first beat number (should be 1 unless we're starting with a partial measure)
//    lyricLine, an object containing beats and bars arrays for positioning
//    markers, an array of RhythmMarkers used to compute the locations of tuplet beats
export class Counter {
  constructor(n, lyricLine, markers) {
    this.n = n;
    this.beats = lyricLine.beats;
    this.subBeats = lyricLine.subBeats;
    this.bars = lyricLine.bars;
    if (this.bars[0] == 0) {
      this.bars.shift(); // drop the pseudo barline at 0
    }
    this.markers = markers;
    this.tuplets = lyricLine.tuplets;

    // We need to generate a list of beat numbers that resets to 1
    // each time the beat position exceeds the next bar position.
    // The counting will begin with n unless n is <= 0, in which
    // case we will start with 1 for the first beat after the first bar.
    let count = (n > 0) ? n : 1;
    this.counts = [];
    let i = 0; // index into bars
    for (let beat of this.beats) {
      if (i < this.bars.length) {
        if (beat >= this.bars[i]) { // we've crossed the next bar
          count = 1;
          i++;
        }
      }
      this.counts.push(count);
      count++;
    }
  }

  createPie(svg, cx, cy, radius, startFractions) {
    const round = (val) => Math.round(val * 1000) / 1000;

    // Draw the clock face
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", cx);
    circle.setAttribute("cy", cy);
    circle.setAttribute("r", radius);
    circle.setAttribute("fill", "none");
    circle.classList.add("counter-pie-segment");
    svg.appendChild(circle);

    for (const startFraction of startFractions) {
        const startAngle = startFraction * 2 * Math.PI - (Math.PI / 2);
        // Calculate the end point of the "hand"
        const x1 = round(cx + radius * Math.cos(startAngle));
        const y1 = round(cy + radius * Math.sin(startAngle));

        // Draw the hand
        appendSVGLineChild(svg, cx, cy, x1, y1, ["counter-pie-segment"]);
    }
  }


  render(svg, x0, y0, fontwidth) {
    let i = 0;
    for (let count of this.counts) {
      let beatX = x0 + this.beats[i] * fontwidth;
      appendSVGTextChild(svg, beatX, y0, count + '', ["counter"]);

      const fractions = this.markers.beatFractions[i];
      if (fractions && fractions.length > 1) {
        // Check if all fractions are equal
        const firstVal = fractions[0].val;
        const allEqual = fractions.every(f => Math.abs(f.val - firstVal) < 1e-9);

        if (!allEqual) {
          const startFractions = [];
          let cumulativeFraction = 0;
          
          const attacks = []; // Store info about attacks: { offset: number, span: number }
          let offsetChars = 0;

          for (let j = 0; j < fractions.length; j++) {
            const frac = fractions[j];
            // Collect start fractions for ALL components
            startFractions.push(cumulativeFraction);

            if (frac.kind === '*') {
              attacks.push({ offset: offsetChars, span: frac.span });
            }
            offsetChars += frac.span;
            cumulativeFraction += frac.val;
          }

          if (attacks.length > 0) { // We need at least one attack to center on
              let targetAttack;
              if (attacks.length >= 2) {
                  targetAttack = attacks[1]; // Center on the second attack
              } else {
                  targetAttack = attacks[0]; // Center on the first (and only) attack
              }

              const radius = fontwidth / 2;
              const cx = beatX + (targetAttack.offset * fontwidth) + (targetAttack.span * fontwidth / 2);
              const cy = y0 - fontwidth / 4;
              this.createPie(svg, cx, cy, radius, startFractions);
          }
        }
      }
      i++;
    }
  }
}