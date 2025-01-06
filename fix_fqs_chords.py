# Fixes old-style chords with internal octave marks
# e.g. (//c^g^e^c) --> (//cgec)
# Leaves other content unchanged.
# Outputs to stdout.

def process_music_line(line):
    state = 0  # 0=normal, 1=in_chord
    in_prefix = True  # True while collecting leading octave marks
    result = []
    
    for c in line:
        if state == 0:
            # Normal state - copy everything
            result.append(c)
            if c == '(':
                state = 1
                in_prefix = True
        else:  # state == 1
            if in_prefix:
                # Keep leading octave marks until we hit a pitch
                result.append(c)
                if c.isalpha():
                    in_prefix = False
            else:
                # Skip octave marks after first pitch until chord ends
                if c == ')':
                    state = 0
                    result.append(c)
                elif c not in '^/':
                    result.append(c)
                    
    return ''.join(result)

def fix_chords():
    for line in sys.stdin:
        if line.startswith('music:'):
            print(process_music_line(line.rstrip()))
        else:
            print(line.rstrip())

if __name__ == '__main__':
    import sys
    fix_chords()
