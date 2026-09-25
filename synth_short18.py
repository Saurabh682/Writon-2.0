import numpy as np
orig_load = np.load
np.load = lambda *args, **kwargs: orig_load(*args, **{**kwargs, 'allow_pickle': True})
from kokoro_onnx import Kokoro
import soundfile as sf

kokoro = Kokoro('models/kokoro/kokoro-v0_19.onnx', 'models/kokoro/voices.bin')

# Writing Hack #18: Kill Filter Words
# Surgical Script:
# "Kill filter words. She heard the floorboards creak beneath his boots. Cut the filter. The floorboards creaked beneath his boots. Keep the event. Remove the filter. Let the reader hear it directly."
sentences = [
    ("Kill filter words.", 1.10, 0.40),
    ("She heard the floorboards creak beneath his boots.", 1.12, 0.45),
    ("Cut the filter.", 1.15, 0.50),
    ("The floorboards creaked beneath his boots.", 1.10, 0.55),
    ("Keep the event.", 1.12, 0.35),
    ("Remove the filter.", 1.12, 0.35),
    ("Let the reader hear it directly.", 1.08, 0.0)
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
out_voice = 'campaign/shorts-rendered/short18_kill_filter_words/assets/voice_raw.wav'
sf.write(out_voice, final_samples, 24000)

print(f"Total voice duration: {len(final_samples)/24000:.2f}s")
for text, start, end in timestamps:
    print(f"[{start:.2f}s - {end:.2f}s] {text}")
