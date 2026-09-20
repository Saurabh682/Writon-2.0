import re

path = 'campaign/shorts-rendered/short13_she_realized/index.html'
with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

# I will replace everything from "// 3.6s: Hook & Flawed layer exit smoothly" to the end of the script tag.

new_timeline = """
      // 5.0s: Exit old layers smoothly as narrator says "Now watch the rewrite..."
      tl.to("#hookLayer", { opacity: 0, y: -15, duration: 0.40, ease: "power2.inOut" }, 5.0)
        .to("#brokenLayer", { opacity: 0, y: -15, duration: 0.40, ease: "power2.inOut" }, 5.0);

      // 5.3s: Clean parchment card becomes visible
      tl.to("#cardContent", { opacity: 1, duration: 0.05 }, 5.3)
        .to("#rwLabel", { opacity: 1, y: 0, duration: 0.30, ease: "power2.out" }, 5.4)
        .to("#tl1", { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, 5.8);

      // Cascading rewrite
      tl.to("#tl2", { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, 7.5)
        .to("#tl3", { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, 9.5)
        .to("#tl4", { opacity: 1, y: 0, duration: 0.45, ease: "back.out(1.3)" }, 11.5);

      // 13.5s: Red divider line
      tl.to("#redDivider", { scaleX: 1, duration: 0.35, ease: "power2.out" }, 13.5);

      // 14.5s: "Don't announce the realization."
      tl.to("#pl1", { opacity: 1, y: 0, duration: 0.40, ease: "power3.out" }, 14.5);

      // 17.0s: "Hand over the evidence."
      tl.to("#pl2", { opacity: 1, y: 0, duration: 0.50, ease: "back.out(1.2)" }, 17.0);

      // End of GSAP Timeline
      
      // Auto-start voiceover and timeline
      const audio = document.getElementById("voiceTrack");
      document.body.addEventListener("click", () => {
        audio.currentTime = 0;
        audio.play();
        tl.restart();
      }, { once: true });
"""

html = re.sub(
    r'// 3\.6s: Hook & Flawed layer exit smoothly.*?tl\.restart\(\);\s*\}, \{ once: true \}\);',
    new_timeline.strip(),
    html,
    flags=re.DOTALL
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(html)
