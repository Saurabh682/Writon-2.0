# WritOn Shorts System & Dual-Franchise Architecture

The WritOn Shorts channel operates on **two distinct editorial franchises sharing one cohesive visual identity**:

| Series | Franchise Name | Core Job | Target Duration | Viewer Reaction |
|---|---|---|---|---|
| **Series A** | **WRITING HACK** | Improve a specific piece of writing | 14–18s | *"That's a useful technique."* |
| **Series B** | **ONE STRANGE IDEA** | Reframe something familiar (tech, reading, culture) | 18–25s | *"Wait… I hadn't thought of it that way."* |

Both franchises share WritOn's official **Warm Parchment visual identity** (`#FAF5EE`), bookish serif/sans typography (`Plus Jakarta Sans` + `Playfair Display`), tactile minimal sound design, and restrained negative space. They are visually differentiated strictly by their top status badge.

---

## 1. Shared Visual System

- **Background Canvas**: Official Warm Coffee Desk parchment (`desk_coffee_card_nobox_4k.jpg` with warm ambient radial gradient).
- **Safe Zone Invariant**: Header elements sit at `top: 172px`. Hook and core content sit at `top: 480px` (optical center), guaranteeing a ~250px vertical buffer so YouTube/Instagram auto-caption stickers (y ≈ 280–380px) never collide with text.
- **Frame 0.0s Static Invariant**: The primary bold hook words must be **statically visible from frame 0.0s** (`opacity: 1`, no initial fade or zoom) so the first frame and feed thumbnail are never empty.
- **Top Pill Differentiation**:
  - Series A: `<div class="inversion-pill">WRITING HACK #XX</div>` (Terracotta `#7D1B17` / `#821D1A`)
  - Series B: `<div class="inversion-pill">ONE STRANGE IDEA #XX</div>` (Terracotta `#7D1B17` / `#821D1A`)
- **Brand Mark**: `Writ<em>On</em><span>.</span>` top-right.
- **Footer**: `@writon_app` • dots • `writon.cc ↗`.

---

## 2. Series A: WRITING HACK

### Purpose & Promise
*"Give me 15 seconds and I will improve this sentence."* Demonstrates concrete writing mechanics through inferential transformation.

### Core Structure
`Challenge → Weak Example → Isolate Exact Flaw → Short Command → Visible Transformation → Craft Principle`

### Retention Grammar & 15-Second Pacing Rhythm
| Timing | Beat | Purpose |
|---|---|---|
| **0:00–0:01.2** | Hook | Stop the swipe (bold 3-word giant static text) |
| **0:01.2–0:02.5** | Weak line / setup | Establish the problem immediately |
| **0:02.5–0:03.5** | Highlight flaw | Direct viewer focus (surgical yellow highlighter) |
| **0:03.5–0:04.2** | Command badge | `DELETE THE EMOTION.` / `CUT THIS WORD.` |
| **0:04.2–0:08.5** | Rewrite builds | Step-by-step mini reveal (Category pill + Line 1 simultaneous) |
| **0:08.5–0:11.5** | Let line land | Emotional and technical recognition |
| **0:11.5–0:15.5** | Principle | Compact craft maxim / ending principle + clean hold |

### YouTube Metadata vs Frame-Zero Generator Contract
To prevent search phrasing from degrading the opening hook, every Short treats search intent and frame-zero behavior as independent dimensions:
```text
SEARCH_TITLE: How to Write Grief Without Saying "Sad"
FRAME_ZERO_HOOK: MAKE THIS HURT.
HOOK_ARCHETYPE: challenge (Constraint)
```

> **The Operating Rule**: *SEO title gets the search. Frame zero gets the stop. The transformation gets the watch. The payoff gets the follow.*

### Hook Archetype Telemetry Schema
For every published Short, log the following telemetry to compare archetype efficacy after 8–12 videos:
```text
SHORT_ID: short_15
HOOK_ARCHETYPE: constraint_challenge
FRAME_ZERO_TEXT: MAKE THIS HURT. / without naming the grief
VIEWED_VS_SWIPED: [track %]
APV: [track %]
AVG_VIEW_DURATION: [track s]
LIKES: [count]
COMMENTS: [count]
REWATCH_SIGNAL: [>100% APV threshold]
```

