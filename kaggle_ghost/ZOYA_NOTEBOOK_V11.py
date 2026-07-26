# ============================================================
# ZOYA GHOST ENGINE V11 — COMPLETE NOTEBOOK
# ⚡ 4 Cells | ALL 16 QA Issues Fixed | ALL Features
# ⚡ Models: /kaggle/tmp/models/
# ⚡ T2I · I2I · Inpaint · Remove_BG · Upscale · LoRA
# ⚡ Fast ⚡ Pro 🚀 Expert 🔬
# ============================================================

# ╔══════════════════════════════════════════════════════════╗
# ║  CELL 1 — PACKAGES + ENVIRONMENT                        ║
# ║  ▶ RUN THIS CELL FIRST                                  ║
# ║  ▶ THEN RESTART SESSION                                 ║
# ║  ▶ THEN CELL 2                                          ║
# ╚══════════════════════════════════════════════════════════╝

import os, sys, subprocess, warnings, time, socket, json, shutil
warnings.filterwarnings("ignore")

print("="*60)
print("  ZOYA V11 — CELL 1: PACKAGES + ENVIRONMENT")
print("="*60)
t0 = time.time()

# ─── Internet ───
def check_internet():
    try:
        socket.create_connection(("8.8.8.8", 53), timeout=5)
        return True
    except: return False

if not check_internet():
    print("  ❌ NO INTERNET! Enable in Notebook Settings")
    raise SystemExit(1)
print("  ✅ Internet OK")

# ─── Env vars (BEFORE any import) ───
os.environ["XFORMERS_DISABLE_FLASH_ATTN"] = "1"      # FIX #3
os.environ["HF_HOME"] = "/kaggle/tmp/.hf"
os.environ["HUGGINGFACE_HUB_CACHE"] = "/kaggle/tmp/.hf/hub"
os.environ["TRANSFORMERS_CACHE"] = "/kaggle/tmp/.hf/t"
os.environ["TORCH_HOME"] = "/kaggle/tmp/.torch"
os.environ["SAFETENSORS_FAST_GPU"] = "1"
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["GRADIO_ANALYTICS_ENABLED"] = "False"
os.environ["GRADIO_SHARE_ENABLED"] = "True"
os.environ["GRADIO_DEBUG"] = "False"
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
os.environ["DO_NOT_TRACK"] = "1"
os.environ["U2NET_HOME"] = "/kaggle/tmp/.u2net"       # rembg cache

# ─── Create all dirs ───
dirs = [
    "/kaggle/tmp/models/Z-Image-Turbo/transformer",
    "/kaggle/tmp/models/Z-Image-Turbo/text_encoder",
    "/kaggle/tmp/models/Z-Image-Turbo/vae",
    "/kaggle/tmp/models/Z-Image-Turbo/scheduler",
    "/kaggle/tmp/models/Z-Image-Turbo/tokenizer",
    "/kaggle/tmp/models/Z-Image-Base/transformer",
    "/kaggle/tmp/models/Z-Image-Base/text_encoder",
    "/kaggle/tmp/models/Z-Image-Base/vae",
    "/kaggle/tmp/models/Z-Image-Base/scheduler",
    "/kaggle/tmp/models/Z-Image-Base/tokenizer",
    "/kaggle/tmp/models/pornmaster",
    "/kaggle/tmp/.hf/hub",
    "/kaggle/tmp/.u2net",
    "/kaggle/tmp/weights",
    "/kaggle/working/output",
]
for d in dirs:
    os.makedirs(d, exist_ok=True)

# ─── HF_TOKEN ───
HF_TOKEN = os.environ.get("HF_TOKEN", "")
if HF_TOKEN:
    subprocess.run(["huggingface-cli", "login", "--token", HF_TOKEN, "--quiet"],
                   capture_output=True)
    print("  ✅ HF_TOKEN set")
else:
    print("  ⚠️  No HF_TOKEN")

def c(cmd):
    print(f"  > {cmd[:100]}")
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=600)
    if r.returncode != 0:
        print(f"  ⚠️  {r.stderr[:150]}")
    return r

# ─── Disk check ───
t, u, f = shutil.disk_usage("/kaggle/tmp")
print(f"  💾 /kaggle/tmp: {f//(2**30)}GB free / {t//(2**30)}GB total")

# ─── Install packages ───
print("\n[1/2] Installing packages...")

# FIX H4: Install diffusers from GIT (ZImagePipeline not in PyPI releases!)
c(f"{sys.executable} -m pip install -q --no-input torch>=2.5.0 torchvision>=0.20.0 --index-url https://download.pytorch.org/whl/cu124")
c(f"{sys.executable} -m pip install -q --no-input git+https://github.com/huggingface/diffusers")
c(f"{sys.executable} -m pip install -q --no-input transformers>=4.47.0 accelerate>=1.2.0 safetensors>=0.4.5")
c(f"{sys.executable} -m pip install -q --no-input xformers>=0.0.29 --index-url https://download.pytorch.org/whl/cu124")
c(f"{sys.executable} -m pip install -q --no-input gradio>=5.0.0 pillow rembg[gpu] onnxruntime-gpu")
c(f"{sys.executable} -m pip install -q --no-input realesrgan basicsr opencv-python-headless")
c(f"{sys.executable} -m pip install -q --no-input scipy psutil requests peft sentencepiece protobuf")

