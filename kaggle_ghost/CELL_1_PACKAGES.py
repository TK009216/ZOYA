# ============================================
# CELL 1 — PACKAGES + SYSTEM CHECK (FIXED)
# ============================================
# ⚡ Version-pinned for compatibility
# ⚡ XFORMERS_DISABLE_FLASH_ATTN set
# ⚡ Run once → Restart Session → Cell 2

import os, subprocess, sys, warnings, time
warnings.filterwarnings("ignore")

# ─── CRITICAL: Set BEFORE any torch import ───
os.environ["XFORMERS_DISABLE_FLASH_ATTN"] = "1"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["TOKENIZERS_PARALLELISM"] = "false"
os.environ["HF_HOME"] = "/kaggle/working/.hf"
os.environ["HUGGINGFACE_HUB_CACHE"] = "/kaggle/working/.hf/hub"
os.makedirs("/kaggle/working/.hf/hub", exist_ok=True)

def c(cmd):
    print(f"  > {cmd[:90]}")
    subprocess.check_call(cmd, shell=True)

print("="*55)
print("  CELL 1: PACKAGES + SYSTEM CHECK (FIXED)")
print("="*55)
t0 = time.time()

# Install — PINNED VERSIONS for compatibility
print("\n[1/2] Installing packages...")
c(f"{sys.executable} -m pip install -q --no-input torch==2.6.0 torchvision==0.21.0 --index-url https://download.pytorch.org/whl/cu124")
c(f"{sys.executable} -m pip install -q --no-input diffusers==0.32.1 transformers==4.49.0 accelerate==1.5.0")
c(f"{sys.executable} -m pip install -q --no-input xformers==0.0.33.post2 --index-url https://download.pytorch.org/whl/cu124")
c(f"{sys.executable} -m pip install -q --no-input gradio==5.20.1 pillow rembg psutil scipy safetensors peft huggingface_hub requests")

# System check
print("\n[2/2] System check...")
import torch, psutil
gpu = torch.cuda.get_device_name(0)
vram = torch.cuda.get_device_properties(0).total_memory / 1e9
disk = psutil.disk_usage("/kaggle/working/")
ram = psutil.virtual_memory()
print(f"  GPU: {gpu}")
print(f"  VRAM: {vram:.1f}GB")
print(f"  RAM: {ram.total/1e9:.1f}GB")
print(f"  DISK: {disk.total/1e9:.1f}GB ({disk.free/1e9:.1f}GB free)")
print(f"  PyTorch: {torch.__version__}")
print(f"  CUDA: {torch.version.cuda}")

# Pre-download models
print("\n[3/3] Pre-downloading models...")
subprocess.run(["huggingface-cli", "download", "Tongyi-MAI/Z-Image-Turbo", "--quiet"],
               capture_output=True)
print("  [OK] Z-Image-Turbo")
subprocess.run(["huggingface-cli", "download", "Tongyi-MAI/Z-Image", "--quiet"],
               capture_output=True)
print("  [OK] Z-Image Base")
subprocess.run(["huggingface-cli", "download", "RomixERR/Pornmaster_v1-Z-Images-Turbo", "--quiet"],
               capture_output=True)
print("  [OK] Pornmaster v1 LoRA")

print(f"\n{'='*55}")
print(f"  CELL 1 DONE! ({time.time()-t0:.0f}s)")
print(f"  ⚠️  RESTART SESSION NOW")
print(f"  ⚠️  Then run Cell 2")
print(f"{'='*55}")
