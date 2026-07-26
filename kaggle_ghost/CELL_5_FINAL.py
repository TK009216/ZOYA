# ============================================================
# CELL 5 — ZOYA GHOST ENGINE V9 (ALL FIXES INTEGRATED)
# ⚡ model_cpu_offload + xformers | Dual T4 | fp16
# ⚡ Fixes: Gradio #11722, torchvision, xformers, OOM
# ============================================================
import os

# ═══════════════════════════════════════════
# CRITICAL: Env vars BEFORE any other import
# ═══════════════════════════════════════════
os.environ["XFORMERS_DISABLE_FLASH_ATTN"] = "1"     # ← FIX #3
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "max_split_size_mb:128,expandable_segments:True"
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["TRANSFORMERS_VERBOSITY"] = "error"
os.environ["DIFFUSERS_VERBOSITY"] = "error"
os.environ["GRADIO_ANALYTICS_ENABLED"] = "False"
os.environ["GRADIO_SHARE_ENABLED"] = "True"
os.environ["GRADIO_DEBUG"] = "False"
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
os.environ["DO_NOT_TRACK"] = "1"

import sys, subprocess, warnings, time, gc, json, base64, traceback
from io import BytesIO
warnings.filterwarnings("ignore")
warnings.simplefilter("ignore")

# ─── Install onnxruntime for rembg ───
subprocess.check_call([sys.executable, "-m", "pip", "install", "-q",
    "rembg", "onnxruntime"], stderr=subprocess.DEVNULL)

# ═══════════════════════════════════════════
# FIX #2: torchvision circular import
# Load extension FIRST → breaks circular dep
# ═══════════════════════════════════════════
import torchvision.extension  # ← MUST be first!
import torchvision
import torchvision.transforms

import torch; torch.set_grad_enabled(False)
torch.backends.cuda.matmul.allow_tf32 = True
torch.backends.cudnn.allow_tf32 = True
torch.backends.cuda.enable_flash_sdp(False)        # T4 doesn't benefit
torch.backends.cuda.enable_mem_efficient_sdp(True)  # Use this instead

from diffusers import ZImagePipeline, ZImageImg2ImgPipeline, ZImageInpaintPipeline
import gradio as gr
from PIL import Image
import rembg, numpy as np

print("="*60)
print("  ZOYA GHOST ENGINE V9 — ALL FIXES INTEGRATED")
print("  model_cpu_offload + xformers + VAE tiling")
print("="*60)

# ═══════════════════════════════════════════
# FIX #1: Gradio #11722 monkey-patch
# ═══════════════════════════════════════════
import gradio_client.utils as _gcu
_og1 = _gcu.get_type
_og2 = _gcu._json_schema_to_python_type
_gcu.get_type = lambda s: "boolean" if isinstance(s, bool) else _og1(s)
_gcu._json_schema_to_python_type = lambda s, d=None: "any" if isinstance(s, bool) else _og2(s, d)
print("  [PATCH] Gradio #11722 ✅")

# ═══════════════════════════════════════════
# Hardware
# ═══════════════════════════════════════════
DTYPE = torch.float16  # T4 NATIVE — NO bf16!
num_gpus = torch.cuda.device_count()
for i in range(num_gpus):
    torch.cuda.set_per_process_memory_fraction(0.94, i)
    p = torch.cuda.get_device_properties(i)
    print(f"  GPU {i}: {p.name} | VRAM: {p.total_memory/1e9:.1f}GB")
print(f"  Dtype: {DTYPE}")

# ─── Use HF model IDs directly (cache from Cell 1) ───
TURBO_ID = "Tongyi-MAI/Z-Image-Turbo"
BASE_ID  = "Tongyi-MAI/Z-Image"
CACHE_DIR = "/kaggle/working/.hf/hub"

# ═══════════════════════════════════════════
# Memory helpers
# ═══════════════════════════════════════════
def clear():
    gc.collect(); torch.cuda.synchronize(); torch.cuda.empty_cache(); gc.collect()

def cuda_mem():
    if not torch.cuda.is_available(): return "0 GB"
    a = torch.cuda.memory_allocated(0) / 1e9
    r = torch.cuda.memory_reserved(0) / 1e9
    return f"{a:.2f}GB/{r:.2f}GB"

# ═══════════════════════════════════════════
# Engine state
# ═══════════════════════════════════════════
ENG = {"name": None, "t2i": None, "i2i": None, "inpaint": None,
       "lora": "", "lora_w": 0.85, "gen": 0, "boot_time": 0}

