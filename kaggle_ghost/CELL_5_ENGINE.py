# ============================================
# CELL 5 — ZOYA GHOST ENGINE V6 (FIXED)
# ============================================
import os, sys, subprocess, warnings, time, gc, json, base64, traceback
from io import BytesIO

# Install onnxruntime for rembg
subprocess.check_call(f"{sys.executable} -m pip install -q onnxruntime", shell=True)

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

# ─── FIX: Rename .fp16.safetensors → .safetensors ───
for model_dir in ["/kaggle/tmp/models/Z-Image-Turbo", "/kaggle/tmp/models/Z-Image-Base"]:
    if not os.path.exists(model_dir): continue
    for root, dirs, files in os.walk(model_dir):
        for f in files:
            if f.endswith(".fp16.safetensors"):
                old = os.path.join(root, f)
                new = os.path.join(root, f.replace(".fp16.safetensors", ".safetensors"))
                os.rename(old, new)
                print(f"  RENAME {f} → {os.path.basename(new)}")
    # Fix model_index.json - remove _variant field
    idx_path = os.path.join(model_dir, "model_index.json")
    if os.path.exists(idx_path):
        with open(idx_path) as f:
            idx = json.load(f)
        idx.pop("_variant", None)
        with open(idx_path, "w") as f:
            json.dump(idx, f, indent=2)

# ─── SYSTEM ───
DTYPE = torch.float16
GPU_NAME = torch.cuda.get_device_name(0)
p = torch.cuda.get_device_properties(0)
VRAM = getattr(p, 'total_memory', getattr(p, 'total_mem', 0)) / 1e9
torch.cuda.set_per_process_memory_fraction(0.92)
print(f"  GPU: {GPU_NAME} | VRAM: {VRAM:.1f}GB")

TURBO = "/kaggle/tmp/models/Z-Image-Turbo"
BASE = "/kaggle/tmp/models/Z-Image-Base"
T_OK = os.path.exists(f"{TURBO}/model_index.json")
B_OK = os.path.exists(f"{BASE}/model_index.json")
print(f"  Turbo: {'OK' if T_OK else 'NO'} | Base: {'OK' if B_OK else 'NO'}")

# ─── ENGINE ───
ENG = {"name":None,"t2i":None,"i2i":None,"inpaint":None,"lora":"","lora_w":0.85,"gen":0}

def clear():
    gc.collect(); torch.cuda.synchronize(); torch.cuda.empty_cache(); gc.collect()

def load(name="turbo", lp="", lw=0.85):
    global ENG
    lp = lp.strip() if lp else ""; lw = float(lw)
    if ENG["name"] == name and ENG["lora"] == lp:
        if lp and ENG["lora_w"] != lw:
            try: ENG["t2i"].set_adapters(adapter_weights=[lw])
            except: pass; ENG["lora_w"] = lw
        ENG["gen"] += 1; return True
    if ENG["name"] != name:
        ENG["t2i"] = ENG["i2i"] = ENG["inpaint"] = None; ENG["name"] = None; clear()
        md = TURBO if name == "turbo" else BASE
        if not os.path.exists(md): return False
        print(f"  [LOAD] {name.upper()}...")
        # NO variant="fp16" — files are already renamed to .safetensors!
        pipe = ZImagePipeline.from_pretrained(md, torch_dtype=DTYPE)
        pipe.enable_model_cpu_offload()
        s = pipe.components
        ENG["name"] = name; ENG["t2i"] = pipe
        ENG["i2i"] = ZImageImg2ImgPipeline(**s)
        ENG["inpaint"] = ZImageInpaintPipeline(**s)
        ENG["lora"] = ""
        print(f"  [OK] {name.upper()} ready")
    if lp != ENG["lora"]:
        if ENG["lora"]:
            try: ENG["t2i"].unload_lora_weights()
            except: pass; clear()
        if lp:
            print(f"  [LORA] {lp[:50]}...")
            try: ENG["t2i"].load_lora_weights(lp)
            except Exception as e: print(f"  [LORA] {e}")
        ENG["lora"] = lp; ENG["lora_w"] = lw; clear()
    ENG["gen"] += 1; return True

if T_OK:
    print("  [BOOT] Loading Turbo...")
    if load("turbo"): print("  [BOOT] Turbo ready!")
print("="*55)

def b64p(s):
    if not s or not s.strip(): return None
    return Image.open(BytesIO(base64.b64decode(s.split(',')[-1]))).convert("RGB")
def p64(img):
    b = BytesIO(); img.save(b, format="PNG")
    return base64.b64encode(b.getvalue()).decode()

