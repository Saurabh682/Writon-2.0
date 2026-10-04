import soundfile as sf
import numpy as np

orig_load = np.load
np.load = lambda *args, **kwargs: orig_load(*args, **{**kwargs, 'allow_pickle': True})

from kokoro_onnx import Kokoro

kokoro = Kokoro('models/kokoro/kokoro-v0_19.onnx', 'models/kokoro/voices.bin')

# Direction: tension in the first "I'm fine" (exclaimed defensively), restraint in the second
# Let's test how Sarah pronounces:
f2_tests = [
    ('"I\'m fine!" she exclaimed defensively.', 1.10),
    ('"I\'m fine," she exclaimed defensively.', 1.10),
    ('I\'m fine! She exclaimed defensively.', 1.10),
]

for t, spd in f2_tests:
    s, sr = kokoro.create(t, voice="af_sarah", speed=spd, lang="en-us")
    print(f"F2: spd={spd} | dur={len(s)/sr:.2f}s | {t}")

f3_tests = [
    ('"I\'m fine." She wiped again.', 1.05),
    ('\"I\'m fine.\" She wiped again.', 1.00),
]

for t, spd in f3_tests:
    s, sr = kokoro.create(t, voice="af_sarah", speed=spd, lang="en-us")
    print(f"F3: spd={spd} | dur={len(s)/sr:.2f}s | {t}")
