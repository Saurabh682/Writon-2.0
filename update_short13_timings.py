import re

path = 'campaign/shorts-rendered/short13_she_realized/index.html'
with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

# I will just replace the specific tl.to lines manually
replacements = [
    ('tl.to("#hlBg", { scaleX: 1, duration: 0.35, ease: "power2.out" }, 1.8);', 'tl.to("#hlBg", { scaleX: 1, duration: 0.35, ease: "power2.out" }, 2.5);'),
    ('tl.to("#deleteDirective", { opacity: 1, y: 0, duration: 0.30, ease: "back.out(1.4)" }, 2.2);', 'tl.to("#deleteDirective", { opacity: 1, y: 0, duration: 0.30, ease: "back.out(1.4)" }, 3.5);'),
    ('tl.to("#wordFurious", { opacity: 0, scale: 0.8, duration: 0.25, ease: "power2.in" }, 3.0);', 'tl.to("#wordFurious", { opacity: 0, scale: 0.8, duration: 0.25, ease: "power2.in" }, 4.0);'),
    ('tl.to("#hookLayer", { opacity: 0, y: -15, duration: 0.40, ease: "power2.inOut" }, 3.6)', 'tl.to("#hookLayer", { opacity: 0, y: -15, duration: 0.40, ease: "power2.inOut" }, 4.5)'),
    ('tl.to("#cardContent", { opacity: 1, duration: 0.05 }, 3.9)', 'tl.to("#cardContent", { opacity: 1, duration: 0.05 }, 4.8)'),
    ('tl.to("#tl2", { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, 5.4)', 'tl.to("#tl2", { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, 7.5)'),
    ('tl.to("#tl3", { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, 6.8)', 'tl.to("#tl3", { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, 9.5)'),
    ('tl.to("#tl4", { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, 8.0)', 'tl.to("#tl4", { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, 11.5)'),
    ('tl.to("#redDivider", { scaleX: 1, duration: 0.35, ease: "power2.out" }, 9.5);', 'tl.to("#redDivider", { scaleX: 1, duration: 0.35, ease: "power2.out" }, 13.5);'),
    ('tl.to("#pl1", { opacity: 1, y: 0, duration: 0.40, ease: "power3.out" }, 10.0);', 'tl.to("#pl1", { opacity: 1, y: 0, duration: 0.40, ease: "power3.out" }, 14.5);'),
    ('tl.to("#pl2", { opacity: 1, y: 0, duration: 0.50, ease: "back.out(1.2)" }, 12.0);', 'tl.to("#pl2", { opacity: 1, y: 0, duration: 0.50, ease: "back.out(1.2)" }, 17.0);'),
    ('data-duration="16.0"', 'data-duration="22.5"')
]

for old, new in replacements:
    html = html.replace(old, new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(html)
