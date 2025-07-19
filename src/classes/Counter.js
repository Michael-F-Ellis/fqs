import { appendSVGTextChild, appendSVGLineChild } from "../utils/svg.js";
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
    // This logic must account for multi-beat tuplets.
    let count = (n > 0) ? n : 1;
    this.counts = [];
    let barIndex = 0;
    
    for (let i = 0; i < this.tuplets.length; i++) {
        const tupletSize = this.tuplets[i].tupletSize;
        const beatPosition = this.beats[i];

        for (let j = 0; j < tupletSize; j++) {
            if (barIndex < this.bars.length && beatPosition >= this.bars[barIndex]) {
                count = 1;
                // Only advance barIndex for the first beat of a tuplet to avoid resetting mid-tuplet
                if (j === 0) { 
                    barIndex++;
                }
            }
            this.counts.push(count);
            count++;
        }
    }
  }

  createAnnulus(svg, cx, cy, radius, startFractions, beatNumber) {
    const round = (val) => Math.round(val * 1000) / 1000;
    const innerRadius = radius * 0.6; // Make the hole larger

    // Draw the outer circle (the annulus boundary)
    const outerCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    outerCircle.setAttribute("cx", cx);
    outerCircle.setAttribute("cy", cy);
    outerCircle.setAttribute("r", radius);
    outerCircle.setAttribute("fill", "none");
    outerCircle.classList.add("counter-annulus-outer");
    svg.appendChild(outerCircle);

    // Draw the inner circle to create the hole in the annulus
    const innerCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    innerCircle.setAttribute("cx", cx);
    innerCircle.setAttribute("cy", cy);
    innerCircle.setAttribute("r", innerRadius);
    innerCircle.setAttribute("fill", "white"); // Use background color
    innerCircle.classList.add("counter-annulus-inner");
    svg.appendChild(innerCircle);


    // Draw the radial lines (spokes)
    if (startFractions && startFractions.length > 0) {
        for (const startFraction of startFractions) {
            const angle = startFraction * 2 * Math.PI - (Math.PI / 2);
            const startX = round(cx + innerRadius * Math.cos(angle));
            const startY = round(cy + innerRadius * Math.sin(angle));
            const endX = round(cx + radius * Math.cos(angle));
            const endY = round(cy + radius * Math.sin(angle));

            appendSVGLineChild(svg, startX, startY, endX, endY, ["counter-annulus-spoke"]);
        }
    }

    // Draw the beat number in the center
    appendSVGTextChild(svg, cx, cy, beatNumber, ["counter"]);
  }


  render(svg, x0, y0, fontwidth) {
    let countIndex = 0;
    for (let i = 0; i < this.tuplets.length; i++) {
      const tupletSize = this.tuplets[i].tupletSize;
      const fractions = this.markers.beatFractions[i];
      const beatX = x0 + this.beats[i] * fontwidth;
      const baseFraction = this.markers.baseFractions[i];

      // Render the main glyph for the first beat of the tuplet
      const startFractions = [];
      let cumulativeFraction = 0;
      for (let j = 0; j < fractions.length; j++) {
          startFractions.push(cumulativeFraction);
          cumulativeFraction += fractions[j].val;
      }
      if (cumulativeFraction > 0 && cumulativeFraction < 1.01) {
          startFractions.push(cumulativeFraction);
      }
      
      const firstItemSpan = fractions.length > 0 ? fractions[0].span : 1;
      const radius = fontwidth * 0.7;
      const cx = beatX + (firstItemSpan * fontwidth / 2);
      const cy = y0 - fontwidth / 4;
      this.createAnnulus(svg, cx, cy, radius, startFractions, this.counts[countIndex] + '');

      let indicatorY = cy + radius + 3;

      if (tupletSize > 1) {
        // Add the tuplet indicator number
        appendSVGTextChild(svg, cx, indicatorY, tupletSize, ["tuplet-indicator"]);
        indicatorY += 4; // Move next indicator down

        // Render bare numbers for the subsequent beats spanned by the tuplet
        let targetBeat = 2;
        let durationTracker = 0;
        let charOffset = 0;

        for (let k = 0; k < fractions.length; k++) {
            const frac = fractions[k];
            const beatThreshold = (targetBeat - 1) / tupletSize;
            
            if (durationTracker + frac.val / 2 >= beatThreshold) {
                const subBeatCx = beatX + (charOffset * fontwidth) + (frac.span * fontwidth / 2);
                appendSVGTextChild(svg, subBeatCx, cy, this.counts[countIndex + targetBeat - 1] + '', ["counter"]);
                targetBeat++;
                if (targetBeat > tupletSize) break;
            }
            durationTracker += frac.val;
            charOffset += frac.span;
        }
      }

      if (baseFraction.num !== baseFraction.den) {
        const fractionString = `${baseFraction.num}/${baseFraction.den}`;
        appendSVGTextChild(svg, cx, indicatorY, fractionString, ["partial-beat-indicator"]);
      }
      
      countIndex += tupletSize;
    }
  }
}
