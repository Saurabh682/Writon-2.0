#!/usr/bin/env python3
"""
WritOn — Local AuK Speech Generation & Voice Editing Runner
Enables zero-shot voice cloning, instruct TTS, and audio inpainting
locally on NVIDIA GeForce RTX GPU.
"""

import argparse
import os
import sys
import time
import torch

# Ensure tools/auk/src is on the module search path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUK_SRC = os.path.join(PROJECT_ROOT, "tools", "auk", "src")
if AUK_SRC not in sys.path:
    sys.path.insert(0, AUK_SRC)

try:
    from auk.infer.infer_auk import AukInfer, save_audio
except ImportError as e:
    print(f"Error importing AuK: {e}")
    print("Please ensure dependencies are installed in tools/auk/.venv")
    sys.exit(1)


def get_default_engine(
    cpu_offload: bool = True,
    dtype: str = "bf16",
    device: str | None = None,
):
    config_path = os.path.join(PROJECT_ROOT, "tools", "auk", "ckpts", "AuK-Flash", "config.yaml")
    ckpt_path = os.path.join(PROJECT_ROOT, "tools", "auk", "ckpts", "AuK-Flash", "auk_flash.safetensors")
    qwen_path = os.path.join(PROJECT_ROOT, "tools", "auk", "ckpts", "Qwen2.5-Omni-3B")

    if not os.path.exists(config_path) or not os.path.exists(ckpt_path):
        raise FileNotFoundError(f"AuK-Flash checkpoint not found under tools/auk/ckpts/AuK-Flash")

    print(f"Loading AuK-Flash engine on {device or 'cuda:0'} (cpu_offload={cpu_offload}) ...")
    return AukInfer(
        config_path=config_path,
        ckpt_path=ckpt_path,
        qwen_path=qwen_path,
        cpu_offload=cpu_offload,
        dtype=dtype,
        device=device,
    )


def generate_speech(
    engine: AukInfer,
    text: str,
    ref_audio: str | None = None,
    voice_desc: str | None = None,
    instruction: str | None = None,
    duration: float = 4.0,
    output_path: str = "auk_generated.wav",
    seed: int = 42,
):
    if not instruction:
        if ref_audio:
            instruction = f'Say the following with the same voice: "{text}"'
        elif voice_desc:
            instruction = f'Generate speech based on the following description: "{voice_desc}". The content to speak is: "{text}".'
        else:
            instruction = f'Speak the following: "{text}"'

    content = [{"type": "text", "text": instruction}]
    if ref_audio and os.path.exists(ref_audio):
        content.append({"type": "audio", "audio": ref_audio})

    messages = [{"role": "user", "content": content}]

    t0 = time.time()
    audio, sr = engine.generate(
        messages,
        gen_seconds=duration,
        seed=seed,
    )
    elapsed = time.time() - t0

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    save_audio(audio, sr, output_path)

    audio_len = len(audio[0]) / sr
    return {
        "output_path": output_path,
        "sample_rate": sr,
        "duration": audio_len,
        "inference_time": elapsed,
    }


def main():
    parser = argparse.ArgumentParser(description="WritOn Local AuK Speech Generation")
    parser.add_argument("--text", type=str, help="Text to speak")
    parser.add_argument("--ref-audio", type=str, default=None, help="Reference audio file for voice cloning")
    parser.add_argument("--voice-desc", type=str, default=None, help="Description of voice for Instruct TTS")
    parser.add_argument("--instruction", type=str, default=None, help="Custom natural language instruction")
    parser.add_argument("--duration", type=float, default=4.0, help="Target duration in seconds")
    parser.add_argument("--output", type=str, default="campaign/shorts-rendered/auk_output.wav", help="Output file path")
    parser.add_argument("--no-offload", action="store_true", help="Disable CPU offloading (keeps all weights in VRAM)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")

    args = parser.parse_args()

    if not args.text and not args.instruction:
        parser.error("Either --text or --instruction is required.")

    engine = get_default_engine(cpu_offload=not args.no_offload)
    result = generate_speech(
        engine=engine,
        text=args.text or "",
        ref_audio=args.ref_audio,
        voice_desc=args.voice_desc,
        instruction=args.instruction,
        duration=args.duration,
        output_path=args.output,
        seed=args.seed,
    )

    print("\n" + "=" * 50)
    print("🎉 Speech Generated Successfully!")
    print(f"Output File:    {result['output_path']}")
    print(f"Duration:       {result['duration']:.2f}s")
    print(f"Sample Rate:    {result['sample_rate']} Hz")
    print(f"Inference Time: {result['inference_time']:.2f}s")
    print("=" * 50)


if __name__ == "__main__":
    main()
