import re

path = 'campaign/shorts-rendered/short13_she_realized/index.html'
with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

# Replace hook
html = re.sub(r'<div class="challenge-hook-headline" id="hookHeadline">\s*Make her terrifying\.\s*</div>',
              '<div class="challenge-hook-headline" id="hookHeadline">\n          STOP WRITING\n        </div>', html)
html = re.sub(r'<div class="challenge-hook-sub" id="hookSub">\s*"SHE REALIZED"\s*</div>',
              '<div class="challenge-hook-sub" id="hookSub">\n          "SHE REALIZED"\n        </div>', html)

# Broken sentence
html = re.sub(r'<span class="broken-line-1">\s*She was\s*<span class="highlight-word" id="wordFurious">\s*furious\s*<span class="highlight-bg" id="hlBg"></span>\s*</span>\s*at him\s*</span>',
              '<span class="broken-line-1">\n          She <span class="highlight-word" id="wordFurious">realized<span class="highlight-bg" id="hlBg"></span></span>\n        </span>', html)

html = re.sub(r'<span class="broken-line-2">for lying\.</span>',
              '<span class="broken-line-2">he had never really loved her.</span>', html)

# Delete directive
html = re.sub(r'<span>Delete the emotion\.</span>', '<span>Delete the realization.</span>', html)

# Repaired text
html = re.sub(r'<span class="keep-pill">Lethal Restraint</span>', '<span class="keep-pill">The Evidence</span>', html)

html = re.sub(r'<div class="title-row" id="tl1">She refolded his napkin</div>', '<div class="title-row" id="tl1">She scrolled his contacts.</div>', html)
html = re.sub(r'<div class="title-row" id="tl2">into a sharp triangle,</div>', '<div class="title-row" id="tl2">Three years, and he</div>', html)
html = re.sub(r'<div class="title-row" id="tl3">and slid the salt cellar</div>', '<div class="title-row" id="tl3">still had her saved as</div>', html)
html = re.sub(r'<div class="title-row" id="tl4"><span class="italic-crimson">two inches left\.</span></div>', '<div class="title-row" id="tl4"><span class="italic-crimson">\'Priya (work)\'.</span></div>', html)

# Payoff
html = re.sub(r'<div class="payoff-lead" id="pl1">Loud anger makes noise\.</div>', '<div class="payoff-lead" id="pl1">Don\'t announce the realization.</div>', html)
html = re.sub(r'<div class="payoff-punch" id="pl2">Lethal anger organizes the room\.</div>', '<div class="payoff-punch" id="pl2">Hand over the evidence.</div>', html)

with open(path, 'w', encoding='utf-8') as f:
    f.write(html)
