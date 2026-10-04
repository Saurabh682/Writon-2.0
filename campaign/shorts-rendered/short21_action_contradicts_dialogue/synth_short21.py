import os
import soundfile as sf
import numpy as np
import subprocess

orig_load = np.load
np.load = lambda *args, **kwargs: orig_load(*args, **{**kwargs, 'allow_pickle': True})

from kokoro_onnx import Kokoro

OUT_DIR = "campaign/shorts-rendered/short21_action_contradicts_dialogue"
ASSETS_DIR = f"{OUT_DIR}/assets"
PIANO_SRC = f"{ASSETS_DIR}/official_writon_piano.mp3"
CLICK_SRC = f"{ASSETS_DIR}/sfx_click.wav"
VOICE_WAV = f"{ASSETS_DIR}/voice_raw.wav"
AUDIO_MIX = f"{ASSETS_DIR}/voiceover_compressed_mixed.mp3"

kokoro = Kokoro(
    "models/kokoro/kokoro-v0_19.onnx",
    "models/kokoro/voices.bin"
)

# Total target duration: 14.0 seconds
# Timeline architecture:
# Line 1 (0.20s - 1.14s, dur 0.94s): "Do you believe her?"
# Line 2 (2.00s - 4.22s, dur 2.22s): "'I'm fine,' she exclaimed defensively." (spd=1.20, clean vocal tension)
# GAP: 4.22s - 4.45s (0.23s silent breathing room)
# Frame 3 Cut at 4.35s
# Line 3 (4.45s - 6.16s, dur 1.71s): "'I'm fine.' She wiped again." (spd=1.08, vocal restraint)
# GAP: 6.16s - 6.30s (0.14s gap)
# Frame 4 Cut at 6.25s
# Line 4 (6.30s - 8.20s, dur 1.90s): "Let actions contradict words." (spd=1.05)
# GAP: 8.20s - 8.35s (0.15s gap)
# Frame 5 Cut at 8.25s
# Line 5 (8.35s - 9.20s, dur 0.85s): "'Take your time.'" (spd=1.05)
# GAP: 9.20s - 10.05s
# Frame 6 Cut at 9.90s
# Line 6 (10.05s - 11.35s, dur 1.30s): "He checked his watch again." (spd=1.05)
# Line 7 (11.65s - 13.70s, dur 2.05s): "Subscribe for daily craft fixes." (spd=1.05)

lines = [
    ("Do you believe her?", 0.20, 1.05, "af_sarah"),
    ('"I\'m fine!" she exclaimed defensively.', 2.00, 1.20, "af_sarah"),
    ('"I\'m fine." She wiped again.', 4.45, 1.08, "af_sarah"),
    ("Let actions contradict words.", 6.30, 1.05, "af_sarah"),
    ('"Take your time."', 8.35, 1.05, "af_sarah"),
    ("He checked his watch again.", 10.05, 1.05, "af_sarah"),
    ("Subscribe for daily craft fixes.", 11.65, 1.05, "af_sarah")
]

sample_rate = 24000
total_len_samples = int(14.0 * sample_rate)
master_audio = np.zeros(total_len_samples, dtype=np.float32)
timestamps = []

print("Synthesizing retimed audio without overlap and with clean pauses...")
for text, target_start, spd, voice in lines:
    samples, sr = kokoro.create(text, voice=voice, speed=spd, lang="en-us")
    start_idx = int(target_start * sr)
    dur = len(samples) / sr
    end_idx = start_idx + len(samples)
    print(f"Line: '{text}' -> dur={dur:.2f}s, start={target_start:.2f}s, end={(target_start + dur):.2f}s")
    if end_idx > total_len_samples:
        samples = samples[:total_len_samples - start_idx]
        end_idx = total_len_samples
    master_audio[start_idx:end_idx] += samples
    timestamps.append((text, target_start, target_start + dur))

sf.write(VOICE_WAV, master_audio, sample_rate)
print(f"Master voice written: {VOICE_WAV} (duration: 14.00s)")

with open(f"{ASSETS_DIR}/timestamps.txt", "w", encoding="utf-8") as f:
    for text, start, end in timestamps:
        f.write(f"{start:.2f}|{end:.2f}|{text}\n")

# Mix with low background piano & tactile cut clicks via ffmpeg
TOTAL_DURATION = 14.0
FADE_START = 12.5

print("Mixing voice with low ambient piano track and tactile click SFX...")
# Frame cuts:
# 1 -> 2: 1.95s
# 2 -> 3: 4.35s
# 3 -> 4: 6.25s
# 4 -> 5: 8.25s
# 5 -> 6: 9.90s
filter_graph = (
    f"[0:a]volume=0.024,afade=t=out:st={FADE_START}:d=1.5[piano];"
    f"[1:a]volume=1.35,compand=attacks=0:points=-80/-80|-12/-12|20/-12[voice];"
    f"[2:a]adelay=1950|1950,volume=0.38[c1];"
    f"[2:a]adelay=4350|4350,volume=0.38[c2];"
    f"[2:a]adelay=6250|6250,volume=0.38[c3];"
    f"[2:a]adelay=8250|8250,volume=0.38[c4];"
    f"[2:a]adelay=9900|9900,volume=0.42[c5];"
    f"[piano][voice][c1][c2][c3][c4][c5]amix=inputs=7:duration=first:dropout_transition=2:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=7"
)

mix_cmd = [
    "ffmpeg", "-y",
    "-stream_loop", "-1", "-i", PIANO_SRC,
    "-i", VOICE_WAV,
    "-i", CLICK_SRC,
    "-filter_complex", filter_graph,
    "-vn",
    "-c:a", "libmp3lame", "-b:a", "192k",
    "-t", str(TOTAL_DURATION),
    AUDIO_MIX
]
subprocess.run(mix_cmd, check=True)
print(f"Done! Mixed audio written to {AUDIO_MIX}")
