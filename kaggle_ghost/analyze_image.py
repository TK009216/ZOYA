from PIL import Image
import numpy as np
import sys

path = sys.argv[1] if len(sys.argv) > 1 else "D:\\PICS\\GENERATED\\1.jpg"
img = Image.open(path)
w, h = img.size
pix = np.array(img)
r, g, b = pix[:,:,0], pix[:,:,1], pix[:,:,2]

print("=" * 50)
print("  ZOYA VISION - IMAGE ANALYSIS")
print("=" * 50)

# Basic
orient = "PORTRAIT" if h > w else "LANDSCAPE"
print(f"  SIZE: {w}x{h} ({w*h/1e6:.1f}MP) {orient}")

# Color
print(f"  COLOR: R={r.mean():.0f} G={g.mean():.0f} B={b.mean():.0f}")
bright = pix.mean()
print(f"  BRIGHTNESS: {bright:.0f}/255 ({bright/255*100:.0f}%)")
print(f"  CONTRAST: {pix.std():.0f}")

# Skin detection
skin_r = (r > 60) & (r < 240)
skin_g = (g > 30) & (g < 210)
skin_b = (b > 10) & (b < 190)
skin_warm = (r.astype(int) > g.astype(int) + 5) & (r.astype(int) > b.astype(int) + 10)
skin = skin_r & skin_g & skin_b & skin_warm
skin_pct = skin.sum() / (w * h) * 100

# Flesh detection (broader)
flesh = (r > 70) & (r < 250) & (g > 40) & (g < 220) & (b > 15) & (b < 200)
flesh = flesh & (abs(r.astype(int) - g.astype(int)) < 50)
flesh_pct = flesh.sum() / (w * h) * 100

print(f"  SKIN: {skin_pct:.1f}%")
print(f"  FLESH: {flesh_pct:.1f}%")

# Skin zones (top/mid/bottom)
h3 = h // 3
ts = skin[:h3,:].sum() / (w * h3) * 100
ms = skin[h3:2*h3,:].sum() / (w * h3) * 100
bs = skin[2*h3:,:].sum() / (w * h3) * 100
print(f"  SKIN ZONES: Top={ts:.1f}% Mid={ms:.1f}% Bot={bs:.1f}%")

# Center focus
cx = skin[h//4:3*h//4, w//4:3*w//4].sum() / ((h//2) * (w//2)) * 100
print(f"  SKIN IN CENTER: {cx:.1f}%")

# Lighting
hi = (pix.mean(axis=2) > 200).sum() / (w * h) * 100
sh = (pix.mean(axis=2) < 40).sum() / (w * h) * 100
print(f"  HIGHLIGHTS: {hi:.1f}%")
print(f"  SHADOWS: {sh:.1f}%")
print(f"  MIDTONES: {100-hi-sh:.1f}%")

# Symmetry
left = pix[:,:w//2,:].mean()
right = pix[:,w//2:,:].mean()
sym = 100 - abs(left - right) / max(left, right) * 100 if max(left, right) > 0 else 100
print(f"  SYMMETRY: {sym:.1f}%")

# Warm/cool
wr = r.mean() / g.mean() if g.mean() > 0 else 1
warmth = "WARM" if wr > 1.08 else "COOL" if wr < 0.92 else "NEUTRAL"
print(f"  TEMP: {wr:.2f} ({warmth})")

# Uniqueness
uv = len(np.unique(pix.reshape(-1, 3), axis=0))
print(f"  UNIQUE COLORS: {uv}")
detail = "HIGH (photorealistic)" if uv > 50000 else "MODERATE" if uv > 1000 else "LOW (solid)"
print(f"  DETAIL: {detail}")

# Conclusion
print()
if skin_pct > 25:
    print("  >> CONTENT: SKIN/NSFW LIKELY")
elif flesh_pct > 30:
    print("  >> CONTENT: FLESH/NSFW POSSIBLE")
elif bright < 40:
    print("  >> CONTENT: DARK SCENE")
elif hi > 80:
    print("  >> CONTENT: OVEREXPOSED BRIGHT")
elif uv > 100000:
    print("  >> CONTENT: PHOTOREALISTIC/HIGH DETAIL")
else:
    print("  >> CONTENT: GENERIC")

print("=" * 50)