print("  ✅ Packages installed")

# ─── Import check ───
# FIX H5: import torchvision EARLY (NOT torchvision.extension)
print("\n[2/2] System check...")
import torchvision
import torch
gpu_n = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "NONE"
vram = torch.cuda.get_device_properties(0).total_memory / 1e9 if torch.cuda.is_available() else 0
print(f"  GPU: {gpu_n}")
print(f"  VRAM: {vram:.1f}GB")
print(f"  PyTorch: {torch.__version__}")
print(f"  CUDA: {torch.version.cuda}")

# ─── Pre-download rembg model ───
# FIX M3: Pre-download u2net so it doesn't timeout during inference
print("\n  [CACHE] Pre-downloading rembg model...")
try:
    import rembg
    rembg.new_session(model_name="u2net")  # Forces download
    print("  ✅ rembg u2net cached")
except: print("  ⚠️  rembg cache failed (will download on first use)")

# ─── Pre-download Real-ESRGAN model ───
# FIX M4: Pre-download ESRGAN model
print("  [CACHE] Pre-downloading Real-ESRGAN model...")
esrgan_path = "/kaggle/tmp/weights/realesr-general-x4v3.pth"
if not os.path.exists(esrgan_path):
    import urllib.request
    try:
        url = "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesr-general-x4v3.pth"
        urllib.request.urlretrieve(url, esrgan_path)
        print(f"  ✅ Real-ESRGAN cached ({os.path.getsize(esrgan_path)//(1024**2)}MB)")
    except:
        print("  ⚠️  ESRGAN download failed (will download on first use)")
else:
    print(f"  ✅ Real-ESRGAN already cached")

# ─── Save marker ───
with open("/kaggle/tmp/.cell1_done", "w") as f:
    json.dump({"time": round(time.time()-t0, 0), "gpu": gpu_n, "vram": round(vram, 1)}, f)

elapsed = time.time() - t0
print(f"\n{'='*60}")
print(f"  ✅ CELL 1 COMPLETE! ({elapsed:.0f}s)")
print(f"  ⚠️  RESTART SESSION NOW → Kernel → Restart → Cell 2")
print(f"{'='*60}")


# ╔══════════════════════════════════════════════════════════╗
# ║  CELL 2 — DOWNLOAD MODELS to /kaggle/tmp/models/        ║
# ║  ▶ Run AFTER restart (Cell 1 must be done)              ║
# ║  ▶ Downloads Turbo (F32→FP16) + Base (BF16) + LoRA     ║
# ╚══════════════════════════════════════════════════════════╝

import os, sys, json, time, gc, shutil, requests
warnings.filterwarnings("ignore")

if not os.path.exists("/kaggle/tmp/.cell1_done"):
    print("  ❌ Run Cell 1 first, then restart!")
    raise SystemExit(1)
print("  ✅ Cell 1 verified")

print("="*60)
print("  ZOYA V11 — CELL 2: DOWNLOAD MODELS")
print("="*60)
t0 = time.time()

# ─── Re-set env vars ───
os.environ["XFORMERS_DISABLE_FLASH_ATTN"] = "1"
os.environ["HF_HOME"] = "/kaggle/tmp/.hf"
os.environ["U2NET_HOME"] = "/kaggle/tmp/.u2net"
os.environ["SAFETENSORS_FAST_GPU"] = "1"

import torch
from safetensors.torch import load_file, save_file

BASE = "/kaggle/tmp/models"
TURBO_DIR = f"{BASE}/Z-Image-Turbo"
BASE_DIR = f"{BASE}/Z-Image-Base"
LORA_DIR = f"{BASE}/pornmaster"

# HuggingFace URLs
HF_TURBO = "https://huggingface.co/Tongyi-MAI/Z-Image-Turbo/resolve/main"
HF_BASE  = "https://huggingface.co/Tongyi-MAI/Z-Image/resolve/main"
HF_LORA  = "https://huggingface.co/RomixERR/Pornmaster_v1-Z-Images-Turbo/resolve/main"

disk_ok, _, _ = shutil.disk_usage("/kaggle/tmp")
print(f"  💾 Free: {disk_ok//(2**30)}GB")

def dl(url, dest, desc=""):
    """Download a file with progress"""
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    if os.path.exists(dest) and os.path.getsize(dest) > 1000:
        print(f"  ✅ {desc or os.path.basename(dest)} (cached)")
        return
    print(f"  ⬇️  {desc or os.path.basename(dest)}...", end=" ", flush=True)
    t1 = time.time()
    r = requests.get(url, stream=True, timeout=600)
    r.raise_for_status()
    total = int(r.headers.get("content-length", 0))
    downloaded = 0
    with open(dest, "wb") as f:
        for chunk in r.iter_content(8*1024*1024):
            if chunk:
                f.write(chunk)
                downloaded += len(chunk)
    print(f"{downloaded/1e6:.0f}MB ({time.time()-t1:.0f}s)")

