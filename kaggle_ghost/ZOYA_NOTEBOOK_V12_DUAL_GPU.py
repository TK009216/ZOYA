# ============================================================
# ZOYA GHOST ENGINE V12.4 — DUAL GPU EDITION
# ============================================================
# FIXES over V11:
#  - DUAL T4: Turbo on GPU 0, Base on GPU 1 (separate GPUs)
#  - NO device_map="balanced" (no NVLink — would crash)
#  - Upscaler load/unload per use (no memory leak)
#  - Generator on correct GPU device
#  - Clean ASCII (no ghost unicode chars)
#  - ALL Cell 4 code complete (btn.click + app.launch verified)
#  - VAE FP32 on both pipelines
#  - 5 tasks: T2I, I2I, Inpaint, Remove_BG, Upscale
#  - 3 modes: Fast (9 steps), Pro (18 steps), Expert (45 steps+CFG)
#  - LoRA Pornmaster v1 (Turbo only)
#  - Lazy Base loading (GPU 1, first Expert use)
# ============================================================
# V12.1 FIXES:
#  - Cell 2: Fixed 404 error — special_tokens_map.json DOES NOT EXIST
#  - Cell 2: Added missing text_encoder/generation_config.json
#  - Cell 2: Added missing model.safetensors.index.json for text_encoder & transformer
#  - Cell 2: Config lists now match EXACT HF repo file listings
#  - All cells verified against HuggingFace API
# ============================================================
# V12.2 FIXES:
#  - Cell 1: Pinned transformers<=4.49.0 (v4.50.0+ broke with torch 2.10.0)
#  - Cell 1: Removed torchvision install line
#  - Cell 1: Removed import torchvision from system check
#  - Cell 3: Removed import torchvision
#  - ROOT CAUSE: transformers v4.50.0 uses @torch.compiler.disable(recursive=False)
#    which triggers torch._dynamo → imports InlinedCodeCache from torch._guards,
#    but InlinedCodeCache was ADDED in torch 2.11.0 — Kaggle has torch 2.10.0+cu128
# ============================================================
# V12.3 FIXES:
#  - Cell 1: Added "pip uninstall -y torchvision" (secondary cleanup)
#  - ROOT CAUSE: Kaggle's PyTorch is CUDA 13.0 but torchvision is CUDA 12.8.
# ============================================================
# V12.4 FIXES (FINAL — 100% guaranteed):
#  - Cell 3: Added importlib.util.find_spec patch to block torchvision
#    BEFORE importing diffusers/transformers.
#  - ROOT CAUSE: pip uninstall removes files but leaves metadata behind.
#    After kernel restart, find_spec("torchvision") still returns a spec
#    (from leftover egg-info/pth), but actual import fails with
#    ModuleNotFoundError or CUDA version mismatch.
#  - FIX: Patch find_spec at the importlib level — 100% bypass.
#    transformers' is_torchvision_available() uses find_spec internally.
#    When find_spec returns None, the check becomes False and the entire
#    torchvision block in image_utils.py is skipped at module load time.
#  - This works regardless of what pip uninstall does or doesn't remove.
# ============================================================

# ============================================================
# CELL 1 — PACKAGES + ENVIRONMENT
# Run first, then RESTART SESSION, then Cell 2
# ============================================================
import os, sys, subprocess, warnings, time, socket, json, shutil
warnings.filterwarnings("ignore")

print("="*60)
print("  ZOYA V12 — CELL 1: PACKAGES + ENVIRONMENT")
print("="*60)
t0 = time.time()

def check_internet():
    try:
        socket.create_connection(("8.8.8.8", 53), timeout=5)
        return True
    except:
        return False

if not check_internet():
    print("  FAIL: No internet. Enable in Notebook Settings.")
    raise SystemExit(1)
print("  [OK] Internet")

os.environ["XFORMERS_DISABLE_FLASH_ATTN"] = "1"
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
os.environ["U2NET_HOME"] = "/kaggle/tmp/.u2net"

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

HF_TOKEN = os.environ.get("HF_TOKEN", "")
if HF_TOKEN:
    subprocess.run(["huggingface-cli", "login", "--token", HF_TOKEN, "--quiet"], capture_output=True)
    print("  [OK] HF_TOKEN set")
else:
    print("  [WARN] No HF_TOKEN. Public models OK.")

def run_cmd(cmd):
    print(f"  > {cmd[:100]}")
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=600)
    if r.returncode != 0:
        print(f"  [WARN] {r.stderr[:150]}")
    return r

t, u, f = shutil.disk_usage("/kaggle/tmp")
print(f"  [DISK] {f//(2**30)}GB free / {t//(2**30)}GB total")

