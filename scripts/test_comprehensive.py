"""
ZOYA Comprehensive Test Suite for Z-Image Ghost Engine V6
Tests: Fast/Pro/Expert modes, LoRA, timing, switching, Remove BG
"""
from gradio_client import Client
import base64, json, os, sys, time

URL = "https://6aaada06e8b7ae3881.gradio.live"
MAIN_DIR = r"D:\PICS\GENERATED"
WEBUI_DIR = r"D:\PROJECTS\ZOYA_009\images"
os.makedirs(MAIN_DIR, exist_ok=True)
os.makedirs(WEBUI_DIR, exist_ok=True)

RESULTS = []

def test(name, task="Text2Image", prompt="", neg="", mode="Fast",
         width=1024, height=1024, seed=-1, image_b64="", mask_b64="",
         lora_path="", lora_weight=0.85, cfg_scale=4.5, i2i_str=0.65,
         inp_str=0.85, exp_steps=45):
    """Run a single test and save results"""
    print(f"\n{'='*60}")
    print(f"  TEST: {name}")
    print(f"{'='*60}")
    
    try:
        client = Client(URL)
        t_start = time.time()

        b64_data, status_json = client.predict(
            task=task, prompt=prompt, neg_prompt=neg, mode=mode,
            width=width, height=height, seed=seed,
            image_b64=image_b64, mask_b64=mask_b64,
            lora_path=lora_path, lora_weight=lora_weight,
            cfg_scale=cfg_scale, i2i_str=i2i_str, inp_str=inp_str,
            exp_steps=exp_steps,
            api_name="/zoya_gateway"
        )
        t_connect = round(time.time() - t_start, 2)
        status = json.loads(status_json)

        print(f"  Status: {status.get('status')}")
        print(f"  Connect Time: {t_connect}s")
        print(f"  Engine Time: {status.get('time','?')}s")
        print(f"  Inference: {status.get('inference','?')}s")

        if status.get("status") == "ERROR":
            print(f"  ERROR: {status.get('message')}")
            RESULTS.append({"name": name, "status": "ERROR", "error": status.get("message")})
            return None

        if not b64_data:
            print("  ERROR: Empty image data")
            RESULTS.append({"name": name, "status": "ERROR", "error": "Empty image"})
            return None

        # Save image
        ts = int(time.time())
        tag = "lora" if lora_path else "nolf"
        filename = f"ZOYA_TEST_{mode}_{tag}_{ts}.png"
        main_path = os.path.join(MAIN_DIR, filename)
        webui_path = os.path.join(WEBUI_DIR, filename)

        with open(main_path, "wb") as f:
            f.write(base64.b64decode(b64_data))
        with open(webui_path, "wb") as f:
            f.write(base64.b64decode(b64_data))

        size_kb = round(os.path.getsize(main_path) / 1024, 1)
        web_url = f"http://127.0.0.1:25809/api/zoya/images/{filename}"

        result = {
            "name": name, "status": "SUCCESS", "mode": mode,
            "file": filename, "size_kb": size_kb,
            "connect_time": t_connect,
            "engine_time": status.get("time"),
            "inference_time": status.get("inference"),
            "steps": status.get("steps"),
            "cfg": status.get("cfg"),
            "lora": status.get("lora"),
            "webui_url": web_url,
            "analysis": status.get("analysis", {})
        }
        RESULTS.append(result)

        print(f"  File: {filename} ({size_kb}KB)")
        print(f"  Steps: {status.get('steps')} | CFG: {status.get('cfg')}")
        print(f"  Skin: {status.get('analysis',{}).get('skin','?')}")
        print(f"  Brightness: {status.get('analysis',{}).get('bright','?')}")
        print(f"  🖼️  {web_url}")

        return result
    
    except Exception as e:
        print(f"  EXCEPTION: {type(e).__name__}: {e}")
        RESULTS.append({"name": name, "status": "CRASH", "error": str(e)})
        return None


def summary():
    """Print final summary"""
    print("\n\n")
    print("="*70)
    print("  FINAL TEST SUMMARY")
    print("="*70)
    
    passed = sum(1 for r in RESULTS if r["status"] == "SUCCESS")
    failed = sum(1 for r in RESULTS if r["status"] != "SUCCESS")
    
    print(f"\n  Total: {len(RESULTS)} | PASSED: {passed} | FAILED: {failed}")
    print()
    
    for r in RESULTS:
        if r["status"] == "SUCCESS":
            print(f"  [OK] {r['name']:40s} | {r['mode']:8s} | {r['engine_time']:>5}s | {r['file']}")
        else:
            print(f"  [XX] {r['name']:40s} | ERROR: {r.get('error','?')}")
    
    print("="*70)


# ═══════════════════════════════════════════
#  TEST PLAN
# ═══════════════════════════════════════════