# ═══════════════════════════════════════════
# FIX #5: Correct loading strategy
# NO device_map! S3-DiT can't split across GPUs.
# Use model_cpu_offload + xformers + VAE tiling
# ═══════════════════════════════════════════
def load_pipeline(model_id):
    """Load with xformers + model_cpu_offload (Tier 1)"""
    print(f"  [LOAD] {model_id.split('/')[-1]}...")
    print(f"  [MEM] before: {cuda_mem()}")

    pipe = ZImagePipeline.from_pretrained(
        model_id,
        torch_dtype=DTYPE,
        cache_dir=CACHE_DIR,
        low_cpu_mem_usage=False,
    )
    print(f"  [MEM] after load (CPU): {cuda_mem()}")

    # ─── Xformers (FIX #3) ───
    try:
        pipe.enable_xformers_memory_efficient_attention()
        print("  [XFORMERS] ✅")
    except Exception as e:
        print(f"  [XFORMERS] ❌ {str(e)[:60]}")
        pipe.enable_attention_slicing("max")

    # ─── VAE optimizations ───
    pipe.vae.enable_slicing()
    pipe.vae.enable_tiling()
    print("  [VAE] ✅ slicing + tiling")

    # ─── CPU offload (NOT device_map!) ───
    pipe.enable_model_cpu_offload(gpu_id=0)
    print("  [OFFLOAD] ✅ model_cpu_offload")

    # ─── Smart encoder: free text_encoder after encode ───
    orig_encode = pipe.encode_prompt
    def smart_encode(prompt, *args, **kwargs):
        result = orig_encode(prompt, *args, **kwargs)
        try:
            if pipe.text_encoder is not None:
                pipe.text_encoder.to("cpu")
            torch.cuda.empty_cache()
        except: pass
        return result
    pipe.encode_prompt = smart_encode

    print(f"  [MEM] after: {cuda_mem()}")
    return pipe

def load_model(name="turbo", lp="", lw=0.85):
    global ENG
    lp = lp.strip() if lp else ""; lw = float(lw)

    # Cache hit: same model + same lora
    if ENG["name"] == name and ENG["lora"] == lp:
        if lp and ENG["lora_w"] != lw:
            try: ENG["t2i"].set_adapters(adapter_weights=[lw])
            except: pass
            ENG["lora_w"] = lw
        ENG["gen"] += 1; return True

    # Different model → unload old
    if ENG["name"] != name:
        for k in ["t2i", "i2i", "inpaint"]:
            if ENG[k] is not None:
                try: ENG[k].to("cpu")
                except: pass
                del ENG[k]
        ENG["name"] = None; clear()

        model_id = TURBO_ID if name == "turbo" else BASE_ID
        pipe = load_pipeline(model_id)

        s = pipe.components
        ENG["name"] = name; ENG["t2i"] = pipe
        ENG["i2i"] = ZImageImg2ImgPipeline(**s)
        ENG["inpaint"] = ZImageInpaintPipeline(**s)

        # Apply same opts to i2i/inpaint
        for p in [ENG["i2i"], ENG["inpaint"]]:
            try: p.enable_xformers_memory_efficient_attention()
            except: pass
            p.enable_attention_slicing("max")
            p.vae.enable_slicing(); p.vae.enable_tiling()
            p.enable_model_cpu_offload(gpu_id=0)

        ENG["lora"] = ""
        print(f"  [OK] {name.upper()} | {cuda_mem()}")

    # LoRA change
    if lp != ENG["lora"]:
        if ENG["lora"]:
            try: ENG["t2i"].unload_lora_weights()
            except: pass; clear()
        if lp:
            print(f"  [LORA] {lp.split('/')[-1]}...")
            try: ENG["t2i"].load_lora_weights(lp)
            except Exception as e: print(f"  [LORA FAIL] {e}")
        ENG["lora"] = lp; ENG["lora_w"] = lw; clear()

    ENG["gen"] += 1; return True

# ─── Download LoRA to known location ───
LORA_DIR = "/kaggle/working/lora/pornmaster"
if not os.path.exists(f"{LORA_DIR}/Pornmaster_v1_000043500.safetensors"):
    print("\n  [LORA] Downloading Pornmaster v1...")
    from huggingface_hub import snapshot_download
    snapshot_download("RomixERR/Pornmaster_v1-Z-Images-Turbo", local_dir=LORA_DIR)
    print(f"  [LORA] ✅ at {LORA_DIR}")

# ─── Boot ───
print("\n  [BOOT] Loading Turbo...")
t0 = time.time()
if load_model("turbo"):
    ENG["boot_time"] = round(time.time() - t0, 1)
    print(f"  [BOOT] ✅ in {ENG['boot_time']}s | {cuda_mem()}")
print("="*60)

