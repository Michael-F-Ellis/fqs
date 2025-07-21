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

    playStopLine(score, lineIndex) {
        console.log(`playStopLine called for score ${score.id}, line ${lineIndex}`);
        // If the clicked line is already playing, stop it.
        if (this.playingScoreId === score.id && this.playingLineIndex === lineIndex) {
            console.log("Stopping the currently playing line.");
            this.stop();
            return;
        }

        // If another line is playing, stop it before starting the new one.
        if (this.playingScoreId !== null) {
            console.log("Another line is playing, stopping it first.");
            this.stop();
        }
        
        if (Tone.context.state !== 'running') {
            Tone.context.resume();
        }

        const boundary = score.lineBoundaries[lineIndex];
        console.log("Line boundary:", boundary);
        const notesForLine = score.noteEvents.filter(event => event.lineIndex === lineIndex);
        console.log("Notes for this line:", JSON.stringify(notesForLine, null, 2));

        if (!boundary || notesForLine.length === 0) {
            console.log("No notes to play for this line.");
            return;
        }

        this.playingScoreId = score.id;
        this.playingLineIndex = lineIndex;
        this.toggleIcon(true);

        Tone.Transport.bpm.value = score.data.midi_params.tempo || 120;
        console.log("BPM set to:", Tone.Transport.bpm.value);
        
        if (this.part) {
            this.part.dispose();
        }
        this.part = new Tone.Part((time, value) => {
            console.log(`Playing note: ${value.note} at time ${time} for duration ${value.duration}`);
            this.synth.triggerAttackRelease(Tone.Frequency(value.note, "midi"), value.duration, time);
        }, notesForLine).start(0);
        
        if (score.data.midi_params.metronome === 'on') {
            if (this.metronome) this.metronome.dispose();
            this.metronome = new Tone.Loop(time => {
                new Tone.MembraneSynth().toDestination().triggerAttackRelease("C4", "8n", time);
            }, "4n").start(0);
        }

        const stopTime = boundary.endTime;
        console.log(`Scheduling stop in ${stopTime} seconds.`);
        Tone.Transport.scheduleOnce(() => {
            console.log("Scheduled stop called.");
            this.stop();
        }, stopTime); // Duration of the line

        this.part.start(0);
        console.log(`Starting transport at offset: 0`);
        Tone.Transport.start(Tone.now());
    }

    stop() {
        console.log("stop() called.");
        Tone.Transport.stop();
        Tone.Transport.cancel();
        if (this.part) {
            this.part.stop();
        }
        Tone.Transport.position = 0;
        console.log("Transport position reset to 0.");
        if (this.metronome) {
            this.metronome.dispose();
            this.metronome = null;
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
