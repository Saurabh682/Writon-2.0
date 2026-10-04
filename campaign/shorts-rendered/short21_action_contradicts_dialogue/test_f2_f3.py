import numpy as np

orig_load = np.load
np.load = lambda *args, **kwargs: orig_load(*args, **{**kwargs, 'allow_pickle': True})

from kokoro_onnx import Kokoro

kokoro = Kokoro('models/kokoro/kokoro-v0_19.onnx', 'models/kokoro/voices.bin')

print("--- Testing F2 speed variants ---")
for spd in [1.12, 1.15, 1.18, 1.20]:
    s, sr = kokoro.create('"I\'m fine!" she exclaimed defensively.', voice='af_sarah', speed=spd, lang='en-us')
    print(f"F2 spd={spd} -> dur={len(s)/sr:.2f}s")

print("--- Testing F3 speed variants ---")
for spd in [1.05, 1.08, 1.10]:
    s, sr = kokoro.create('"I\'m fine." She wiped again.', voice='af_sarah', speed=spd, lang='en-us')
    print(f"F3 spd={spd} -> dur={len(s)/sr:.2f}s")
