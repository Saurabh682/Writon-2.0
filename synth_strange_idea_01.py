import numpy as np
orig_load = np.load
np.load = lambda *args, **kwargs: orig_load(*args, **{**kwargs, 'allow_pickle': True})
from kokoro_onnx import Kokoro
import soundfile as sf

kokoro = Kokoro('models/kokoro/kokoro-v0_19.onnx', 'models/kokoro/voices.bin')

# Tightened, punched script for One Strange Idea #01
# Target duration: ~18-20s voice
sentences = [
    ("An AI can write five pull requests before your coffee gets cold.", 1.28, 0.18),
    ("Writing code has never been cheaper.", 1.28, 0.20),
    ("Reviewing code still takes context, edge-case paranoia, and owning the bug.", 1.26, 0.22),
    ("When generation is free, verification becomes the tax.", 1.26, 0.25),
    ("The bottleneck didn't disappear. It moved from writing code to trusting it.", 1.26, 0.0)
]

all_audio = []
timestamps = []
current_time = 0.0

for text, spd, pause_sec in sentences:
    samples, sr = kokoro.create(text, voice='af_nicole', speed=spd, lang='en-us')
    dur = len(samples) / sr
    timestamps.append((text, current_time, current_time + dur))
    all_audio.append(samples)
    if pause_sec > 0:
        pause = np.zeros(int(sr * pause_sec))
        all_audio.append(pause)
        current_time += dur + pause_sec
    else:
        current_time += dur

final_samples = np.concatenate(all_audio)
out_voice = 'campaign/shorts-rendered/strange_idea_01_ai_bottleneck/assets/voice_raw.wav'
sf.write(out_voice, final_samples, 24000)

voice_dur = len(final_samples) / 24000
print(f"Total voice duration: {voice_dur:.2f}s")
for text, start, end in timestamps:
    print(f"[{start:.2f}s - {end:.2f}s] {text}")

with open('campaign/shorts-rendered/strange_idea_01_ai_bottleneck/assets/timestamps.txt', 'w') as f:
    for text, start, end in timestamps:
        f.write(f"{start:.2f}|{end:.2f}|{text}\n")
