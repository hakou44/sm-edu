"""Génère les icônes de SM SCHOOL AI (web/PWA + sources Android pour @capacitor/assets)."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os, sys

S = 4  # supersampling
N = 1024
NAVY = (16, 42, 67)
TEAL = (0, 168, 150)
GOLD = (255, 196, 61)
WHITE = (255, 255, 255)

def gradient(size):
    img = Image.new("RGB", (size, size))
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * size)
            px[x, y] = tuple(int(NAVY[i] * (1 - t) + TEAL[i] * t) for i in range(3))
    return img

def find_font(size):
    for p in ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
              "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"]:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

def foreground(size=N, scale=1.0):
    """Motif centré sur fond transparent (zone sûre ~66% pour l'icône adaptative)."""
    W = size * S
    img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c = W / 2
    k = W / 1024 * scale
    def P(x, y): return (c + (x - 512) * k, c + (y - 512) * k)
    # toque de diplômé
    d.polygon([P(512, 300), P(800, 410), P(512, 520), P(224, 410)], fill=WHITE)
    d.polygon([P(330, 470), P(330, 560), P(512, 620), P(694, 560), P(694, 470), P(512, 540)], fill=(220, 232, 240))
    d.line([P(790, 418), P(790, 560)], fill=GOLD, width=int(12 * k))
    d.ellipse([P(772, 556), P(808, 592)], fill=GOLD)
    # monogramme SM
    f = find_font(int(250 * k))
    text = "SM"
    bb = d.textbbox((0, 0), text, font=f)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    d.text((c - tw / 2 - bb[0], P(0, 640)[1] - bb[1]), text, font=f, fill=WHITE)
    # étincelle IA
    sx, sy, r = P(745, 270)[0], P(745, 270)[1], 62 * k
    d.polygon([(sx, sy - r), (sx + r * .28, sy - r * .28), (sx + r, sy), (sx + r * .28, sy + r * .28),
               (sx, sy + r), (sx - r * .28, sy + r * .28), (sx - r, sy), (sx - r * .28, sy - r * .28)], fill=GOLD)
    return img.resize((size, size), Image.LANCZOS)

def rounded_icon(size=N):
    bg = gradient(size).convert("RGBA")
    bg.alpha_composite(foreground(size))
    mask = Image.new("L", (size * S, size * S), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size * S - 1, size * S - 1], radius=int(size * S * 0.22), fill=255)
    mask = mask.resize((size, size), Image.LANCZOS)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(bg, (0, 0), mask)
    return out

def maskable(size=512):
    bg = gradient(size).convert("RGBA")
    bg.alpha_composite(foreground(size, scale=0.78))  # zone sûre
    return bg

if __name__ == "__main__":
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    web = os.path.join(root, "web", "icons"); assets = os.path.join(root, "assets")
    os.makedirs(web, exist_ok=True); os.makedirs(assets, exist_ok=True)
    base = rounded_icon(N)
    for s in (192, 512):
        base.resize((s, s), Image.LANCZOS).save(os.path.join(web, f"icon-{s}.png"))
    maskable(512).save(os.path.join(web, "icon-maskable-512.png"))
    base.resize((180, 180), Image.LANCZOS).save(os.path.join(web, "apple-touch-icon.png"))
    base.resize((48, 48), Image.LANCZOS).save(os.path.join(web, "favicon.png"))
    # sources pour @capacitor/assets (Android)
    gradient(N).save(os.path.join(assets, "icon-background.png"))
    foreground(N, scale=0.78).save(os.path.join(assets, "icon-foreground.png"))
    base.save(os.path.join(assets, "icon-only.png"))
    print("OK")
