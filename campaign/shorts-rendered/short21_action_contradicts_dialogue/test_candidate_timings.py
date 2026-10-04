import soundfile as sf
import numpy as np

orig_load = np.load
np.load = lambda *args, **kwargs: orig_load(*args, **{**kwargs, 'allow_pickle': True})

from kokoro_onnx import Kokoro

kokoro = Kokoro('models/kokoro/kokoro-v0_19.onnx', 'models/kokoro/voices.bin')

# Test Sarah and Sky for all 6 lines at natural conversational speed (1.0 - 1.12)
lines = [
    ("Do you believe her?", 1.05),
    ('"I\'m fine!" she exclaimed defensively.', 1.08),
    ('"I\'m fine." She wiped again.', 1.05),
    ("Let actions contradict words.", 1.05),
    ('"Take your time."', 1.05),
    ("He checked his watch again.", 1.05),
    ("Subscribe for daily craft fixes.", 1.08),
]

for voice in ["af_sarah", "af_sky"]:
    print(f"=== Voice: {voice} ===")
    total = 0
    for text, spd in lines:
        s, sr = kokoro.create(text, voice=voice, speed=spd, lang="en-us")
        dur = len(s) / sr
        total += dur
        print(f"  {dur:.2f}s | {text}")
    print(f"Total raw speech: {total:.2f}s\n")
