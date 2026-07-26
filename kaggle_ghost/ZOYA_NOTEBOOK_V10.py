# ============================================================
# ZOYA GHOST ENGINE V10 — COMPLETE NOTEBOOK
# ⚡ 3 Cells | All Features | All 7 Bug Fixes
# ⚡ T2I · I2I · Inpaint · Remove_BG · Upscale · LoRA
# ⚡ Fast ⚡ Pro 🚀 Expert 🔬
# ============================================================
# ⚡ model_cpu_offload + xformers + VAE tiling | T4 fp16
# ⚡ Ghost Mode | api_name="zoya_gateway" | Remote Ready

# ╔══════════════════════════════════════════════════════════╗
# ║  CELL 1 — ENVIRONMENT SETUP & MODEL DOWNLOAD            ║
# ║  ▶ RUN THIS CELL FIRST                                  ║
# ║  ▶ THEN RESTART SESSION (Kernel → Restart)              ║
# ║  ▶ THEN RUN CELL 2                                       ║
# ╚══════════════════════════════════════════════════════════╝

import os, sys, subprocess, warnings, time, socket, json
warnings.filterwarnings("ignore")

print("="*60)
print("  ZOYA V10 — CELL 1: ENVIRONMENT SETUP")
print("="*60)
t0 = time.time()

# ─── Kaggle internet connectivity check ───
def check_internet():
    try:
        socket.create_connection(("8.8.8.8", 53), timeout=5)
        return True
    except OSError:
        return False

if not check_internet():
    print("  ❌ NO INTERNET! Enable in Notebook Settings → Internet ON")
    print("  ❌ Cannot download packages or models without internet.")
    raise SystemExit(1)
print("  ✅ Internet connected")

# ─── Environment Variables (must be set early) ───
os.environ["XFORMERS_DISABLE_FLASH_ATTN"] = "1"      # FIX #3
os.environ["HF_HOME"] = "/kaggle/working/.hf"
os.environ["HUGGINGFACE_HUB_CACHE"] = "/kaggle/working/.hf/hub"
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "max_split_size_mb:128,expandable_segments:True"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["TRANSFORMERS_VERBOSITY"] = "error"
os.environ["DIFFUSERS_VERBOSITY"] = "error"
os.environ["GRADIO_ANALYTICS_ENABLED"] = "False"
os.environ["GRADIO_SHARE_ENABLED"] = "True"
os.environ["GRADIO_DEBUG"] = "False"
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
os.environ["DO_NOT_TRACK"] = "1"
os.environ["SAFETENSORS_FAST_GPU"] = "1"
os.environ["CUDA_LAUNCH_BLOCKING"] = "0"
os.environ["TORCH_CUDNN_V8_API_ENABLED"] = "1"

os.makedirs("/kaggle/working/.hf/hub", exist_ok=True)
os.makedirs("/kaggle/working/lora_models", exist_ok=True)
os.makedirs("/kaggle/working/outputs", exist_ok=True)
os.makedirs("/kaggle/working/weights", exist_ok=True)

# ─── HF_TOKEN for gated models ───
HF_TOKEN = os.environ.get("HF_TOKEN", "")
if HF_TOKEN:
    subprocess.run(["huggingface-cli", "login", "--token", HF_TOKEN, "--quiet"],
                   capture_output=True)
    print("  ✅ HF_TOKEN authenticated")
else:
    print("  ⚠️  No HF_TOKEN set. If models are gated, set HF_TOKEN env var.")

def c(cmd):
    print(f"  > {cmd[:100]}")
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=300)
    if r.returncode != 0:
        print(f"  ⚠️  {r.stderr[:150]}")
    return r

# ─── Disk space check ───
import shutil
t, u, f = shutil.disk_usage("/kaggle/working")
free_gb = f // (2**30)
print(f"  💾 Disk: {t//(2**30)}GB total, {free_gb}GB free")
if free_gb < 35:
    print(f"  ⚠️  Low disk! May not fit all models.")

# ─── Install version-pinned packages ───
print("\n[1/4] Installing packages...")
pkgs = [
    f"{sys.executable} -m pip install -q --no-input torch==2.4.0 torchvision==0.19.0 --index-url https://download.pytorch.org/whl/cu124",
    f"{sys.executable} -m pip install -q --no-input torchaudio==2.4.0 --index-url https://download.pytorch.org/whl/cu124",
    f"{sys.executable} -m pip install -q --no-input diffusers==0.32.1 transformers==4.47.0 accelerate==1.2.0",
    f"{sys.executable} -m pip install -q --no-input xformers==0.0.28.post1 --index-url https://download.pytorch.org/whl/cu124",
    f"{sys.executable} -m pip install -q --no-input gradio==5.12.0 pillow==10.4.0 huggingface_hub==0.27.0",
    f"{sys.executable} -m pip install -q --no-input safetensors==0.4.5 sentencepiece==0.2.0 protobuf==5.27.0",
    f"{sys.executable} -m pip install -q --no-input rembg[gpu]==2.0.77 onnxruntime-gpu==1.20.0",
    f"{sys.executable} -m pip install -q --no-input realesrgan==0.3.0 basicsr==1.4.2 opencv-python==4.10.0",
    f"{sys.executable} -m pip install -q --no-input scipy psutil requests peft",
]
for cmd in pkgs:
    c(cmd)
