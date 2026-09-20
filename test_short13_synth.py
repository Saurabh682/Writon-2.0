import numpy as np
orig_load = np.load
np.load = lambda *args, **kwargs: orig_load(*args, **{**kwargs, 'allow_pickle': True})
from kokoro_onnx import Kokoro
import soundfile as sf

kokoro = Kokoro('models/kokoro/kokoro-v0_19.onnx', 'models/kokoro/voices.bin')

sentences = [
    ("Stop writing: she realized.", 1.25),
    ("Delete the realization.", 1.30),
    ("She scrolled his contacts. Three years, and he still had her saved as Priya work.", 1.25),
    ("Don't announce the realization.", 1.25),
    ("Hand over the evidence.", 1.25)
]

all_audio = []
timestamps = []
current_time = 0.0

for text, spd in sentences:
    samples, sr = kokoro.create(text, voice='af_nicole', speed=spd, lang='en-us')
    dur = len(samples) / sr
    timestamps.append((text, current_time, current_time + dur))
    all_audio.append(samples)
    pause = np.zeros(int(sr * 0.25))
    all_audio.append(pause)
    current_time += dur + (len(pause) / sr)

final_samples = np.concatenate(all_audio)
out_path = 'campaign/shorts-rendered/short13_she_realized/assets/voice_compressed.wav'
sf.write(out_path, final_samples, 24000)

print(f"Total voice duration: {len(final_samples)/24000:.2f}s")
for text, start, end in timestamps:
    print(f"[{start:.2f}s - {end:.2f}s] {text}")