# ═══════════════════════════════════════════
# INFERENCE ENGINE
# ═══════════════════════════════════════════
def b64p(s):
    if not s or not s.strip(): return None
    return Image.open(BytesIO(base64.b64decode(s.split(',')[-1]))).convert("RGB")

@torch.inference_mode()
def zoya_gateway(task, prompt, neg_prompt, mode, width, height, seed,
                 image_b64, mask_b64, lora_path, lora_weight,
                 cfg_scale, i2i_str, inp_str, exp_steps):
    start = time.time(); clear()
    try:
        w = max(512, min(1536, int(width)//64*64))
        h = max(512, min(1536, int(height)//64*64))
        seed = int(seed)
        gen = torch.Generator("cuda").manual_seed(seed) if seed != -1 else None
        lp = lora_path.strip() if lora_path else ""; lw = float(lora_weight)

        # Remove BG
        if task == "Remove_BG":
            img = b64p(image_b64)
            if img is None:
                return Image.new("RGB",(512,512),(0,0,0)), \
                       json.dumps({"status":"ERROR","message":"No image","time":0})
            result = rembg.remove(img).convert("RGB")
            return result, json.dumps({"status":"SUCCESS","task":"Remove_BG",
                "time":round(time.time()-start,2)})

        # Mode config
        if mode == "Fast":
            if not load_model("turbo", lp, lw): raise RuntimeError("Turbo unavailable")
            steps, cfg, neg = 8, 0.0, None
        elif mode == "Pro":
            if not load_model("turbo", lp, lw): raise RuntimeError("Turbo unavailable")
            steps, cfg, neg = 16, 0.0, None
        else:
            if not load_model("base", lp, lw): raise RuntimeError("Base unavailable")
            steps = int(exp_steps); cfg = float(cfg_scale)
            neg = neg_prompt or "lowres, bad anatomy, bad hands, cropped, worst quality"

        img = b64p(image_b64); mask = b64p(mask_b64)
        kw = {"prompt":prompt,"num_inference_steps":steps,"guidance_scale":cfg,"generator":gen}
        if neg: kw["negative_prompt"] = neg

        t0 = time.time()
        print(f"  {task} | {w}x{h} | {steps} steps | {cuda_mem()}")

        if task == "Text2Image":
            out = ENG["t2i"](**kw, width=w, height=h)
        elif task == "Image2Image":
            if img is None: raise ValueError("I2I needs image")
            out = ENG["i2i"](**kw, image=img.resize((w,h)), strength=float(i2i_str))
        elif task == "Inpaint":
            if img is None or mask is None: raise ValueError("Inpaint needs image+mask")
            out = ENG["inpaint"](**kw, image=img.resize((w,h)),
                                 mask_image=mask.resize((w,h)).convert("L"),
                                 strength=float(inp_str))
        else: raise ValueError(f"Unknown: {task}")

        result = out.images[0]; del out
        inf = round(time.time()-t0,2); total = round(time.time()-start,2); clear()
        return result, json.dumps({
            "status":"SUCCESS","task":task,"mode":mode,
            "width":w,"height":h,"steps":steps,"cfg":cfg,"seed":seed,
            "lora":lp.split('/')[-1] if lp else "none",
            "engine":ENG["name"],"gen":ENG["gen"],
            "inference_s":inf,"total_s":total,
            "mem":cuda_mem(),"ghost":"ACTIVE"})

    except Exception as e:
        traceback.print_exc(); clear()
        return Image.new("RGB",(512,512),(0,0,0)), json.dumps({
            "status":"ERROR","message":str(e)[:200],
            "time":round(time.time()-start,2)})

# ═══════════════════════════════════════════
# GRADIO UI — WITH IMAGE UPLOAD SUPPORT
# ═══════════════════════════════════════════
with gr.Blocks(title="ZOYA Ghost V9", analytics_enabled=False,
               theme=gr.themes.Soft(primary_hue="violet")) as app:
    gr.HTML(f"""
    <div style='padding:20px;background:linear-gradient(135deg,#0f0c29,#302b63,#24243e);
         border-radius:16px;text-align:center;border:1px solid #6C63FF;'>
      <h1 style='color:#fff;margin:0;font-size:32px;font-weight:800;'>⚡ ZOYA GHOST ENGINE V9</h1>
      <p style='color:rgba(255,255,255,0.7);margin:6px 0;font-size:14px;'>
        model_cpu_offload + xformers · T2I · I2I · Inpaint · Remove BG · LoRA</p>
    </div>""")
    with gr.Row():
        with gr.Column(scale=1):
            task = gr.Dropdown(["Text2Image","Image2Image","Inpaint","Remove_BG"],
                               value="Text2Image", label="🎯 Task")
            prompt = gr.Textbox(label="📝 Prompt", lines=3,
                value="pronmstr. beautiful woman, perfect skin, cute face, seductive, sensual, soft lighting, 4K, detailed")
            neg_prompt = gr.Textbox(label="🚫 Negative (Expert only)", lines=2,
                value="lowres, bad anatomy, bad hands, cropped, worst quality")
            mode = gr.Radio(["Fast (8 steps)","Pro (16 steps)","Expert (Base 45+ steps)"],
                            value="Fast (8 steps)", label="⚡ Mode")
            # ─── Image uploads (for I2I / Inpaint / Remove_BG) ───
            input_img = gr.Image(label="📷 Input Image (for I2I/Inpaint/Remove_BG)",
                                 type="pil", height=256, visible=False)
            input_mask = gr.Image(label="🎭 Mask (for Inpaint only)",
                                  type="pil", height=256, visible=False)
            # Show/hide image uploads based on task
            def update_uploads(task_val):
                show_img = task_val in ("Image2Image", "Inpaint", "Remove_BG")
                show_mask = task_val == "Inpaint"
                return gr.update(visible=show_img), gr.update(visible=show_mask)
            task.change(fn=update_uploads, inputs=task, outputs=[input_img, input_mask])
            with gr.Row():
                width = gr.Slider(512,1536,1024,step=64,label="W")
                height = gr.Slider(512,1536,1024,step=64,label="H")
                seed = gr.Number(-1,label="Seed",precision=0)
            with gr.Accordion("🔧 Advanced", open=False):
                with gr.Row():
                    cfg_scale = gr.Slider(1,10,4.5,0.5,label="CFG")
                    expert_steps = gr.Slider(20,60,45,1,label="Expert Steps")
                with gr.Row():
                    i2i_strength = gr.Slider(0.1,1,0.65,0.05,label="I2I Str")
                    inp_strength = gr.Slider(0.1,1,0.85,0.05,label="Inpaint Str")
            with gr.Accordion("🧠 LoRA", open=False):
                lora_select = gr.Dropdown(["None","Pornmaster v1 (pronmstr)"],
                                          value="None",label="LoRA")
                lora_weight = gr.Slider(0,2,0.85,0.05,label="Weight")
            btn = gr.Button("✨ GENERATE", variant="primary", size="lg")
        with gr.Column(scale=1):
            output = gr.Image(label="🖼 Output", type="pil", height=512)
            status = gr.Textbox(label="📊 Status", lines=14)
            p = torch.cuda.get_device_properties(0)
            gr.HTML(f"<small>xformers ✅ | model_cpu_offload | {p.total_memory/1e9:.0f}GB T4</small>")

    def img_to_b64(pil_img):
        """Convert PIL image to base64 string"""
        if pil_img is None: return ""
        buffered = BytesIO()
        pil_img.save(buffered, format="PNG")
        return "data:image/png;base64," + base64.b64encode(buffered.getvalue()).decode()

    def wrap(task, prompt, neg, mode, w, h, seed, in_img, in_mask, lora, lw, cfg, es, i2i, inp):
        mode_map = {"Fast (8 steps)":"Fast","Pro (16 steps)":"Pro","Expert (Base 45+ steps)":"Expert"}
        lp = LORA_DIR if "Pornmaster" in lora else ""
        img_b64 = img_to_b64(in_img)
        mask_b64 = img_to_b64(in_mask)
        return zoya_gateway(task,prompt,neg,mode_map.get(mode,"Fast"),w,h,seed,img_b64,mask_b64,lp,lw,cfg,i2i,inp,es)

    btn.click(fn=wrap,
        inputs=[task,prompt,neg_prompt,mode,width,height,seed,input_img,input_mask,
                lora_select,lora_weight,cfg_scale,expert_steps,i2i_strength,inp_strength],
        outputs=[output,status], api_name="zoya_gateway")

print("="*60)
print("  ▌╔══════════════════════════════════╗▐")
print("  ▌║  ZOYA GHOST ENGINE V9 ACTIVE    ║▐")
print("  ▌║  ✅ Gradio #11722               ║▐")
print("  ▌║  ✅ torchvision circular import ║▐")
print("  ▌║  ✅ xformers flash attn         ║▐")
print("  ▌║  ✅ model_cpu_offload (no OOM)  ║▐")
print("  ▌║  ✅ Ghost Mode                  ║▐")
print("  ▌╚══════════════════════════════════╝▐")
print("="*60)

app.queue(max_size=5)
app.launch(share=True,server_name="0.0.0.0",debug=False,quiet=True,show_error=False)

print("✅ ZOYA GHOST ENGINE V9 — ACTIVE!")
print("📡 Send URL to ZOYA for remote control")
print("="*60)