print("  ✅ Packages installed")

# ─── System check ───
print("\n[2/4] System check...")
import torch, psutil
gpu_name = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "NONE"
vram_gb = torch.cuda.get_device_properties(0).total_memory / 1e9 if torch.cuda.is_available() else 0
ram_gb = psutil.virtual_memory().total / 1e9
print(f"  GPU: {gpu_name}")
print(f"  VRAM: {vram_gb:.1f}GB")
print(f"  RAM: {ram_gb:.1f}GB")
print(f"  PyTorch: {torch.__version__} | CUDA: {torch.version.cuda}")

# ─── Pre-download models with verification ───
print("\n[3/4] Pre-downloading models...")

def download_model(repo_id, label, check_file="model_index.json", retries=2):
    print(f"  [DL] {label}...")
    for a in range(retries):
        r = subprocess.run([sys.executable, "-m", "huggingface_hub", "download",
                           repo_id, "--quiet", "--resume-download"],
                          capture_output=True, text=True, timeout=600)
        if r.returncode == 0:
            # Check various locations
            for p in [r.stdout.strip().split('\n')[-1] if r.stdout.strip() else "",
                      f"/kaggle/working/.hf/hub/models--{repo_id.replace('/','--')}/snapshots/"]:
                if os.path.exists(os.path.join(p, check_file)) if p else False:
                    sz = sum(os.path.getsize(os.path.join(dp, f)) for dp,_,fn in os.walk(p) for f in fn)//(2**30) if os.path.isdir(p) else 0
                    print(f"    ✅ {label} ({sz}GB)")
                    return True
                # Check snapshots
                if os.path.isdir(p):
                    for s in os.listdir(p):
                        sp = os.path.join(p, s)
                        if os.path.isdir(sp) and os.path.exists(os.path.join(sp, check_file)):
                            print(f"    ✅ {label} (cached)")
                            return True
            if a < retries-1:
                print(f"    ⚠️  Retry {a+1}/{retries}...")
                time.sleep(3)
        else:
            print(f"    ⚠️  Error: {r.stderr[:100]}")
            if a < retries-1:
                time.sleep(5)
    print(f"    ❌ {label} FAILED")
    return False

# Download ALL models
download_model("Tongyi-MAI/Z-Image-Turbo", "Z-Image-Turbo")
total2, _, free2 = shutil.disk_usage("/kaggle/working")
if free2 // (2**30) > 25:
    download_model("Tongyi-MAI/Z-Image", "Z-Image Base")
else:
    print("  ⚠️  Base model skip (disk). Will download on-demand.")
download_model("RomixERR/Pornmaster_v1-Z-Images-Turbo", "Pornmaster v1 LoRA",
               check_file="Pornmaster_v1_000043500.safetensors")

print(f"\n[4/4] Directories ready.")
print(f"  📁 Cache: /kaggle/working/.hf/hub")
print(f"  📁 LoRA:  /kaggle/working/lora_models")
print(f"  📁 Out:   /kaggle/working/outputs")

# ─── Save status ───
with open("/kaggle/working/.cell1_done", "w") as f:
    json.dump({"time": round(time.time()-t0,0), "gpu": gpu_name,
               "vram": round(vram_gb,1)}, f)

elapsed = time.time() - t0
print(f"\n{'='*60}")
print(f"  ✅ CELL 1 COMPLETE! ({elapsed:.0f}s)")
print(f"  ⚠️  RESTART SESSION NOW → Kernel → Restart → Cell 2")
print(f"{'='*60}")


# ============================================================
# ╔══════════════════════════════════════════════════════════╗
# ║  CELL 2 — ENGINE (RUN AFTER RESTART)                    ║
# ║  ▶ Cell 1 must have been run before restart             ║
# ║  ▶ All 7 bug fixes integrated                           ║
# ║  ▶ Loads models, sets up inference pipeline             ║
# ╚══════════════════════════════════════════════════════════╝
# ============================================================

# ─── Verify Cell 1 ran ───
import os, sys, json
if not os.path.exists("/kaggle/working/.cell1_done"):
    print("  ❌ Cell 1 was NOT run! Please run Cell 1 first, then restart.")
    print("  ❌ This cell requires models downloaded in Cell 1.")
    raise SystemExit(1)
with open("/kaggle/working/.cell1_done") as f:
    status = json.load(f)
print(f"  ✅ Cell 1 verified: {status.get('gpu','?')} | {status.get('vram','?')}GB VRAM")