def convert_f32_to_fp16(f32_path, fp16_path):
    """Load F32 → .half() → save FP16 → delete F32"""
    print(f"  🔄 Converting {os.path.basename(f32_path)} → FP16...", end=" ", flush=True)
    t1 = time.time()
    tensors = load_file(f32_path, device="cpu")
    fp16 = {k: v.half() for k, v in tensors.items()}
    del tensors; gc.collect()
    save_file(fp16, fp16_path)
    del fp16; gc.collect()
    os.remove(f32_path)  # Delete F32 to save space
    print(f"{time.time()-t1:.0f}s ✅")

def dl_conv(remote_path, local_dir, name):
    """Download F32 → convert to FP16 → save → delete F32"""
    fp16_name = name.replace(".safetensors", ".fp16.safetensors")
    fp16_path = f"{local_dir}/{fp16_name}"
    if os.path.exists(fp16_path) and os.path.getsize(fp16_path) > 1000:
        print(f"  ✅ {name} → FP16 (cached)")
        return
    f32_path = f"{local_dir}/{name}"
    dl(f"{HF_TURBO}/{remote_path}", f32_path, desc=name)
    convert_f32_to_fp16(f32_path, fp16_path)

# ═══════════════════════════════════════════
# PHASE 1: Z-Image-Turbo (F32 → FP16)
# ═══════════════════════════════════════════
print("\n" + "="*50)
print("  PHASE 1: Z-Image-Turbo (F32→FP16)")
print("="*50)

# Config files (no conversion needed)
print("\n--- Configs ---")
turbo_configs = [
    "model_index.json",
    "transformer/config.json",
    "text_encoder/config.json",
    "vae/config.json",
    "scheduler/scheduler_config.json",
    "tokenizer/tokenizer.json",
    "tokenizer/tokenizer_config.json",
    "tokenizer/special_tokens_map.json",
    "tokenizer/merges.txt",
    "tokenizer/vocab.json",
]
for rel in turbo_configs:
    dl(f"{HF_TURBO}/{rel}", f"{TURBO_DIR}/{rel}", desc=f"cfg/{rel}")

# VAE (single file, small)
print("\n--- VAE ---")
dl_conv("vae/diffusion_pytorch_model.safetensors",
        f"{TURBO_DIR}/vae", "diffusion_pytorch_model.safetensors")

# Text Encoder (3 shards)
print("\n--- Text Encoder ---")
for i in range(1, 4):
    name = f"model-0000{i}-of-00003.safetensors"
    dl_conv(f"text_encoder/{name}", f"{TURBO_DIR}/text_encoder", name)

# Transformer (3 shards)
print("\n--- Transformer ---")
for i in range(1, 4):
    name = f"diffusion_pytorch_model-0000{i}-of-00003.safetensors"
    dl_conv(f"transformer/{name}", f"{TURBO_DIR}/transformer", name)

# Set _variant in model_index.json
idx_path = f"{TURBO_DIR}/model_index.json"
if os.path.exists(idx_path):
    with open(idx_path) as f:
        idx = json.load(f)
    idx["_variant"] = "fp16"
    with open(idx_path, "w") as f:
        json.dump(idx, f, indent=2)
    print("  [VARIANT] _variant set to fp16 ✅")

# ═══════════════════════════════════════════
# PHASE 2: Z-Image-Base (BF16, no conversion)
# ═══════════════════════════════════════════
print("\n" + "="*50)
print("  PHASE 2: Z-Image-Base (BF16, no conversion)")
print("="*50)

# Config files
print("\n--- Configs ---")
base_configs = [
    "model_index.json",
    "transformer/config.json",
    "text_encoder/config.json",
    "vae/config.json",
    "scheduler/scheduler_config.json",
    "tokenizer/tokenizer.json",
    "tokenizer/tokenizer_config.json",
    "tokenizer/special_tokens_map.json",
    "tokenizer/merges.txt",
    "tokenizer/vocab.json",
]
for rel in base_configs:
    dl(f"{HF_BASE}/{rel}", f"{BASE_DIR}/{rel}", desc=f"cfg/{rel}")

# VAE
print("\n--- VAE ---")
dl(f"{HF_BASE}/vae/diffusion_pytorch_model.safetensors",
   f"{BASE_DIR}/vae/diffusion_pytorch_model.safetensors", desc="VAE")

# Text Encoder (3 shards, already BF16)
print("\n--- Text Encoder ---")
for i in range(1, 4):
    name = f"model-0000{i}-of-00003.safetensors"
    dl(f"{HF_BASE}/text_encoder/{name}", f"{BASE_DIR}/text_encoder/{name}", desc=name)

# Transformer (2 shards, already BF16)
print("\n--- Transformer ---")
for i in range(1, 3):
    name = f"diffusion_pytorch_model-0000{i}-of-00002.safetensors"
    dl(f"{HF_BASE}/transformer/{name}", f"{BASE_DIR}/transformer/{name}", desc=name)

# ═══════════════════════════════════════════
# PHASE 3: Pornmaster LoRA
# ═══════════════════════════════════════════
print("\n" + "="*50)
print("  PHASE 3: Pornmaster v1 LoRA")
print("="*50)

# FIX H1: Correct repo URL
lora_files = [
    "Pornmaster_v1_000043500.safetensors",
    "Pornmaster_v1_000044700.safetensors",
]
for fname in lora_files:
    dl(f"{HF_LORA}/{fname}", f"{LORA_DIR}/{fname}", desc=fname)

