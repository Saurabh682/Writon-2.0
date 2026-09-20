import os
import re

path = 'campaign/shorts-rendered/short13_she_realized/index.html'
with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

html = html.replace('How to Write Anger Without Screaming', 'Stop Writing \
She
Realized\')
html = html.replace('MAKE HER TERRIFYING.', 'STOP WRITING')
html = html.replace('without raising her voice', 'SHE
REALIZED')

html = html.replace('She stared at him, angry and menacing.', 'She realized he had never really loved her.')
html = html.replace('menacing', 'realized')

html = html.replace('She spoke carefully, keeping her hands entirely still.', 'She scrolled his contacts. Three years, and he still had her saved as \\'Priya (work)\\'.')

html = html.replace('Anger is loud. True threat is quiet.', 'Don\\'t announce the realization. Hand over the evidence.')

html = html.replace('short12_cold_anger', 'short13_she_realized')

with open(path, 'w', encoding='utf-8') as f:
    f.write(html)