# ─── Set env vars AGAIN (restart clears them!) ───
os.environ["XFORMERS_DISABLE_FLASH_ATTN"] = "1"
os.environ["HF_HOME"] = "/kaggle/working/.hf"
os.environ["HUGGINGFACE_HUB_CACHE"] = "/kaggle/working/.hf/hub"
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "max_split_size_mb:128,expandable_segments:True"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["TRANSFORMERS_VERBOSITY"] = "error"
os.environ["DIFFUSERS_VERBOSITY"] = "error"
os.environ["GRADIO_ANALYTICS_ENABLED"] = "False"
os.environ["GRADIO_DEBUG"] = "False"
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
os.environ["DO_NOT_TRACK"] = "1"
os.environ["SAFETENSORS_FAST_GPU"] = "1"

import warnings, time, gc, traceback, base64, atexit
from io import BytesIO
warnings.filterwarnings("ignore")

print("="*60)
print("  ZOYA V10 — CELL 2: ENGINE")
print("="*60)
t0 = time.time()

# ─── FIX #2: torchvision.extension FIRST ───
import torchvision.extension

# ─── Now safe imports ───
import torch
import torchvision
import torchvision.transforms
torch.set_grad_enabled(False)
torch.backends.cuda.matmul.allow_tf32 = True
torch.backends.cudnn.allow_tf32 = True
torch.backends.cuda.enable_flash_sdp(False)
torch.backends.cuda.enable_mem_efficient_sdp(True)

from diffusers import ZImagePipeline, ZImageImg2ImgPipeline, ZImageInpaintPipeline
import gradio as gr
from PIL import Image
import numpy as np
import rembg
import psutil
import shutil

# ─── FIX #1: Gradio #11722 monkey-patch ───
import gradio_client.utils as _gcu
import importlib
importlib.reload(_gcu)
_og1, _og2 = _gcu.get_type, _gcu._json_schema_to_python_type
_gcu.get_type = lambda s: "boolean" if isinstance(s, bool) else _og1(s)
_gcu._json_schema_to_python_type = lambda s, d=None: "any" if isinstance(s, bool) else _og2(s, d)
print("  [FIX #1] Gradio #11722 ✅")

# ─── Hardware setup ───
DTYPE = torch.float16
num_gpus = torch.cuda.device_count()
for i in range(num_gpus):
    torch.cuda.set_per_process_memory_fraction(0.92, i)
    p = torch.cuda.get_device_properties(i)
    print(f"  GPU {i}: {p.name} | VRAM: {p.total_memory/1e9:.1f}GB")
print(f"  DTYPE: fp16 (T4 native)")

TURBO_ID = "Tongyi-MAI/Z-Image-Turbo"
BASE_ID  = "Tongyi-MAI/Z-Image"
CACHE_DIR = "/kaggle/working/.hf/hub"
LORA_DIR = "/kaggle/working/lora_models/pornmaster"

import shutil
_, _, free_disk = shutil.disk_usage("/kaggle/working")
print(f"  💾 Free disk: {free_disk//(2**30)}GB")

# ─── Memory helpers ───
def clear():
    gc.collect()
    torch.cuda.synchronize()
    torch.cuda.empty_cache()
    gc.collect()

def cuda_mem():
    if not torch.cuda.is_available(): return "0GB"
    return f"{torch.cuda.memory_allocated(0)/1e9:.2f}/{torch.cuda.memory_reserved(0)/1e9:.2f}GB"

# ─── Engine state ───
ENG = {
    "name": None, "t2i": None, "i2i": None, "inpaint": None,
    "lora": "", "lora_w": 0.85, "gen": 0, "boot_time": 0,
    "upscaler": None, "upscaler_loaded": False,
    "busy": False, "warmed_up": False
}

@atexit.register
def cleanup():
    """Clean VRAM on shutdown"""
    for k in ["t2i", "i2i", "inpaint"]:
        if ENG.get(k) is not None:
            try: ENG[k].to("cpu")
            except: pass
    clear()
    print("  [CLEANUP] ✅")