# Also download config if exists
try:
    dl(f"{HF_LORA}/model_index.json", f"{LORA_DIR}/model_index.json", desc="LoRA config")
except:
    pass  # May not have model_index.json

# ═══════════════════════════════════════════
# VERIFICATION
# ═══════════════════════════════════════════
print("\n" + "="*50)
print("  VERIFICATION")
print("="*50)

for name, path in [("Turbo", TURBO_DIR), ("Base", BASE_DIR), ("LoRA", LORA_DIR)]:
    files = []
    for dp, _, fn in os.walk(path):
        for f in fn:
            if f.endswith(".safetensors"):
                files.append(os.path.join(dp, f))
    total_gb = sum(os.path.getsize(f) for f in files) / (1024**3)
    print(f"  {name}: {len(files)} files, {total_gb:.1f}GB")

# Summary
elapsed = time.time() - t0
_, _, free = shutil.disk_usage("/kaggle/tmp")
print(f"\n{'='*60}")
print(f"  ✅ CELL 2 COMPLETE! ({elapsed:.0f}s)")
print(f"  💾 Free: {free//(2**30)}GB")
print(f"  ▶ Now run Cell 3")
print(f"{'='*60}")


# ╔══════════════════════════════════════════════════════════╗
# ║  CELL 3 — FULL ENGINE                                    ║
# ║  ▶ Run AFTER Cell 2 (models must be downloaded)          ║
# ║  ▶ Loads pipelines, applies all fixes, inference fn      ║
# ╚══════════════════════════════════════════════════════════╝

import os, sys, json, time, gc, traceback, base64, warnings
from io import BytesIO
warnings.filterwarnings("ignore")

if not os.path.exists("/kaggle/tmp/models/Z-Image-Turbo/model_index.json"):
    print("  ❌ Models not found! Run Cell 2 first.")
    raise SystemExit(1)
print("  ✅ Models verified")

print("="*60)
print("  ZOYA V11 — CELL 3: ENGINE")
print("="*60)
t0 = time.time()

# ─── Env vars AGAIN ───
os.environ["XFORMERS_DISABLE_FLASH_ATTN"] = "1"
os.environ["HF_HOME"] = "/kaggle/tmp/.hf"
os.environ["U2NET_HOME"] = "/kaggle/tmp/.u2net"
os.environ["SAFETENSORS_FAST_GPU"] = "1"

# FIX H5: Import torchvision early
import torchvision
import torch
torch.set_grad_enabled(False)
torch.backends.cuda.matmul.allow_tf32 = True
torch.backends.cudnn.allow_tf32 = True
torch.backends.cuda.enable_flash_sdp(False)
torch.backends.cuda.enable_mem_efficient_sdp(True)

# FIX H4: Import from diffusers (installed from git)
from diffusers import (
    ZImagePipeline,
    ZImageImg2ImgPipeline,
    ZImageInpaintPipeline,
)
import gradio as gr
from PIL import Image
import numpy as np
import rembg

# ─── Gradio #11722 monkey-patch (FIX L3) ───
import gradio_client.utils as _gcu
import importlib
importlib.reload(_gcu)
_og1 = _gcu.get_type
_og2 = _gcu._json_schema_to_python_type
_gcu.get_type = lambda s: "boolean" if isinstance(s, bool) else _og1(s)
_gcu._json_schema_to_python_type = lambda s, d=None: "any" if isinstance(s, bool) else _og2(s, d)
print("  [FIX #1] Gradio #11722 ✅")

# ─── Gradio close() fix for Kaggle ───
_orig_close = gr.Blocks.close
async def _safe_close(self):
    if hasattr(self, 'server') and self.server is not None:
        await _orig_close(self)
gr.Blocks.close = _safe_close
print("  [FIX] Gradio close() safe ✅")

# ─── Hardware ───
DTYPE = torch.float16
DTYPE_BASE = torch.bfloat16  # Base model is natively BF16
num_gpus = torch.cuda.device_count()
for i in range(num_gpus):
    torch.cuda.set_per_process_memory_fraction(0.92, i)
    p = torch.cuda.get_device_properties(i)
    print(f"  GPU {i}: {p.name} | {p.total_memory/1e9:.1f}GB VRAM")

TURBO_DIR = "/kaggle/tmp/models/Z-Image-Turbo"
BASE_DIR = "/kaggle/tmp/models/Z-Image-Base"
LORA_DIR = "/kaggle/tmp/models/pornmaster"

# ─── Memory helpers ───
def clear():
    gc.collect(); torch.cuda.synchronize(); torch.cuda.empty_cache(); gc.collect()

def cuda_mem():
    if not torch.cuda.is_available(): return "0GB"
    return f"{torch.cuda.memory_allocated(0)/1e9:.2f}/{torch.cuda.memory_reserved(0)/1e9:.2f}GB"

# ─── Engine state ───
ENG = {
    "turbo": None, "base": None,  # Main pipelines
    "i2i": None, "inpaint": None, # Derived (Turbo-based)
    "base_i2i": None, "base_inpaint": None,  # Base-derived (lazy)
    "lora": "", "lora_w": 0.85,
    "gen": 0, "busy": False, "boot_time": 0,
    "upscaler": None, "base_loaded": False,
}

