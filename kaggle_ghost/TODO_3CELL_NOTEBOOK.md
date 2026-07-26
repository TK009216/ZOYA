# 📋 Z-IMAGE NSFW 3-CELL KAGGLE NOTEBOOK — COMPREHENSIVE TODO LIST

**Based on QA Report Findings | ZOYA Ghost Engine V10**

---

## 📋 Total: 147 tasks (3 phases + Edge Cases + Testing + Verification)

---

### Phase 1: CELL 1 — PACKAGES + DOWNLOAD + SYSTEM CHECK
**Goal:** Single cell that installs everything, checks system, pre-downloads models, then prompts restart.

#### 1.1 — Environment Setup [H] 🟢
- [ ] **1.1.1** Set `HF_HOME=/kaggle/working/.hf` at top of cell (before any imports)
- [ ] **1.1.2** Set `HUGGINGFACE_HUB_CACHE=/kaggle/working/.hf/hub`
- [ ] **1.1.3** Set `XFORMERS_DISABLE_FLASH_ATTN=1` (critical for T4 stability)
- [ ] **1.1.4** Set `PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True,max_split_size_mb:128`
- [ ] **1.1.5** Set `TF_CPP_MIN_LOG_LEVEL=3`
- [ ] **1.1.6** Set `TOKENIZERS_PARALLELISM=false`
- [ ] **1.1.7** Set `TRANSFORMERS_VERBOSITY=error`
- [ ] **1.1.8** Set `DIFFUSERS_VERBOSITY=error`
- [ ] **1.1.9** Set `GRADIO_ANALYTICS_ENABLED=False`
- [ ] **1.1.10** Set `GRADIO_SHARE_ENABLED=True`
- [ ] **1.1.11** Set `HF_HUB_DISABLE_TELEMETRY=1`
- [ ] **1.1.12** Set `DO_NOT_TRACK=1`
- [ ] **1.1.13** Create `.hf/hub` directories with `makedirs(exist_ok=True)`

#### 1.2 — HF Token Handling [H] 🔴 (NEW — Issue #2)
- [ ] **1.2.1** Check if `HF_TOKEN` env var exists (from Kaggle secrets)
- [ ] **1.2.2** If HF_TOKEN present, run `huggingface-cli login --token $HF_TOKEN`
- [ ] **1.2.3** If HF_TOKEN missing, print WARNING about gated model access
- [ ] **1.2.4** Add `token=HF_TOKEN` to all `huggingface-cli download` calls for gated repos
- [ ] **1.2.5** Handle token auth in snapshot_download for LoRA (Cell 2 needs same)

#### 1.3 — Disk Space Verification [H] 🟠 (NEW — Issue #3)
- [ ] **1.3.1** Check disk space BEFORE any downloads using `psutil.disk_usage()`
- [ ] **1.3.2** Verify at least 35GB free for Turbo (~12GB) + Base (~12GB) + LoRAs + overhead
- [ ] **1.3.3** Print clear error and FAIL FAST if insufficient disk
- [ ] **1.3.4** After downloads, re-check disk and print remaining free space