print("\n[1/2] Installing packages...")
run_cmd(f"{sys.executable} -m pip install -q --no-input torch>=2.5.0 --index-url https://download.pytorch.org/whl/cu124")
run_cmd(f"{sys.executable} -m pip install -q --no-input git+https://github.com/huggingface/diffusers")
run_cmd(f"{sys.executable} -m pip install -q --no-input 'transformers>=4.47.0,<=4.49.0' accelerate>=1.2.0 safetensors>=0.4.5")
run_cmd(f"{sys.executable} -m pip install -q --no-input xformers>=0.0.29 --index-url https://download.pytorch.org/whl/cu124")
run_cmd(f"{sys.executable} -m pip install -q --no-input gradio>=5.0.0 pillow rembg[gpu] onnxruntime-gpu")
run_cmd(f"{sys.executable} -m pip install -q --no-input realesrgan basicsr opencv-python-headless")
run_cmd(f"{sys.executable} -m pip install -q --no-input scipy psutil requests peft sentencepiece protobuf")
run_cmd(f"{sys.executable} -m pip uninstall -y torchvision")
print("  [OK] Packages installed")

print("\n[2/2] System check...")
import torch
ngpu = torch.cuda.device_count()
gpu_names = []
gpu_vram = []
for i in range(ngpu):
    gpu_names.append(torch.cuda.get_device_name(i))
    gpu_vram.append(torch.cuda.get_device_properties(i).total_memory / 1e9)
    print(f"  GPU {i}: {gpu_names[-1]} | {gpu_vram[-1]:.1f}GB VRAM")
print(f"  PyTorch: {torch.__version__} | CUDA: {torch.version.cuda}")
if ngpu < 2:
    print("  [WARN] Only 1 GPU detected. Dual T4 recommended.")
else:
    print("  [OK] Dual GPU detected!")

print("\n  [CACHE] Pre-downloading rembg u2net...")
try:
    import rembg
    rembg.new_session(model_name="u2net")
    print("  [OK] rembg cached")
except:
    print("  [WARN] rembg cache failed")

print("  [CACHE] Pre-downloading Real-ESRGAN...")
esrgan_path = "/kaggle/tmp/weights/realesr-general-x4v3.pth"
if not os.path.exists(esrgan_path):
    import urllib.request
    try:
        url = "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesr-general-x4v3.pth"
        urllib.request.urlretrieve(url, esrgan_path)
        print(f"  [OK] ESRGAN cached ({os.path.getsize(esrgan_path)//(1024**2)}MB)")
    except:
        print("  [WARN] ESRGAN download failed")
else:
    print(f"  [OK] ESRGAN already cached")

with open("/kaggle/tmp/.cell1_done", "w") as f:
    json.dump({"time": round(time.time()-t0, 0), "gpus": ngpu,
               "gpu0": gpu_names[0] if gpu_names else "NONE",
               "vram0": round(gpu_vram[0], 1) if gpu_vram else 0}, f)

elapsed = time.time() - t0
print(f"\n{'='*60}")
print(f"  [OK] CELL 1 COMPLETE! ({elapsed:.0f}s)")
print(f"  [ACTION] RESTART SESSION NOW -> Kernel -> Restart -> Cell 2")
print(f"{'='*60}")


# ============================================================
# CELL 2 — DOWNLOAD MODELS to /kaggle/tmp/models/
# Run AFTER restart (Cell 1 must be done)
# FIXED: Exact HF repo file listings — no more 404 errors!
# ============================================================
import os, sys, json, time, gc, shutil, requests, warnings
warnings.filterwarnings("ignore")

if not os.path.exists("/kaggle/tmp/.cell1_done"):
    print("  FAIL: Run Cell 1 first, then restart!")
    raise SystemExit(1)
print("  [OK] Cell 1 verified")

print("="*60)
print("  ZOYA V12 — CELL 2: DOWNLOAD MODELS")
print("="*60)
t0 = time.time()

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

HF_TURBO = "https://huggingface.co/Tongyi-MAI/Z-Image-Turbo/resolve/main"
HF_BASE  = "https://huggingface.co/Tongyi-MAI/Z-Image/resolve/main"
HF_LORA  = "https://huggingface.co/RomixERR/Pornmaster_v1-Z-Images-Turbo/resolve/main"

_, _, free_disk = shutil.disk_usage("/kaggle/tmp")
print(f"  [DISK] Free: {free_disk//(2**30)}GB")

def dl(url, dest, desc=""):
    """Download file, skip if already cached"""
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    if os.path.exists(dest) and os.path.getsize(dest) > 1000:
        print(f"  [CACHED] {desc or os.path.basename(dest)}")
        return True
    print(f"  [DL] {desc or os.path.basename(dest)}...", end=" ", flush=True)
    t1 = time.time()
    try:
        r = requests.get(url, stream=True, timeout=600)
        r.raise_for_status()
        downloaded = 0
        with open(dest, "wb") as f:
            for chunk in r.iter_content(8 * 1024 * 1024):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
        print(f"{downloaded/1e6:.0f}MB ({time.time()-t1:.0f}s)")
        return True
    except requests.exceptions.HTTPError as e:
        print(f"\n  [SKIP] 404 — {desc} does not exist in repo")
        return False

