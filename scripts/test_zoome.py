"""
ZOYA Ghost Engine V6 — Comprehensive Test Suite v2
Tests: Fast/Pro/Expert modes, LoRA, timing, switching
"""
import os, sys, time, json

# Add parent to path
sys.path.insert(0, r"D:\PROJECTS\ZOYA_009\scripts")

from zoya_gradio import generate

URL = "https://6aaada06e8b7ae3881.gradio.live"
PMASTER = "/kaggle/tmp/models/pornmaster"

RESULTS = []

def test(name, mode="Fast", prompt="", neg="", seed=-1, width=1024, height=1024,
         lora_path="", lora_weight=0.85):
    """Run one test and show results inline"""
    print(f"\n{'='*60}")
    print(f"  [{name}]", flush=True)
    t0 = time.time()
    
    result = generate(
        prompt=prompt, mode=mode, url=URL,
        task="Text2Image", neg_prompt=neg,
        width=width, height=height, seed=seed,
        lora_path=lora_path, lora_weight=lora_weight
    )
    dt = round(time.time() - t0, 2)
    
    if result.get("status") == "ERROR":
        print(f"  [XX] ERROR: {result.get('message','?')}")
        RESULTS.append({"name": name, "status": "ERROR", "error": result.get("message")})
    else:
        print(f"  [OK] Time: {dt}s | File: {result['filename']} ({result['size_kb']}KB)")
        print(f"  URL: {result['webui_url']}")
        RESULTS.append({**result, "name": name, "status": "SUCCESS"})
    
    return result

# ─── TEST PROMPTS ───
P1 = "pronmstr. 1girl, beautiful woman, perfect skin, cute face, oiled body, sensual expression, seductive pose, soft lighting, 4K, detailed face"
P2 = "pronmstr. beautiful woman, oiled body, sensual, soft lighting, 4K"
P3 = "pronmstr. 1girl, cute face, perfect skin, wet body, shiny skin, seductive, bedroom eyes, soft glow"
P4 = "portrait of a beautiful woman, soft lighting, detailed face, high quality, 4K"

# ═══════════════════════════════════════════
print("\n" + "="*60)
print("  PHASE 1: FAST MODE (Turbo, 8 steps)")
print("="*60)
test("Fast #1", mode="Fast", prompt=P1)
test("Fast #2", mode="Fast", prompt=P2, seed=42)
test("Fast #3", mode="Fast", prompt=P3, seed=777)

# ═══════════════════════════════════════════
print("\n" + "="*60)
print("  PHASE 2: PRO MODE (Turbo, 16 steps)")
print("="*60)
test("Pro #1", mode="Pro", prompt=P1)
test("Pro #2", mode="Pro", prompt=P2, seed=123)
test("Pro #3", mode="Pro", prompt=P3, seed=456)

# ═══════════════════════════════════════════
print("\n" + "="*60)
print("  PHASE 3: EXPERT MODE (Base, 45 steps)")
print("="*60)
test("Expert #1", mode="Expert", prompt=P4, neg="lowres, bad anatomy, bad hands, cropped")
test("Expert #2", mode="Expert", prompt=P4, neg="lowres, bad anatomy", seed=789)
test("Expert #3", mode="Expert", prompt=P3, neg="lowres, bad anatomy", seed=321)

# ═══════════════════════════════════════════
print("\n" + "="*60)
print("  PHASE 4: LORA TEST (Pornmaster v1)")
print("="*60)
test("Fast+LoRA #1", mode="Fast", prompt=P1, lora_path=PMASTER, lora_weight=0.9)
test("Pro+LoRA #1", mode="Pro", prompt=P1, lora_path=PMASTER, lora_weight=0.9)
test("Expert+LoRA #1", mode="Expert", prompt=P4, neg="lowres, bad anatomy", lora_path=PMASTER, lora_weight=0.85)

# ═══════════════════════════════════════════
print("\n" + "="*60)
print("  PHASE 5: MODE SWITCHING")
print("="*60)
# Fast -> Pro (same engine, no reload)
test("Switch Fast->Pro", mode="Fast", prompt=P2)
test("Switch Fast->Pro", mode="Pro", prompt=P2)

# Pro -> Expert (engine switch)
test("Switch Pro->Expert", mode="Pro", prompt=P4)
test("Switch Pro->Expert", mode="Expert", prompt=P4, neg="lowres")

# Expert -> Fast (engine switch back)
test("Switch Expert->Fast", mode="Expert", prompt=P4, neg="lowres", seed=999)
test("Switch Expert->Fast", mode="Fast", prompt=P2)

# ═══════════════════════════════════════════
print("\n" + "="*60)
print("  PHASE 6: RESOLUTION TEST")
print("="*60)
test("512x512", mode="Fast", prompt=P2, width=512, height=512)
test("2048x1024", mode="Fast", prompt=P2, width=2048, height=1024)
test("1408x1408", mode="Pro", prompt=P2, width=1408, height=1408)

# ═══════════════════════════════════════════
print("\n" + "="*60)
print("  FINAL SUMMARY")
print("="*60)
passed = sum(1 for r in RESULTS if r["status"] == "SUCCESS")
failed = sum(1 for r in RESULTS if r["status"] != "SUCCESS")
print(f"  Total: {len(RESULTS)} | PASSED: {passed} | FAILED: {failed}\n")
for r in RESULTS:
    if r["status"] == "SUCCESS":
        print(f"  [OK] {r['name']:30s} | {r.get('time_seconds','?'):>5}s | {r['filename']}")
    else:
        print(f"  [XX] {r['name']:30s} | ERROR: {r.get('error','?')}")
print("="*60)
