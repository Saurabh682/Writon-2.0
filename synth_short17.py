import numpy as np
orig_load = np.load
np.load = lambda *args, **kwargs: orig_load(*args, **{**kwargs, 'allow_pickle': True})
from kokoro_onnx import Kokoro
import soundfile as sf

kokoro = Kokoro('models/kokoro/kokoro-v0_19.onnx', 'models/kokoro/voices.bin')

# Writing Hack #17: Make Guilt Visible
# Target: ~15-16s voice, ~19.5-20.0s total video (deliberate literary pauses)
sentences = [
    ("Make guilt visible.", 1.12, 0.40),
    ("Without saying guilty.", 1.12, 0.45),
    ("Delete the confession.", 1.15, 0.50),
    ("He typed: Happy belated.", 1.10, 0.35),
    ("Then turned the phone face-down.", 1.10, 0.55),
    ("Guilt doesn't explain itself.", 1.12, 0.35),
    ("Show what the character refuses to look at.", 1.10, 0.0)
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
out_voice = 'campaign/shorts-rendered/short17_make_guilt_visible/assets/voice_raw.wav'
sf.write(out_voice, final_samples, 24000)

print(f"Total voice duration: {len(final_samples)/24000:.2f}s")
for text, start, end in timestamps:
    print(f"[{start:.2f}s - {end:.2f}s] {text}")
