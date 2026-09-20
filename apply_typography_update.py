import re

path = 'campaign/shorts-rendered/short13_she_realized/index.html'
with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Update CSS
css_replace = """
      .challenge-hook-layer {
        position: absolute;
        top: 280px;
        left: 155px;
        width: 770px;
        z-index: 12;
      }

      .challenge-hook-headline {
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-size: 160px;
        line-height: 0.85;
        font-weight: 900;
        color: #0E0C0A;
        letter-spacing: -4px;
        text-transform: uppercase;
        margin-bottom: 24px;
      }

      .hook-word {
        display: block;
      }

      .challenge-hook-sub {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 56px;
        font-style: italic;
        color: #821D1A;
        font-weight: 700;
      }
"""
html = re.sub(
    r'\.challenge-hook-layer\s*\{.*?\.challenge-hook-sub\s*\{[^}]*\}',
    css_replace.strip(),
    html,
    flags=re.DOTALL
)

# 2. Update HTML
html_replace = """
      <div class="challenge-hook-layer" id="hookLayer">
        <div class="challenge-hook-headline" id="hookHeadline">
          <div class="hook-word">STOP</div>
          <div class="hook-word">WRITING</div>
        </div>
        <div class="challenge-hook-sub" id="hookSub">
          "she realized"
        </div>
      </div>
"""
html = re.sub(
    r'<div class="challenge-hook-layer" id="hookLayer">.*?</div>\s*</div>',
    html_replace.strip(),
    html,
    flags=re.DOTALL
)

# 3. Update JS Animation
js_setup = """
      // Initial state
      gsap.set("#cardContent", { opacity: 0 });
      gsap.set(".hook-word", { opacity: 0, scale: 0.95 });
      gsap.set("#hookSub", { opacity: 0, y: 15 });
"""
html = re.sub(
    r'// Initial state\s*gsap\.set\("#cardContent", \{ opacity: 0 \}\);',
    js_setup.strip(),
    html
)

js_anim = """
      // 0.0s: The big words punch in (staggered)
      tl.to(".hook-word", { opacity: 1, scale: 1.0, duration: 0.4, ease: "back.out(1.5)", stagger: 0.15 }, 0.0);
      
      // 0.8s: The red italic text drops in
      tl.to("#hookSub", { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, 0.8);
      
      // 1.5s: Flawed sentence slides in
      tl.to("#brokenLayer", { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, 1.5);
"""

# Replace the single line for #brokenLayer at 0.6s with this block
html = re.sub(
    r'// 0\.6s: Flawed sentence slides in immediately \(no dead air!\)\s*tl\.to\("#brokenLayer", \{ opacity: 1, y: 0, duration: 0\.35, ease: "power3\.out" \}, 0\.6\);',
    js_anim.strip(),
    html
)

# 4. Change pill to #13
html = html.replace('WRITING HACK #12', 'WRITING HACK #13')

# Since broken sentence now comes in at 1.5s (instead of 0.6), I should shift everything else by roughly +1s.
# But wait, audio timings:
# "Stop writing: She realized." (0-2s)
# "She realized he had never really loved her." (2-5s)
# So at 1.5s the flawed sentence coming in makes sense.
# Let's adjust the other ones just slightly if needed, but maybe leave them for now.
# Original times: hlBg at 2.5, deleteDirective at 3.5. This is perfect!
# hlBg at 2.5 is right when "She realized he had never really loved her" starts.

with open(path, 'w', encoding='utf-8') as f:
    f.write(html)
