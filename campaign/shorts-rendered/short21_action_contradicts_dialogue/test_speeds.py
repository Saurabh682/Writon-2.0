import soundfile as sf
import numpy as np

orig_load = np.load
np.load = lambda *args, **kwargs: orig_load(*args, **{**kwargs, 'allow_pickle': True})

from kokoro_onnx import Kokoro

kokoro = Kokoro('models/kokoro/kokoro-v0_19.onnx', 'models/kokoro/voices.bin')

tests = [
    # Frame 1: target 0-2s (around 1.1s)
    ("Do you believe her?", "af_nicole", 1.05),
    
    # Frame 2: target 2-4s (around 2.0s)
    ("I'm fine, she exclaimed defensively.", "af_nicole", 1.15),
    ("I'm fine, she exclaimed defensively.", "af_nicole", 1.20),
    ("I'm fine, she exclaimed defensively.", "af_nicole", 1.25),
    ("I'm fine! She said defensively.", "af_nicole", 1.15),
    
    # Frame 3: target 4-6s (around 1.8-2.0s)
    ("I'm fine. She wiped again.", "af_nicole", 1.10),
    ("I'm fine. She wiped again.", "af_nicole", 1.15),
    ("I'm fine. She wiped again.", "af_nicole", 1.20),
    
    # Frame 4: target 6-8s (around 1.6-1.8s)
    ("Let actions contradict words.", "af_nicole", 1.10),
    ("Let actions contradict words.", "af_nicole", 1.15),
    
    # Frame 5: target 8-10s (around 1.0s)
    ("Take your time.", "af_nicole", 1.05),
    
    # Frame 6: target 10-14s (around 3.0-3.5s)
    ("He checked his watch again.", "af_nicole", 1.10),
    ("Subscribe for daily craft fixes.", "af_nicole", 1.10),
    ("He checked his watch again. Subscribe for daily craft fixes.", "af_nicole", 1.15),
    ("He checked his watch again. Subscribe for daily craft fixes.", "af_nicole", 1.20),
    ("He checked his watch again. Subscribe for daily craft fixes.", "af_nicole", 1.25),
]

for text, voice, spd in tests:
    samples, sr = kokoro.create(text, voice=voice, speed=spd, lang="en-us")
    dur = len(samples) / sr
    print(f"spd={spd:.2f} | dur={dur:.2f}s | {text}")
