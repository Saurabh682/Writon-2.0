import numpy as np
orig_load = np.load
np.load = lambda *args, **kwargs: orig_load(*args, **{**kwargs, 'allow_pickle': True})
from kokoro_onnx import Kokoro
import soundfile as sf

kokoro = Kokoro('models/kokoro/kokoro-v0_19.onnx', 'models/kokoro/voices.bin')

# Writing Hack #15: Refined Hook to "Make this hurt — without naming the grief."
sentences = [
    ("Make this hurt — without naming the grief.", 1.28, 0.15),
    ("Delete the emotion.", 1.30, 0.15),
    ("He found the wooden hangers clattering together in the empty closet.", 1.25, 0.18),
    ("Don't describe the grief.", 1.25, 0.16),
    ("Show the sound it leaves behind.", 1.25, 0.0)
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
out_path = 'campaign/shorts-rendered/short15_make_this_hurt/assets/voice_raw.wav'
sf.write(out_path, final_samples, 24000)

print(f"Total voice duration: {len(final_samples)/24000:.2f}s")
for text, start, end in timestamps:
    print(f"[{start:.2f}s - {end:.2f}s] {text}")
