import math
import os
from PIL import Image, ImageDraw, ImageFilter

def create_flame_mask(size, scale=1.0, offset_y=0):
    """
    Renders an organic, ultra-smooth flame silhouette at given size.
    Uses parametric bezier-like sampling at supersampled resolution.
    """
    w, h = size
    mask = Image.new('L', (w, h), 0)
    draw = ImageDraw.Draw(mask)
    
    cx = w / 2.0
    cy = h / 2.0 + offset_y
    base_r = (min(w, h) * 0.30) * scale
    
    # Generate flame outline points
    points = []
    # Bottom round bulb of the flame
    steps = 120
    for i in range(steps + 1):
        # Angle from ~0.15*pi to 0.85*pi (bottom semicircle)
        theta = math.pi * 0.15 + (math.pi * 0.70) * (i / steps)
        # Squeeze slightly wider on sides, rounded bottom
        rx = base_r * 1.08
        ry = base_r * 1.15
        px = cx + rx * math.cos(theta)
        py = cy + ry * math.sin(theta)
        points.append((px, py))
        
    # Right flick curve going up to the top tip
    # Tip is at (cx + base_r * 0.12, cy - base_r * 1.65)
    tip_x = cx + base_r * 0.08
    tip_y = cy - base_r * 1.65
    
    # Right side ascending curve (quadratic bezier from right bulb to tip)
    p0 = points[-1]
    p1 = (cx + base_r * 1.1, cy - base_r * 0.4)
    p2 = (tip_x + base_r * 0.35, tip_y + base_r * 0.4)
    p3 = (tip_x, tip_y)
    
    for t_step in range(1, 41):
        t = t_step / 40.0
        # Cubic Bezier
        bx = (1-t)**3 * p0[0] + 3*(1-t)**2*t * p1[0] + 3*(1-t)*t**2 * p2[0] + t**3 * p3[0]
        by = (1-t)**3 * p0[1] + 3*(1-t)**2*t * p1[1] + 3*(1-t)*t**2 * p2[1] + t**3 * p3[1]
        points.append((bx, by))
        
    # Left side descending curve (with an inner cute flame tongue/flick)
    # Tip to left bulb
    p_left = points[0]
    p1_l = (tip_x - base_r * 0.28, tip_y + base_r * 0.5)
    p2_l = (cx - base_r * 1.05, cy - base_r * 0.4)
    p3_l = p_left
    
    for t_step in range(1, 41):
        t = t_step / 40.0
        bx = (1-t)**3 * tip_x + 3*(1-t)**2*t * p1_l[0] + 3*(1-t)*t**2 * p2_l[0] + t**3 * p3_l[0]
        by = (1-t)**3 * tip_y + 3*(1-t)**2*t * p1_l[1] + 3*(1-t)*t**2 * p2_l[1] + t**3 * p3_l[1]
        points.append((bx, by))
        
    draw.polygon(points, fill=255)
    return mask

def draw_star(draw, cx, cy, r_outer, r_inner, fill):
    points = []
    for i in range(8):
        angle = i * math.pi / 4 - math.pi / 2
        r = r_outer if i % 2 == 0 else r_inner
        points.append((cx + r * math.cos(angle), cy + r * math.sin(angle)))
    draw.polygon(points, fill=fill)

