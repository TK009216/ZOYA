# ============================================
# CELL 2 — DOWNLOAD TURBO MODEL (fp16)
# ============================================
# F32 → fp16 conversion to save disk space
# Download 1 file at a time → convert → delete F32

import os, time, json, requests
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
from safetensors.torch import save_file as st_save
from safetensors import safe_open

print("="*55)
print("  CELL 2: TURBO MODEL (fp16)")
print("="*55)
t0 = time.time()

BASE = "https://huggingface.co/Tongyi-MAI/Z-Image-Turbo/resolve/main"
DIR = "/kaggle/working/models/Z-Image-Turbo"
TMP = "/kaggle/working/.tmp"
os.makedirs(DIR, exist_ok=True)
os.makedirs(TMP, exist_ok=True)

def dl(url, dest):
    print(f"  DL {os.path.basename(dest)}...", end=" ", flush=True)
    t1 = time.time()
    r = requests.get(url, stream=True, timeout=600)
    r.raise_for_status()
    with open(dest, "wb") as f:
        for chunk in r.iter_content(8*1024*1024):
            if chunk: f.write(chunk)
    mb = os.path.getsize(dest)/1e6
    print(f"{mb:.0f}MB ({time.time()-t1:.0f}s)")

def conv(f32, fp16):
    print(f"  CONV {os.path.basename(fp16)}...", end=" ", flush=True)
    t1 = time.time()
    tensors = {}
    with safe_open(f32, framework="pt", device="cpu") as f:
        for key in f.keys():
            tensors[key] = f.get_tensor(key).half()
    st_save(tensors, fp16)
    del tensors
    print(f"{time.time()-t1:.0f}s")

def dl_conv(remote, local):
    fp16p = f"{DIR}/{local.replace('.safetensors', '.fp16.safetensors')}"
    if os.path.exists(fp16p) and os.path.getsize(fp16p) > 1024:
        print(f"  SKIP {local}")
        return
    f32p = f"{TMP}/{local}"
    dl(f"{BASE}/{remote}", f32p)
    conv(f32p, fp16p)
    os.remove(f32p)
    print(f"  CLEAN deleted F32")

# Configs (small, no conversion)
print("\n--- Configs ---")
cfgs = ["model_index.json","scheduler/scheduler_config.json",
    "text_encoder/config.json","text_encoder/generation_config.json",
    "text_encoder/model.safetensors.index.json",
    "tokenizer/merges.txt","tokenizer/tokenizer.json",
    "tokenizer/tokenizer_config.json","tokenizer/vocab.json",
    "transformer/config.json",
    "transformer/diffusion_pytorch_model.safetensors.index.json",
    "vae/config.json"]
for f in cfgs:
    dest = f"{DIR}/{f}"
    if not os.path.exists(dest):
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        dl(f"{BASE}/{f}", dest)

# VAE
print("\n--- VAE ---")
dl_conv("vae/diffusion_pytorch_model.safetensors","vae/diffusion_pytorch_model.safetensors")

# Text Encoder (3 shards)
print("\n--- Text Encoder ---")
for i in range(1,4):
    dl_conv(f"text_encoder/model-0000{i}-of-00003.safetensors",
            f"text_encoder/model-0000{i}-of-00003.safetensors")

# Transformer (3 shards - the big ones!)
print("\n--- Transformer ---")
for i in range(1,4):
    dl_conv(f"transformer/diffusion_pytorch_model-0000{i}-of-00003.safetensors",
            f"transformer/diffusion_pytorch_model-0000{i}-of-00003.safetensors")

# Update model_index.json
with open(f"{DIR}/model_index.json") as f:
    idx = json.load(f)
idx["_variant"] = "fp16"
with open(f"{DIR}/model_index.json","w") as f:
    json.dump(idx, f, indent=2)

# Cleanup
shutil.rmtree(TMP, ignore_errors=True)
total = sum(os.path.getsize(os.path.join(dp,f)) for dp,_,fn in os.walk(DIR) for f in fn) / 1e9

print(f"\n{'='*55}")
print(f"  TURBO DONE! ({time.time()-t0:.0f}s)")
print(f"  Size: {total:.1f}GB")
print(f"  Ready for CELL 3!")
print(f"{'='*55}")
