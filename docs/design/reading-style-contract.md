# WritOn reading style contract

The Android reader, React reader, and public share page use the same editorial defaults. Platform-specific controls may override these values for accessibility, but a story with default settings must retain the same hierarchy and rhythm everywhere.

| Element | Canonical treatment |
| --- | --- |
| Reading face | Source Serif 4, regular |
| Body | 20sp/px, 1.6 line height |
| Paragraph gap | 1.25em |
| First paragraph | 2.8em drop cap when it begins with plain text |
| H1 | 1.8× body, semibold |
| H2 | 1.4× body, semibold |
| H3–H6 | 1.1× body, semibold |
| Quote | Italic body text with a 3px terracotta left rule |
| Lists | Body typography, 0.5em item rhythm, visible bullet/number |
| Divider | One-pixel neutral rule |

The app parser and both web renderers must preserve paragraphs, headings, ordered and unordered lists, quotes, inline emphasis, and dividers. New formatting features should be added to all three surfaces in the same change.