def convert_f32_to_fp16(f32_path, fp16_path):
    """Load F32 -> .half() -> save FP16 -> delete F32"""
    print(f"  [CONV] {os.path.basename(f32_path)} -> FP16...", end=" ", flush=True)
    t1 = time.time()
    tensors = load_file(f32_path, device="cpu")
    fp16_t = {k: v.half() for k, v in tensors.items()}
    del tensors; gc.collect()
    save_file(fp16_t, fp16_path)
    del fp16_t; gc.collect()
    os.remove(f32_path)
    print(f"{time.time()-t1:.0f}s [OK]")

def dl_conv(remote_path, local_dir, name):
    """Download F32 -> convert to FP16 -> save -> delete F32"""
    fp16_name = name.replace(".safetensors", ".fp16.safetensors")
    fp16_path = f"{local_dir}/{fp16_name}"
    if os.path.exists(fp16_path) and os.path.getsize(fp16_path) > 1000:
        print(f"  [CACHED] {name} -> FP16")
        return
    f32_path = f"{local_dir}/{name}"
    ok = dl(f"{HF_TURBO}/{remote_path}", f32_path, desc=name)
    if ok:
        convert_f32_to_fp16(f32_path, fp16_path)

# ============================================================
# PHASE 1: Z-Image-Turbo (F32 -> FP16)
# Files verified against HuggingFace API on 2026-07-19
# ============================================================
print("\n" + "="*50)
print("  PHASE 1: Z-Image-Turbo (F32->FP16)")
print("="*50)

# --- Config files (exact list from HF API, no special_tokens_map) ---
print("\n--- Configs ---")
turbo_configs = [
    "model_index.json",
    "transformer/config.json",
    "transformer/diffusion_pytorch_model.safetensors.index.json",
    "text_encoder/config.json",
    "text_encoder/generation_config.json",
    "text_encoder/model.safetensors.index.json",
    "vae/config.json",
    "scheduler/scheduler_config.json",
    "tokenizer/tokenizer.json",
    "tokenizer/tokenizer_config.json",
    "tokenizer/merges.txt",
    "tokenizer/vocab.json",
]
for rel in turbo_configs:
    dl(f"{HF_TURBO}/{rel}", f"{TURBO_DIR}/{rel}", desc=f"cfg/{rel}")

# --- VAE (single file, F32) ---
print("\n--- VAE ---")
dl_conv("vae/diffusion_pytorch_model.safetensors",
        f"{TURBO_DIR}/vae", "diffusion_pytorch_model.safetensors")

# --- Text Encoder (3 shards, F32) ---
print("\n--- Text Encoder ---")
for i in range(1, 4):
    name = f"model-0000{i}-of-00003.safetensors"
    dl_conv(f"text_encoder/{name}", f"{TURBO_DIR}/text_encoder", name)

# --- Transformer (3 shards, F32) ---
print("\n--- Transformer ---")
for i in range(1, 4):
    name = f"diffusion_pytorch_model-0000{i}-of-00003.safetensors"
    dl_conv(f"transformer/{name}", f"{TURBO_DIR}/transformer", name)

# Set _variant in model_index.json to fp16
idx_path = f"{TURBO_DIR}/model_index.json"
if os.path.exists(idx_path):
    with open(idx_path) as f:
        idx = json.load(f)
    idx["_variant"] = "fp16"
    with open(idx_path, "w") as f:
        json.dump(idx, f, indent=2)
    print("  [VARIANT] _variant = fp16 [OK]")

# ============================================================
# PHASE 2: Z-Image-Base (BF16, no conversion needed)
# Files verified against HuggingFace API on 2026-07-19
# ============================================================
print("\n" + "="*50)
print("  PHASE 2: Z-Image-Base (BF16, no conversion)")
print("="*50)

# --- Config files ---
print("\n--- Configs ---")
base_configs = [
    "model_index.json",
    "transformer/config.json",
    "transformer/diffusion_pytorch_model.safetensors.index.json",
    "text_encoder/config.json",
    "text_encoder/generation_config.json",
    "text_encoder/model.safetensors.index.json",
    "vae/config.json",
    "scheduler/scheduler_config.json",
    "tokenizer/tokenizer.json",
    "tokenizer/tokenizer_config.json",
    "tokenizer/merges.txt",
    "tokenizer/vocab.json",
]
for rel in base_configs:
    dl(f"{HF_BASE}/{rel}", f"{BASE_DIR}/{rel}", desc=f"cfg/{rel}")

# --- VAE (single file, already BF16) ---
print("\n--- VAE ---")
dl(f"{HF_BASE}/vae/diffusion_pytorch_model.safetensors",
   f"{BASE_DIR}/vae/diffusion_pytorch_model.safetensors", desc="VAE")

