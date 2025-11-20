// Per-parse initializer. Runs at the beginning of each parse.
{
	let subBeatNumber = 0;
	let beatNumber = 0;
	function newBeatTuple() {
		subBeatNumber = 0;
	}
	function incSubBeatNumber(n = 1) {
		subBeatNumber += n;
		return subBeatNumber;
	}
	function incBeatNumber(n = 1) {
		beatNumber += n;
		return beatNumber;
	}
}
// -- Music line components & Tokens --
MusicLine
	= "music:" _ value: Bar + { return { music: value };} 

Bar
	= _ keysig: KeySig ? _ tuples: (b: BeatTuple _ { return b })+ rest: (_ Barline) {
	return { type: "bar", keysig, tuples }
}

Barline
	= "|"

KeySig
	= "K0" / ("K"[# &][1 - 7])

BeatTuple
	= sz: [2 - 9] ? tuple : Beat {
	newBeatTuple()
	let size = sz ? parseInt(sz) : 1;
	return { size, tuple }
}

Beat
	= subbeats: SubBeat + partials: Partial * {
		const npartial = partials.length
  return { subbeats, npartial }
	}

SubBeat = chord:Chord {
	const num = incSubBeatNumber();
	return { type: 'chord', chord, num }
}
  / pitch:Pitch {
const num = incSubBeatNumber();
return { type: 'pitch', values: pitch, num }
  }
  / rest:Rest {
const num = incSubBeatNumber()
return { type: 'rest', values: rest, num }
  }
  / Hold  {
const num = incSubBeatNumber();
return { type: 'hold', num }
}

Chord
	= "(" pitches: Pitch + ")" { return pitches }

Rest
	= ";" {
	return { x: null, y: null, duration: null }
}

Hold
	= SingleHold / DoubleHold

SingleHold
	= "-"

DoubleHold
	= "="

Partial
	= "_"

Pitch
	= marks:OctaveMarks alts:Alteration note:NoteName {
	return { marks, alts, note, oct: null, x: null, y: null, duration: null }
}

// We return the number of octaves up (positive) or down (negative)
OctaveMarks
	= marks: ("^" +) { return marks.length; }
/ marks:("/"+) { return -1 * marks.length; }
	/ ""           { return 0; }


// We return the number of sharps (positive) or flats (negative)
Alteration
	= alt: "&&" { return -2; } 
  / alt: "&" {return -1}
	/ alt: "##" { return 2 }
  / alt: "#" {return 1}
	/ ""       { return 0 }

NoteName
	= $[a - g]

_
	= [\t] *