# ─── FIX #5 + #7: Load pipeline with fp16 + no safety checker ───
def load_pipeline(model_id, variant="fp16"):
    """Load with all FIXes applied"""
    print(f"  [LOAD] {model_id.split('/')[-1]} (variant={variant})...")
    print(f"  [MEM] before: {cuda_mem()}")

    try:
        pipe = ZImagePipeline.from_pretrained(
            model_id,
            torch_dtype=DTYPE,
            variant=variant,
            cache_dir=CACHE_DIR,
            low_cpu_mem_usage=False,
        )
    except Exception as e:
        print(f"  [LOAD] Failed with variant={variant}: {e}")
        print(f"  [LOAD] Retrying without variant...")
        pipe = ZImagePipeline.from_pretrained(
            model_id,
            torch_dtype=DTYPE,
            cache_dir=CACHE_DIR,
            low_cpu_mem_usage=False,
        )

    print(f"  [MEM] after load: {cuda_mem()}")

    # FIX #7: Disable safety checker (CRITICAL for NSFW)
    pipe.safety_checker = None
    if hasattr(pipe, 'safety_checker_config'):
        pipe.safety_checker_config = None
    print("  [FIX #7] Safety checker DISABLED ✅")

    # FIX #3: xformers
    try:
        pipe.enable_xformers_memory_efficient_attention()
        print("  [XFORMERS] ✅")
    except Exception as e:
        print(f"  [XFORMERS] fallback: {e}")
        pipe.enable_attention_slicing("max")

    # VAE optimizations
    pipe.vae.enable_slicing()
    pipe.vae.enable_tiling()
    print("  [VAE] slicing + tiling")

    # FIX #4: model_cpu_offload (NOT device_map!)
    pipe.enable_model_cpu_offload(gpu_id=0)
    print("  [FIX #4] model_cpu_offload ✅")

    # Smart text_encoder offload
    orig_encode = pipe.encode_prompt
    def smart_encode(prompt, *args, **kwargs):
        result = orig_encode(prompt, *args, **kwargs)
        try:
            if hasattr(pipe, 'text_encoder') and pipe.text_encoder is not None:
                pipe.text_encoder.to("cpu")
            torch.cuda.empty_cache()
        except: pass
        return result
    pipe.encode_prompt = smart_encode

    print(f"  [MEM] after: {cuda_mem()}")
    return pipe

# ─── Model router with state machine ───
def load_model(name="turbo", lp="", lw=0.85):
    global ENG
    lp = lp.strip() if lp else ""
    lw = float(lw)

    # Cache hit
    if ENG["name"] == name and ENG["lora"] == lp:
        if lp and ENG["lora_w"] != lw:
            try: ENG["t2i"].set_adapters(adapter_weights=[lw]); ENG["lora_w"] = lw
            except: pass
        ENG["gen"] += 1
        return True, "cached"

    # Busy check
    if ENG["busy"]:
        return False, "BUSY - another generation in progress"

    # Different model → unload
    if ENG["name"] != name:
        print(f"  [UNLOAD] {ENG.get('name','none')} → {name}")
        for k in ["t2i", "i2i", "inpaint"]:
            if ENG[k] is not None:
                try: ENG[k].to("cpu")
                except: pass
                del ENG[k]
                ENG[k] = None
        ENG["name"] = None
        clear()

        model_id = TURBO_ID if name == "turbo" else BASE_ID
        print(f"  [BOOT] Loading {name.upper()}...")
        tb = time.time()

        # For Base model, try w/o variant first
        v = "fp16" if name == "turbo" else None
        pipe = load_pipeline(model_id, variant=v)

        print(f"  [BOOT] Loaded in {time.time()-tb:.0f}s")
        s = pipe.components
        ENG["name"] = name
        ENG["t2i"] = pipe
        ENG["i2i"] = ZImageImg2ImgPipeline(**s)
        ENG["inpaint"] = ZImageInpaintPipeline(**s)

        # Apply same opts to derived pipelines
        for p in [ENG["i2i"], ENG["inpaint"]]:
            p.safety_checker = None
            try: p.enable_xformers_memory_efficient_attention()
            except: pass
            p.enable_attention_slicing("max")
            p.vae.enable_slicing()
            p.vae.enable_tiling()
            p.enable_model_cpu_offload(gpu_id=0)

        ENG["lora"] = ""
        print(f"  [OK] {name.upper()} | {cuda_mem()}")

    # LoRA change
    if lp != ENG["lora"]:
        if ENG["lora"]:
            try: ENG["t2i"].unload_lora_weights()
            except: pass
            clear()
        if lp:
            print(f"  [LORA] Loading {lp.split('/')[-1]}...")
            if os.path.exists(lp):
                try:
                    ENG["t2i"].load_lora_weights(lp)
                    # Also set on derived pipes
                    for p in [ENG["i2i"], ENG["inpaint"]]:
                        try: p.load_lora_weights(lp)
                        except: pass
                    print(f"  [LORA] ✅")
                except Exception as e:
                    print(f"  [LORA FAIL] {e}")
            else:
                print(f"  [LORA] Path not found: {lp}")
        ENG["lora"] = lp
        ENG["lora_w"] = lw
        clear()

    # Warmup (first generation is slower)
    if not ENG["warmed_up"]:
        print("  [WARMUP] Running dummy inference...")
        try:
            _ = ENG["t2i"](
                prompt="warmup",
                num_inference_steps=1,
                width=512, height=512,
                guidance_scale=0.0,
                generator=torch.Generator("cuda").manual_seed(0)
            )
            ENG["warmed_up"] = True
            clear()
            print("  [WARMUP] ✅ CUDA kernels compiled")
        except Exception as e:
            print(f"  [WARMUP] Skip: {e}")

    ENG["gen"] += 1
    return True, "loaded"