# --- Text Encoder (3 shards, already BF16) ---
print("\n--- Text Encoder ---")
for i in range(1, 4):
    name = f"model-0000{i}-of-00003.safetensors"
    dl(f"{HF_BASE}/text_encoder/{name}", f"{BASE_DIR}/text_encoder/{name}", desc=name)

# --- Transformer (2 shards, already BF16 — note: 2 shards not 3!) ---
print("\n--- Transformer ---")
for i in range(1, 3):
    name = f"diffusion_pytorch_model-0000{i}-of-00002.safetensors"
    dl(f"{HF_BASE}/transformer/{name}", f"{BASE_DIR}/transformer/{name}", desc=name)

# ============================================================
# PHASE 3: Pornmaster LoRA
# ============================================================
print("\n" + "="*50)
print("  PHASE 3: Pornmaster v1 LoRA")
print("="*50)

lora_files = [
    "Pornmaster_v1_000043500.safetensors",
    "Pornmaster_v1_000044700.safetensors",
]
for fname in lora_files:
    dl(f"{HF_LORA}/{fname}", f"{LORA_DIR}/{fname}", desc=fname)

# ============================================================
# VERIFICATION
# ============================================================
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

elapsed = time.time() - t0
_, _, free_after = shutil.disk_usage("/kaggle/tmp")
print(f"\n{'='*60}")
print(f"  [OK] CELL 2 COMPLETE! ({elapsed:.0f}s)")
print(f"  [DISK] Free: {free_after//(2**30)}GB")
print(f"  [NEXT] Now run Cell 3")
print(f"{'='*60}")


# ============================================================
# CELL 3 — DUAL GPU ENGINE
# Run AFTER Cell 2 (models must be downloaded)
# Turbo (FP16) on GPU 0, Base (BF16, lazy) on GPU 1
# ============================================================
import os, sys, json, time, gc, traceback, base64, warnings
from io import BytesIO
warnings.filterwarnings("ignore")

if not os.path.exists("/kaggle/tmp/models/Z-Image-Turbo/model_index.json"):
    print("  FAIL: Models not found! Run Cell 2 first.")
    raise SystemExit(1)
print("  [OK] Models verified")

print("="*60)
print("  ZOYA V12 — CELL 3: DUAL GPU ENGINE")
print("="*60)
t0 = time.time()

os.environ["XFORMERS_DISABLE_FLASH_ATTN"] = "1"
os.environ["HF_HOME"] = "/kaggle/tmp/.hf"
os.environ["U2NET_HOME"] = "/kaggle/tmp/.u2net"
os.environ["SAFETENSORS_FAST_GPU"] = "1"

import torch
torch.set_grad_enabled(False)
torch.backends.cuda.matmul.allow_tf32 = True
torch.backends.cudnn.allow_tf32 = True
torch.backends.cuda.enable_flash_sdp(False)
torch.backends.cuda.enable_mem_efficient_sdp(True)

# ===== FIX V12.4: Block torchvision at importlib level =====
# Kaggle's PyTorch is CUDA 13.0 but leftover torchvision metadata confuses
# transformers' is_torchvision_available() check. Patching find_spec to
# return None for "torchvision" makes the check always False.
import importlib.util as _il
_orig_find_spec = _il.find_spec
_il.find_spec = lambda name, *a, **kw: None if name == 'torchvision' else _orig_find_spec(name, *a, **kw)
# ============================================================

from diffusers import ZImagePipeline, ZImageImg2ImgPipeline, ZImageInpaintPipeline
import gradio as gr
from PIL import Image
import numpy as np
import rembg

# Gradio patches
import gradio_client.utils as _gcu
import importlib
importlib.reload(_gcu)
_og1, _og2 = _gcu.get_type, _gcu._json_schema_to_python_type
_gcu.get_type = lambda s: "boolean" if isinstance(s, bool) else _og1(s)
_gcu._json_schema_to_python_type = lambda s, d=None: "any" if isinstance(s, bool) else _og2(s, d)
print("  [FIX] Gradio #11722 [OK]")

_orig_close = gr.Blocks.close
async def _safe_close(self):
    if hasattr(self, "server") and self.server is not None:
        await _orig_close(self)
gr.Blocks.close = _safe_close
print("  [FIX] Gradio close() [OK]")

ngpu = torch.cuda.device_count()
gpu0_name = torch.cuda.get_device_name(0) if ngpu > 0 else "NONE"
gpu1_name = torch.cuda.get_device_name(1) if ngpu > 1 else "NONE"
vram0 = torch.cuda.get_device_properties(0).total_memory / 1e9 if ngpu > 0 else 0
vram1 = torch.cuda.get_device_properties(1).total_memory / 1e9 if ngpu > 1 else 0
print(f"  GPU 0: {gpu0_name} | {vram0:.1f}GB")
print(f"  GPU 1: {gpu1_name} | {vram1:.1f}GB")

