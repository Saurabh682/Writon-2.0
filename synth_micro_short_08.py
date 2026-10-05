import numpy as np
orig_load = np.load
np.load = lambda *args, **kwargs: orig_load(*args, **{**kwargs, 'allow_pickle': True})
from kokoro_onnx import Kokoro
import soundfile as sf

kokoro = Kokoro('models/kokoro/kokoro-v0_19.onnx', 'models/kokoro/voices.bin')

# Paced, punchy narration strictly matching user request:
# Beat 1: "Six minutes versus ninety minutes."
# Beat 2: "An AI coding agent finishes in six minutes. The CI pipeline takes an hour and a half."
# Beat 3: "We accelerated the writer. Not the factory."
# Beat 4: "The infrastructure choke."

sentences = [
    ("Six minutes versus ninety minutes.", 1.25, 0.25),
    ("An AI coding agent finishes in six minutes. The CI pipeline takes an hour and a half.", 1.25, 0.35),
    ("We accelerated the writer. Not the factory.", 1.22, 0.35),
    ("The infrastructure choke.", 1.20, 0.0)
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
out_voice = 'campaign/shorts-rendered/micro_short_08_ci_choke/assets/voice_raw.wav'
sf.write(out_voice, final_samples, 24000)

voice_dur = len(final_samples) / 24000
print(f"Total voice duration: {voice_dur:.2f}s")
for text, start, end in timestamps:
    print(f"[{start:.2f}s - {end:.2f}s] {text}")

with open('campaign/shorts-rendered/micro_short_08_ci_choke/assets/timestamps.txt', 'w') as f:
    for text, start, end in timestamps:
        f.write(f"{start:.2f}|{end:.2f}|{text}\n")
