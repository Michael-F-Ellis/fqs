import { FqsToMidiParser } from './FqsToMidiParser.js';

/**
 * Manages MIDI playback using Tone.js.
 */
export class MidiPlayer {
    constructor() {
        this.synth = new Tone.Synth().toDestination();
        this.part = null;
        this.metronome = null;
        this.playingScoreId = null;
        this.playingLineIndex = -1;
    }

    async playStopLine(score, lineIndex) {
        console.log(`playStopLine called for score ${score.id}, line ${lineIndex}`);
        
        if (Tone.context.state !== 'running') {
            await Tone.start();
            console.log("AudioContext started.");
        }

        if (this.playingScoreId === score.id && this.playingLineIndex === lineIndex) {
            this.stop();
            return;
        }

        if (this.playingScoreId !== null) {
            this.stop();
        }
        
        const notesForLine = score.noteEvents[lineIndex] || [];
        if (notesForLine.length === 0) {
            console.log("No notes to play for this line.");
            return;
        }

        this.playingScoreId = score.id;
        this.playingLineIndex = lineIndex;
        this.toggleIcon(true);

        Tone.Transport.bpm.value = score.data.midi_params.tempo || 120;

        // Normalize note times to be relative to the start of the line
        const startTime = notesForLine[0].Time;
        const notesForPart = notesForLine.map(note => ({
            time: note.Time - startTime,
            note: note.Note,
            duration: note.Duration,
        }));

        // Create a new part and schedule the notes
        this.part = new Tone.Part((time, value) => {
            // Convert MIDI note number to frequency for Tone.js
            const frequency = new Tone.Midi(value.note).toFrequency();
            this.synth.triggerAttackRelease(frequency, value.duration, time);
        }, notesForPart);

        // When the part is done playing, call the stop method.
        this.part.onstop = () => {
            console.log("Part finished, calling stop().");
            this.stop();
        };
        
        // Start the part and the transport.
        this.part.start(0);
        Tone.Transport.start();
    }

    stop() {
        console.log("stop() called.");
        Tone.Transport.stop();
        Tone.Transport.cancel();
        if (this.part) {
            this.part.dispose();
            this.part = null;
        }
        
        this.toggleIcon(false);
        this.playingScoreId = null;
        this.playingLineIndex = -1;
    }

    toggleIcon(isPlaying) {
        document.querySelectorAll('.midi-play-icon').forEach(icon => {
            const scoreElement = icon.closest('.score');
            if (!scoreElement) return;

            const scoreId = scoreElement.id;
            const lineIndex = parseInt(icon.dataset.lineIndex, 10);

            if (scoreId === this.playingScoreId && lineIndex === this.playingLineIndex) {
                icon.classList.toggle('midi-playing', isPlaying);
            } else {
                icon.classList.remove('midi-playing');
            }
        });
    }
}
