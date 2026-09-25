import numpy as np
orig_load = np.load
np.load = lambda *args, **kwargs: orig_load(*args, **{**kwargs, 'allow_pickle': True})
from kokoro_onnx import Kokoro
import soundfile as sf

kokoro = Kokoro('models/kokoro/kokoro-v0_19.onnx', 'models/kokoro/voices.bin')

sentences = [
    ("Make jealousy visible — without saying jealous.", 1.30, 0.15),
    ("Delete the emotion.", 1.30, 0.15),
    ("She liked Mira's post, unliked it, then liked it again.", 1.26, 0.18),
    ("Don't announce the feeling.", 1.26, 0.16),
    ("Jealousy is attention you never meant to pay.", 1.25, 0.0)
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
out_path = 'campaign/shorts-rendered/short14_write_jealousy/assets/voice_compressed.wav'
sf.write(out_path, final_samples, 24000)

print(f"Total voice duration: {len(final_samples)/24000:.2f}s")
for text, start, end in timestamps:
    print(f"[{start:.2f}s - {end:.2f}s] {text}")
