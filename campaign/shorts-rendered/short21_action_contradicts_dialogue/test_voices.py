import soundfile as sf
import numpy as np

orig_load = np.load
np.load = lambda *args, **kwargs: orig_load(*args, **{**kwargs, 'allow_pickle': True})

from kokoro_onnx import Kokoro

kokoro = Kokoro('models/kokoro/kokoro-v0_19.onnx', 'models/kokoro/voices.bin')

# Compare voices for "I'm fine, she exclaimed defensively."
# We want conversational voice, with tension in the first "I'm fine" and restraint in the second.
# Let's test af_nicole, af_bella, af_sarah, af_sky
voices = ['af_nicole', 'af_bella', 'af_sarah', 'af_sky']

print("--- Testing Frame 2: 'I'm fine,' she exclaimed defensively. ---")
for v in voices:
    s, sr = kokoro.create('"I\'m fine," she exclaimed defensively.', voice=v, speed=1.18, lang="en-us")
    print(f"voice={v} | dur={len(s)/sr:.2f}s")
    sf.write(f"campaign/shorts-rendered/short21_action_contradicts_dialogue/assets/test_f2_{v}.wav", s, sr)

print("--- Testing Frame 3: 'I'm fine.' She wiped again. ---")
for v in voices:
    s, sr = kokoro.create('"I\'m fine." She wiped again.', voice=v, speed=1.15, lang="en-us")
    print(f"voice={v} | dur={len(s)/sr:.2f}s")
    sf.write(f"campaign/shorts-rendered/short21_action_contradicts_dialogue/assets/test_f3_{v}.wav", s, sr)