# ─── LoRA: download to known path ───
if not os.path.exists(f"{LORA_DIR}/Pornmaster_v1_000043500.safetensors"):
    print(f"\n  [LORA] Syncing Pornmaster v1 to {LORA_DIR}...")
    os.makedirs(LORA_DIR, exist_ok=True)
    try:
        from huggingface_hub import snapshot_download
        snapshot_download("RomixERR/Pornmaster_v1-Z-Images-Turbo",
                         local_dir=LORA_DIR, local_dir_use_symlinks=False)
        print(f"  [LORA] ✅")
    except Exception as e:
        print(f"  [LORA] ⚠️ {e}")

# ─── Boot: load Turbo ───
print("\n  [BOOT] Pre-loading Turbo...")
bt = time.time()
ok, msg = load_model("turbo")
if ok:
    ENG["boot_time"] = round(time.time() - bt, 1)
    print(f"  [BOOT] ✅ in {ENG['boot_time']}s | {cuda_mem()}")
else:
    print(f"  [BOOT] ❌ {msg}")
print("="*60)

# ─── Real-ESRGAN upscaler (lazy load) ───
def get_upscaler():
    """Lazy-load Real-ESRGAN upscaler"""
    if ENG["upscaler_loaded"]:
        return ENG["upscaler"]

    print("  [UPSCALER] Loading Real-ESRGAN...")
    try:
        from realesrgan import RealESRGANer
        from realesrgan.archs.srvgg_arch import SRVGGNetCompact

        model_path = "/kaggle/working/weights/realesr-general-x4v3.pth"
        if not os.path.exists(model_path):
            # Download on demand
            import urllib.request
            os.makedirs("/kaggle/working/weights", exist_ok=True)
            url = "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesr-general-x4v3.pth"
            print(f"  [UPSCALER] Downloading model...")
            urllib.request.urlretrieve(url, model_path)
            print(f"  [UPSCALER] Downloaded ✅")

        model = SRVGGNetCompact(
            num_in_ch=3, num_out_ch=3, num_feat=64,
            num_conv=32, upscale=4, act_type='prelu'
        )
        upscaler = RealESRGANer(
            scale=4, model_path=model_path, model=model,
            tile=400, tile_pad=10, pre_pad=0, half=True
        )
        ENG["upscaler"] = upscaler
        ENG["upscaler_loaded"] = True
        print(f"  [UPSCALER] ✅")
        return upscaler
    except Exception as e:
        print(f"  [UPSCALER] ❌ {e}")
        return None

def upscale_image(img_pil, scale=2):
    """Upscale a PIL image. Returns PIL image."""
    upscaler = get_upscaler()
    if upscaler is None:
        return img_pil  # No upscaler available

    try:
        # Convert PIL → numpy BGR (Real-ESRGAN uses OpenCV format)
        img_np = np.array(img_pil)[:, :, ::-1]  # RGB → BGR
        output_bgr, _ = upscaler.enhance(img_np, outscale=scale)
        output_rgb = output_bgr[:, :, ::-1]  # BGR → RGB
        return Image.fromarray(output_rgb)
    except Exception as e:
        print(f"  [UPSCALE] ❌ {e}")
        return img_pil

# ─── Image conversion helpers ───
def b64_to_pil(s):
    """Base64 string → PIL Image. Returns None on failure."""
    if not s or not s.strip(): return None
    try:
        return Image.open(BytesIO(base64.b64decode(s.split(',')[-1]))).convert("RGB")
    except:
        return None

def pil_to_b64(img):
    """PIL Image → base64 data URI string"""
    if img is None: return ""
    buf = BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()

