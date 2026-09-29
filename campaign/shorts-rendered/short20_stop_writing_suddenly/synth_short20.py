import os
import soundfile as sf
import numpy as np
import subprocess

orig_load = np.load
np.load = lambda *args, **kwargs: orig_load(*args, **{**kwargs, 'allow_pickle': True})

from kokoro_onnx import Kokoro

OUT_DIR = "campaign/shorts-rendered/short20_stop_writing_suddenly"
ASSETS_DIR = f"{OUT_DIR}/assets"
PIANO_SRC = f"{ASSETS_DIR}/official_writon_piano.mp3"
CLICK_SRC = f"{ASSETS_DIR}/sfx_click.wav"
VOICE_WAV = f"{ASSETS_DIR}/voice_raw.wav"
AUDIO_MIX = f"{ASSETS_DIR}/voiceover_compressed_mixed.mp3"

kokoro = Kokoro(
    "models/kokoro/kokoro-v0_19.onnx",
    "models/kokoro/voices.bin"
)

# Total target duration: 13.5 seconds
# Rapid Dual-Example Structure:
# 0.15s: "Stop writing 'Suddenly'."
# 2.10s: "Suddenly, the phone rang."
# 4.25s: "She reached for the tap when the phone rang."
# 6.70s: "Suddenly, the glass shattered."
# 8.65s: "The shelf tilted. The glass hit the floor."
# 11.20s: "Put the event last."

lines = [
    ("Stop writing suddenly.", 0.15, 1.30),
    ("Suddenly, the phone rang.", 2.10, 1.25),
    ("She reached for the tap when the phone rang.", 4.25, 1.25),
    ("Suddenly, the glass shattered.", 6.70, 1.25),
    ("The shelf tilted. The glass hit the floor.", 8.65, 1.25),
    ("Put the event last.", 11.20, 1.25)
]

sample_rate = 24000
total_len_samples = int(13.5 * sample_rate)
master_audio = np.zeros(total_len_samples, dtype=np.float32)
timestamps = []

print("Generating voice segments for Short #20...")
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
print(f"Master voice written: {VOICE_WAV} (duration: 13.50s)")

with open(f"{ASSETS_DIR}/timestamps.txt", "w", encoding="utf-8") as f:
    for text, start, end in timestamps:
        f.write(f"{start:.2f}|{end:.2f}|{text}\n")

# Mix with ambient piano & clicks via ffmpeg
TOTAL_DURATION = 13.5
FADE_START = 12.0

print("Mixing voice with ambient piano track and tactile click SFX...")
# Clicks at key visual cuts:
# c1: 0.05s (Hook start)
# c2: 2.05s (Example 1 start)
# c3: 4.20s (Rewrite 1 snap)
# c4: 6.65s (Example 2 start)
# c5: 8.60s (Rewrite 2 snap)
# c6: 11.10s (Rule + End-Card snap)
filter_graph = (
    f"[0:a]volume=0.038,afade=t=out:st={FADE_START}:d=1.5[piano];"
    f"[1:a]volume=1.35,compand=attacks=0:points=-80/-80|-12/-12|20/-12[voice];"
    f"[2:a]adelay=50|50,volume=0.45[c1];"
    f"[2:a]adelay=2050|2050,volume=0.45[c2];"
    f"[2:a]adelay=4200|4200,volume=0.50[c3];"
    f"[2:a]adelay=6650|6650,volume=0.45[c4];"
    f"[2:a]adelay=8600|8600,volume=0.50[c5];"
    f"[2:a]adelay=11100|11100,volume=0.55[c6];"
    f"[piano][voice][c1][c2][c3][c4][c5][c6]amix=inputs=8:duration=first:dropout_transition=2:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=7"
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
