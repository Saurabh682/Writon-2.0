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
# Frame cuts:
# Frame 1 (0-2s): "Do you believe her?"
# Frame 2 (2-4.2s): "'I'm fine,' she exclaimed defensively." (with tension)
# Frame 3 (4.2-6.2s): "'I'm fine.' She wiped again." (with restraint)
# Frame 4 (6.2-8.2s): "Let actions contradict words."
# Frame 5 (8.2-10.0s): "'Take your time.'"
# Frame 6 (10.0-14.0s): "He checked his watch again. Subscribe for daily craft fixes."

lines = [
    # text, start_sec, speed, voice
    ("Do you believe her?", 0.20, 1.05, "af_sarah"),
    ('"I\'m fine!" she exclaimed defensively.', 2.05, 1.10, "af_sarah"),
    ('"I\'m fine." She wiped again.', 4.30, 1.05, "af_sarah"),
    ("Let actions contradict words.", 6.25, 1.05, "af_sarah"),
    ('"Take your time."', 8.35, 1.05, "af_sarah"),
    ("He checked his watch again.", 10.15, 1.05, "af_sarah"),
    ("Subscribe for daily craft fixes.", 11.75, 1.05, "af_sarah")
]

sample_rate = 24000
total_len_samples = int(14.0 * sample_rate)
master_audio = np.zeros(total_len_samples, dtype=np.float32)
timestamps = []

print("Synthesizing calibrated 6-frame audio with Sarah voice...")
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
# 1 -> 2: 2.0s
# 2 -> 3: 4.2s
# 3 -> 4: 6.2s
# 4 -> 5: 8.2s
# 5 -> 6: 10.0s
filter_graph = (
    f"[0:a]volume=0.025,afade=t=out:st={FADE_START}:d=1.5[piano];"
    f"[1:a]volume=1.35,compand=attacks=0:points=-80/-80|-12/-12|20/-12[voice];"
    f"[2:a]adelay=2000|2000,volume=0.40[c1];"
    f"[2:a]adelay=4200|4200,volume=0.40[c2];"
    f"[2:a]adelay=6200|6200,volume=0.40[c3];"
    f"[2:a]adelay=8200|8200,volume=0.40[c4];"
    f"[2:a]adelay=10000|10000,volume=0.45[c5];"
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
