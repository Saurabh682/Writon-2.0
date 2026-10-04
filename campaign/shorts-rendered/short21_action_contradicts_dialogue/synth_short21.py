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
# Timeline:
# 0.15s: "Would you believe her?"
# 2.20s: "'I'm fine,' she said."
# 4.30s: "'I'm fine.' She wiped the counter again."
# 7.20s: "The action can disagree."
# 10.60s: "Subscribe for daily craft fixes."

lines = [
    ("Would you believe her?", 0.15, 1.25),
    ("I'm fine, she said.", 2.20, 1.25),
    ("I'm fine. She wiped the counter again.", 4.30, 1.25),
    ("The action can disagree.", 7.20, 1.25),
    ("Subscribe for daily craft fixes.", 10.60, 1.25)
]

sample_rate = 24000
total_len_samples = int(14.0 * sample_rate)
master_audio = np.zeros(total_len_samples, dtype=np.float32)
timestamps = []

print("Generating voice segments for Short #21...")
for text, target_start, spd in lines:
    samples, sr = kokoro.create(text, voice="af_nicole", speed=spd, lang="en-us")
    start_idx = int(target_start * sr)
    dur = len(samples) / sr
    end_idx = start_idx + len(samples)
    print(f"Beat: '{text}' -> dur={dur:.2f}s, start={target_start:.2f}s, end={(target_start + dur):.2f}s")
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

# Mix with ambient piano & clicks via ffmpeg
TOTAL_DURATION = 14.0
FADE_START = 12.5

print("Mixing voice with ambient piano track and tactile click SFX...")
# Clicks at key visual cuts:
# c1: 0.05s (Hook start)
# c2: 2.15s (Scene 1 dialogue)
# c3: 4.25s (Scene 1 action reveal)
# c4: 7.15s (Scene 2 contradiction)
# c5: 10.55s (Rule + End-Card snap)
filter_graph = (
    f"[0:a]volume=0.038,afade=t=out:st={FADE_START}:d=1.5[piano];"
    f"[1:a]volume=1.35,compand=attacks=0:points=-80/-80|-12/-12|20/-12[voice];"
    f"[2:a]adelay=50|50,volume=0.45[c1];"
    f"[2:a]adelay=2150|2150,volume=0.45[c2];"
    f"[2:a]adelay=4250|4250,volume=0.50[c3];"
    f"[2:a]adelay=7150|7150,volume=0.45[c4];"
    f"[2:a]adelay=10550|10550,volume=0.55[c5];"
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
print(f"Done. Mixed audio written to {AUDIO_MIX}")
