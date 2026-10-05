import soundfile as sf
import numpy as np

orig_load = np.load
np.load = lambda *args, **kwargs: orig_load(*args, **{**kwargs, 'allow_pickle': True})
from kokoro_onnx import Kokoro

kokoro = Kokoro('models/kokoro/kokoro-v0_19.onnx', 'models/kokoro/voices.bin')

print('--- af_nicole line timings ---')
lines = [
    ("Do you believe her?", 1.05),
    ('"I\'m fine!" she exclaimed defensively.', 1.25),
    ('"I\'m fine." She wiped again.', 1.15),
    ("Let actions contradict words.", 1.10),
    ('"Take your time."', 1.05),
    ("He checked his watch again.", 1.10),
    ("Subscribe for daily craft fixes.", 1.12),
]
for text, spd in lines:
    s, sr = kokoro.create(text, voice='af_nicole', speed=spd, lang='en-us')
    dur = len(s) / sr
    print(f'dur={dur:.2f}s (spd={spd}) | {text}')
