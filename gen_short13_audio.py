import os
import soundfile as sf
import numpy as np
import subprocess

orig_load = np.load
np.load = lambda *args, **kwargs: orig_load(*args, **{**kwargs, 'allow_pickle': True})

from kokoro_onnx import Kokoro

SLUG = "short13_she_realized"
OUT_DIR = f"d:/VibeCode/WritOn-PowerUp/campaign/shorts-rendered/{SLUG}"
ASSETS_DIR = f"{OUT_DIR}/assets"
PIANO_SRC = "d:/VibeCode/WritOn-PowerUp/campaign/shorts-rendered/prototype_craft_rules_4k/assets/official_writon_piano.mp3"
VOICE_WAV = f"{ASSETS_DIR}/voice_raw.wav"
AUDIO_MIX = f"{ASSETS_DIR}/voiceover_compressed_mixed.mp3"

os.makedirs(ASSETS_DIR, exist_ok=True)

script_text = """Stop writing: She realized.

She realized he had never really loved her.

Now watch the rewrite: She scrolled his contacts. Three years, and he still had her saved as 'Priya work'.

Don't announce the realization. Hand over the evidence.

That's why you.."""

kokoro = Kokoro(
    "d:/VibeCode/WritOn-PowerUp/models/kokoro/kokoro-v0_19.onnx",
    "d:/VibeCode/WritOn-PowerUp/models/kokoro/voices.bin"
)

print("Synthesizing voiceover with Nicole (af_nicole @ 1.15x)...")
samples, sr = kokoro.create(script_text, voice="af_nicole", speed=1.15, lang="en-us")
sf.write(VOICE_WAV, samples, sr)

probe = subprocess.run(
    ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
     "-of", "default=noprint_wrappers=1:nokey=1", VOICE_WAV],
    capture_output=True, text=True
)
voice_dur = float(probe.stdout.strip())
print(f"Spoken Voice Duration: {voice_dur:.2f}s")

TOTAL_DURATION = round(voice_dur + 1.2, 1)
FADE_START = TOTAL_DURATION - 1.5

print(f"Total Video Duration: {TOTAL_DURATION}s (fade out at {FADE_START}s)")

print("Mixing voice with ambient piano track...")
mix_cmd = [
    "ffmpeg", "-y",
    "-stream_loop", "-1", "-i", PIANO_SRC,
    "-i", VOICE_WAV,
    "-filter_complex",
    f"[0:a]volume=0.038,afade=t=out:st={FADE_START}:d=1.4[piano];"
    f"[1:a]volume=1.4,compand=attacks=0:points=-80/-80|-12/-12|20/-12[voice];"
    f"[piano][voice]amix=inputs=2:duration=first:dropout_transition=2",
    "-c:a", "libmp3lame", "-b:a", "192k",
    "-t", str(TOTAL_DURATION),
    AUDIO_MIX
]
subprocess.run(mix_cmd, check=True)
print("Done. Mixed audio written to", AUDIO_MIX)
