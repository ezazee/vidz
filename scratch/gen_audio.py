import wave, math, random, struct

def generate_tone(filename, duration_sec=10, sample_rate=44100):
    with wave.open(filename, 'w') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        
        for i in range(duration_sec * sample_rate):
            t = float(i) / sample_rate
            # C major chord drone
            val = math.sin(2 * math.pi * 261.63 * t) + \
                  math.sin(2 * math.pi * 329.63 * t) + \
                  math.sin(2 * math.pi * 392.00 * t)
            val = val / 3.0 # normalize
            
            # Apply slow volume envelope (LFO)
            lfo = (math.sin(2 * math.pi * 0.1 * t) + 1) / 2
            
            sample = int(val * lfo * 32767.0)
            wav.writeframesraw(struct.pack('<h', sample))

generate_tone('scratch/test.wav')
print("Generated scratch/test.wav")
