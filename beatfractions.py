import sys
import re
from fractions import Fraction

def parse_fqs_beat(beat_string):
    """
    Parses a combined FQS music/rhythm beat string.
    Returns a list of pitch events with start/duration as fractions of the beat,
    and the generated internal lyric string for verification.
    """
    # Ignore FQS octave or accidental modifiers for this script's purpose
    cleaned_beat_string = re.sub(r'[\^\/&#%]', '', beat_string)
    
    # A token is an attack (a chord in parens or a single note) followed by its holds.
    # Example: '(dc)--a' -> ['(dc)--', 'a']
    tokens = re.findall(r'\([^)]+\)-*|[a-g]-*', cleaned_beat_string)

    lyric_string = ""
    pitches = []
    
    for token in tokens:
        # Find all pitch letters in the token
        pitch_letters = "".join(re.findall(r'[a-g]', token))
        if not pitch_letters:
            continue

        # The rhythm is one attack ('*') plus any holds ('-')
        num_holds = token.count('-')
        lyric_string += '*' + ('-' * num_holds)
        
        # Group the pitches if it's a chord
        if '(' in token:
            pitches.append(tuple(pitch_letters))
        else:
            pitches.append(pitch_letters)

    # --- Calculate Timings from Generated Lyric String ---
    num_subdivisions = len(lyric_string)
    if num_subdivisions == 0:
        return [], ""
    subdivision_duration = Fraction(1, num_subdivisions)
    
    attack_indices = [i for i, char in enumerate(lyric_string) if char == '*']
    
    if len(pitches) != len(attack_indices):
        # This error indicates a bug in the tokenization or parsing logic.
        raise ValueError(f"Mismatch between parsed pitches ({len(pitches)}) and attacks ({len(attack_indices)}).")

    results = []
    
    for pitch_idx, attack_start_subdiv in enumerate(attack_indices):
        # Determine the duration of this attack in subdivisions
        next_attack_subdiv = num_subdivisions
        if pitch_idx + 1 < len(attack_indices):
            next_attack_subdiv = attack_indices[pitch_idx+1]
        
        attack_duration_subdivs = next_attack_subdiv - attack_start_subdiv
        
        # Convert subdivision counts to fractional time
        attack_duration = attack_duration_subdivs * subdivision_duration
        attack_start_time = attack_start_subdiv * subdivision_duration

        pitch_or_chord = pitches[pitch_idx]

        if isinstance(pitch_or_chord, tuple): # It's a Chord
            num_chord_tones = len(pitch_or_chord)
            if num_chord_tones == 0: continue
            
            # The roll delay is based on the duration of a single subdivision,
            # divided evenly among the chord tones.
            roll_delay_per_note = subdivision_duration / num_chord_tones
            
            for tone_idx, tone in enumerate(pitch_or_chord):
                roll_offset = tone_idx * roll_delay_per_note
                start_time = attack_start_time + roll_offset
                # Duration is adjusted so all notes end simultaneously
                duration = attack_duration - roll_offset
                
                results.append({
                    "pitch": tone,
                    "start": start_time,
                    "duration": duration
                })
        else: # It's a single note
            results.append({
                "pitch": pitch_or_chord,
                "start": attack_start_time,
                "duration": attack_duration
            })
            
    return results, lyric_string

def main():
    if len(sys.argv) != 2:
        print("Usage: python beatfractions.py <beat_string>")
        print("Example: python beatfractions.py '(dc)--a'")
        sys.exit(1)
        
    beat_string = sys.argv[1]
    
    try:
        fractions, lyric_string = parse_fqs_beat(beat_string)
        
        if fractions:
            print(f"Parsing beat string: '{beat_string}'")
            print(f"Generated lyric string: '{lyric_string}'")
            print(f"Beat subdivisions: {len(lyric_string)}")
            print(f"Subdivision duration: 1/{len(lyric_string)}")
            print("-" * 35)
            print(f"{'Pitch':<7} {'Start':<12} {'Duration'}")
            print("-" * 35)
            for item in fractions:
                print(f"{item['pitch']:<7} {str(item['start']):<12} {str(item['duration'])}")
    except ValueError as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()