PROMPT = "pronmstr. 1girl, beautiful woman, perfect skin, cute face, oiled body, sensual expression, seductive pose, soft lighting, 4K, detailed face, sharp focus"
PROMPT2 = "pronmstr. beautiful woman, oiled body, sensual, soft lighting, 4K"
PROMPT3 = "pronmstr. 1girl, cute face, perfect skin, wet body, shiny skin, seductive, bedroom eyes, soft glow, masterpiece"
PROMPT4 = "portrait of a beautiful woman, soft lighting, detailed face, high quality, 4K"
PMASTER = "/kaggle/tmp/models/pornmaster"

# ─── PHASE 1: Fast Mode Tests ───
print("\n")
print("=" * 60)
print("  PHASE 1: FAST MODE (Turbo, 8 steps, CFG=0)")
print("=" * 60)

test("Fast T2I #1", mode="Fast", prompt=PROMPT)
test("Fast T2I #2 (diff seed)", mode="Fast", prompt=PROMPT2, seed=42)
test("Fast T2I #3 (diff seed)", mode="Fast", prompt=PROMPT3, seed=777)

# ─── PHASE 2: Pro Mode Tests ───
print("\n")
print("=" * 60)
print("  PHASE 2: PRO MODE (Turbo, 16 steps, CFG=0)")
print("=" * 60)

test("Pro T2I #1", mode="Pro", prompt=PROMPT)
test("Pro T2I #2 (diff seed)", mode="Pro", prompt=PROMPT2, seed=123)
test("Pro T2I #3 (diff seed)", mode="Pro", prompt=PROMPT3, seed=456)

# ─── PHASE 3: Expert Mode Tests (Base model) ───
print("\n")
print("=" * 60)
print("  PHASE 3: EXPERT MODE (Base, 45 steps, CFG=4.5)")
print("=" * 60)

test("Expert T2I #1", mode="Expert", prompt=PROMPT4, neg="lowres, bad anatomy, bad hands, cropped")
test("Expert T2I #2", mode="Expert", prompt=PROMPT4, neg="lowres, bad anatomy", seed=789)
test("Expert T2I #3", mode="Expert", prompt=PROMPT3, neg="lowres, bad anatomy", seed=321)

# ─── PHASE 4: LORA Tests ───
print("\n")
print("=" * 60)
print("  PHASE 4: LORA (Pornmaster v1) all modes")
print("=" * 60)

test("Fast + LoRA", mode="Fast", prompt=PROMPT, lora_path=PMASTER, lora_weight=0.9)
test("Pro + LoRA", mode="Pro", prompt=PROMPT, lora_path=PMASTER, lora_weight=0.9)
test("Expert + LoRA", mode="Expert", prompt="1girl, beautiful woman, perfect skin, soft lighting, 4K", 
     neg="lowres, bad anatomy", lora_path=PMASTER, lora_weight=0.85)

# ─── PHASE 5: Mode Switching Speed ───
print("\n")
print("=" * 60)
print("  PHASE 5: MODE SWITCHING TESTS")
print("=" * 60)

# Fast -> Pro (same engine, no reload)
test("Switch Fast->Pro #1", mode="Fast", prompt=PROMPT2)
test("Switch Fast->Pro #2", mode="Pro", prompt=PROMPT2)

# Pro -> Expert (engine switch: Turbo->Base)
test("Switch Pro->Expert #1", mode="Pro", prompt=PROMPT4)
test("Switch Pro->Expert #2", mode="Expert", prompt=PROMPT4, neg="lowres, bad anatomy")

# Expert -> Fast (engine switch: Base->Turbo)
test("Switch Expert->Fast #1", mode="Expert", prompt=PROMPT4, neg="lowres", seed=999)
test("Switch Expert->Fast #2", mode="Fast", prompt=PROMPT2)

# Fast -> Expert -> Fast
test("Switch Fast->Expert", mode="Expert", prompt=PROMPT4, neg="lowres", seed=555)
test("Switch Expert->Fast v2", mode="Fast", prompt=PROMPT3)

# ─── PHASE 6: Resolution Tests ───
print("\n")
print("=" * 60)
print("  PHASE 6: RESOLUTION TESTS")
print("=" * 60)

test("Fast 512x512", mode="Fast", prompt=PROMPT2, width=512, height=512)
test("Fast 2048x1024", mode="Fast", prompt=PROMPT2, width=2048, height=1024)
test("Pro 1408x1408", mode="Pro", prompt=PROMPT2, width=1408, height=1408)

# ─── PHASE 7: Remove BG Test ───
print("\n")
print("=" * 60)
print("  PHASE 7: REMOVE BG TEST")
print("=" * 60)

# Generate an image first, then use it for Remove BG
test("Remove BG source", mode="Fast", prompt=PROMPT, seed=100)

# ─── FINAL SUMMARY ───
summary()
