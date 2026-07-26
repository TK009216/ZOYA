# ============================================
# CELL 1 — F32 TO fp16 CONVERTER
# ============================================
# ✅ Download each F32 file → Convert to fp16 → Delete F32
# ✅ Final model: ~14GB (fits in 21GB!)
# ✅ Clean, no xet, no errors

import os, sys, subprocess, warnings, time, shutil, json, requests
warnings.filterwarnings("ignore")
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["TOKENIZERS_PARALLELISM"] = "false"

def c(cmd):
    print(f"  > {cmd[:90]}")
    subprocess.check_call(cmd, shell=True)

print("="*55)
print("  CELL 1: F32→fp16 CONVERTER")
print("="*55)
t0 = time.time()

# ── 1. INSTALL ──
print("\n[1/5] Installing packages...")
c(f"{sys.executable} -m pip install -q --no-input torch==2.6.0 torchvision --index-url https://download.pytorch.org/whl/cu124")
c(f"{sys.executable} -m pip install -q --no-input diffusers transformers accelerate peft gradio==5.20.1 pillow rembg psutil scipy safetensors huggingface_hub requests")

# ── 2. DOWNLOAD + CONVERT ──
print("\n[2/5] Downloading + converting to fp16...")

BASE = "https://huggingface.co/Tongyi-MAI/Z-Image-Turbo/resolve/main"
DIR = "/kaggle/working/models/Z-Image-Turbo"
TMP = "/kaggle/working/.tmp"
os.makedirs(DIR, exist_ok=True)
os.makedirs(TMP, exist_ok=True)

from safetensors.torch import save_file as st_save
from safetensors import safe_open

def dl_file(url, dest):
    """Download single file with progress"""
    print(f"    DL {os.path.basename(dest)}...", end=" ", flush=True)
    t1 = time.time()
    r = requests.get(url, stream=True, timeout=600)
    r.raise_for_status()
    with open(dest, "wb") as f:
        for chunk in r.iter_content(8*1024*1024):
            if chunk: f.write(chunk)
    mb = os.path.getsize(dest) / 1e6
    print(f"{mb:.0f}MB ({time.time()-t1:.0f}s)")

def convert_safetensors(f32_path, fp16_path):
    """Convert F32 safetensors to fp16 (tensor by tensor = low RAM)"""
    print(f"    CONV {os.path.basename(fp16_path)}...", end=" ", flush=True)
    t1 = time.time()
    tensors = {}
    with safe_open(f32_path, framework="pt", device="cpu") as f:
        for key in f.keys():
            tensors[key] = f.get_tensor(key).half()
    st_save(tensors, fp16_path)
    del tensors
    print(f"{time.time()-t1:.0f}s")

def download_and_convert(remote_path, local_name):
    """Download F32 file, convert to fp16, delete F32"""
    f32_path = f"{TMP}/{local_name}"
    fp16_path = f"{DIR}/{local_name.replace('.safetensors', '.fp16.safetensors')}"
    
    if os.path.exists(fp16_path) and os.path.getsize(fp16_path) > 1024:
        print(f"    SKIP {local_name} (exists)")
        return
    
    # Download
    dl_file(f"{BASE}/{remote_path}", f32_path)
    
    # Convert
    convert_safetensors(f32_path, fp16_path)
    
    # Delete F32 immediately to save space
    os.remove(f32_path)
    print(f"    CLEAN {os.path.basename(f32_path)} deleted")

# ── 2A. Config files (no conversion needed) ──
print("\n  --- Config files ---")
configs = [
    "model_index.json",
    "scheduler/scheduler_config.json",
    "text_encoder/config.json",
    "text_encoder/generation_config.json",
    "text_encoder/model.safetensors.index.json",
    "tokenizer/merges.txt",
    "tokenizer/tokenizer.json",
    "tokenizer/tokenizer_config.json",
    "tokenizer/vocab.json",
    "transformer/config.json",
    "transformer/diffusion_pytorch_model.safetensors.index.json",
    "vae/config.json",
]
for f in configs:
    dest = f"{DIR}/{f}"
    if not os.path.exists(dest):
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        dl_file(f"{BASE}/{f}", dest)

# ── 2B. VAE (small, ~350MB fp16) ──
print("\n  --- VAE ---")
download_and_convert("vae/diffusion_pytorch_model.safetensors", "vae/diffusion_pytorch_model.safetensors")

# ── 2C. Text Encoder shards (3 files, ~4GB fp16 total) ──
print("\n  --- Text Encoder ---")
for i in range(1, 4):
    fname = f"model-0000{i}-of-00003.safetensors"
    download_and_convert(f"text_encoder/{fname}", f"text_encoder/{fname}")

# ── 2D. Transformer shards (3 files, ~12GB fp16 total) ──
print("\n  --- Transformer (the big one) ---")
for i in range(1, 4):
    fname = f"diffusion_pytorch_model-0000{i}-of-00003.safetensors"
    download_and_convert(f"transformer/{fname}", f"transformer/{fname}")

# ── 3. UPDATE model_index.json for fp16 ──
print("\n[3/5] Updating model_index.json for fp16...")
idx_path = f"{DIR}/model_index.json"
with open(idx_path) as f:
    idx = json.load(f)
# Add variant info
idx["_variant"] = "fp16"
with open(idx_path, "w") as f:
    json.dump(idx, f, indent=2)
print("  >> Updated!")

# ── 4. FREE SPACE ──
print("\n[4/5] Final cleanup...")
shutil.rmtree(TMP, ignore_errors=True)
shutil.rmtree("/root/.cache/pip", ignore_errors=True)
import psutil
d = psutil.disk_usage("/kaggle/working/")

# Calculate final sizes
fp16_size = sum(os.path.getsize(os.path.join(dp,f)) for dp,_,fn in os.walk(DIR) for f in fn if f.endswith(".safetensors")) / 1e9
total_size = sum(os.path.getsize(os.path.join(dp,f)) for dp,_,fn in os.walk(DIR) for f in fn) / 1e9
print(f"  >> Model: {total_size:.1f}GB (weights: {fp16_size:.1f}GB)")
print(f"  >> Free: {d.free/1e9:.1f}GB / {d.total/1e9:.1f}GB")

# ── 5. LORAS ──
print("\n[5/5] Downloading LoRAs...")
os.makedirs("/kaggle/working/models/pornmaster", exist_ok=True)
for f in ["Pornmaster_v1_000043500.safetensors", "Pornmaster_v1_000044700.safetensors"]:
    dl_file(f"https://huggingface.co/RomixERR/Pornmaster_v1-Z-Images-Turbo/resolve/main/{f}",
            f"/kaggle/working/models/pornmaster/{f}")

os.makedirs("/kaggle/working/models/smnth", exist_ok=True)
for f in ["pytorch_lora_weights.safetensors", "adapter_config.json"]:
    try:
        dl_file(f"https://huggingface.co/Kakelaka/Smnth_v1_NSFW1/resolve/main/{f}",
                f"/kaggle/working/models/smnth/{f}")
    except:
        print(f"  SKIP {f}")

print(f"\n{'='*55}")
print(f"  ✅ DONE! ({time.time()-t0:.0f}s)")
print(f"  Model (fp16): {total_size:.1f}GB")
print(f"  Free: {d.free/1e9:.1f}GB")
print(f"  Ready for CELL 2!")
print(f"{'='*55}")