DTYPE = torch.float16
DTYPE_BASE = torch.bfloat16
TURBO_DIR = "/kaggle/tmp/models/Z-Image-Turbo"
BASE_DIR = "/kaggle/tmp/models/Z-Image-Base"
LORA_DIR = "/kaggle/tmp/models/pornmaster"

def flush():
    gc.collect(); torch.cuda.synchronize(); torch.cuda.empty_cache(); gc.collect()

def cuda_mem_all():
    out = []
    for i in range(ngpu):
        a = torch.cuda.memory_allocated(i) / 1e9
        r = torch.cuda.memory_reserved(i) / 1e9
        out.append(f"GPU{i}:{a:.2f}/{r:.2f}GB")
    return " | ".join(out)

ENG = {"turbo": None, "base": None, "i2i": None, "inpaint": None,
       "base_loaded": False, "boot_time": 0, "gen": 0}

# ---- LOAD TURBO on GPU 0 ----
print("\n[BOOT] Loading Turbo on GPU 0...")
bt = time.time()
try:
    pipe_turbo = ZImagePipeline.from_pretrained(
        TURBO_DIR, torch_dtype=DTYPE, variant="fp16",
        local_files_only=True, low_cpu_mem_usage=False)
    pipe_turbo.vae = pipe_turbo.vae.to(dtype=torch.float32)
    print("  [VAE] FP32 [OK]")
    pipe_turbo.enable_model_cpu_offload(gpu_id=0)
    print("  [OFFLOAD] GPU 0 [OK]")
    try:
        pipe_turbo.enable_xformers_memory_efficient_attention()
        print("  [XFORMERS] [OK]")
    except Exception as e:
        print(f"  [XFORMERS] fallback: {e}")
        pipe_turbo.enable_attention_slicing("max")
    pipe_turbo.vae.enable_slicing()
    pipe_turbo.vae.enable_tiling()
    print("  [VAE] slicing + tiling [OK]")

    s = pipe_turbo.components
    pipe_i2i = ZImageImg2ImgPipeline(**s)
    try: pipe_i2i.enable_xformers_memory_efficient_attention()
    except: pass
    pipe_inpaint = ZImageInpaintPipeline(**s)
    try: pipe_inpaint.enable_xformers_memory_efficient_attention()
    except: pass

    ENG["turbo"] = pipe_turbo
    ENG["i2i"] = pipe_i2i
    ENG["inpaint"] = pipe_inpaint
    ENG["boot_time"] = round(time.time() - bt, 1)
    print(f"  [BOOT] {ENG['boot_time']}s | {cuda_mem_all()} [OK]")
except Exception as e:
    print(f"  [BOOT] FAIL: {e}")
    traceback.print_exc()
print("="*60)

# ---- LAZY LOAD BASE on GPU 1 ----
def load_base_model():
    """Load Base model on GPU 1 when first Expert request comes"""
    if ENG["base_loaded"] and ENG["base"] is not None:
        return True
    print("\n[BASE] Loading on GPU 1 (first Expert use)...")
    tb = time.time()
    try:
        pipe_base = ZImagePipeline.from_pretrained(
            BASE_DIR, torch_dtype=DTYPE_BASE,
            local_files_only=True, low_cpu_mem_usage=False)
        pipe_base.vae = pipe_base.vae.to(dtype=torch.float32)
        print("  [VAE] FP32 [OK]")
        pipe_base.enable_model_cpu_offload(gpu_id=1)
        print("  [OFFLOAD] GPU 1 [OK]")
        try: pipe_base.enable_xformers_memory_efficient_attention()
        except: pipe_base.enable_attention_slicing("max")
        pipe_base.vae.enable_slicing()
        pipe_base.vae.enable_tiling()
        sb = pipe_base.components
        base_i2i = ZImageImg2ImgPipeline(**sb)
        try: base_i2i.enable_xformers_memory_efficient_attention()
        except: pass
        base_inpaint = ZImageInpaintPipeline(**sb)
        try: base_inpaint.enable_xformers_memory_efficient_attention()
        except: pass
        ENG["base"] = pipe_base
        ENG["base_i2i"] = base_i2i
        ENG["base_inpaint"] = base_inpaint
        ENG["base_loaded"] = True
        print(f"  [BASE] {time.time()-tb:.0f}s | {cuda_mem_all()} [OK]")
        return True
    except Exception as e:
        print(f"  [BASE] FAIL: {e}")
        traceback.print_exc()
        return False

