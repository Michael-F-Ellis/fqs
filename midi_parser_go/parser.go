package midi_parser

import (
	"regexp"
	"strings"
)

// NoteEvent represents a single MIDI note to be played.
type NoteEvent struct {
	Note     int     // MIDI note number
	Time     float64 // Start time in seconds from the beginning of the line
	Duration float64 // Duration in seconds
}

// Pitch represents a single musical pitch.
type Pitch struct {
	MidiNote         int
	IsChordPitch     bool
	ChordGroupNumber int
}

// Tuplet represents a rhythmic grouping within a beat.
type Tuplet struct {
	Text       string // The raw lyric text, e.g., "(*--*)"
	TupletSize int    // e.g., 3 for a triplet
}

// LyricLine represents a line of lyrics, providing the rhythmic structure.
type LyricLine struct {
	Tuplets []Tuplet
}

// PitchLine represents a line of musical pitches.
type PitchLine struct {
	Pitches []Pitch
}

// MidiParams contains MIDI-specific parameters for playback.
type MidiParams struct {
	Tempo int
	Roll  string // "on" or "off"
}

// Score represents the entire musical piece to be parsed.
type Score struct {
	PitchLines []PitchLine
	LyricLines []LyricLine
	MidiParams MidiParams
}

var nonRhythmRegex = regexp.MustCompile(`[()|\s]`)

// calculateNoteStartTimes performs the first pass, determining the precise start time
// for every single note, including rolled chord offsets.
func calculateNoteStartTimes(lyricLine LyricLine, pitchLine PitchLine, beatDuration float64, rollChords bool) []float64 {
	noteStartTimes := []float64{}
	lineCurrentTime := 0.0
	pitchIdx := 0

	for _, tuplet := range lyricLine.Tuplets {
		if pitchIdx >= len(pitchLine.Pitches) {
			break
		}

		lyricBeatString := nonRhythmRegex.ReplaceAllString(tuplet.Text, "")
		tupletMultiplier := 1.0 / float64(tuplet.TupletSize)
		tupletDuration := beatDuration * tupletMultiplier

		if !strings.Contains(lyricBeatString, "*") {
			lineCurrentTime += tupletDuration
			continue
		}

		numSubdivisions := len(lyricBeatString)
		subdivisionDuration := tupletDuration / float64(numSubdivisions)
		attackIndices := regexp.MustCompile(`\*`).FindAllStringIndex(lyricBeatString, -1)

		for _, attackIndex := range attackIndices {
			if pitchIdx >= len(pitchLine.Pitches) {
				break
			}

			attackStartInBeat := attackIndex[0]
			attackStartTime := lineCurrentTime + (float64(attackStartInBeat) * subdivisionDuration)
			
			currentPitch := pitchLine.Pitches[pitchIdx]

			if currentPitch.IsChordPitch {
				// Peek ahead to see how many notes are in this chord
				chordGroupNumber := currentPitch.ChordGroupNumber
				numChordTones := 0
				for i := pitchIdx; i < len(pitchLine.Pitches) && pitchLine.Pitches[i].IsChordPitch && pitchLine.Pitches[i].ChordGroupNumber == chordGroupNumber; i++ {
					numChordTones++
				}

				var rollDelayPerNote float64
				if rollChords && numChordTones > 0 {
					rollDelayPerNote = subdivisionDuration / float64(numChordTones)
				}

				for i := 0; i < numChordTones; i++ {
					rollOffset := float64(i) * rollDelayPerNote
					noteStartTimes = append(noteStartTimes, attackStartTime+rollOffset)
				}
				pitchIdx += numChordTones

			} else {
				noteStartTimes = append(noteStartTimes, attackStartTime)
				pitchIdx++
			}
		}
		lineCurrentTime += tupletDuration
	}
	return noteStartTimes
}

// buildNoteEvents performs the second pass, calculating durations and creating the final events.
func buildNoteEvents(noteStartTimes []float64, pitchLine PitchLine, beatDuration float64) []NoteEvent {
	events := []NoteEvent{}
	for i, startTime := range noteStartTimes {
		var duration float64
		if i+1 < len(noteStartTimes) {
			duration = noteStartTimes[i+1] - startTime
		} else {
			duration = beatDuration // Default duration for the last note
		}

		// Ensure we don't have more start times than pitches
		if i >= len(pitchLine.Pitches) {
			break
		}

		events = append(events, NoteEvent{
			Note:     pitchLine.Pitches[i].MidiNote,
			Time:     startTime,
			Duration: duration,
		})
	}
	return events
}

// Parse takes a Score object and returns a slice of NoteEvents for each line.
func Parse(score Score) [][]NoteEvent {
	allLinesEvents := make([][]NoteEvent, len(score.PitchLines))
	beatDuration := 60.0 / float64(score.MidiParams.Tempo)
	rollChords := score.MidiParams.Roll != "off"

	for lineIndex, pitchLine := range score.PitchLines {
		if lineIndex >= len(score.LyricLines) {
			break
		}
		lyricLine := score.LyricLines[lineIndex]

		// Pass 1: Get all note start times
		noteStartTimes := calculateNoteStartTimes(lyricLine, pitchLine, beatDuration, rollChords)

		// Pass 2: Build the final events with durations
		allLinesEvents[lineIndex] = buildNoteEvents(noteStartTimes, pitchLine, beatDuration)
	}

	return allLinesEvents
}