def render_streak_logo(canvas_size=2048, is_splash=False, is_adaptive=False):
    """
    Renders high-resolution cute flame logo.
    """
    S = canvas_size
    img = Image.new('RGBA', (S, S), (15, 23, 42, 255) if (not is_splash and not is_adaptive) else (0, 0, 0, 0))
    
    # Subtle ambient glow layer
    glow = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    cx, cy = S // 2, S // 2 + int(S * 0.02)
    
    glow_r = int(S * 0.38)
    glow_draw.ellipse(
        [cx - glow_r, cy - glow_r, cx + glow_r, cy + glow_r],
        fill=(255, 122, 0, 85)
    )
    glow = glow.filter(ImageFilter.GaussianBlur(radius=int(S * 0.12)))
    img = Image.alpha_composite(img, glow)
    
    # 1. Outer Flame (Crimson-Orange)
    flame_outer_mask = create_flame_mask((S, S), scale=1.0, offset_y=int(S * 0.03))
    
    # Create smooth vertical gradient for outer flame
    outer_grad = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    top_color = (255, 75, 75)      # Duolingo / Coral Red
    mid_color = (255, 120, 0)      # Saturated Tangerine
    bot_color = (255, 170, 0)      # Warm Golden Orange
    
    grad_draw = ImageDraw.Draw(outer_grad)
    for y in range(S):
        factor = y / S
        if factor < 0.5:
            t = factor / 0.5
            r = int(top_color[0] + (mid_color[0] - top_color[0]) * t)
            g = int(top_color[1] + (mid_color[1] - top_color[1]) * t)
            b = int(top_color[2] + (mid_color[2] - top_color[2]) * t)
        else:
            t = (factor - 0.5) / 0.5
            r = int(mid_color[0] + (bot_color[0] - mid_color[0]) * t)
            g = int(mid_color[1] + (bot_color[1] - mid_color[1]) * t)
            b = int(mid_color[2] + (bot_color[2] - mid_color[2]) * t)
        grad_draw.line([(0, y), (S, y)], fill=(r, g, b, 255))
        
    outer_flame = Image.composite(outer_grad, Image.new('RGBA', (S, S), (0, 0, 0, 0)), flame_outer_mask)
    img = Image.alpha_composite(img, outer_flame)
    
    # 2. Mid Flame (Warm Golden Amber)
    flame_mid_mask = create_flame_mask((S, S), scale=0.72, offset_y=int(S * 0.10))
    mid_grad = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    mid_draw = ImageDraw.Draw(mid_grad)
    for y in range(S):
        factor = y / S
        r = 255
        g = int(145 + factor * 60)
        b = int(10 + factor * 20)
        mid_draw.line([(0, y), (S, y)], fill=(r, g, b, 255))
    mid_flame = Image.composite(mid_grad, Image.new('RGBA', (S, S), (0, 0, 0, 0)), flame_mid_mask)
    img = Image.alpha_composite(img, mid_flame)
    
    # 3. Inner Core Flame (Bright Lemon Light)
    flame_inner_mask = create_flame_mask((S, S), scale=0.45, offset_y=int(S * 0.16))
    inner_flame = Image.new('RGBA', (S, S), (255, 245, 140, 255))
    inner_flame = Image.composite(inner_flame, Image.new('RGBA', (S, S), (0, 0, 0, 0)), flame_inner_mask)
    img = Image.alpha_composite(img, inner_flame)
    
    # 4. Cute playful mascot details: sparkling eyes & smile!
    details = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d_draw = ImageDraw.Draw(details)
    
    eye_y = cy + int(S * 0.08)
    eye_lx = cx - int(S * 0.08)
    eye_rx = cx + int(S * 0.08)
    eye_r = int(S * 0.024)
    
    # Eyes
    d_draw.ellipse([eye_lx - eye_r, eye_y - eye_r * 1.3, eye_lx + eye_r, eye_y + eye_r * 1.3], fill=(45, 20, 10, 240))
    d_draw.ellipse([eye_rx - eye_r, eye_y - eye_r * 1.3, eye_rx + eye_r, eye_y + eye_r * 1.3], fill=(45, 20, 10, 240))
    
    # Eye shines (white dots)
    shine_r = int(eye_r * 0.42)
    d_draw.ellipse([eye_lx - shine_r + 2, eye_y - eye_r - 2, eye_lx + shine_r + 2, eye_y - eye_r + 2*shine_r], fill=(255, 255, 255, 255))
    d_draw.ellipse([eye_rx - shine_r + 2, eye_y - eye_r - 2, eye_rx + shine_r + 2, eye_y - eye_r + 2*shine_r], fill=(255, 255, 255, 255))
    
    # Cute little smile arc
    mouth_y = eye_y + int(S * 0.04)
    mouth_w = int(S * 0.038)
    d_draw.arc([cx - mouth_w, mouth_y - mouth_w, cx + mouth_w, mouth_y + mouth_w], start=10, end=170, fill=(45, 20, 10, 240), width=int(S * 0.007))
    
    # Cheerful pink cheek blush
    blush_r = int(S * 0.026)
    d_draw.ellipse([eye_lx - int(S*0.04) - blush_r, eye_y + int(S*0.025) - blush_r, eye_lx - int(S*0.04) + blush_r, eye_y + int(S*0.025) + blush_r], fill=(255, 100, 120, 110))
    d_draw.ellipse([eye_rx + int(S*0.04) - blush_r, eye_y + int(S*0.025) - blush_r, eye_rx + int(S*0.04) + blush_r, eye_y + int(S*0.025) + blush_r], fill=(255, 100, 120, 110))
    
    # Playful golden sparkles
    draw_star(d_draw, cx + int(S * 0.28), cy - int(S * 0.18), int(S * 0.055), int(S * 0.02), (255, 240, 120, 245))
    draw_star(d_draw, cx - int(S * 0.26), cy + int(S * 0.05), int(S * 0.04), int(S * 0.015), (255, 240, 120, 240))
    draw_star(d_draw, cx + int(S * 0.22), cy + int(S * 0.22), int(S * 0.035), int(S * 0.012), (255, 255, 255, 230))
    
    img = Image.alpha_composite(img, details)
    return img

if __name__ == '__main__':
    print('Generating brand assets...')
    os.makedirs('assets', exist_ok=True)
    
    # 1. Main App Icon (1024x1024)
    print('- Rendering icon.png...')
    icon_high = render_streak_logo(canvas_size=2048, is_splash=False)
    icon_final = icon_high.resize((1024, 1024), Image.Resampling.LANCZOS)
    icon_final.save('assets/icon.png', 'PNG', optimize=True)
    
    # 2. Splash Icon (1024x1024, transparent)
    print('- Rendering splash-icon.png...')
    splash_high = render_streak_logo(canvas_size=2048, is_splash=True)
    splash_final = splash_high.resize((1024, 1024), Image.Resampling.LANCZOS)
    splash_final.save('assets/splash-icon.png', 'PNG', optimize=True)
    
    # 3. Android Adaptive Foreground (512x512, transparent, with safe margins)
    print('- Rendering android-icon-foreground.png...')
    fg_high = render_streak_logo(canvas_size=2048, is_adaptive=True)
    fg_final = fg_high.resize((512, 512), Image.Resampling.LANCZOS)
    fg_final.save('assets/android-icon-foreground.png', 'PNG', optimize=True)
    
    # 4. Android Adaptive Background (512x512 solid #0F172A)
    print('- Rendering android-icon-background.png...')
    bg = Image.new('RGBA', (512, 512), (15, 23, 42, 255))
    bg.save('assets/android-icon-background.png', 'PNG', optimize=True)
    
    # 5. Favicon (48x48)
    print('- Rendering favicon.png...')
    fav = icon_final.resize((48, 48), Image.Resampling.LANCZOS)
    fav.save('assets/favicon.png', 'PNG', optimize=True)
    
    print('All brand assets successfully generated without wireframes or web artifacts!')