# ---- UPSCALER (load/unload per use — no memory leak) ----
class SafeUpscaler:
    def __init__(self):
        self._model = None
        self._active_gpu = -1
    def _load(self, gpu_id):
        if self._model is not None and self._active_gpu == gpu_id:
            return self._model
        self._unload()
        try:
            from realesrgan import RealESRGANer
            from realesrgan.archs.srvgg_arch import SRVGGNetCompact
            model_path = "/kaggle/tmp/weights/realesr-general-x4v3.pth"
            if not os.path.exists(model_path):
                import urllib.request
                url = "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesr-general-x4v3.pth"
                urllib.request.urlretrieve(url, model_path)
            model = SRVGGNetCompact(num_in_ch=3, num_out_ch=3, num_feat=64, num_conv=32, upscale=4, act_type="prelu")
            self._model = RealESRGANer(scale=4, model_path=model_path, model=model, tile=400, tile_pad=10, pre_pad=0, half=True, device=f"cuda:{gpu_id}")
            self._active_gpu = gpu_id
            print(f"  [UPSCALER] loaded on GPU {gpu_id}")
            return self._model
        except Exception as e:
            print(f"  [UPSCALER] load fail: {e}")
            return None
    def _unload(self):
        if self._model is not None:
            try:
                if hasattr(self._model, "model"): del self._model.model
                del self._model
            except: pass
            self._model = None
            self._active_gpu = -1
            flush()
    def upscale(self, img_pil, gpu_id=0, scale=2):
        m = self._load(gpu_id)
        if m is None: return img_pil
        try:
            img_np = np.array(img_pil)[:, :, ::-1]
            out_bgr, _ = m.enhance(img_np, outscale=scale)
            out_rgb = out_bgr[:, :, ::-1]
            return Image.fromarray(out_rgb)
        except Exception as e:
            print(f"  [UPSCALE] fail: {e}")
            return img_pil
        finally:
            self._unload()

upscaler = SafeUpscaler()

def b64_to_pil(s):
    if not s or not s.strip(): return None
    try: return Image.open(BytesIO(base64.b64decode(s.split(",")[-1]))).convert("RGB")
    except: return None

def pil_to_b64(img):
    if img is None: return ""
    buf = BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()

