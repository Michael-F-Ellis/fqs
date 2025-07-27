package midi_parser

import (
	"log"
	"strings"
)

const NoteEvent = 1 // triggered by an asterisk, '*' in the rhythm input
const RestEvent = 2 // triggered by a semicolon, ';' in the rhythm input
const HoldEvent = 3 // triggered by a dash, '-' in the rhythm input
const LineEvent = 4 // inserted by the parser at the beginning of each line before other events.

type MusicEvent struct {
	Kind            int     // NoteEvent | RestEvent | HoldEven | LineEvent
	LineIndex       int     // The line number this event belongs to
	tIdx            int     // index of the tuplet that contains this event.
	ChordIndex      int     // index of notes in a chord. (valid for NoteEvents. Set to -1 for non chord notes
	NumNotesInChord int     // number of notes in the chord this event belongs to
	Time            float64 // start time of event
	Duration        float64 // duration of event
	Note            int     // a MIDI pitch (valid if Kind is NoteEvent)
}

// Tuplet represents a rhythmic grouping within a beat.
type Tuplet struct {
	Text       string // The raw lyric text, e.g., "(*--*)"
	TupletSize int    // number of beats spanned by this tuplet, e.g., 2 for a 2 beat triplet
	// The following are assigned at parse time
	subDivisions int
}

// LyricLine represents a line of lyrics, providing the rhythmic structure.
type LyricLine struct {
	Tuplets []Tuplet
}

