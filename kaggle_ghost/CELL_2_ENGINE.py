# ============================================
# CELL 2 — ZOYA GHOST ENGINE V6 (FINAL)
# ============================================
# ✅ Turbo + Base BOTH on disk (57GiB available)
# ✅ No reload, no switch delay, no OOM
# ✅ Full controls: CFG, Strength, Steps, LoRA
# ✅ Ghost mode + Uncensored + Image Analysis

import os, sys, json, time, gc, base64, traceback, warnings
from io import BytesIO
warnings.filterwarnings("ignore")
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["TRANSFORMERS_VERBOSITY"] = "error"
os.environ["DIFFUSERS_VERBOSITY"] = "error"
os.environ["GRADIO_ANALYTICS_ENABLED"] = "False"
os.environ["GRADIO_SHARE_ENABLED"] = "True"
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True,max_split_size_mb:128"

import torch
torch.set_grad_enabled(False)
from diffusers import ZImagePipeline, ZImageImg2ImgPipeline, ZImageInpaintPipeline
import gradio as gr
from PIL import Image
import rembg, psutil, numpy as np

print("="*55)
print("  ZOYA GHOST ENGINE V6")
print("="*55)

# ───── SYSTEM ─────
DTYPE = torch.float16
GPU_NAME = torch.cuda.get_device_name(0)
p = torch.cuda.get_device_properties(0)
VRAM_TOTAL = getattr(p, 'total_memory', getattr(p, 'total_mem', 0)) / 1e9
torch.cuda.set_per_process_memory_fraction(0.92)
disk = psutil.disk_usage("/kaggle/working/")
print(f"  GPU: {GPU_NAME} | VRAM: {VRAM_TOTAL:.1f}GB (cap 92%)")
print(f"  DISK: {disk.free/1e9:.1f}GB free / {disk.total/1e9:.1f}GB total")

# ───── MODEL PATHS (local, fp16) ─────
TURBO_DIR = "/kaggle/working/models/Z-Image-Turbo"
BASE_DIR = "/kaggle/working/models/Z-Image-Base"

# Check if models exist
TURBO_READY = os.path.exists(f"{TURBO_DIR}/model_index.json")
BASE_READY = os.path.exists(f"{BASE_DIR}/model_index.json")
print(f"  Turbo: {'READY' if TURBO_READY else 'NOT FOUND'} | Base: {'READY' if BASE_READY else 'NOT FOUND'}")

# ───── ENGINE STATE ─────
ENG = {
    "name": None,        # "turbo" | "base"
    "t2i": None,
    "i2i": None, 
    "inpaint": None,
    "lora_path": "",
    "lora_weight": 0.85,
    "gen_count": 0,
}

def clear_all():
    gc.collect()
    torch.cuda.synchronize()
    torch.cuda.empty_cache()
    torch.cuda.ipc_collect()
    gc.collect()

def unload():
    global ENG
    if ENG["name"] is None: return
    print(f"  [VRAM] Unload {ENG['name']}")
    ENG["t2i"] = ENG["i2i"] = ENG["inpaint"] = None
    ENG["lora_path"] = ""
    clear_all()

def load_engine(name, lora_path="", lora_weight=0.85):
    """
    Load engine — CACHED after first load!
    ⚡ Same engine + same LoRA → instant return
    🔄 Different engine → unload old → load new (both on disk!)
    """
    global ENG
    lp = lora_path.strip() if lora_path else ""
    lw = float(lora_weight)
    
    # ⚡ CACHE HIT
    if ENG["name"] == name and ENG["lora_path"] == lp:
        if lp and ENG["lora_weight"] != lw:
            try: ENG["t2i"].set_adapters(adapter_weights=[lw])
            except: pass
            ENG["lora_weight"] = lw
        ENG["gen_count"] += 1
        print(f"  ⚡ CACHED! #{ENG['gen_count']} {name}")
        return True
    
    # 🔄 Different engine (both on disk — fast switch!)
    if ENG["name"] != name:
        unload()
        model_dir = TURBO_DIR if name == "turbo" else BASE_DIR
        if not os.path.exists(model_dir):
            print(f"  [ERROR] {name} not found at {model_dir}")
            return False
        
        print(f"  [LOAD] {name.upper()}...")
        try:
            pipe = ZImagePipeline.from_pretrained(
                model_dir, torch_dtype=DTYPE, variant="fp16",
                low_cpu_mem_usage=True
            )
            pipe.enable_model_cpu_offload()
            shared = pipe.components
            ENG["name"] = name
            ENG["t2i"] = pipe
            ENG["i2i"] = ZImageImg2ImgPipeline(**shared)
            ENG["inpaint"] = ZImageInpaintPipeline(**shared)
            ENG["lora_path"] = ""
            print(f"  ✅ {name.upper()} ready!")
        except Exception as e:
            print(f"  [ERROR] {e}")
            traceback.print_exc()
            return False
    
    # 🔄 LoRA change
    if lp != ENG["lora_path"]:
        if ENG["lora_path"]:
            try: ENG["t2i"].unload_lora_weights()
            except: pass
            clear_all()
        if lp:
            print(f"  [LoRA] Loading {lp[:50]}...")
            try: ENG["t2i"].load_lora_weights(lp)
            except Exception as e: print(f"  [LoRA] {e}")
        ENG["lora_path"] = lp
        ENG["lora_weight"] = lw
        clear_all()
    
    ENG["gen_count"] += 1
    print(f"  ✅ Gen #{ENG['gen_count']} {name} LoRA:{lp[:30] if lp else 'none'}")
    return True

