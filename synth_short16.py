import numpy as np
orig_load = np.load
np.load = lambda *args, **kwargs: orig_load(*args, **{**kwargs, 'allow_pickle': True})
from kokoro_onnx import Kokoro
import soundfile as sf

kokoro = Kokoro('models/kokoro/kokoro-v0_19.onnx', 'models/kokoro/voices.bin')

# Writing Hack #16: Subtext & Physical Resistance
# Natural speech rate: 1.15x speed + deliberate literary pauses
sentences = [
    ("Say it without saying it.", 1.15, 0.25),
    ("Delete the confession.", 1.18, 0.25),
    ("He let go of her hand.", 1.12, 0.35),
    ("She didn't reach back.", 1.12, 0.40),
    ("Don't announce the ending.", 1.15, 0.25),
    ("Show the reflex that stops.", 1.15, 0.0)
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
out_voice = 'campaign/shorts-rendered/short16_say_it_without_saying/assets/voice_raw.wav'
sf.write(out_voice, final_samples, 24000)

print(f"Total voice duration: {len(final_samples)/24000:.2f}s")
for text, start, end in timestamps:
    print(f"[{start:.2f}s - {end:.2f}s] {text}")