// Pitch represents a single musical pitch.
type Pitch struct {
	MidiNote         int  // MIDI note number (0-127)
	IsChordPitch     bool // True if this pitch is part of a chord
	ChordGroupNumber int  // Identifies which chord group this pitch belongs to
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

func NewScore(pitchLines []PitchLine, lyricLines []LyricLine, midiParams MidiParams) *Score {
	return &Score{
		PitchLines: pitchLines,
		LyricLines: lyricLines,
		MidiParams: midiParams,
	}
}

type FQSMIDIParser struct {
	// Input
	score *Score
	// State
	rollChords bool // stagger chord tone attacks if true
	// State variables
	tIdx            int      // index of current tuplet
	pos             int      // current position in current tuplet
	beatTime        float64  // time of current beat in beats (i.e. not yet scaled for tempo)
	chordIdx        int      // index of current chord
	inChord         bool     // whether we're in a chord
	numNotesInChord int      // number of notes in the current chord
	Tuplets         []Tuplet // tuplets for the current line
	// Output
	Events []MusicEvent
}

func NewMidiParser(score *Score) *FQSMIDIParser {
	return &FQSMIDIParser{
		score:           score,
		tIdx:            0,
		pos:             0,
		inChord:         false,
		chordIdx:        0,
		numNotesInChord: 0,
		rollChords:      score.MidiParams.Roll != "off",
		Events:          []MusicEvent{},
	}
}

func (p *FQSMIDIParser) Parse() [][]MusicEvent {
	allLinesEvents := make([][]MusicEvent, len(p.score.LyricLines))
	holdAccumulator := 0.0

	for lineIdx, lyricLine := range p.score.LyricLines {
		p.tIdx = 0
		p.pos = 0
		p.Tuplets = lyricLine.Tuplets
		p.Events = []MusicEvent{} // Clear events for the new line.

		for p.tIdx < len(p.Tuplets) {
			tuplet := &p.Tuplets[p.tIdx]
			ttext := strings.TrimSpace(tuplet.Text)
			for p.pos < len(ttext) {
				switch ttext[p.pos] {
				case '(':
					p.beginChord(ttext)
				case ')':
					p.endChord(tuplet)
				case '*':
					p.addNoteEvent(tuplet, lineIdx)
				case '-':
					p.addHoldEvent(tuplet, lineIdx)
				case ';':
					p.addRestEvent(tuplet, lineIdx)
				case '_':
					// ignore
				default:
					log.Fatalf("invalid character: %c", ttext[p.pos])
				}
				p.pos++
			}
			p.ProcessTupletEnd()
		}

		// Process holds and rests for the current line
		var lineEvents []MusicEvent
		lineEvents, holdAccumulator = p.processLineEvents(holdAccumulator)

		// Assign pitches
		pitchLine := p.score.PitchLines[lineIdx]
		pitchIdx := 0
		for i := range lineEvents {
			if lineEvents[i].Kind == NoteEvent {
				if pitchIdx < len(pitchLine.Pitches) {
					lineEvents[i].Note = pitchLine.Pitches[pitchIdx].MidiNote
					pitchIdx++
				}
			}
		}

		allLinesEvents[lineIdx] = lineEvents
	}

	// After processing all lines, if there's a lingering hold,
	// apply it to the last note of the last line that had notes.
	if holdAccumulator > 0 {
		for i := len(allLinesEvents) - 1; i >= 0; i-- {
			if len(allLinesEvents[i]) > 0 {
				lastEvent := &allLinesEvents[i][len(allLinesEvents[i])-1]
				if lastEvent.Kind == NoteEvent {
					lastEvent.Duration += holdAccumulator
					break
				}
			}
		}
	}

	return allLinesEvents
}
func (p *FQSMIDIParser) processLineEvents(holdAccumulator float64) ([]MusicEvent, float64) {
	var finalEvents []MusicEvent
	// Apply the incoming hold to the first note of the line, if it exists.
	if len(p.Events) > 0 && p.Events[0].Kind == NoteEvent {
		p.Events[0].Duration += holdAccumulator
		holdAccumulator = 0
	}

	for i := len(p.Events) - 1; i >= 0; i-- {
		event := p.Events[i]
		switch event.Kind {
		case HoldEvent:
			holdAccumulator += event.Duration
		case RestEvent:
			holdAccumulator = 0 // Rests consume holds
		case NoteEvent:
			event.Duration += holdAccumulator
			holdAccumulator = 0
			finalEvents = append([]MusicEvent{event}, finalEvents...) // Prepend
		}
	}
	return finalEvents, holdAccumulator
}

func (p *FQSMIDIParser) beginChord(ttext string) {
	p.inChord = true
	p.chordIdx = 0
	p.numNotesInChord = 0
	endParen := strings.Index(ttext[p.pos:], ")")
	if endParen == -1 {
		log.Fatalf("Mismatched parenthesis in tuplet: %s", ttext)
	}
	chordText := ttext[p.pos : p.pos+endParen]
	p.numNotesInChord = strings.Count(chordText, "*")
}

func (p *FQSMIDIParser) endChord(t *Tuplet) {
	p.inChord = false
	p.chordIdx = -1
	t.subDivisions++
}

func (p *FQSMIDIParser) addNoteEvent(tp *Tuplet, lineIdx int) {
	event := MusicEvent{
		Kind:       NoteEvent,
		LineIndex:  lineIdx,
		tIdx:       p.tIdx,
		ChordIndex: p.chordIdx,
	}
	if p.inChord {
		event.NumNotesInChord = p.numNotesInChord
	}
	p.Events = append(p.Events, event)

	if !p.inChord {
		tp.subDivisions++
	} else {
		p.chordIdx++
	}
}

func (p *FQSMIDIParser) addHoldEvent(tp *Tuplet, lineIdx int) {
	p.Events = append(p.Events, MusicEvent{
		Kind:      HoldEvent,
		LineIndex: lineIdx,
		tIdx:      p.tIdx,
	})
	if !p.inChord {
		tp.subDivisions++
	}
}

func (p *FQSMIDIParser) addRestEvent(tp *Tuplet, lineIdx int) {
	p.Events = append(p.Events, MusicEvent{
		Kind:      RestEvent,
		LineIndex: lineIdx,
		tIdx:      p.tIdx,
	})
	if !p.inChord {
		tp.subDivisions++
	}
}

func (p *FQSMIDIParser) ProcessTupletEnd() {
	tuplet := &p.Tuplets[p.tIdx]
	beats := float64(tuplet.TupletSize)
	if tuplet.subDivisions == 0 {
		p.tIdx++
		p.pos = 0
		return
	}

	// Handle partial beats
	numUnderscores := strings.Count(tuplet.Text, "_")
	if numUnderscores > 0 {
		numRhythmicChars := 0
		for _, char := range tuplet.Text {
			if strings.ContainsRune("*;-", char) {
				numRhythmicChars++
			}
		}
		if numRhythmicChars > 0 {
			beats = beats * float64(numRhythmicChars) / float64(numRhythmicChars+numUnderscores)
		}
	}

	subSize := beats / float64(tuplet.subDivisions)

	// Walk backward through the events of the current tuplet assigning start times
	subdivisionFromEnd := 0
	for i := len(p.Events) - 1; i >= 0; i-- {
		event := &p.Events[i]
		if event.tIdx != p.tIdx {
			break
		}

		isNoteOrRest := false
		switch event.Kind {
		case NoteEvent:
			isNoteOrRest = true
			if event.ChordIndex == -1 || !p.rollChords {
				event.Time = p.beatTime + (float64(tuplet.subDivisions-subdivisionFromEnd-1) * subSize)
				event.Duration = subSize
			} else {
				stagger := 0.0
				if event.NumNotesInChord > 0 {
					stagger = subSize / float64(event.NumNotesInChord)
				}
				event.Time = p.beatTime + (float64(tuplet.subDivisions-subdivisionFromEnd-1) * subSize) + float64(event.ChordIndex)*stagger
				event.Duration = subSize - float64(event.ChordIndex)*stagger
			}
		case HoldEvent, RestEvent:
			isNoteOrRest = true
			event.Time = p.beatTime + (float64(tuplet.subDivisions-subdivisionFromEnd-1) * subSize)
			event.Duration = subSize
		}

		if isNoteOrRest {
			if event.ChordIndex <= 0 {
				subdivisionFromEnd++
			}
		}
	}
	p.beatTime += beats
	p.tIdx++
	p.pos = 0
}