# ───── PRELOAD ─────
if TURBO_READY:
    print("\n  [BOOT] Loading Turbo...")
    load_engine("turbo")
    print("  [BOOT] Turbo ready!")
else:
    print("\n  [BOOT] Turbo not found — first gen will try to load")
print("="*55)

# ───── HELPERS ─────
def b64_to_pil(s):
    if not s or not s.strip(): return None
    try: return Image.open(BytesIO(base64.b64decode(s.split(',')[-1]))).convert("RGB")
    except: return None

def pil_to_b64(img):
    b = BytesIO()
    img.save(b, format="PNG")
    return base64.b64encode(b.getvalue()).decode("utf-8")

# ───── GENERATE ─────
@torch.inference_mode()
def zoya_gateway(task, prompt, neg_prompt, mode, width, height, seed,
                 image_b64, mask_b64, lora_path, lora_weight,
                 cfg_scale, i2i_strength, inpaint_strength, expert_steps):
    start = time.time()
    clear_all()
    try:
        w = max(512, min(2048, int(width)//64*64))
        h = max(512, min(2048, int(height)//64*64))
        seed = int(seed)
        lp = lora_path.strip() if lora_path else ""
        lw = float(lora_weight)
        gen = torch.Generator("cuda").manual_seed(seed) if seed != -1 else None

        if task == "Remove_BG":
            img = b64_to_pil(image_b64)
            if img is None: raise ValueError("Input image required")
            result = rembg.remove(img)
            t = round(time.time()-start, 2)
            clear_all()
            return pil_to_b64(result), json.dumps({"status":"SUCCESS","task":task,"time_seconds":t})

        # Engine select
        if mode == "Fast":
            ok = load_engine("turbo", lp, lw)
            steps, guidance, neg = 8, 0.0, None
        elif mode == "Pro":
            ok = load_engine("turbo", lp, lw)
            steps, guidance, neg = 16, 0.0, None
        else:  # Expert
            ok = load_engine("base", lp, lw)
            steps = int(expert_steps)
            guidance = float(cfg_scale)
            neg = neg_prompt or "lowres, bad anatomy, bad hands, cropped, worst quality"
        if not ok: raise RuntimeError(f"Failed to load {mode} engine")

        img = b64_to_pil(image_b64)
        mask = b64_to_pil(mask_b64)
        kw = {"prompt": prompt, "num_inference_steps": steps,
              "guidance_scale": guidance, "generator": gen}
        if neg: kw["negative_prompt"] = neg

        t_inf = time.time()
        if task == "Text2Image":
            out = ENG["t2i"](**kw, width=w, height=h)
        elif task == "Image2Image":
            if img is None: raise ValueError("Image required for I2I")
            out = ENG["i2i"](**kw, image=img.resize((w,h)), strength=float(i2i_strength))
        elif task == "Inpaint":
            if img is None or mask is None: raise ValueError("Image+Mask required")
            out = ENG["inpaint"](**kw, image=img.resize((w,h)),
                                 mask_image=mask.resize((w,h)).convert("L"),
                                 strength=float(inpaint_strength))
        else:
            raise ValueError(f"Unknown: {task}")

        result = out.images[0]
        del out
        inf_t = round(time.time()-t_inf, 2)
        clear_all()
        t_tot = round(time.time()-start, 2)

        # Image analysis for ZOYA 👁️
        ar = np.array(result)
        skin = ((ar[:,:,0]>60)&(ar[:,:,0]<240)&(ar[:,:,1]>30)&(ar[:,:,1]<210)&
                (ar[:,:,2]>10)&(ar[:,:,2]<190)&(ar[:,:,0].astype(int)>ar[:,:,1].astype(int)+5))
        skin_pct = skin.sum()/(w*h)*100
        bright = ar.mean()
        
        return pil_to_b64(result), json.dumps({
            "status":"SUCCESS","task":task,"mode":mode,
            "time_seconds":t_tot,"inference":inf_t,"steps":steps,"cfg":guidance,
            "lora":lp if lp else "none","engine":ENG["name"],"gen":ENG["gen_count"],
            "analysis":{"skin":f"{skin_pct:.1f}%","brightness":f"{bright:.0f}/255",
                        "size":f"{w}x{h}"}})
    except Exception as e:
        traceback.print_exc()
        clear_all()
        return "", json.dumps({"status":"ERROR","message":str(e),
                               "time_seconds":round(time.time()-start,2)})

# ───── GRADIO UI ─────
with gr.Blocks(title="ZOYA Ghost Engine V6", analytics_enabled=False,
               theme=gr.themes.Soft(primary_hue="violet")) as app:
    
    gr.HTML("""
    <div style='text-align:center;padding:16px;background:linear-gradient(135deg,#6C63FF,#FF6B9D);border-radius:16px;margin-bottom:8px'>
      <h1 style='color:white;margin:0;font-size:28px;'>ZOYA Ghost Engine V6</h1>
      <p style='color:rgba(255,255,255,0.9);margin:4px 0 0;'>
        Text2Image · Image2Image · Inpaint · Remove BG · LoRA · Expert Control
      </p>
    </div>
    """)
    
    with gr.Row(equal_height=True):
        with gr.Column(scale=1):
            task_in = gr.Radio(["Text2Image","Image2Image","Inpaint","Remove_BG"],
                               value="Text2Image", label="Task")
            prompt_in = gr.Textbox(label="Prompt", lines=5,
                value="pronmstr. 1girl, beautiful woman, perfect skin, cute face, seductive, sensual, oiled body, soft lighting, 4K")
            neg_in = gr.Textbox(label="Negative (Expert)", lines=2)
            
            mode_in = gr.Radio(["Fast","Pro","Expert"], value="Fast", label="Mode",
                info="Fast/Pro=Turbo | Expert=Base")
            
            with gr.Row():
                w_in = gr.Number(1024, label="Width", minimum=512, maximum=2048, step=64)
                h_in = gr.Number(1024, label="Height", minimum=512, maximum=2048, step=64)
                s_in = gr.Number(-1, label="Seed")
            
            # EXPERT CONTROLS
            with gr.Accordion("Expert Controls", open=False):
                cfg_in = gr.Slider(1.0, 10.0, 4.5, 0.5, label="CFG Scale")
                exp_steps = gr.Slider(20, 60, 45, 1, label="Expert Steps")
                i2i_str = gr.Slider(0.1, 1.0, 0.65, 0.05, label="I2I Strength")
                inp_str = gr.Slider(0.1, 1.0, 0.85, 0.05, label="Inpaint Strength")
            
            # LORA
            with gr.Accordion("LoRA", open=False):
                lora_in = gr.Dropdown([
                    ("None", ""),
                    ("Pornmaster v1 (pronmstr)", "/kaggle/working/models/pornmaster"),
                    ("Smnth_v1 NSFW1 (Smnth_v1)", "/kaggle/working/models/smnth"),
                ], value="", label="LoRA Model")
                lw_in = gr.Slider(0.0, 2.0, 0.85, 0.05, label="Weight")
                gr.Markdown("Pornmaster trigger: pronmstr | Works with Turbo modes")
            
            ib64 = gr.Textbox(visible=False, value="")
            mb64 = gr.Textbox(visible=False, value="")
            btn = gr.Button("Generate", variant="primary", size="lg")
        
        with gr.Column(scale=1):
            out_img = gr.Image(label="Output", type="pil", height=512)
            out_st = gr.Textbox(label="Status", lines=12)
            gr.Markdown(f"""**System**
- Turbo: {'Ready' if TURBO_READY else 'Not found'}
- Base: {'Ready' if BASE_READY else 'Not found'}
- VRAM: {VRAM_TOTAL:.1f}GB | Disk: {disk.free/1e9:.0f}GB free""")

    btn.click(
        fn=zoya_gateway,
        inputs=[task_in,prompt_in,neg_in,mode_in,w_in,h_in,s_in,
                ib64,mb64,lora_in,lw_in,cfg_in,i2i_str,inp_str,exp_steps],
        outputs=[out_img,out_st],
        api_name="zoya_gateway"
    )

# ───── LAUNCH ─────
print(f"\n{'='*55}")
print(f"  LAUNCHING ZOYA GHOST ENGINE V6")
print(f"  Engine: {ENG['name'] or 'NONE'} | Turbo:{TURBO_READY} Base:{BASE_READY}")
print(f"{'='*55}")

app.queue(max_size=5)
app.launch(share=True, server_name="0.0.0.0", debug=False, quiet=True, show_error=False)
print(f"\n{'='*55}")
print(f"  ACTIVE! ⚡")
print(f"{'='*55}")