def sanitize_dim(d, name, mode="fast"):
    """Ensure dimensions are valid for Z-Image"""
    d = max(512, min(1536 if mode != "expert" else 1024, int(d)))
    d = (d // 16) * 16  # Must be multiple of 16
    return d

# ─── Main inference function ───
@torch.inference_mode()
def zoya_gateway(task, prompt, neg_prompt, mode, width, height, seed,
                 image_b64, mask_b64, lora_path, lora_weight,
                 cfg_scale, i2i_str, inp_str, exp_steps, upscale_factor):
    """Complete inference pipeline with all features"""
    start = time.time()
    clear()

    try:
        # ─── Input validation ───
        errors = []
        w = sanitize_dim(int(width), "width", mode.lower())
        h = sanitize_dim(int(height), "height", mode.lower())
        if w != int(width) or h != int(height):
            errors.append(f"Dimensions adjusted to {w}x{h} (must be multiple of 16)")

        seed = int(seed)
        if seed < -1:
            errors.append(f"Invalid seed: {seed}. Using -1 (random).")
            seed = -1

        if not prompt or not prompt.strip():
            errors.append("Prompt is empty")

        mode = mode.strip().lower()
        if mode not in ("fast", "pro", "expert"):
            errors.append(f"Invalid mode: {mode}")

        task = task.strip().lower()
        valid_tasks = ("text2image", "image2image", "inpaint", "remove_bg", "upscale")
        if task not in valid_tasks:
            errors.append(f"Invalid task: {task}")

        if task in ("image2image", "inpaint", "remove_bg") and not image_b64:
            errors.append(f"{task} requires an input image")
        if task == "inpaint" and not mask_b64:
            errors.append("Inpaint requires a mask image")
        if task == "upscale" and not image_b64:
            errors.append("Upscale requires an input image")

        if errors:
            return Image.new("RGB", (512, 512), (32, 32, 32)), json.dumps({
                "status": "ERROR", "errors": errors,
                "time": round(time.time() - start, 2)
            }, indent=2)

        lp = lora_path.strip() if lora_path else ""
        lw = float(lora_weight) if lora_weight else 0.85

        # ─── Handle Upscale task (standalone) ───
        if task == "upscale":
            img = b64_to_pil(image_b64)
            if img is None:
                return Image.new("RGB", (512, 512), (0, 0, 0)), json.dumps({
                    "status": "ERROR", "message": "Could not decode image",
                    "time": round(time.time() - start, 2)
                })
            sc = int(upscale_factor) if upscale_factor else 2
            result = upscale_image(img, sc)
            return result, json.dumps({
                "status": "SUCCESS", "task": "Upscale",
                "original": f"{img.width}x{img.height}",
                "result": f"{result.width}x{result.height}",
                "scale": sc,
                "time": round(time.time() - start, 2)
            }, indent=2)

        # ─── Handle Remove_BG ───
        if task == "remove_bg":
            img = b64_to_pil(image_b64)
            if img is None:
                return Image.new("RGB", (512, 512), (0, 0, 0)), json.dumps({
                    "status": "ERROR", "message": "Could not decode image",
                    "time": round(time.time() - start, 2)
                })
            result = rembg.remove(img).convert("RGBA")  # Keep alpha!
            return result, json.dumps({
                "status": "SUCCESS", "task": "Remove_BG",
                "time": round(time.time() - start, 2)
            }, indent=2)

        # ─── Mode configuration ───
        if mode == "fast":
            name, steps, cfg, neg = "turbo", 8, 0.0, None
        elif mode == "pro":
            name, steps, cfg, neg = "turbo", 16, 0.0, None
        else:  # expert
            name, steps, cfg, neg = "base", int(exp_steps) if exp_steps else 45, \
                                     float(cfg_scale) if cfg_scale else 4.5, \
                                     neg_prompt or "lowres, bad anatomy, bad hands, cropped, worst quality"

        # ─── Load model ───
        ok, msg = load_model(name, lp, lw)
        if not ok:
            return Image.new("RGB", (512, 512), (0, 0, 0)), json.dumps({
                "status": "ERROR", "message": f"Model load failed: {msg}",
                "time": round(time.time() - start, 2)
            })

        # Decode input images
        img = b64_to_pil(image_b64)
        mask = b64_to_pil(mask_b64)

        # ─── Seed handling ───
        actual_seed = seed
        if seed == -1:
            actual_seed = torch.randint(0, 2**31 - 1, (1,)).item()
        gen = torch.Generator("cuda").manual_seed(actual_seed)

        # ─── Prepare kwargs ───
        kw = {
            "prompt": prompt,
            "num_inference_steps": steps,
            "guidance_scale": cfg,
            "generator": gen,
        }
        if neg:
            kw["negative_prompt"] = neg

        # ─── Dispatch task ───
        t0_inf = time.time()
        print(f"  {task} | {w}x{h} | {steps} steps | mode={mode} | {cuda_mem()}")

        if task == "text2image":
            out = ENG["t2i"](**kw, width=w, height=h)
        elif task == "image2image":
            if img is None:
                raise ValueError("Image2Image requires input image")
            out = ENG["i2i"](**kw, image=img.resize((w, h)),
                            strength=float(i2i_str) if i2i_str else 0.65)
        elif task == "inpaint":
            if img is None or mask is None:
                raise ValueError("Inpaint requires image + mask")
            out = ENG["inpaint"](**kw, image=img.resize((w, h)),
                                mask_image=mask.resize((w, h)).convert("L"),
                                strength=float(inp_str) if inp_str else 0.85)
        else:
            raise ValueError(f"Unknown task: {task}")

        result = out.images[0]
        inf_time = round(time.time() - t0_inf, 2)
        del out
        clear()

        # ─── Post-process: Upscale ───
        upscale_time = 0
        final_w, final_h = w, h
        if upscale_factor and int(upscale_factor) > 1:
            sc = int(upscale_factor)
            print(f"  [UPSCALE] {sc}x...")
            tu = time.time()
            result = upscale_image(result, sc)
            upscale_time = round(time.time() - tu, 2)
            final_w, final_h = result.width, result.height
            print(f"  [UPSCALE] ✅ {final_w}x{final_h} in {upscale_time}s")

        # ─── Status JSON ───
        total_time = round(time.time() - start, 2)
        status_data = {
            "status": "SUCCESS",
            "task": task,
            "mode": mode,
            "width": w, "height": h,
            "output_width": final_w, "output_height": final_h,
            "steps": steps, "cfg": cfg,
            "seed_used": actual_seed,
            "lora": lp.split('/')[-1] if lp else "none",
            "engine": ENG["name"],
            "gen_id": ENG["gen"],
            "inference_s": inf_time,
            "upscale_s": upscale_time,
            "total_s": total_time,
            "mem": cuda_mem(),
            "ghost": "V10 ACTIVE"
        }

        return result, json.dumps(status_data, indent=2)

    except Exception as e:
        traceback.print_exc()
        clear()
        return Image.new("RGB", (512, 512), (32, 32, 32)), json.dumps({
            "status": "ERROR",
            "message": str(e)[:300],
            "time": round(time.time() - start, 2)
        }, indent=2)

print(f"\n  ✅ CELL 2 COMPLETE ({time.time()-t0:.0f}s)")
print(f"  ▶ Now run Cell 3 to launch Gradio UI")
print("="*60)


# ============================================================
# ╔══════════════════════════════════════════════════════════╗
# ║  CELL 3 — GRADIO UI + GHOST LAUNCH                      ║
# ║  ▶ Run AFTER Cell 2 (engine must be loaded)             ║
# ║  ▶ Full UI: T2I, I2I, Inpaint, Remove_BG, Upscale      ║
# ║  ▶ Ghost Mode: stealth launch with error fallback       ║
# ╚══════════════════════════════════════════════════════════╝
# ============================================================

print("="*60)
print("  ZOYA V10 — CELL 3: GRADIO UI + LAUNCH")
print("="*60)

# ─── Verify Cell 2 ran ───
if ENG.get("t2i") is None:
    print("  ❌ Cell 2 was NOT run! Run Cell 2 first, then this cell.")
    raise SystemExit(1)
print(f"  ✅ Engine ready: {ENG['name']} | {ENG['gen']} gens")

# ─── Gradio UI ───
with gr.Blocks(title="ZOYA V10", analytics_enabled=False,
               theme=gr.themes.Soft(primary_hue="violet")) as app:

    gr.HTML(f"""
    <div style='padding:20px;background:linear-gradient(135deg,#0f0c29,#302b63,#24243e);
         border-radius:16px;text-align:center;border:1px solid #6C63FF;'>
      <h1 style='color:#fff;margin:0;font-size:32px;font-weight:800;'>⚡ ZOYA GHOST ENGINE V10</h1>
      <p style='color:rgba(255,255,255,0.7);margin:6px 0;font-size:14px;'>
        S3-DiT 6B · T2I · I2I · Inpaint · Remove BG · Upscale · LoRA</p>
      <p style='color:rgba(108,99,255,0.8);margin:0;font-size:12px;'>
        Fast ⚡8s · Pro 🚀16s · Expert 🔬45s Base + CFG</p>
    </div>""")

    with gr.Row():
        with gr.Column(scale=1):
            # ─── Task ───
            task = gr.Dropdown(
                ["Text2Image", "Image2Image", "Inpaint", "Remove_BG", "Upscale"],
                value="Text2Image", label="🎯 Task"
            )

            # ─── Prompt ───
            prompt = gr.Textbox(label="📝 Prompt", lines=3,
                value="pronmstr. beautiful woman, perfect skin, cute face, seductive, sensual, soft lighting, 4K, detailed")
            neg_prompt = gr.Textbox(label="🚫 Negative (Expert only)", lines=2,
                value="lowres, bad anatomy, bad hands, cropped, worst quality")

            # ─── Mode ───
            mode = gr.Radio(
                ["Fast ⚡ (8 steps, Turbo)", "Pro 🚀 (16 steps, Turbo)", "Expert 🔬 (45 steps, Base + CFG)"],
                value="Fast ⚡ (8 steps, Turbo)", label="⚡ Mode"
            )

            # ─── Image uploads (separate per task to avoid Gradio reset bug) ───
            input_img = gr.Image(label="📷 Input Image", type="pil", height=256, visible=False)
            input_mask = gr.Image(label="🎭 Mask (for Inpaint)", type="pil", height=256, visible=False)

            def update_vis(task_val):
                """Dynamic visibility for image/mask uploads"""
                is_gen = task_val in ("Image2Image", "Inpaint", "Remove_BG")
                is_inpaint = task_val == "Inpaint"
                is_upscale = task_val == "Upscale"
                show_img = is_gen or is_upscale
                return gr.update(visible=show_img), gr.update(visible=is_inpaint)

            task.change(fn=update_vis, inputs=task, outputs=[input_img, input_mask])

            with gr.Row():
                width = gr.Slider(512, 1536, 1024, step=64, label="Width")
                height = gr.Slider(512, 1536, 1024, step=64, label="Height")
                seed = gr.Number(-1, label="Seed (-1=random)", precision=0)

            with gr.Accordion("🔧 Advanced", open=False):
                with gr.Row():
                    cfg_scale = gr.Slider(1, 10, 4.5, 0.5, label="CFG (Expert only)")
                    expert_steps = gr.Slider(20, 60, 45, 1, label="Expert Steps")
                with gr.Row():
                    i2i_strength = gr.Slider(0.1, 1, 0.65, 0.05, label="I2I Strength")
                    inp_strength = gr.Slider(0.1, 1, 0.85, 0.05, label="Inpaint Strength")

            with gr.Accordion("🧠 LoRA", open=False):
                lora_select = gr.Dropdown(
                    ["None", "Pornmaster v1 (pronmstr)"],
                    value="None", label="LoRA"
                )
                lora_weight = gr.Slider(0, 2, 0.85, 0.05, label="Weight")

            with gr.Accordion("📐 Upscale", open=False):
                upscale_enable = gr.Checkbox(label="Enable Upscale", value=False)
                upscale_factor = gr.Radio(["2x", "4x"], value="2x", label="Scale")

            btn = gr.Button("✨ GENERATE", variant="primary", size="lg")

        with gr.Column(scale=1):
            output = gr.Image(label="🖼 Output", type="pil", height=512)
            status = gr.Textbox(label="📊 Status", lines=16)
            p = torch.cuda.get_device_properties(0)
            gr.HTML(
                f"<small>xformers ✅ | model_cpu_offload | "
                f"{p.total_memory/1e9:.0f}GB T4 | "
                f"Boot: {ENG.get('boot_time',0)}s | "
                f"Gen: {ENG.get('gen',0)}</small>"
            )

    # ─── Generate handler ───
    def handle_generate(task, prompt, neg, mode, w, h, seed,
                        in_img, in_mask, lora, lw, cfg, es, i2i, inp,
                        up_enable, up_factor):
        """Wrapper: UI inputs → zoya_gateway()"""
        mode_map = {
            "Fast ⚡ (8 steps, Turbo)": "fast",
            "Pro 🚀 (16 steps, Turbo)": "pro",
            "Expert 🔬 (45 steps, Base + CFG)": "expert",
        }
        m = mode_map.get(mode, "fast")
        lp = LORA_DIR if "Pornmaster" in lora else ""
        img_b64 = pil_to_b64(in_img)
        mask_b64 = pil_to_b64(in_mask)
        up_sc = int(up_factor.replace("x", "")) if up_enable else 0

        return zoya_gateway(
            task, prompt, neg, m, w, h, seed, img_b64, mask_b64,
            lp, lw, cfg, i2i, inp, es, up_sc
        )

    btn.click(
        fn=handle_generate,
        inputs=[
            task, prompt, neg_prompt, mode, width, height, seed,
            input_img, input_mask, lora_select, lora_weight,
            cfg_scale, expert_steps, i2i_strength, inp_strength,
            upscale_enable, upscale_factor
        ],
        outputs=[output, status],
        api_name="zoya_gateway"
    )

print("  ✅ UI ready!")

# ─── Ghost launch with fallback ───
print("\n  [LAUNCH] Starting Gradio...")
print("  [LAUNCH] Ghost Mode: stealth, no debug output")
app.queue(max_size=5)

try:
    app.launch(
        share=True,
        server_name="0.0.0.0",
        quiet=True,
        show_error=False,
        prevent_thread_lock=True
    )
    print(f"\n{'='*60}")
    print(f"  ✅ ZOYA GHOST ENGINE V10 — ACTIVE!")
    print(f"  ✅ Gradio launched — check output above for URL")
    print(f"  ✅ Send URL to ZOYA for remote control")
    print(f"  ✅ api_name='zoya_gateway' ready")
    print(f"{'='*60}")
except Exception as e:
    print(f"\n  ⚠️  Ghost launch failed: {e}")
    print(f"  🔄 Retrying with visible output...")
    try:
        app.launch(
            share=True,
            server_name="0.0.0.0",
            quiet=False,
            show_error=True,
            prevent_thread_lock=True
        )
    except Exception as e2:
        print(f"  ❌ Gradio launch FAILED: {e2}")
        print(f"  💡 Check: Is internet ON? Is port available?")
        # Final try with debug
        app.launch(share=True, debug=True)

print("\n📡 ZOYA GHOST ENGINE V10 — DEPLOYED")
print("📡 Share the gradio.live URL with ZOYA")
