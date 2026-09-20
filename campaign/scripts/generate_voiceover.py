"""
Standardized Voiceover Generator for WritOn Video Pipelines
Primary Model: Kokoro-82M (Local Offline ONNX)
Default Voice: af_nicole (Kokoro Nicole - Intimate, deliberate, atmospheric storytelling)
Backing Track: official_writon_piano.mp3
"""

import argparse
import os
import subprocess
import tempfile
import soundfile as sf
import numpy as np

# Patch allow_pickle for numpy 2.x
orig_load = np.load
np.load = lambda *args, **kwargs: orig_load(*args, **{**kwargs, "allow_pickle": True})

from kokoro_onnx import Kokoro

WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
MODEL_PATH = os.path.join(WORKSPACE_ROOT, "models", "kokoro", "kokoro-v0_19.onnx")
VOICES_PATH = os.path.join(WORKSPACE_ROOT, "models", "kokoro", "voices.bin")
PIANO_TRACK = os.path.join(WORKSPACE_ROOT, "campaign", "shorts-rendered", "prototype_craft_rules_4k", "assets", "official_writon_piano.mp3")

def generate_voiceover(
    text: str,
    output_path: str,
    voice: str = "af_nicole",
    speed: float = 0.95,
    mix_piano: bool = True,
    voice_vol: float = 1.35,
    piano_vol: float = 0.08
):
    print(f"[Kokoro TTS] Initializing model with voice: {voice} (speed: {speed})...")
    kokoro = Kokoro(MODEL_PATH, VOICES_PATH)
    
    samples, sr = kokoro.create(text, voice=voice, speed=speed, lang="en-us")
    
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as raw_wav:
        raw_wav_path = raw_wav.name
    
    sf.write(raw_wav_path, samples, sr)
    duration_sec = len(samples) / sr
    print(f"[Kokoro TTS] Voice duration: {duration_sec:.2f}s")
    
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    
    if mix_piano and os.path.exists(PIANO_TRACK):
        print("[Kokoro TTS] Mixing voiceover with ambient piano track...")
        # Fade out piano gently in the last 1.5s
        fade_start = max(0, duration_sec - 1.5)
        filter_complex = (
            f"[0:a]volume={voice_vol}[v];"
            f"[1:a]aloop=loop=-1:size=2e+09,volume={piano_vol},"
            f"afade=t=out:st={fade_start:.2f}:d=1.5[p];"
            f"[v][p]amix=inputs=2:duration=first:dropout_transition=2[out]"
        )
        cmd = [
            "ffmpeg", "-y",
            "-i", raw_wav_path,
            "-i", PIANO_TRACK,
            "-filter_complex", filter_complex,
            "-map", "[out]",
            "-b:a", "192k",
            output_path
        ]
        res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        if res.returncode != 0:
            print("[ffmpeg Error]:", res.stderr.decode("utf-8", errors="ignore"))
            # Fallback to direct conversion
            cmd_fallback = ["ffmpeg", "-y", "-i", raw_wav_path, "-b:a", "192k", output_path]
            subprocess.run(cmd_fallback, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    else:
        cmd_direct = ["ffmpeg", "-y", "-i", raw_wav_path, "-b:a", "192k", output_path]
        subprocess.run(cmd_direct, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
    if os.path.exists(raw_wav_path):
        os.remove(raw_wav_path)
        
    print(f"[Kokoro TTS] Successfully generated: {output_path} ({os.path.getsize(output_path)} bytes)")
    return output_path

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="WritOn Kokoro Voiceover Generator")
    parser.add_argument("--text", type=str, required=True, help="Script text to synthesize")
    parser.add_argument("--out", type=str, default="output_voiceover.mp3", help="Output MP3 path")
    parser.add_argument("--voice", type=str, default="af_nicole", help="Kokoro voice ID (default: af_nicole)")
    parser.add_argument("--speed", type=float, default=0.95, help="Playback speed (default: 0.95)")
    parser.add_argument("--no-piano", action="store_true", help="Disable background piano mix")
    
    args = parser.parse_args()
    generate_voiceover(
        text=args.text,
        output_path=args.out,
        voice=args.voice,
        speed=args.speed,
        mix_piano=not args.no_piano
    )
