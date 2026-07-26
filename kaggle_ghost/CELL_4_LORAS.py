# ============================================
# CELL 4 — LORAS + ANIME + NSFW
# ============================================
# Download all LoRAs for Z-Image Turbo
# 1. Pornmaster v1 (NSFW, trigger: pronmstr)
# 2. Smnth_v1 NSFW1 (better anatomy, trigger: Smnth_v1)
# 3. Anime LoRA (trigger varies)

import os, time, requests
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
import warnings; warnings.filterwarnings("ignore")

print("="*55)
print("  CELL 4: LORAS")
print("="*55)
t0 = time.time()

def dl(url, dest, label=""):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    if os.path.exists(dest) and os.path.getsize(dest) > 1024:
        print(f"  SKIP {label}")
        return True
    print(f"  DL {label}...", end=" ", flush=True)
    t1 = time.time()
    try:
        r = requests.get(url, stream=True, timeout=120)
        r.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in r.iter_content(8*1024*1024):
                if chunk: f.write(chunk)
        print(f"{os.path.getsize(dest)/1e6:.0f}MB ({time.time()-t1:.0f}s)")
        return True
    except Exception as e:
        print(f"FAILED: {e}")
        return False

# ── 1. Pornmaster v1 ──
print("\n[1/3] Pornmaster v1 (NSFW, trigger: pronmstr)...")
pm = "/kaggle/working/models/pornmaster"
for f in ["Pornmaster_v1_000043500.safetensors", "Pornmaster_v1_000044700.safetensors"]:
    dl(f"https://huggingface.co/RomixERR/Pornmaster_v1-Z-Images-Turbo/resolve/main/{f}",
       f"{pm}/{f}", f"Pornmaster/{f}")

# ── 2. Smnth_v1 NSFW1 ──
print("\n[2/3] Smnth_v1 NSFW1 (NSFW/anatomy, trigger: Smnth_v1)...")
sm = "/kaggle/working/models/smnth"
dl("https://huggingface.co/Kakelaka/Smnth_v1_NSFW1/resolve/main/pytorch_lora_weights.safetensors",
   f"{sm}/pytorch_lora_weights.safetensors", "Smnth_v1/weights")
dl("https://huggingface.co/Kakelaka/Smnth_v1_NSFW1/resolve/main/adapter_config.json",
   f"{sm}/adapter_config.json", "Smnth_v1/config")

# ── 3. Anime LoRA search ──
print("\n[3/3] Anime/Style LoRAs...")

# Try several anime LoRAs for Z-Image
anime_loras = [
    # Z-Image specific anime LoRAs from HF Spaces
    ("prithivMLmods/Z-Image-Turbo-LoRA-DLC", "anime_style.safetensors", "Anime Style"),
]

anime_dir = "/kaggle/working/models/anime"
os.makedirs(anime_dir, exist_ok=True)

for repo, fname, label in anime_loras:
    dl(f"https://huggingface.co/{repo}/resolve/main/{fname}",
       f"{anime_dir}/{fname}", label)

# If no specific anime LoRA found, create a note
import glob
anime_files = glob.glob(f"{anime_dir}/*")
if not anime_files:
    print("  (No anime LoRA downloaded — use Pornmaster+prompt engineering for anime style)")
    print("  Tip: Use 'anime style, anime artstyle' in prompt without LoRA")

# Show all LoRAs found
print("\n--- All LoRAs ---")
for root, dirs, files in os.walk("/kaggle/working/models"):
    for f in files:
        if f.endswith(".safetensors"):
            path = os.path.join(root, f)
            size = os.path.getsize(path)/1e6
            print(f"  {os.path.basename(root)}/{f}: {size:.0f}MB")

print(f"\n{'='*55}")
print(f"  LORAS DONE! ({time.time()-t0:.0f}s)")
print(f"  Ready for CELL 5: ENGINE!")
print(f"{'='*55}")