# ─── Load Turbo pipeline ───
print("\n  [BOOT] Loading Turbo...")
bt = time.time()
try:
    pipe_turbo = ZImagePipeline.from_pretrained(
        TURBO_DIR,
        torch_dtype=DTYPE,
        variant="fp16",
        local_files_only=True,
        low_cpu_mem_usage=False,  # FIX M5
    )
    # FIX: VAE stays in FP32 (prevents black images)
    pipe_turbo.vae = pipe_turbo.vae.to(dtype=torch.float32)
    print("  [VAE] FP32 ✅ (prevents black images)")

    pipe_turbo.enable_model_cpu_offload(gpu_id=0)
    print("  [OFFLOAD] model_cpu_offload ✅")

    try:
        pipe_turbo.enable_xformers_memory_efficient_attention()
        print("  [XFORMERS] ✅")
    except Exception as e:
        print(f"  [XFORMERS] fallback: {e}")
        pipe_turbo.enable_attention_slicing("max")

    pipe_turbo.vae.enable_slicing()
    pipe_turbo.vae.enable_tiling()
    print("  [VAE] slicing + tiling ✅")

    # Smart encoder: offload text_encoder to CPU after encode
    orig_encode = pipe_turbo.encode_prompt
    def smart_encode(prompt, *args, **kwargs):
        result = orig_encode(prompt, *args, **kwargs)
        try:
            if hasattr(pipe_turbo, 'text_encoder') and pipe_turbo.text_encoder is not None:
                pipe_turbo.text_encoder.to("cpu")
            torch.cuda.empty_cache()
        except: pass
        return result
    pipe_turbo.encode_prompt = smart_encode

    # Create derived pipelines (share components)
    s = pipe_turbo.components
    pipe_i2i = ZImageImg2ImgPipeline(**s)
    pipe_i2i.enable_model_cpu_offload(gpu_id=0)
    try: pipe_i2i.enable_xformers_memory_efficient_attention()
    except: pass

    pipe_inpaint = ZImageInpaintPipeline(**s)
    pipe_inpaint.enable_model_cpu_offload(gpu_id=0)
    try: pipe_inpaint.enable_xformers_memory_efficient_attention()
    except: pass

    ENG["turbo"] = pipe_turbo
    ENG["i2i"] = pipe_i2i
    ENG["inpaint"] = pipe_inpaint
    ENG["boot_time"] = round(time.time() - bt, 1)
    print(f"  [BOOT] ✅ in {ENG['boot_time']}s | {cuda_mem()}")

except Exception as e:
    print(f"  [BOOT] ❌ {e}")
    traceback.print_exc()

print("="*60)

# ─── Lazy Base model loader (FIX M6) ───
def load_base_model():
    """Load Base model on-demand for Expert mode"""
    if ENG["base_loaded"] and ENG["base"] is not None:
        return True

    print("\n  [BASE] Loading Z-Image-Base (first Expert use)...")
    tb = time.time()
    try:
        pipe_base = ZImagePipeline.from_pretrained(
            BASE_DIR,
            torch_dtype=DTYPE_BASE,  # BF16 for Base (native format)
            local_files_only=True,
            low_cpu_mem_usage=False,  # FIX M5
        )
        pipe_base.vae = pipe_base.vae.to(dtype=torch.float32)  # VAE in FP32!
        pipe_base.enable_model_cpu_offload(gpu_id=0)
        try: pipe_base.enable_xformers_memory_efficient_attention()
        except: pass
        pipe_base.vae.enable_slicing()
        pipe_base.vae.enable_tiling()

        # Derived pipelines
        sb = pipe_base.components
        base_i2i = ZImageImg2ImgPipeline(**sb)
        base_i2i.enable_model_cpu_offload(gpu_id=0)
        base_inpaint = ZImageInpaintPipeline(**sb)
        base_inpaint.enable_model_cpu_offload(gpu_id=0)

        ENG["base"] = pipe_base
        ENG["base_i2i"] = base_i2i
        ENG["base_inpaint"] = base_inpaint
        ENG["base_loaded"] = True
        print(f"  [BASE] ✅ in {time.time()-tb:.0f}s | {cuda_mem()}")
        return True
    except Exception as e:
        print(f"  [BASE] ❌ {e}")
        traceback.print_exc()
        return False

# ─── Real-ESRGAN upscaler (lazy load) ───
def get_upscaler():
    if ENG["upscaler"] is not None:
        return ENG["upscaler"]
    print("  [UPSCALER] Loading Real-ESRGAN...")
    try:
        from realesrgan import RealESRGANer
        from realesrgan.archs.srvgg_arch import SRVGGNetCompact
        model_path = "/kaggle/tmp/weights/realesr-general-x4v3.pth"
        if not os.path.exists(model_path):
            import urllib.request
            url = "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesr-general-x4v3.pth"
            urllib.request.urlretrieve(url, model_path)
        model = SRVGGNetCompact(num_in_ch=3, num_out_ch=3, num_feat=64, num_conv=32, upscale=4, act_type='prelu')
        upscaler = RealESRGANer(scale=4, model_path=model_path, model=model, tile=400, tile_pad=10, pre_pad=0, half=True)
        ENG["upscaler"] = upscaler
        print("  [UPSCALER] ✅")
        return upscaler
    except Exception as e:
        print(f"  [UPSCALER] ❌ {e}")
        return None

