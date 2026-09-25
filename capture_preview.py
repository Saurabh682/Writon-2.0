import asyncio
from playwright.async_api import async_playwright
import os

frames = [0.0, 0.4, 0.8, 1.5, 2.2, 4.2, 8.8, 12.5]
html_path = "file:///d:/VibeCode/WritOn-PowerUp/campaign/shorts-rendered/short13_she_realized/index.html"
out_dir = "C:/Users/Kumar/.gemini/antigravity/brain/269e3b50-9933-4ab2-aeee-17be6b6fa527"

async def capture_frames():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1080, "height": 1920})
        await page.goto(html_path)
        await page.wait_for_timeout(1000)

        for t in frames:
            await page.evaluate(f"if (window.__timelines && window.__timelines.main) {{ window.__timelines.main.seek({t}); window.__timelines.main.pause(); }}")
            await page.wait_for_timeout(150)
            out_file = f"{out_dir}/short13_autocaption_fix_{str(t).replace('.', '_')}s.jpg"
            await page.screenshot(path=out_file, type='jpeg', quality=85)
            print(f"Captured {out_file}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(capture_frames())
