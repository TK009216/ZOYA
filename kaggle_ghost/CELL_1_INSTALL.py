# ============================================
# CELL 1 — SETUP + DOWNLOAD (Ghost Mode)
# ============================================
# ⚠️ Sirf EK BAAR chalao
# ⚠️ Phir "Restart Session" karo
# ⚠️ Phir Cell 2 chalao
# ⚠️ Cell 1 dubara mat chalana

import os, warnings, torch, subprocess
warnings.filterwarnings("ignore")

# ---------- Environment Setup ----------
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["TRANSFORMERS_VERBOSITY"] = "error"
os.environ["DIFFUSERS_VERBOSITY"] = "error"
os.environ["HF_HOME"] = "/kaggle/working/.cache"
os.environ["HF_HUB_CACHE"] = "/kaggle/working/.cache/hub"
os.environ["HF_XET_HIGH_PERFORMANCE"] = "1"
os.environ["XET_CACHE_MODE"] = "off"
os.environ["GRADIO_ANALYTICS_ENABLED"] = "False"
os.makedirs("/kaggle/working/.cache/hub", exist_ok=True)

print("=" * 55)
print("  ZOYA Ghost Setup — Cell 1")
print("=" * 55)

# ---------- Install ----------
print("\n[*] Installing packages...")
!pip install -q git+https://github.com/huggingface/diffusers.git --upgrade
!pip install -q transformers accelerate peft safetensors sentencepiece --quiet
!pip install -q gradio==5.50.0 --quiet
!pip install -q huggingface_hub rembg onnxruntime --quiet

print("[*] Packages installed.")

# ---------- GPU Check ----------
print(f"\n[*] GPU: {torch.cuda.get_device_name(0)}")
vram_prop = torch.cuda.get_device_properties(0)
vram_gb = getattr(vram_prop, 'total_memory', getattr(vram_prop, 'total_mem', 0)) / 1e9
print(f"[*] VRAM: {vram_gb:.1f} GB")
print(f"[*] GPU Count: {torch.cuda.device_count()}")
print(f"[*] BF16 Support: {torch.cuda.is_bf16_supported()}")

# ---------- Download Models (cached) ----------
print("\n[*] Downloading Z-Image-Turbo...")
subprocess.run(["huggingface-cli", "download", "Tongyi-MAI/Z-Image-Turbo", "--quiet"],
               capture_output=True, env={**os.environ})
print("[OK] Turbo")

print("[*] Downloading Z-Image Base...")
subprocess.run(["huggingface-cli", "download", "Tongyi-MAI/Z-Image", "--quiet"],
               capture_output=True, env={**os.environ})
print("[OK] Base")

print("[*] Downloading Pornmaster v1 LoRA...")
subprocess.run(["huggingface-cli", "download", "RomixERR/Pornmaster_v1-Z-Images-Turbo", "--quiet"],
               capture_output=True, env={**os.environ})
print("[OK] Pornmaster LoRA")

print("\n" + "=" * 55)
print("  ✅ CELL 1 COMPLETE!")
print("  ⚠️  Ab 'Restart Session' karo")
print("  ⚠️  Phir Cell 2 chalana")
print("  ✅ Cell 1 dubara mat chalana")
print("=" * 55)