#### 1.4 — Version-Pinned Package Install [H] 🔴
- [ ] **1.4.1** Install `torch==2.6.0 torchvision==0.21.0` from `https://download.pytorch.org/whl/cu124`
- [ ] **1.4.2** Install `diffusers==0.32.1` (pinned! NOT latest — issue #6 from QA)
- [ ] **1.4.3** Install `transformers==4.49.0`
- [ ] **1.4.4** Install `accelerate==1.5.0`
- [ ] **1.4.5** Install `xformers==0.0.33.post2` from cu124 index
- [ ] **1.4.6** Install `gradio==5.20.1` (pinned — newer versions have issues)
- [ ] **1.4.7** Install `pillow`, `rembg`, `psutil`, `scipy`, `safetensors`, `peft`
- [ ] **1.4.8** Install `huggingface_hub`, `requests`, `onnxruntime`
- [ ] **1.4.9** Use `subprocess.check_call` with `--no-input` and `-q` flags
- [ ] **1.4.10** Capture install output for debugging (don't fully suppress)

#### 1.5 — System Check Display [M] 🟢
- [ ] **1.5.1** Import torch and psutil
- [ ] **1.5.2** Get GPU name: `torch.cuda.get_device_name(0)`
- [ ] **1.5.3** Get VRAM: `torch.cuda.get_device_properties(0).total_memory / 1e9`
- [ ] **1.5.4** Get free RAM: `psutil.virtual_memory()`
- [ ] **1.5.5** Get free DISK: `psutil.disk_usage("/kaggle/working/")`
- [ ] **1.5.6** Display formatted system summary table
- [ ] **1.5.7** Check GPU count (dual T4 = 2)
- [ ] **1.5.8** Check bf16 support (T4 = no, report fp16)
- [ ] **1.5.9** Warn if only 1 GPU (slower, but works)

#### 1.6 — Pre-Download Z-Image-Turbo [H] 🔴
- [ ] **1.6.1** Run `huggingface-cli download Tongyi-MAI/Z-Image-Turbo --quiet`
- [ ] **1.6.2** VERIFY download: check `model_index.json` exists in cache (Issue #7)
- [ ] **1.6.3** Print "✅ Z-Image-Turbo: OK (X.X GB)" with actual size
- [ ] **1.6.4** Handle download failure with clear error message
- [ ] **1.6.5** Set HF_TOKEN for gated access if available

#### 1.7 — Pre-Download Z-Image Base [H] 🔴
- [ ] **1.7.1** Run `huggingface-cli download Tongyi-MAI/Z-Image --quiet`
- [ ] **1.7.2** VERIFY: check `model_index.json` exists (Issue #7)
- [ ] **1.7.3** Print "✅ Z-Image Base: OK (X.X GB)"
- [ ] **1.7.4** Handle gated model access with HF_TOKEN

#### 1.8 — Pre-Download Pornmaster LoRA [M] 🟠
- [ ] **1.8.1** Run `huggingface-cli download RomixERR/Pornmaster_v1-Z-Images-Turbo --quiet`
- [ ] **1.8.2** Print "✅ Pornmaster v1 LoRA: OK"
- [ ] **1.8.3** Note LoRA path for Cell 2 reference

#### 1.9 — Cell 1 Completion + Restart Message [L] 🟢
- [ ] **1.9.1** Print total elapsed time
- [ ] **1.9.2** Print prominent "⚠️  RESTART SESSION NOW ⚠️" message
- [ ] **1.9.3** Print "Then run Cell 2 — do NOT run Cell 1 again"
- [ ] **1.9.4** Print available disk space summary
- [ ] **1.9.5** Print model sizes summary

---

### Phase 2: CELL 2 — ENGINE
**Goal:** Main inference engine with all optimizations, fixes, and safety overrides.

#### 2.1 — Environment Re-Set [H] 🟢
- [ ] **2.1.1** Re-set ALL env vars (kernel restart resets them!)
- [ ] **2.1.2** `XFORMERS_DISABLE_FLASH_ATTN=1` (Fix #3)
- [ ] **2.1.3** `PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True,max_split_size_mb:128`
- [ ] **2.1.4** `TF_CPP_MIN_LOG_LEVEL=3`
- [ ] **2.1.5** `TRANSFORMERS_VERBOSITY=error`
- [ ] **2.1.6** `DIFFUSERS_VERBOSITY=error`
- [ ] **2.1.7** `GRADIO_ANALYTICS_ENABLED=False`
- [ ] **2.1.8** `GRADIO_SHARE_ENABLED=True`
- [ ] **2.1.9** `HF_HUB_DISABLE_TELEMETRY=1`
- [ ] **2.1.10** `DO_NOT_TRACK=1`
- [ ] **2.1.11** HF_TOKEN re-check for gated models

#### 2.2 — FIX #2: torchvision.extension First Import [H] 🔴
- [ ] **2.2.1** Import `torchvision.extension` BEFORE anything else
- [ ] **2.2.2** Then import `torchvision` and `torchvision.transforms`
- [ ] **2.2.3** This breaks circular import bug in torchvision 0.21.0

#### 2.3 — FIX #1: Gradio #11722 Monkey-Patch [H] 🔴
- [ ] **2.3.1** Import `gradio_client.utils as _gcu`
- [ ] **2.3.2** Save original `_gcu._json_schema_to_python_type`
- [ ] **2.3.3** Create patched function handling `bool` type schemas
- [ ] **2.3.4** Apply patch: `_gcu._json_schema_to_python_type = patched`
- [ ] **2.3.5** Print "✅ Gradio #11722 patched"

#### 2.4 — All Other Imports [H] 🟢
- [ ] **2.4.1** `import torch; torch.set_grad_enabled(False)`
- [ ] **2.4.2** `torch.backends.cuda.matmul.allow_tf32 = True`
- [ ] **2.4.3** `torch.backends.cudnn.allow_tf32 = True`
- [ ] **2.4.4** `torch.backends.cuda.enable_flash_sdp(False)` (T4 doesn't benefit)
- [ ] **2.4.5** `torch.backends.cuda.enable_mem_efficient_sdp(True)`
- [ ] **2.4.6** `from diffusers import ZImagePipeline, ZImageImg2ImgPipeline, ZImageInpaintPipeline`
- [ ] **2.4.7** `import gradio as gr`
- [ ] **2.4.8** `from PIL import Image`
- [ ] **2.4.9** `import rembg`, `numpy as np`, `psutil`
- [ ] **2.4.10** `import json, time, gc, base64, traceback, warnings`
- [ ] **2.4.11** `from io import BytesIO`
- [ ] **2.4.12** `from huggingface_hub import snapshot_download`

#### 2.5 — Hardware Detection [M] 🟢
- [ ] **2.5.1** Detect GPU model and VRAM
- [ ] **2.5.2** Count GPUs available
- [ ] **2.5.3** Set `DTYPE = torch.float16` (Fix #5 — T4 native)
- [ ] **2.5.4** Set per-process memory fraction: `torch.cuda.set_per_process_memory_fraction(0.94, i)`
- [ ] **2.5.5** Display GPU summary for all detected GPUs

#### 2.6 — Model Paths + Verification [H] 🔴
- [ ] **2.6.1** Define `TURBO_DIR = "/kaggle/working/models/Z-Image-Turbo"`
- [ ] **2.6.2** Define `BASE_DIR = "/kaggle/working/models/Z-Image-Base"`
- [ ] **2.6.3** Define `CACHE_DIR = "/kaggle/working/.hf/hub"`
- [ ] **2.6.4** Verify Turbo exists: check `model_index.json` (Issue #7)
- [ ] **2.6.5** Verify Base exists: check `model_index.json` (Issue #7)
- [ ] **2.6.6** If models missing, print download instructions + FAIL

#### 2.7 — Memory Helpers [M] 🟢
- [ ] **2.7.1** `clear()`: `gc.collect(); torch.cuda.synchronize(); torch.cuda.empty_cache(); gc.collect()`
- [ ] **2.7.2** `cuda_mem()`: Return `allocated/reserved GB` formatted string
- [ ] **2.7.3** Print memory state before/after critical operations

#### 2.8 — Engine State [H] 🟢
- [ ] **2.8.1** Define `ENG` dict:
  - `name`: `None` | `"turbo"` | `"base"`
  - `t2i`: pipeline ref
  - `i2i`: pipeline ref
  - `inpaint`: pipeline ref
  - `lora`: `""` | lora path
  - `lora_w`: `0.85`
  - `gen`: generation counter
  - `boot_time`: timestamp
  - `actual_seed`: tracks last used seed (Issue #9)

#### 2.9 — load_pipeline() — FIX #7: Safety Checker Disabled [CRITICAL] 🔴 (NEW!)
- [ ] **2.9.1** Accept model_id parameter
- [ ] **2.9.2** Print "Loading [model_name]..." with memory before
- [ ] **2.9.3** Load pipeline: `ZImagePipeline.from_pretrained(model_id, torch_dtype=DTYPE, cache_dir=CACHE_DIR, low_cpu_mem_usage=False)`
- [ ] **2.9.4** 🔴 **FIX #7: pipe.safety_checker = None** — CRITICAL for NSFW!
- [ ] **2.9.5** 🔴 **Verify safety_checker is indeed None** (some models use different attr names)
- [ ] **2.9.6** Enable xformers: `pipe.enable_xformers_memory_efficient_attention()` (Fix #3)
- [ ] **2.9.7** Fallback: `pipe.enable_attention_slicing("max")` if xformers unavailable
- [ ] **2.9.8** VAE slicing: `pipe.vae.enable_slicing()`
- [ ] **2.9.9** VAE tiling: `pipe.vae.enable_tiling()`
- [ ] **2.9.10** **model_cpu_offload**: `pipe.enable_model_cpu_offload(gpu_id=0)` (Fix #4 — NOT device_map!)
- [ ] **2.9.11** Smart text_encoder offload: patch `encode_prompt` to free text_encoder after encode
- [ ] **2.9.12** Print memory state after loading

#### 2.10 — load_model() [H] 🔴
- [ ] **2.10.1** Cache hit logic: same name + same lora → `set_adapters` for weight change
- [ ] **2.10.2** Model switch: unload old → clear → load new via `load_pipeline()`
- [ ] **2.10.3** Create shared sub-pipelines: `ZImageImg2ImgPipeline(**components)` and `ZImageInpaintPipeline(**components)`
- [ ] **2.10.4** Apply same optimizations to i2i/inpaint sub-pipelines
- [ ] **2.10.5** LoRA change: unload old → clear memory → load new → set weight
- [ ] **2.10.6** Handle LoRA load failures gracefully (don't crash engine)
- [ ] **2.10.7** Return `True` on success, `False` on failure

#### 2.11 — LoRA Snapshot Download [M] 🟠
- [ ] **2.11.1** Define `LORA_DIR = "/kaggle/working/lora/pornmaster"`
- [ ] **2.11.2** Check if LoRA already downloaded (check safetensors file exists)
- [ ] **2.11.3** If not: `snapshot_download("RomixERR/Pornmaster_v1-Z-Images-Turbo", local_dir=LORA_DIR)`
- [ ] **2.11.4** Handle HF_TOKEN for gated LoRA repos
- [ ] **2.11.5** Print LoRA download confirmation with size

#### 2.12 — Real-ESRGAN Upscaler (Lazy Load) [M] 🟠 (NEW — Issue #13)
- [ ] **2.12.1** Define `UPSCALER = None` global
- [ ] **2.12.2** Create `lazy_load_upscaler()`: checks if `UPSCALER is None`
- [ ] **2.12.3** If None: import `from realesrgan import RealESRGANer` and `from basicsr.archs.rrdbnet_arch import RRDBNet`
- [ ] **2.12.4** Download Real-ESRGAN weights on first call
- [ ] **2.12.5** Only load when "Upscale" task is selected (saves memory)
- [ ] **2.12.6** Handle OOM by falling back to simple bicubic upscale

#### 2.13 — Boot: Load Turbo at Startup [H] 🔴
- [ ] **2.13.1** If Turbo exists → load immediately
- [ ] **2.13.2** Track boot time: `ENG["boot_time"] = round(time.time()-t0, 1)`
- [ ] **2.13.3** Print boot confirmation with memory usage
- [ ] **2.13.4** If Turbo missing → print warning (first gen will fail)

#### 2.14 — zoya_gateway(): Input Validation [H] 🔴 (NEW — Issue #11)
- [ ] **2.14.1** Validate prompt is non-empty (for T2I/I2I/Inpaint tasks)
- [ ] **2.14.2** Validate image_b64 for I2I, Inpaint, Remove_BG tasks
- [ ] **2.14.3** Validate mask_b64 for Inpaint task
- [ ] **2.14.4** Validate width/height are ints and in range [512, max_res]
- [ ] **2.14.5** Validate seed is an int
- [ ] **2.14.6** Validate lora_weight is float in [0.0, 2.0]
- [ ] **2.14.7** Validate cfg_scale is float in [1.0, 10.0] (Expert mode)
- [ ] **2.14.8** Validate steps is int in [20, 60] (Expert mode)
- [ ] **2.14.9** Return clean error JSON on any validation failure

#### 2.15 — zoya_gateway(): Resolution Capping Per Mode [H] 🔴 (Issue #4)
- [ ] **2.15.1** Fast mode: cap at `min(res, 1536)` — 1536 max
- [ ] **2.15.2** Pro mode: cap at `min(res, 1536)` — 1536 max
- [ ] **2.15.3** Expert mode: cap at `min(res, 1024)` — 1024 max (Issue #4)
- [ ] **2.15.4** Round to nearest 64: `(val // 64) * 64`
- [ ] **2.15.5** Minimum 512: `max(512, val)`
- [ ] **2.15.6** Log the capped resolution in status JSON

#### 2.16 — zoya_gateway(): FIX #7 — Safety Check Double Verify [CRITICAL] 🔴
- [ ] **2.16.1** After loading pipeline, assert `pipe.safety_checker is None`
- [ ] **2.16.2** If safety_checker exists, set to None again
- [ ] **2.16.3** Also check for `safety_module`, `nsfw_checker`, or any similar attrs
- [ ] **2.16.4** Log confirmation: "Safety checker: DISABLED ✅"

#### 2.17 — zoya_gateway(): All 4 Tasks + Upscale [H] 🔴
- [ ] **2.17.1** **Text2Image**: `ENG["t2i"](prompt=prompt, width=w, height=h, num_inference_steps=steps, guidance_scale=cfg, generator=gen)`
- [ ] **2.17.2** **Image2Image**: Validate image → `ENG["i2i"](image=img.resize((w,h)), strength=float(i2i_str), ...)`
- [ ] **2.17.3** **Inpaint**: Validate image+mask → `ENG["inpaint"](image=img.resize((w,h)), mask_image=mask.resize((w,h)).convert("L"), strength=float(inp_str), ...)`
- [ ] **2.17.4** **Remove_BG**: `rembg.remove(img)` — PRESERVE RGBA (Issue #8)
- [ ] **2.17.5** **Upscale**: `lazy_load_upscaler()` → `upscaler.enhance(img, outscale=scale)` (NEW — Issue #13)

#### 2.18 — zoya_gateway(): Mode Configuration [H] 🔴
- [ ] **2.18.1** **Fast**: load Turbo, 8 steps, CFG=0.0, no negative prompt
- [ ] **2.18.2** **Pro**: load Turbo, 16 steps, CFG=0.0, no negative prompt
- [ ] **2.18.3** **Expert**: load Base, steps from slider (20-60, default 45), CFG from slider, default negative prompt
- [ ] **2.18.4** Handle load failure: raise RuntimeError with clear message

#### 2.19 — zoya_gateway(): FIX #8 — Remove_BG Preserve RGBA [M] 🔴 (Issue #8)
- [ ] **2.19.1** DO NOT call `.convert("RGB")` on rembg output
- [ ] **2.19.2** Return RGBA image with transparent background
- [ ] **2.19.3** Status JSON should note `has_alpha: true` when applicable
- [ ] **2.19.4** Ensure Gradio Image widget can display RGBA

#### 2.20 — zoya_gateway(): FIX #9 — Actual Seed Reporting [M] 🟠 (Issue #9)
- [ ] **2.20.1** Track actual seed used by PyTorch
- [ ] **2.20.2** If `seed == -1`: generate random seed, capture it
- [ ] **2.20.3** If `seed != -1`: use provided seed, still report it back
- [ ] **2.20.4** Store in `ENG["actual_seed"]`
- [ ] **2.20.5** Include `seed` field in status JSON with the actual seed value

#### 2.21 — zoya_gateway(): FIX #10 — Progress Updates [M] 🟡 (Issue #10)
- [ ] **2.21.1** Add `yield` mechanism for long generations (>30s expected)
- [ ] **2.21.2** Yield status: `{"status":"PROGRESS","phase":"loading_engine","progress":0.1}`
- [ ] **2.21.3** Yield status: `{"status":"PROGRESS","phase":"encoding","progress":0.3}`
- [ ] **2.21.4** Yield status: `{"status":"PROGRESS","phase":"inference","progress":0.5}`
- [ ] **2.21.5** Yield status: `{"status":"PROGRESS","phase":"decoding","progress":0.9}`
- [ ] **2.21.6** Final yield: `{"status":"SUCCESS", ...}` with full data
- [ ] **2.21.7** For Expert mode (120-240s): yield every 30s or at step milestones (Issue #5)

#### 2.22 — zoya_gateway(): Status JSON Construction [H] 🟢
- [ ] **2.22.1** Include: `status`, `task`, `mode`, `width`, `height`, `seed`, `steps`, `cfg`
- [ ] **2.22.2** Include: `engine` (turbo/base), `lora`, `gen` (counter)
- [ ] **2.22.3** Include: `inference_s`, `total_s`, `mem` (CUDA memory)
- [ ] **2.22.4** Include: `actual_seed` (Issue #9)
- [ ] **2.22.5** Include: `has_alpha` for Remove_BG (Issue #8)
- [ ] **2.22.6** Include: `analysis` with skin %, brightness, size (from V6)
- [ ] **2.22.7** On error: `status=ERROR`, `message`, `time_seconds`

#### 2.23 — b64/pil Conversion Helpers [L] 🟢
- [ ] **2.23.1** `b64p(s)`: base64 string → PIL Image (RGBA for Remove_BG!)
- [ ] **2.23.2** `img_to_b64(pil_img)`: PIL → base64 data URI string
- [ ] **2.23.3** Handle `None` inputs gracefully
- [ ] **2.23.4** Handle corrupted base64 with try/except → return None

---

### Phase 3: CELL 3 — GRADIO UI + LAUNCH
**Goal:** Beautiful Gradio interface with all controls, proper visibility, and ghost launch.

#### 3.1 — Gradio Blocks Setup [H] 🟢
- [ ] **3.1.1** Create `gr.Blocks(title="ZOYA NSFW V10", analytics_enabled=False, theme=gr.themes.Soft(primary_hue="violet"))`
- [ ] **3.1.2** Add custom HTML header with gradient styling
- [ ] **3.1.3** Title: "⚡ ZOYA NSFW V10 — Z-Image Ghost Engine"
- [ ] **3.1.4** Subtitle: "Text2Image · Image2Image · Inpaint · Remove BG · Upscale · LoRA"

#### 3.2 — FIX #12: Separate Image Upload Widgets Per Task [H] 🔴 (Issue #12)
- [ ] **3.2.1** Create `input_img_t2i` = Image widget for Text2Image (visible by default)
- [ ] **3.2.2** Create `input_img_i2i` = Image widget for Image2Image
- [ ] **3.2.3** Create `input_img_inpaint` = Image widget for Inpaint
- [ ] **3.2.4** Create `input_img_removebg` = Image widget for Remove_BG
- [ ] **3.2.5** Create `input_mask` = Image widget for Inpaint mask
- [ ] **3.2.6** Each widget has its own `visible` state toggled by task selection
- [ ] **3.2.7** This fixes Gradio visibility reset bug (separate widgets = no reset)

#### 3.3 — Task Dropdown + Visibility Logic [H] 🔴
- [ ] **3.3.1** Create `task` dropdown with all 5 tasks:
  - `Text2Image`, `Image2Image`, `Inpaint`, `Remove_BG`, `Upscale`
- [ ] **3.3.2** **Upscale task** (NEW — Issue #13): separate from Image2Image
- [ ] **3.3.3** `update_visibility(task_val)` function:
  - Shows correct input image widget for each task
  - Shows mask only for Inpaint
  - Hides prompt fields for Remove_BG/Upscale (not needed)
  - Shows upscale scale slider only for Upscale
- [ ] **3.3.4** Connect `task.change(fn=update_visibility, inputs=task, outputs=[...])`

#### 3.4 — Input Widgets: Prompts [M] 🟢
- [ ] **3.4.1** `prompt` Textbox: label="Prompt", lines=3, default NSFW prompt
- [ ] **3.4.2** `neg_prompt` Textbox: label="Negative Prompt (Expert)", lines=2, default value
- [ ] **3.4.3** Proper placeholder text for guidance

#### 3.5 — Input Widgets: Mode Selection [M] 🟢
- [ ] **3.5.1** `mode` Radio: ["Fast (8 steps)", "Pro (16 steps)", "Expert (Base 45+ steps)"]
- [ ] **3.5.2** Default: "Fast (8 steps)"
- [ ] **3.5.3** Info text: "Fast/Pro = Turbo | Expert = Base model"
- [ ] **3.5.4** Disable Expert controls when Fast/Pro selected

#### 3.6 — Input Widgets: Image Uploads [H] 🟢
- [ ] **3.6.1** `input_img_t2i` = `gr.Image(label="Input Image (optional)", type="pil", visible=False)`
- [ ] **3.6.2** `input_img_i2i` = `gr.Image(label="Input Image", type="pil", visible=False)`
- [ ] **3.6.3** `input_img_inpaint` = `gr.Image(label="Input Image", type="pil", visible=False)`
- [ ] **3.6.4** `input_img_removebg` = `gr.Image(label="Image to Remove BG", type="pil", visible=False)`
- [ ] **3.6.5** `input_mask` = `gr.Image(label="Mask (for Inpaint)", type="pil", visible=False)`
- [ ] **3.6.6** All images use `type="pil"` for direct PIL compatibility

#### 3.7 — Input Widgets: Size Controls [M] 🟢
- [ ] **3.7.1** `width` = Slider(512, 1536, 1024, step=64, label="Width")
- [ ] **3.7.2** `height` = Slider(512, 1536, 1024, step=64, label="Height")
- [ ] **3.7.3** `seed` = Number(-1, label="Seed (-1 = random)", precision=0)

#### 3.8 — Input Widgets: Advanced / Expert Controls [M] 🟢
- [ ] **3.8.1** `cfg_scale` = Slider(1.0, 10.0, 4.5, 0.5, label="CFG Scale (Expert)")
- [ ] **3.8.2** `expert_steps` = Slider(20, 60, 45, 1, label="Expert Steps")
- [ ] **3.8.3** `i2i_strength` = Slider(0.1, 1.0, 0.65, 0.05, label="I2I Strength")
- [ ] **3.8.4** `inp_strength` = Slider(0.1, 1.0, 0.85, 0.05, label="Inpaint Strength")
- [ ] **3.8.5** `upscale_scale` = Slider(2, 4, 2, 1, label="Upscale Factor (NEW!)")
- [ ] **3.8.6** Wrap in `gr.Accordion("🔧 Advanced", open=False)`

#### 3.9 — Input Widgets: LoRA Controls [M] 🟢
- [ ] **3.9.1** `lora_select` = Dropdown(["None", "Pornmaster v1 (pronmstr)"], value="None")
- [ ] **3.9.2** `lora_weight` = Slider(0.0, 2.0, 0.85, 0.05, label="LoRA Weight")
- [ ] **3.9.3** Info text: "Trigger: pronmstr | Works with Turbo modes"

#### 3.10 — Output Widgets [H] 🟢
- [ ] **3.10.1** `output_img` = Image(label="🖼 Output", type="pil", height=512)
- [ ] **3.10.2** `status` = Textbox(label="📊 Status JSON", lines=14)
- [ ] **3.10.3** System info HTML: VRAM, GPU, engine status
- [ ] **3.10.4** LoRA status indicator

#### 3.11 — handle_generate() Wrapper [H] 🔴
- [ ] **3.11.1** Receives all Gradio widget values
- [ ] **3.11.2** Maps UI mode strings → internal mode strings
  - "Fast (8 steps)" → "Fast"
  - "Pro (16 steps)" → "Pro"
  - "Expert (Base 45+ steps)" → "Expert"
- [ ] **3.11.3** Maps LoRA selection → LoRA path (`LORA_DIR` or `""`)
- [ ] **3.11.4** Converts PIL images → base64 strings for zoya_gateway
- [ ] **3.11.5** Passes all params to `zoya_gateway()`
- [ ] **3.11.6** Handles output unpacking (image + JSON status)

#### 3.12 — btn.click Wiring [H] 🔴
- [ ] **3.12.1** `btn.click(fn=handle_generate, inputs=[all 15+ inputs], outputs=[output_img, status], api_name="zoya_gateway")`
- [ ] **3.12.2** api_name is critical for remote API access
- [ ] **3.12.3** All inputs explicitly mapped (no missing params)

#### 3.13 — FIX #6: Ghost Launch with Error Display [H] 🔴 (Issue #6)
- [ ] **3.13.1** `app.queue(max_size=5)`
- [ ] **3.13.2** Wrap launch in try/except:
  ```python
  try:
      app.launch(share=True, server_name="0.0.0.0", debug=False, quiet=True, show_error=False)
  except Exception as e:
      print(f"❌ LAUNCH FAILED: {e}")
      traceback.print_exc()
      print("⚠️ Ghost mode: launch failed — check errors above")
  ```
- [ ] **3.13.3** Ghost mode MUST show errors (Issue #6) — don't silently fail!
- [ ] **3.13.4** Print the Gradio URL when successful
- [ ] **3.13.5** Print "✅ ACTIVE! Send URL to ZOYA" on success

#### 3.14 — FIX #5: Expert Timing UI Feedback [M] 🟠 (Issue #5)
- [ ] **3.14.1** UI status should show estimated time per mode
- [ ] **3.14.2** Fast: "~8-15s"
- [ ] **3.14.3** Pro: "~16-30s"
- [ ] **3.14.4** Expert: "~120-240s" (NOT 60-90s — corrected!)
- [ ] **3.14.5** Show progress dots or elapsed time during Expert mode

#### 3.15 — Gradio Theme Customization [L] 🟢
- [ ] **3.15.1** Soft theme with violet primary
- [ ] **3.15.2** Custom CSS for header gradient
- [ ] **3.15.3** Responsive layout (equal_height rows)
- [ ] **3.15.4** Button highlighting for Generate

---

### Edge Cases & Error Handling [H] 🔴

- [ ] **EC-1**: Network failure during model download → retry logic (3 attempts)
- [ ] **EC-2**: Disk space exhausted mid-download → cleanup partial files, report space
- [ ] **EC-3**: CUDA OOM during inference → `clear()` + return error JSON with OOM message
- [ ] **EC-4**: GPU not available (CPU mode) → warn and use CPU (slow but functional)
- [ ] **EC-5**: Invalid image upload (corrupted file) → return validation error
- [ ] **EC-6**: Empty prompt submitted → return error "Prompt required for this task"
- [ ] **EC-7**: Seed = None or empty string → treat as -1 (random)
- [ ] **EC-8**: Width/height not multiple of 64 → round to nearest 64
- [ ] **EC-9**: Width/height < 512 → clamp to 512
- [ ] **EC-10**: Width/height > max → cap per mode (1536/1024)
- [ ] **EC-11**: LoRA file missing → skip LoRA, continue with base model
- [ ] **EC-12**: HF_TOKEN invalid/expired → print auth error, suggest manual token
- [ ] **EC-13**: Model not found at path → print available models, fail gracefully
- [ ] **EC-14**: Gradio launch port conflict → auto-retry with different port
- [ ] **EC-15**: Ghost mode Kaggle shutdown → handle SIGTERM, print shutdown message
- [ ] **EC-16**: Multiple rapid submissions → queue max_size prevents overload
- [ ] **EC-17**: Real-ESRGAN import fails → fall back to PIL `Image.resize(LANCZOS)`
- [ ] **EC-18**: Remove_BG input has no subject → return original image with alpha
- [ ] **EC-19**: Inpaint mask all black or all white → warn "Mask may be invalid"
- [ ] **EC-20**: Python version mismatch → detect and report at Cell 1 start

---

### Testing Tasks [H] 🔴

- [ ] **T-1**: **Cell 1 fresh install** — Run on empty Kaggle notebook, verify all packages install
- [ ] **T-2**: **Cell 1 restart test** — Restart session, verify env vars are reset
- [ ] **T-3**: **Cell 1 disk check** — Intentionally fill disk, verify fail-fast works
- [ ] **T-4**: **Cell 1 model download** — Verify model_index.json exists after download
- [ ] **T-5**: **Cell 1 HF_TOKEN test** — Test with and without token for gated models
- [ ] **T-6**: **Cell 2 safety checker** — Verify `pipe.safety_checker is None` after load
- [ ] **T-7**: **Cell 2 all tasks** — Test T2I, I2I, Inpaint, Remove_BG, Upscale
- [ ] **T-8**: **Cell 2 resolution capping** — Test Fast=1536, Pro=1536, Expert=1024
- [ ] **T-9**: **Cell 2 RGBA preservation** — Remove_BG output has alpha channel
- [ ] **T-10**: **Cell 2 seed reporting** — seed=-1 returns actual seed, seed=42 returns 42
- [ ] **T-11**: **Cell 2 mode switching** — Fast→Expert→Pro→Fast with LoRA changes
- [ ] **T-12**: **Cell 2 OOM recovery** — Submit with max res, verify error handling
- [ ] **T-13**: **Cell 2 input validation** — Test empty prompt, missing image, etc.
- [ ] **T-14**: **Cell 2 progress yields** — Verify interim status JSONs (Issue #10)
- [ ] **T-15**: **Cell 3 widget visibility** — Each task shows correct image upload
- [ ] **T-16**: **Cell 3 Upscale widget** — Upscale task shows scale slider, hides prompt
- [ ] **T-17**: **Cell 3 ghost launch fail** — Force port conflict, verify error displayed
- [ ] **T-18**: **Cell 3 API access** — Verify `api_name="zoya_gateway"` works remotely
- [ ] **T-19**: **Full pipeline test** — Cell 1→Restart→Cell 2→(cell 2 acts as cell 3) 
- [ ] **T-20**: **Expert timing test** — Measure actual Expert generation time (should be 120-240s)

---

### Verification Checklist [H] 🔴

- [ ] **V-1**: All 13 QA issues addressed (#1 through #13)
- [ ] **V-2**: `XFORMERS_DISABLE_FLASH_ATTN=1` set before any torch import
- [ ] **V-3**: `model_cpu_offload` used (NOT `device_map`, NOT `balanced`)
- [ ] **V-4**: `fp16` variant (T4 native, NOT bf16)
- [ ] **V-5**: `diffusers==0.32.1` pinned (NOT latest)
- [ ] **V-6**: `pipe.safety_checker = None` explicitly set
- [ ] **V-7**: torchvision.extension imported first
- [ ] **V-8**: Gradio #11722 monkey-patch applied
- [ ] **V-9**: Disk space verified before downloads
- [ ] **V-10**: Model download verified via model_index.json check
- [ ] **V-11**: Remove_BG preserves RGBA (no .convert("RGB"))
- [ ] **V-12**: Actual seed reported back when seed=-1
- [ ] **V-13**: Resolution capped: Fast/Pro=1536, Expert=1024
- [ ] **V-14**: Expert timing shows 120-240s (not 60-90s)
- [ ] **V-15**: Ghost launch shows errors on failure
- [ ] **V-16**: Progress updates yield during long generation
- [ ] **V-17**: Input validation before any inference
- [ ] **V-18**: Separate image upload widgets per task
- [ ] **V-19**: Upscale as separate task in dropdown
- [ ] **V-20**: LoRA snapshot_download with proper path
- [ ] **V-21**: VAE slicing + tiling enabled
- [ ] **V-22**: xformers with fallback to attention slicing
- [ ] **V-23**: Smart text_encoder offload
- [ ] **V-24**: Per-process memory fraction set to 0.94
- [ ] **V-25**: NSFW prompt as default in UI

---

### File Size Budget
| Section | Target Lines | Current Est. |
|---------|-------------|---------------|
| CELL 1: Packages + Download | 120-150 | ⬜ |
| CELL 2: Engine | 500-600 | ⬜ |
| CELL 3: Gradio UI | 200-250 | ⬜ |
| **Total** | **820-1000** | **⬜** |

> **Note:** The file will be a **single .py file** with 3 clearly separated cells using `# %%` markers (VS Code Jupyter format) or separate code blocks with clear `# ===== CELL N =====` comments.

---

### Implementation Order (Recommended)
```
1.  CELL 1 skeleton → env vars → system check → packages → downloads → restart msg
2.  CELL 3 skeleton → Blocks → widgets → visibility → handle_generate → launch
3.  CELL 2 helpers → clear() → cuda_mem() → b64p() → img_to_b64()
4.  CELL 2 load_pipeline() → safety_checker=None → xformers → VAE → offload
5.  CELL 2 load_model() → caching → sub-pipelines → LoRA management
6.  CELL 2 zoya_gateway() → input validation → resolution cap → mode config
7.  CELL 2 task dispatch → T2I → I2I → Inpaint → Remove_BG → Upscale
8.  CELL 2 Fix #9 (seed reporting) → Fix #10 (progress yields) → status JSON
9.  CELL 1 Fix #2 (HF_TOKEN) → Fix #3 (disk check) → Fix #7 (model verification)
10. CELL 3 Fix #12 (separate upload widgets) → Fix #13 (Upscale task)
11. CELL 3 ghost launch → try/except → error display
12. Edge cases → testing → verification
```

---

**📋 Total: 147 tasks (3 phases + Edge Cases + Testing + Verification)**
- Phase 1: 44 tasks 🔵
- Phase 2: 59 tasks 🟣
- Phase 3: 28 tasks 🟢
- Edge Cases: 20 tasks ⚠️
- Testing: 20 tasks 🧪
- Verification: 25 tasks ✅