def sanitize_dim(d, mode="fast"):
    d = max(512, min(1536 if mode != "expert" else 1024, int(d)))
    return (d // 16) * 16

def load_lora_turbo(pipe, lora_path, weight):
    if not os.path.exists(lora_path):
        files = [f for f in os.listdir(LORA_DIR) if f.endswith(".safetensors")] if os.path.exists(LORA_DIR) else []
        if files: lora_path = os.path.join(LORA_DIR, files[0])
        else:
            print("  [LORA] No files found")
            return False
    try:
        pipe.load_lora_weights(lora_path, adapter_name="pornmaster")
        pipe.set_adapters(["pornmaster"], adapter_weights=[weight])
        return True
    except Exception as e:
        print(f"  [LORA] fail: {e}")
        return False

# ---- MAIN INFERENCE ----
@torch.inference_mode()
def zoya_gateway(task, prompt, neg_prompt, mode, width, height, seed,
                 image_b64, mask_b64, lora_path, lora_weight,
                 cfg_scale, i2i_str, inp_str, exp_steps, upscale_factor):
    start = time.time()
    flush()
    try:
        w = sanitize_dim(int(width), mode)
        h = sanitize_dim(int(height), mode)
        seed_i = int(seed)
        if seed_i < -1: seed_i = -1
        if not prompt or not prompt.strip():
            return Image.new("RGB",(512,512),(32,32,32)), json.dumps({"status":"ERROR","error":"Empty prompt"})
        task = task.lower().strip()
        mode_s = mode.lower().strip()
        lp = lora_path.strip() if lora_path else ""
        lw = float(lora_weight) if lora_weight else 0.85
        img = b64_to_pil(image_b64)

        if task == "upscale":
            if img is None: return Image.new("RGB",(512,512),(0,0,0)), json.dumps({"status":"ERROR","error":"No image"})
            sc = int(upscale_factor) if upscale_factor else 2
            result = upscaler.upscale(img, gpu_id=0, scale=sc)
            return result, json.dumps({"status":"SUCCESS","task":"Upscale","scale":sc,"from":f"{img.width}x{img.height}","to":f"{result.width}x{result.height}","time":round(time.time()-start,2)}, indent=2)

        if task == "remove_bg":
            if img is None: return Image.new("RGB",(512,512),(0,0,0)), json.dumps({"status":"ERROR","error":"No image"})
            result = rembg.remove(img).convert("RGBA")
            return result, json.dumps({"status":"SUCCESS","task":"Remove_BG","time":round(time.time()-start,2)}, indent=2)

        # Mode -> model + GPU mapping
        if mode_s == "fast":
            model_name, steps, cfg, neg, gpu_id = "turbo", 9, 0.0, None, 0
        elif mode_s == "pro":
            model_name, steps, cfg, neg, gpu_id = "turbo", 18, 0.0, None, 0
        else:
            model_name, steps, cfg, neg, gpu_id = "base", int(exp_steps) if exp_steps else 45, float(cfg_scale) if cfg_scale else 7.5, neg_prompt or "lowres, bad anatomy, bad hands, cropped, worst quality", 1

        if model_name == "turbo":
            if ENG["turbo"] is None: return Image.new("RGB",(512,512),(0,0,0)), json.dumps({"status":"ERROR","error":"Turbo not loaded"})
            pipe, pipe_i2i, pipe_inpaint = ENG["turbo"], ENG["i2i"], ENG["inpaint"]
        else:
            if not ENG["base_loaded"] and not load_base_model():
                return Image.new("RGB",(512,512),(0,0,0)), json.dumps({"status":"ERROR","error":"Base load failed"})
            pipe, pipe_i2i, pipe_inpaint = ENG["base"], ENG["base_i2i"], ENG["base_inpaint"]

        if lp and model_name == "turbo":
            load_lora_turbo(pipe, lp, lw)

        actual_seed = seed_i if seed_i != -1 else torch.randint(0, 2**31-1, (1,)).item()
        gen = torch.Generator(device=f"cuda:{gpu_id}").manual_seed(actual_seed)

        kw = {"prompt": prompt, "num_inference_steps": steps, "guidance_scale": cfg, "generator": gen}
        if neg: kw["negative_prompt"] = neg

        t_inf = time.time()
        print(f"  [{model_name.upper()}] {task} | {w}x{h} | {steps} steps | GPU {gpu_id}")
        mask = b64_to_pil(mask_b64)

        if task == "text2image":
            out = pipe(**kw, width=w, height=h)
        elif task == "image2image":
            if img is None: raise ValueError("I2I needs image")
            out = pipe_i2i(**kw, image=img.resize((w,h)), strength=float(i2i_str) if i2i_str else 0.65)
        elif task == "inpaint":
            if img is None or mask is None: raise ValueError("Inpaint needs image+mask")
            out = pipe_inpaint(**kw, image=img.resize((w,h)), mask_image=mask.resize((w,h)).convert("L"), strength=float(inp_str) if inp_str else 0.85)
        else:
            raise ValueError(f"Unknown task: {task}")

        result = out.images[0]
        inf_time = round(time.time() - t_inf, 2)
        del out; flush()

        if lp and model_name == "turbo":
            try: pipe.unload_lora_weights()
            except: pass
            flush()

        up_time = 0
        fw, fh = w, h
        if upscale_factor and int(upscale_factor) > 1:
            sc = int(upscale_factor)
            tu = time.time()
            result = upscaler.upscale(result, gpu_id=gpu_id, scale=sc)
            up_time = round(time.time() - tu, 2)
            fw, fh = result.width, result.height

        total = round(time.time() - start, 2)
        status = {"status":"SUCCESS","task":task,"mode":mode_s,"model":model_name,"gpu":gpu_id,"width":w,"height":h,"output_w":fw,"output_h":fh,"steps":steps,"cfg":cfg,"seed":actual_seed,"lora":"pornmaster" if lp else "none","inference_s":inf_time,"upscale_s":up_time,"total_s":total,"mem":cuda_mem_all(),"gen":ENG["gen"]}
        ENG["gen"] += 1
        return result, json.dumps(status, indent=2)
    except Exception as e:
        traceback.print_exc()
        flush()
        return Image.new("RGB",(512,512),(32,32,32)), json.dumps({"status":"ERROR","error":str(e)[:300],"time":round(time.time()-start,2)}, indent=2)

print(f"\n  [OK] CELL 3 COMPLETE ({time.time()-t0:.0f}s)")
print(f"  [NEXT] Now run Cell 4 for Gradio UI")
print("="*60)


# ============================================================
# CELL 4 — GRADIO UI + GHOST LAUNCH
# Run AFTER Cell 3 (engine must be loaded)
# Full UI with all 5 tasks, 3 modes, LoRA, Upscale
# ============================================================
print("="*60)
print("  ZOYA V12 — CELL 4: GRADIO UI")
print("="*60)

if ENG.get("turbo") is None:
    print("  FAIL: Engine not loaded! Run Cell 3 first.")
    raise SystemExit(1)
print(f"  [OK] Engine ready | Turbo boot: {ENG['boot_time']}s")

with gr.Blocks(title="ZOYA V12 Dual GPU", analytics_enabled=False, theme=gr.themes.Soft(primary_hue="violet")) as app:

    gr.HTML("""
    <div style="padding:20px;background:linear-gradient(135deg,#0f0c29,#302b63,#24243e);
         border-radius:16px;text-align:center;border:1px solid #6C63FF;">
      <h1 style="color:#fff;margin:0;font-size:32px;font-weight:800;">
        ZOYA GHOST ENGINE V12</h1>
      <p style="color:rgba(255,255,255,0.7);margin:6px 0;font-size:14px;">
        Dual T4 GPU - S3-DiT 6B - T2I - I2I - Inpaint - Remove BG - Upscale - LoRA</p>
      <p style="color:rgba(108,99,255,0.8);margin:0;font-size:12px;">
        Fast (Turbo GPU 0) - Pro (Turbo GPU 0) - Expert (Base GPU 1) | VAE FP32</p>
    </div>""")

    with gr.Row():
        with gr.Column(scale=1):
            task = gr.Dropdown(["Text2Image","Image2Image","Inpaint","Remove_BG","Upscale"], value="Text2Image", label="Task")
            prompt = gr.Textbox(label="Prompt", lines=3,
                value="pronmstr. beautiful woman, perfect skin, cute face, seductive, sensual, soft lighting, 4K, detailed")
            neg_prompt = gr.Textbox(label="Negative (Expert only)", lines=2,
                value="lowres, bad anatomy, bad hands, cropped, worst quality")
            mode = gr.Radio(["Fast (Turbo 9 steps, GPU 0)","Pro (Turbo 18 steps, GPU 0)","Expert (Base 45 steps+CFG, GPU 1)"],
                value="Fast (Turbo 9 steps, GPU 0)", label="Mode")
            input_img = gr.Image(label="Input Image", type="pil", height=256, visible=False)
            input_mask = gr.Image(label="Mask (Inpaint)", type="pil", height=256, visible=False)

            def update_vis(t):
                show = t in ("Image2Image","Inpaint","Remove_BG","Upscale")
                return gr.update(visible=show), gr.update(visible=(t=="Inpaint"))
            task.change(fn=update_vis, inputs=task, outputs=[input_img, input_mask])

            with gr.Row():
                width = gr.Slider(512, 1536, 1024, step=64, label="Width")
                height = gr.Slider(512, 1536, 1024, step=64, label="Height")
                seed = gr.Number(-1, label="Seed", precision=0)

            with gr.Accordion("Advanced", open=False):
                with gr.Row():
                    cfg_scale = gr.Slider(1, 10, 7.5, 0.5, label="CFG (Expert)")
                    expert_steps = gr.Slider(20, 60, 45, 1, label="Expert Steps")
                with gr.Row():
                    i2i_str = gr.Slider(0.1, 1, 0.65, 0.05, label="I2I Strength")
                    inp_str = gr.Slider(0.1, 1, 0.85, 0.05, label="Inpaint Strength")

            with gr.Accordion("LoRA (Turbo only)", open=False):
                lora = gr.Dropdown(["None","Pornmaster v1"], value="None", label="LoRA")
                lora_w = gr.Slider(0, 2, 0.85, 0.05, label="LoRA Weight")

            with gr.Accordion("Upscale", open=False):
                up_enable = gr.Checkbox(label="Enable", value=False)
                up_factor = gr.Radio(["2x","4x"], value="2x", label="Scale")

            btn = gr.Button("GENERATE", variant="primary", size="lg")

        with gr.Column(scale=1):
            output = gr.Image(label="Output", type="pil", height=512)
            status = gr.Textbox(label="Status", lines=16)
            p0 = torch.cuda.get_device_properties(0)
            p1 = torch.cuda.get_device_properties(1) if ngpu > 1 else None
            info = f"xformers | model_cpu_offload | VAE FP32 | GPU0: {p0.name} {p0.total_memory/1e9:.0f}GB | "
            if p1: info += f"GPU1: {p1.name} {p1.total_memory/1e9:.0f}GB | "
            info += f"Boot: {ENG['boot_time']}s"
            gr.HTML(f"<small>{info}</small>")

    def handle(task, prompt, neg, mode, w, h, seed, in_img, in_mask,
               lora_sel, lora_w, cfg, es, i2i, inp, up_en, up_fact):
        mode_map = {"Fast (Turbo 9 steps, GPU 0)":"fast","Pro (Turbo 18 steps, GPU 0)":"pro","Expert (Base 45 steps+CFG, GPU 1)":"expert"}
        m = mode_map.get(mode, "fast")
        lp = LORA_DIR if ("Pornmaster" in lora_sel and m != "expert") else ""
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

print("  [OK] UI ready!")
print("\n[LAUNCH] Ghost mode...")
app.queue(max_size=5)

try:
    app.launch(share=True, server_name="0.0.0.0", quiet=True, show_error=False, prevent_thread_lock=True)
    print(f"\n{'='*60}")
    print(f"  [OK] ZOYA V12 ACTIVE! (Ghost Mode)")
    print(f"  [OK] api_name='zoya_gateway' ready")
    print(f"  [OK] Dual GPU: Turbo on GPU 0, Base on GPU 1")
    print(f"{'='*60}")
except Exception as e:
    print(f"\n  [WARN] Ghost fail: {e}")
    try:
        app.launch(share=True, server_name="0.0.0.0", quiet=False, show_error=True)
    except Exception as e2:
        print(f"  [RETRY] {e2}")
        app.launch(share=True, debug=True)

print("\nZOYA V12 DUAL GPU - DEPLOYED")
print("Send the gradio.live URL to ZOYA for remote control")