@torch.inference_mode()
def zoya_gateway(task, prompt, neg_prompt, mode, width, height, seed,
                 image_b64, mask_b64, lora_path, lora_weight,
                 cfg_scale, i2i_str, inp_str, exp_steps):
    start = time.time(); clear()
    try:
        w = max(512, min(2048, int(width)//64*64))
        h = max(512, min(2048, int(height)//64*64))
        seed = int(seed); gen = torch.Generator("cuda").manual_seed(seed) if seed != -1 else None
        lp = lora_path.strip() if lora_path else ""; lw = float(lora_weight)
        if task == "Remove_BG":
            img = b64p(image_b64)
            if img is None: raise ValueError("Image required")
            return p64(rembg.remove(img)), json.dumps({"status":"SUCCESS","time":round(time.time()-start,2)})
        if mode == "Fast":
            if not load("turbo",lp,lw): raise RuntimeError("Turbo fail")
            steps, cfg, neg = 8, 0.0, None
        elif mode == "Pro":
            if not load("turbo",lp,lw): raise RuntimeError("Turbo fail")
            steps, cfg, neg = 16, 0.0, None
        else:
            if not load("base",lp,lw): raise RuntimeError("Base fail")
            steps = int(exp_steps); cfg = float(cfg_scale)
            neg = neg_prompt or "lowres, bad anatomy, bad hands, cropped, worst quality"
        img = b64p(image_b64); mask = b64p(mask_b64)
        kw = {"prompt":prompt,"num_inference_steps":steps,"guidance_scale":cfg,"generator":gen}
        if neg: kw["negative_prompt"] = neg
        t0 = time.time()
        if task == "Text2Image":
            out = ENG["t2i"](**kw, width=w, height=h)
        elif task == "Image2Image":
            if img is None: raise ValueError("I2I needs image")
            out = ENG["i2i"](**kw, image=img.resize((w,h)), strength=float(i2i_str))
        elif task == "Inpaint":
            if img is None or mask is None: raise ValueError("Inpaint needs image+mask")
            out = ENG["inpaint"](**kw, image=img.resize((w,h)),
                                 mask_image=mask.resize((w,h)).convert("L"), strength=float(inp_str))
        else: raise ValueError(f"Unknown: {task}")
        result = out.images[0]; del out
        inf_t = round(time.time()-t0,2); t_tot = round(time.time()-start,2); clear()
        ar = np.array(result)
        skin = ((ar[:,:,0]>60)&(ar[:,:,0]<240)&(ar[:,:,1]>30)&(ar[:,:,1]<210)&
                (ar[:,:,2]>10)&(ar[:,:,2]<190)&(ar[:,:,0].astype(int)>ar[:,:,1].astype(int)+5))
        return p64(result), json.dumps({
            "status":"SUCCESS","task":task,"mode":mode,
            "time":t_tot,"inference":inf_t,"steps":steps,"cfg":cfg,
            "lora":lp if lp else "none","engine":ENG["name"],"gen":ENG["gen"],
            "analysis":{"skin":f"{skin.sum()/(w*h)*100:.1f}%","bright":f"{ar.mean():.0f}/255"}})
    except Exception as e:
        traceback.print_exc(); clear()
        return "", json.dumps({"status":"ERROR","message":str(e),
                               "time":round(time.time()-start,2)})

with gr.Blocks(title="ZOYA Ghost V6", analytics_enabled=False,
               theme=gr.themes.Soft(primary_hue="violet")) as app:
    gr.HTML("""
    <div style='padding:16px;background:linear-gradient(135deg,#6C63FF,#FF6B9D);
         border-radius:16px;text-align:center'>
      <h1 style='color:white;margin:0;font-size:28px;'>ZOYA Ghost Engine V6</h1>
      <p style='color:rgba(255,255,255,0.9);margin:4px 0;'>
        T2I · I2I · Inpaint · Remove BG · LoRA · NSFW · Ghost Mode
      </p>
    </div>""")
    with gr.Row():
        with gr.Column(scale=1):
            task = gr.Radio(["Text2Image","Image2Image","Inpaint","Remove_BG"],value="Text2Image",label="Task")
            prompt = gr.Textbox(label="Prompt",lines=4,
                value="pronmstr. 1girl, beautiful woman, perfect skin, cute face, oiled body, seductive, sensual, soft lighting, 4K")
            neg = gr.Textbox(label="Negative (Expert)",lines=2)
            mode = gr.Radio(["Fast","Pro","Expert"],value="Fast",label="Mode",info="Fast/Pro=Turbo | Expert=Base")
            with gr.Row():
                w = gr.Number(1024,label="W",min=512,max=2048,step=64)
                h = gr.Number(1024,label="H",min=512,max=2048,step=64)
                seed = gr.Number(-1,label="Seed")
            with gr.Accordion("Controls",open=False):
                cfg = gr.Slider(1,10,4.5,0.5,label="CFG")
                es = gr.Slider(20,60,45,1,label="Steps")
                i2i = gr.Slider(0.1,1,0.65,0.05,label="I2I Strength")
                inp = gr.Slider(0.1,1,0.85,0.05,label="Inpaint Strength")
            with gr.Accordion("LoRA",open=False):
                lora = gr.Dropdown([("None",""),
                    ("Pornmaster v1 (pronmstr)","/kaggle/tmp/models/pornmaster")],value="",label="LoRA")
                lw = gr.Slider(0,2,0.85,0.05,label="Weight")
            ib64=gr.Textbox(visible=False); mb64=gr.Textbox(visible=False)
            btn = gr.Button("Generate",variant="primary",size="lg")
        with gr.Column(scale=1):
            out = gr.Image(label="Output",type="pil",height=512)
            st = gr.Textbox(label="Status",lines=14)
            gr.HTML(f"<small>Turbo=OK | Base=OK | VRAM={VRAM:.1f}GB | Trigger: pronmstr</small>")
    btn.click(fn=zoya_gateway,inputs=[task,prompt,neg,mode,w,h,seed,ib64,mb64,lora,lw,cfg,i2i,inp,es],
              outputs=[out,st],api_name="zoya_gateway")

print("Launching...")
app.queue(max_size=5)
app.launch(share=True,server_name="0.0.0.0",debug=False,quiet=True,show_error=False)
print("ACTIVE! Send URL to ZOYA")
