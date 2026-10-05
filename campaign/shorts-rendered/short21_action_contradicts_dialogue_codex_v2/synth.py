"""Build complete, measured, non-overlapping Kokoro narration for this Short."""
from pathlib import Path
import json
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[2]
TEXT = [
    "She says she's fine. Do you believe her?",
    "I'm fine, she exclaimed defensively.",
    "I'm fine. She wiped the counter again.",
    "Let actions contradict words.",
    "Take your time. He checked his watch again.",
    "Let the action reveal it. Subscribe for daily craft fixes.",
]

# The existing, locally trusted legacy voice bank uses NumPy pickle storage.
original_load = np.load
try:
    np.load = lambda *a, **kw: original_load(*a, **{**kw, "allow_pickle": True})
    voice = Kokoro(str(REPO / "models/kokoro/kokoro-v0_19.onnx"),
                   str(REPO / "models/kokoro/voices.bin"))
finally:
    np.load = original_load

for speed in (1.04,):
    clips = []
    for i, text in enumerate(TEXT):
        if i == 5:
            lesson, sr = voice.create("Let the action reveal it.", voice="af_nicole", speed=speed, lang="en-us")
            cta, _ = voice.create("Subscribe for daily craft fixes.", voice="af_sarah", speed=speed, lang="en-us")
            samples = np.concatenate((lesson, np.zeros(round(sr * 0.12), dtype=np.float32), cta))
        else:
            samples, sr = voice.create(text, voice="af_nicole", speed=speed, lang="en-us")
        active = np.flatnonzero(np.abs(samples) > 0.004)
        assert active.size, f"Empty narration: {text}"
        pad = int(sr * 0.05)
        clips.append(samples[max(0, active[0] - pad):min(len(samples), active[-1] + pad + 1)])
    durations = [len(c) / sr for c in clips]
    minimums = [max(d + 0.18, 1.4 if i == 0 else 0) for i, d in enumerate(durations[:5])]
    break
else:
    raise RuntimeError("Narration cannot fit naturally; revise copy rather than clipping speech")

holds = minimums
cta_start = sum(holds)
total_duration = float(np.ceil((cta_start + max(4.0, durations[5] + 0.55)) * 30) / 30)
audio = np.zeros(round(total_duration * sr), dtype=np.float32)
timings = []
cursor = 0.0
for i, (text, clip) in enumerate(zip(TEXT, clips)):
    scene_start = cursor if i < 5 else cta_start
    scene_end = scene_start + holds[i] if i < 5 else total_duration
    start = scene_start + (0.05 if i < 5 else 0.45)
    end = start + len(clip) / sr
    assert end <= scene_end - 0.05, (text, end, scene_end)
    sample_start = round(start * sr)
    audio[sample_start:sample_start + len(clip)] = clip
    timings.append(dict(text=text, start=start, end=end, sceneStart=scene_start, sceneEnd=scene_end))
    cursor = scene_end
    print(f"{scene_start:.2f}-{scene_end:.2f}s | speech {start:.2f}-{end:.2f}s | {text}", flush=True)

assert all(a["end"] < b["start"] for a, b in zip(timings, timings[1:]))
assert abs(timings[-1]["sceneEnd"] - total_duration) < 1e-6
audio *= min(1, 0.78 / max(float(np.max(np.abs(audio))), 0.001))
sf.write(ROOT / "assets/voice.wav", audio, sr)
(ROOT / "assets/timings.json").write_text(json.dumps(timings, indent=2), encoding="utf-8")
(ROOT / "assets/timings.js").write_text("window.shortTimings = " + json.dumps(timings) + ";", encoding="utf-8")
for filename in ("hyperframes.json", "index.motion.json"):
    path = ROOT / filename
    config = json.loads(path.read_text(encoding="utf-8"))
    config["duration"] = total_duration
    for assertion in config.get("assertions", []):
        if assertion.get("selector") == "#caption4":
            assertion["bySec"] = timings[4]["sceneStart"] + 0.1
    path.write_text(json.dumps(config, indent=2), encoding="utf-8")
import re
html_path = ROOT / "index.html"
html = html_path.read_text(encoding="utf-8")
html = re.sub(r'data-duration="[\d.]+"', f'data-duration="{total_duration}"', html)
html_path.write_text(html, encoding="utf-8")
print(f"Full script duration: {total_duration:.2f}s", flush=True)
print(f"Kokoro af_nicole lesson / af_sarah subscription CTA, speed {speed}; no overlapping or clipped narration", flush=True)