### Hook Archetypes for Controlled Testing (4:1 Ratio)
Maintain a strict **4:1 ratio (Writing Hack : One Strange Idea)** while varying only one major variable (hook family):
1. **Challenge Hooks** (e.g. `MAKE HER TERRIFYING.`, `MAKE THIS HURT.`)
2. **Prohibition / Diagnostic Hooks** (e.g. `STOP WRITING "SHE REALIZED."`)
3. **Story-First Hooks** (e.g. `THE CLOSET WAS EMPTY. THE HANGERS WERE STILL MOVING.`)
4. **Comparison Hooks** (e.g. `WHICH VERSION HURTS MORE?`)

### Sound Palette
- Tactile mechanical clicks (`deadbolt_click` / `sfx_click.wav`)
- Fountain pen scratch / pencil strike
- Page turns / paper movement
- Ambient piano (`volume <= 0.035`)

---

## 3. Series B: ONE STRANGE IDEA

### Purpose & Promise
*"Something familiar is stranger than it looks."* Broad intellectual inquiry into reading, technology, culture, software, and digital life.

### Core Structure
`Strange Fact → Contradiction → Evidence → Interpretation → Insight / Question`

### Retention Grammar
- **0–3 sec**: Hook containing tension, paradox, or unresolved question. Never open with a topic label (*"AI Coding Fatigue"*).
- **3–8 sec**: Contradiction established.
- **8–14 sec**: Concrete evidence / contrast.
- **14–20 sec**: The Reversal / Shift.
- **20–25 sec**: Closing insight or open question.

### Screen Design Rule: One Thought Per Screen
- Never create a slide presentation or paragraph wall.
- **Voiceover carries the reasoning and nuance.**
- **Screen text carries the compressed punchline.**

### Ending Modes (Rotate across 4 modes; avoid mandatory quote-card aphorisms)
1. **Insight**: *"The bottleneck moved."*
2. **Practical Principle**: *"Your device first. The cloud second."*
3. **Question**: *"So what exactly are people queuing for?"*
4. **Hard Stop**: End cleanly on the revealing fact without commentary.

### Sound Palette
- Mechanical keyboard taps
- Notification cascades / sync chime
- Book cover opening / closing
- Quiet ambient hum / piano

---

## 4. Master Topic & Pipeline Registry

### Series A: WRITING HACK
- [x] **#11**: Physical action replaces adverb (*"Quietly"* / `MAKE THIS LINE FEEL DANGEROUS`)
- [x] **#12**: Controlled domestic behavior replaces named anger (*"Furious"* / `MAKE HER TERRIFYING`)
- [x] **#13**: Concrete evidence replaces stated realization (*"She Realized"* / `STOP WRITING "SHE REALIZED"`)
- [x] **#14**: Compulsive behavior replaces named jealousy (*"Jealous"* / `MAKE JEALOUSY VISIBLE`)
- [x] **#15**: Sound & tactile omission replaces named grief (*"Devastated"* / `MAKE THIS HURT`) — *Published*
- [x] **#16**: Subtext & physical resistance replaces dialogue explanation (*"I don't love you anymore"* / `SAY IT WITHOUT SAYING IT`) — *Rendered & Ready*
- [x] **#17**: Avoidance gesture replaces named guilt (*"Guilty"* / `MAKE GUILT VISIBLE`) — *Rendered & Ready (20s calibrated)*

### Series B: ONE STRANGE IDEA
- [ ] **#01 — AI Engineering**: `AI CAN WRITE THE CODE. WHO READS IT?`
  - Thesis: When generation becomes free, the verification tax becomes infinite. The bottleneck moved from writing code to trusting it.
- [ ] **#02 — Reading & Print**: `GEN Z GREW UP ON SCREENS. WHY ARE THEY CHOOSING PAPER?`
  - Thesis: Screens demand, notify, and track. Paper does nothing until you return. Screens are making print desirable again.
- [ ] **#03 — Consumer Psychology**: `THE PHONE CAN COME TO YOU. WHY QUEUE FOR HOURS?`
  - Thesis: Delivery optimizes ownership; the queue optimizes participation and status. Inconvenience is part of the product.
- [ ] **#04 — Silent Book Clubs**: `THE NEW SOCIAL ACTIVITY? NOT TALKING.`
  - Thesis: In an attention economy of constant conversational performance, shared silence is the rarest communal luxury.
- [ ] **#05 — Local-First Software**: `WHY DOES YOUR APP NEED THE INTERNET TO SHOW YOUR OWN DATA?`
  - Thesis: Cloud centralization turned users into tenants of their own work. Software should survive its server.
