import { LyricLine } from '../classes/LyricLine.js';
import { PitchLine } from '../classes/Pitch.js';

/**
 * Parses an FQS Score object into a format suitable for MIDI playback.
 */
export class FqsToMidiParser {
    constructor(score) {
        this.score = score;
        this.midi_params = score.data.midi_params || {};
        this.noteEvents = [];
        this.lineBoundaries = [];
        this.parse();
    }

    parse() {
        const tempo = parseInt(this.midi_params.tempo, 10) || 120;
        const beatDuration = 60.0 / tempo;
        const rollChords = (this.midi_params.roll !== 'off');

        this.score.pitchLines.forEach((pitchLine, lineIndex) => {
            let lineCurrentTime = 0.0;
            const lyricLine = this.score.lyricLines[lineIndex];

            if (!pitchLine || !lyricLine) return;

            let pitchIdx = 0;
            // Iterate over the tuplets, which correctly group rhythms by beat.
            for (const tuplet of lyricLine.tuplets) {
                // tuplet.text contains the rhythm for one beat, e.g., "(*--*)*" or "**"
                // We need to count subdivisions. Anything enclosed in '()' is one subdivision
                // Otherwise each character is a subdivision.
                tupletDivisions =
                // Clean the string to only contain rhythm characters.
                const lyricBeatString = tuplet.text.replace(/[()|\s]/g, '');
                const numSubdivisions = lyricBeatString.length;

                if (numSubdivisions === 0) {
                    lineCurrentTime += beatDuration; // Rest beat
                    continue;
                }

                const tupletMultiplier = 1.0 / tuplet.tupletSize;
                const subdivisionDuration = (beatDuration * tupletMultiplier) / numSubdivisions;

                const lyricAttackIndices = [...lyricBeatString.matchAll(/\*/g)].map(m => m.index);

                for (let k = 0; k < lyricAttackIndices.length; k++) {
                    const attackStartInBeat = lyricAttackIndices[k];
                    const attackStartTime = lineCurrentTime + (attackStartInBeat * subdivisionDuration);

                    const nextAttackStartInBeat = (k + 1 < lyricAttackIndices.length) ? lyricAttackIndices[k + 1] : numSubdivisions;
                    const attackDurationSubdivs = nextAttackStartInBeat - attackStartInBeat;
                    const attackDuration = attackDurationSubdivs * subdivisionDuration;

                    const currentPitch = pitchLine.pitches[pitchIdx];

                    if (currentPitch && currentPitch.isChordPitch) {
                        const chordGroup = [];
                        const chordGroupNumber = currentPitch.chordGroupNumber;
                        while (pitchIdx < pitchLine.pitches.length &&
                            pitchLine.pitches[pitchIdx].isChordPitch &&
                            pitchLine.pitches[pitchIdx].chordGroupNumber === chordGroupNumber) {
                            chordGroup.push(pitchLine.pitches[pitchIdx]);
                            pitchIdx++;
                        }

                        const numChordTones = chordGroup.length;
                        // The roll delay is based on one subdivision, not the whole attack duration
                        const rollDelayPerNote = rollChords ? (subdivisionDuration / numChordTones) : 0;

                        for (let toneIdx = 0; toneIdx < numChordTones; toneIdx++) {
                            const pitch = chordGroup[toneIdx];
                            const rollOffset = toneIdx * rollDelayPerNote;

                            this.noteEvents.push({
                                note: pitch.midiNote,
                                time: attackStartTime + rollOffset,
                                duration: subdivisionDuration - rollOffset,
                                lineIndex: lineIndex
                            });
                        }
                    } else { // It's a single note
                        if (currentPitch) {
                            this.noteEvents.push({
                                note: currentPitch.midiNote,
                                time: attackStartTime,
                                duration: attackDuration,
                                lineIndex: lineIndex
                            });
                            pitchIdx++;
                        }
                    }
                }
                lineCurrentTime += beatDuration * tupletMultiplier;
            }
            this.lineBoundaries.push({ startTime: 0, endTime: lineCurrentTime });
        });
    }

    getNoteEvents() {
        return this.noteEvents;
    }

    getLineBoundaries() {
        return this.lineBoundaries;
    }
}