def upscale_image(img_pil, scale=2):
    upscaler = get_upscaler()
    if upscaler is None: return img_pil
    try:
        img_np = np.array(img_pil)[:, :, ::-1]  # RGB → BGR
        out_bgr, _ = upscaler.enhance(img_np, outscale=scale)
        out_rgb = out_bgr[:, :, ::-1]  # BGR → RGB
        return Image.fromarray(out_rgb)
    except Exception as e:
        print(f"  [UPSCALE] ❌ {e}")
        return img_pil

# ─── Image helpers ───
def b64_to_pil(s):
    if not s or not s.strip(): return None
    try: return Image.open(BytesIO(base64.b64decode(s.split(',')[-1]))).convert("RGB")
    except: return None

def pil_to_b64(img):
    if img is None: return ""
    buf = BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()

def sanitize_dim(d, mode="fast"):
    d = max(512, min(1536 if mode != "expert" else 1024, int(d)))
    return (d // 16) * 16

# ─── LoRA loading (FIX M2: Turbo only) ───
def load_lora_turbo(pipe, lora_path, weight):
    """Load LoRA on Turbo pipeline. Returns True if successful."""
    if not os.path.exists(lora_path):
        # Try to find safetensors file
        lora_files = [f for f in os.listdir(LORA_DIR) if f.endswith(".safetensors")] if os.path.exists(LORA_DIR) else []
        if lora_files:
            lora_path = os.path.join(LORA_DIR, lora_files[0])
        else:
            print("  [LORA] No LoRA files found")
            return False
    try:
        pipe.load_lora_weights(lora_path, adapter_name="pornmaster")
        pipe.set_adapters(["pornmaster"], adapter_weights=[weight])
        return True
    except Exception as e:
        print(f"  [LORA] ❌ {e}")
        return False

# ─── MAIN INFERENCE FUNCTION ───
@torch.inference_mode()
def zoya_gateway(task, prompt, neg_prompt, mode, width, height, seed,
                 image_b64, mask_b64, lora_path, lora_weight,
                 cfg_scale, i2i_str, inp_str, exp_steps, upscale_factor):
    start = time.time()
    clear()
    try:
        # ─── Validation ───
        w = sanitize_dim(int(width), mode)
        h = sanitize_dim(int(height), mode)
        seed = int(seed)
        if seed < -1: seed = -1
        if not prompt or not prompt.strip():
            return Image.new("RGB", (512,512), (32,32,32)), json.dumps({"status":"ERROR","error":"Empty prompt"})

        task = task.lower().strip()
        mode = mode.lower().strip()
        lp = lora_path.strip() if lora_path else ""
        lw = float(lora_weight) if lora_weight else 0.85

        # ─── Standalone tasks ───
        img = b64_to_pil(image_b64)

        if task == "upscale":
            if img is None:
                return Image.new("RGB",(512,512),(0,0,0)), json.dumps({"status":"ERROR","error":"No image"})
            sc = int(upscale_factor) if upscale_factor else 2
            result = upscale_image(img, sc)
            return result, json.dumps({"status":"SUCCESS","task":"Upscale","scale":sc,
                "from":f"{img.width}x{img.height}","to":f"{result.width}x{result.height}",
                "time":round(time.time()-start,2)}, indent=2)

        if task == "remove_bg":
            if img is None:
                return Image.new("RGB",(512,512),(0,0,0)), json.dumps({"status":"ERROR","error":"No image"})
            result = rembg.remove(img).convert("RGBA")
            return result, json.dumps({"status":"SUCCESS","task":"Remove_BG",
                "time":round(time.time()-start,2)}, indent=2)

        # ─── Mode config ───
        # FIX H6: Turbo modes MUST have guidance_scale=0.0
        # FIX L2: Use 9 steps for Turbo (yields 8 DiT forwards)
        if mode == "fast":
            name, steps, cfg, neg = "turbo", 9, 0.0, None
        elif mode == "pro":
            name, steps, cfg, neg = "turbo", 18, 0.0, None
        else:  # expert
            name, steps, cfg, neg = "base", int(exp_steps) if exp_steps else 45, \
                                     float(cfg_scale) if cfg_scale else 7.5, \
                                     neg_prompt or "lowres, bad anatomy, bad hands, cropped, worst quality"

        # ─── Load model ───
        if name == "turbo":
            if ENG["turbo"] is None:
                return Image.new("RGB",(512,512),(0,0,0)), json.dumps({"status":"ERROR","error":"Turbo not loaded"})
            pipe = ENG["turbo"]
            i2i_pipe = ENG["i2i"]
            inpaint_pipe = ENG["inpaint"]
        else:  # base
            # FIX M6: Lazy load Base model
            if not ENG["base_loaded"]:
                if not load_base_model():
                    return Image.new("RGB",(512,512),(0,0,0)), json.dumps({"status":"ERROR","error":"Base load failed"})
            pipe = ENG["base"]
            i2i_pipe = ENG["base_i2i"]
            inpaint_pipe = ENG["base_inpaint"]

        # ─── LoRA (FIX M2: Turbo only) ───
        if lp and name == "turbo":
            load_lora_turbo(pipe, lp, lw)

        # ─── Seed ───
        actual_seed = seed
        if seed == -1:
            actual_seed = torch.randint(0, 2**31-1, (1,)).item()
        gen = torch.Generator("cuda").manual_seed(actual_seed)

        # ─── Prepare kwargs ───
        kw = {"prompt": prompt, "num_inference_steps": steps,
              "guidance_scale": cfg, "generator": gen}
        if neg:
            kw["negative_prompt"] = neg

        # ─── Dispatch ───
        t_inf = time.time()
        print(f"  {task} | {w}x{h} | {steps} steps | mode={name} | {cuda_mem()}")

        mask = b64_to_pil(mask_b64)

        if task == "text2image":
            out = pipe(**kw, width=w, height=h)
        elif task == "image2image":
            if img is None: raise ValueError("I2I needs image")
            out = i2i_pipe(**kw, image=img.resize((w,h)),
                          strength=float(i2i_str) if i2i_str else 0.65)
        elif task == "inpaint":
            if img is None or mask is None: raise ValueError("Inpaint needs image+mask")
            out = inpaint_pipe(**kw, image=img.resize((w,h)),
                              mask_image=mask.resize((w,h)).convert("L"),
                              strength=float(inp_str) if inp_str else 0.85)
        else:
            raise ValueError(f"Unknown task: {task}")

        result = out.images[0]
        inf_time = round(time.time() - t_inf, 2)
        del out; clear()

        # ─── Unload LoRA ───
        if lp and name == "turbo":
            try: pipe.unload_lora_weights()
            except: pass
            clear()

        # ─── Upscale post-process ───
        up_time = 0
        fw, fh = w, h
        if upscale_factor and int(upscale_factor) > 1:
            sc = int(upscale_factor)
            tu = time.time()
            result = upscale_image(result, sc)
            up_time = round(time.time() - tu, 2)
            fw, fh = result.width, result.height

        # ─── Status JSON ───
        total = round(time.time() - start, 2)
        status = {"status":"SUCCESS","task":task,"mode":mode,
                  "model":name,"width":w,"height":h,
                  "output_w":fw,"output_h":fh,
                  "steps":steps,"cfg":cfg,
                  "seed":actual_seed,
                  "lora":"pornmaster" if lp else "none",
                  "inference_s":inf_time,"upscale_s":up_time,"total_s":total,
                  "mem":cuda_mem(),"gen":ENG["gen"]}
        ENG["gen"] += 1
        return result, json.dumps(status, indent=2)

    except Exception as e:
        traceback.print_exc()
        clear()
        return Image.new("RGB", (512,512), (32,32,32)), json.dumps({
            "status":"ERROR","error":str(e)[:300],
            "time":round(time.time()-start,2)}, indent=2)

print(f"\n  ✅ CELL 3 COMPLETE ({time.time()-t0:.0f}s)")
print(f"  ▶ Now run Cell 4 for Gradio UI")
print("="*60)


# ╔══════════════════════════════════════════════════════════╗
# ║  CELL 4 — GRADIO UI + GHOST LAUNCH                      ║
# ║  ▶ Run AFTER Cell 3 (engine must be loaded)             ║
# ║  ▶ Full UI with all 5 tasks, 3 modes, LoRA, Upscale    ║
# ╚══════════════════════════════════════════════════════════╝

print("="*60)
print("  ZOYA V11 — CELL 4: GRADIO UI")
print("="*60)

if ENG.get("turbo") is None:
    print("  ❌ Engine not loaded! Run Cell 3 first.")
    raise SystemExit(1)
print(f"  ✅ Engine ready | Turbo boot: {ENG['boot_time']}s")

# ─── BUILD UI ───
with gr.Blocks(title="ZOYA V11", analytics_enabled=False,
               theme=gr.themes.Soft(primary_hue="violet")) as app:

    gr.HTML(f"""
    <div style='padding:20px;background:linear-gradient(135deg,#0f0c29,#302b63,#24243e);
         border-radius:16px;text-align:center;border:1px solid #6C63FF;'>
      <h1 style='color:#fff;margin:0;font-size:32px;font-weight:800;'>⚡ ZOYA GHOST ENGINE V11</h1>
      <p style='color:rgba(255,255,255,0.7);margin:6px 0;font-size:14px;'>
        S3-DiT 6B · T2I · I2I · Inpaint · Remove BG · Upscale · LoRA</p>
      <p style='color:rgba(108,99,255,0.8);margin:0;font-size:12px;'>
        Fast ⚡~20s · Pro 🚀~35s · Expert 🔬~120s (Base+CFG) | VAE FP32 ✅</p>
    </div>""")

    with gr.Row():
        with gr.Column(scale=1):
            task = gr.Dropdown(
                ["Text2Image","Image2Image","Inpaint","Remove_BG","Upscale"],
                value="Text2Image", label="🎯 Task"
            )
            prompt = gr.Textbox(label="📝 Prompt", lines=3,
                value="pronmstr. beautiful woman, perfect skin, cute face, seductive, sensual, soft lighting, 4K, detailed")
            neg_prompt = gr.Textbox(label="🚫 Negative (Expert only)", lines=2,
                value="lowres, bad anatomy, bad hands, cropped, worst quality")
            mode = gr.Radio(
                ["Fast ⚡ (Turbo 9 steps, ~20s)","Pro 🚀 (Turbo 18 steps, ~35s)",
                 "Expert 🔬 (Base 45 steps, CFG, ~120s)"],
                value="Fast ⚡ (Turbo 9 steps, ~20s)", label="⚡ Mode"
            )
            input_img = gr.Image(label="📷 Input Image", type="pil", height=256, visible=False)
            input_mask = gr.Image(label="🎭 Mask (Inpaint)", type="pil", height=256, visible=False)

            def update_vis(t):
                show = t in ("Image2Image","Inpaint","Remove_BG","Upscale")
                return gr.update(visible=show), gr.update(visible=(t=="Inpaint"))
            task.change(fn=update_vis, inputs=task, outputs=[input_img, input_mask])

            with gr.Row():
                width = gr.Slider(512, 1536, 1024, step=64, label="W")
                height = gr.Slider(512, 1536, 1024, step=64, label="H")
                seed = gr.Number(-1, label="Seed", precision=0)

            with gr.Accordion("🔧 Advanced", open=False):
                with gr.Row():
                    cfg_scale = gr.Slider(1, 10, 7.5, 0.5, label="CFG (Expert)")
                    expert_steps = gr.Slider(20, 60, 45, 1, label="Expert Steps")
                with gr.Row():
                    i2i_str = gr.Slider(0.1, 1, 0.65, 0.05, label="I2I Str")
                    inp_str = gr.Slider(0.1, 1, 0.85, 0.05, label="Inpaint Str")

            with gr.Accordion("🧠 LoRA (Turbo only)", open=False):
                lora = gr.Dropdown(["None","Pornmaster v1"], value="None", label="LoRA")
                lora_w = gr.Slider(0, 2, 0.85, 0.05, label="Weight")

            with gr.Accordion("📐 Upscale", open=False):
                up_enable = gr.Checkbox(label="Enable", value=False)
                up_factor = gr.Radio(["2x","4x"], value="2x", label="Scale")

            btn = gr.Button("✨ GENERATE", variant="primary", size="lg")

        with gr.Column(scale=1):
            output = gr.Image(label="🖼 Output", type="pil", height=512)
            status = gr.Textbox(label="📊 Status", lines=16)
            p = torch.cuda.get_device_properties(0)
            gr.HTML(f"<small>xformers | model_cpu_offload | VAE FP32 | "
                    f"{p.total_memory/1e9:.0f}GB T4 | Boot: {ENG['boot_time']}s</small>")

    # ─── Generate handler ───
    def handle(task, prompt, neg, mode, w, h, seed, in_img, in_mask,
               lora_sel, lora_w, cfg, es, i2i, inp, up_en, up_fact):
        mode_map = {
            "Fast ⚡ (Turbo 9 steps, ~20s)": "fast",
            "Pro 🚀 (Turbo 18 steps, ~35s)": "pro",
            "Expert 🔬 (Base 45 steps, CFG, ~120s)": "expert",
        }
        m = mode_map.get(mode, "fast")
        # FIX M2: LoRA only on Turbo (Fast/Pro modes)
        lp = LORA_DIR if ("Pornmaster" in lora_sel and m != "expert") else ""
        # FIX H6: Force prompt with pronmstr for LoRA
        final_prompt = prompt
        if lp and "pronmstr" not in prompt.lower():
            final_prompt = f"pronmstr. {prompt}"
        img_b64 = pil_to_b64(in_img)
        mask_b64 = pil_to_b64(in_mask)
        up_sc = int(up_fact.replace("x","")) if up_en else 0
        return zoya_gateway(task, final_prompt, neg, m, w, h, seed,
                           img_b64, mask_b64, lp, lora_w,
                           cfg, i2i, inp, es, up_sc)

    btn.click(fn=handle,
        inputs=[task, prompt, neg_prompt, mode, width, height, seed,
                input_img, input_mask, lora, lora_w,
                cfg_scale, expert_steps, i2i_str, inp_str,
                up_enable, up_factor],
        outputs=[output, status], api_name="zoya_gateway")

print("  ✅ UI Ready!")
print("\n  [LAUNCH] Ghost Mode...")
app.queue(max_size=5)

# ─── Ghost launch with fallback ───
try:
    app.launch(share=True, server_name="0.0.0.0",
               quiet=True, show_error=False, prevent_thread_lock=True)
    print(f"\n{'='*60}")
    print(f"  ✅ ZOYA V11 ACTIVE! (Ghost Mode)")
    print(f"  ✅ api_name='zoya_gateway' ready")
    print(f"  ✅ Share the gradio.live URL with ZOYA")
    print(f"{'='*60}")
except Exception as e:
    print(f"\n  ⚠️  Ghost launch: {e}")
    print(f"  🔄 Retrying...")
    try:
        app.launch(share=True, server_name="0.0.0.0",
                   quiet=False, show_error=True)
    except Exception as e2:
        print(f"  ❌ {e2}")
        app.launch(share=True, debug=True)

print("\n📡 ZOYA GHOST ENGINE V11 — DEPLOYED")
print("📡 Send URL to ZOYA for remote control")
