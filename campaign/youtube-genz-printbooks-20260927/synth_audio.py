import os
import soundfile as sf
import numpy as np
import subprocess

orig_load = np.load
np.load = lambda *args, **kwargs: orig_load(*args, **{**kwargs, 'allow_pickle': True})

from kokoro_onnx import Kokoro

OUT_DIR = "campaign/youtube-genz-printbooks-20260927"
ASSETS_DIR = f"{OUT_DIR}/assets"
PIANO_SRC = "campaign/shorts-rendered/short18_kill_filter_words/assets/official_writon_piano.mp3"
CLICK_SRC = f"{ASSETS_DIR}/sfx_click.wav"
VOICE_WAV = f"{ASSETS_DIR}/voice_raw.wav"
AUDIO_MIX = f"{ASSETS_DIR}/audio_mixed.mp3"

kokoro = Kokoro(
    "models/kokoro/kokoro-v0_19.onnx",
    "models/kokoro/voices.bin"
)

# Total target: exactly 13.0 seconds
# Timeline of spoken lines:
# 0.15s: "Read one page on paper."
# 1.55s: "Then sharpen one verb."
# 3.10s: "He made a sound."
# 4.30s: "He coughed."
# 6.05s: "She looked at him."
# 7.20s: "She glanced at him."
# 9.15s: "Turn the page. Find one more."

lines = [
    ("Read one page on paper.", 0.15, 1.35),
    ("Then sharpen one verb.", 1.55, 1.35),
    ("He made a sound.", 3.10, 1.30),
    ("He coughed.", 4.30, 1.25),
    ("She looked at him.", 6.05, 1.30),
    ("She glanced at him.", 7.20, 1.25),
    ("Turn the page. Find one more.", 9.15, 1.25)
]

sample_rate = 24000
total_len_samples = int(13.0 * sample_rate)
master_audio = np.zeros(total_len_samples, dtype=np.float32)
timestamps = []

print("Generating voice segments...")
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

# Load tactile click and mix at beat transition moments (0.05s, 4.25s, 7.15s, 9.0s)
if os.path.exists(CLICK_SRC):
    click_data, click_sr = sf.read(CLICK_SRC)
    if len(click_data.shape) > 1:
        click_data = click_data[:, 0]
    # Resample or match if needed (sfx_click is 44100 or 48000, Kokoro is 24000)
    # We will mix clicks using ffmpeg filter_complex instead of numpy to preserve native sample rate!

sf.write(VOICE_WAV, master_audio, sample_rate)
print(f"Master voice written: {VOICE_WAV} (duration: 13.00s)")

with open(f"{ASSETS_DIR}/timestamps.txt", "w", encoding="utf-8") as f:
    for text, start, end in timestamps:
        f.write(f"{start:.2f}|{end:.2f}|{text}\n")

# Mix with ambient piano & clicks via ffmpeg
TOTAL_DURATION = 13.0
FADE_START = 11.5

print("Mixing voice with ambient piano track...")
# Clicks at 0.05s, 4.25s (strike to coughed), 7.15s (strike to glanced), 8.95s (page turn)
# amix normalizes by input count unless disabled, which made the voice too quiet.
filter_graph = (
    f"[0:a]volume=0.038,afade=t=out:st={FADE_START}:d=1.5[piano];"
    f"[1:a]volume=1.35,compand=attacks=0:points=-80/-80|-12/-12|20/-12[voice];"
    f"[2:a]adelay=50|50,volume=0.4[c1];"
    f"[2:a]adelay=4250|4250,volume=0.5[c2];"
    f"[2:a]adelay=7150|7150,volume=0.5[c3];"
    f"[2:a]adelay=8950|8950,volume=0.5[c4];"
    f"[piano][voice][c1][c2][c3][c4]amix=inputs=6:duration=first:dropout_transition=2:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=7"
)

mix_cmd = [
    "ffmpeg", "-y",
    "-stream_loop", "-1", "-i", PIANO_SRC,
    "-i", VOICE_WAV,
    "-i", CLICK_SRC,
    "-filter_complex", filter_graph,
    "-c:a", "libmp3lame", "-b:a", "192k",
    "-t", str(TOTAL_DURATION),
    AUDIO_MIX
]
subprocess.run(mix_cmd, check=True)
print(f"Done. Mixed audio written to {AUDIO_MIX}")
