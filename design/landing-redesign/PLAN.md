# PLWM-MCC Landing Page Redesign Plan

Status: PROPOSAL (mockup at `design/landing-redesign/index.html`, served at http://localhost:4173)
Scope: visual + motion overhaul of the public landing page only. Routes, nav labels, content, SEO structure, and all backend integrations are preserved.

---

## 1. Design Read

Redesign (visual overhaul, content preserved) of a church landing page for the Manila/Parañaque
congregation and first-time visitors, with a reverent editorial language, leaning toward native
CSS, typography-led layout, and restrained scroll parallax.

Dials: DESIGN_VARIANCE 7 · MOTION_INTENSITY 6 · VISUAL_DENSITY 3

Direction name: **Quiet Cathedral**. Warm light paper base, ink-navy typography (the existing
brand navy promoted to the ink role), existing brand gold as the single accent, one dark
scripture interlude as the page's single color-block moment. Architectural arch motif for media
panels. Sharp corners everywhere else.

---

## 2. Audit of the current page (what reads as slop)

Structure (`cms-frontend/src/pages/public/HomePage.jsx`, 515 lines, all inline styles):

| # | Finding | Why it hurts |
|---|---|---|
| 1 | Hero stacks 5+ text blocks: pill badge, headline, tagline, verse, community line, glass stat box, 2 CTAs, scroll cue | Hero stack discipline blown; nothing breathes |
| 2 | YouTube loop shows burned-in captions ("[music]", banner text) under an 88% flat navy overlay | Video reads as a murky smudge; the loop seek hack (3:47–4:09, 500ms polling) is fragile |
| 3 | "SCROLL" cue + bouncing arrow | Dead pattern; users know how to scroll |
| 4 | Pulsing gold dot in the pill + animated bounce | Ornament motion with no communication job |
| 5 | 4 identical gathering cards, each with 3 uppercase micro-labels in 4 different colors (red/blue/purple/orange) | Rainbow accents, equal-card grid, 10px type |
| 6 | Same eyebrow pattern (dash + uppercase) above every section | Templated rhythm, the #1 AI tell |
| 7 | Zigzag pairs: seminar (text+3 equal cards), mission (text+navy box) | Repeated layout family; 3-equal-cards twice |
| 8 | White → gray → white → gray → navy section flipping | No theme lock; page feels stitched together |
| 9 | Pills overlaid on event card thumbnails; per-card "Learn More" buttons | Pills-on-images tell; 4 duplicate CTA intents on one page |
| 10 | Decorative gold dots on CTA bullets | Semantic-less dots |
| 11 | Em-dashes used as separators throughout copy | Signature LLM tell |
| 12 | html { overflow-x: hidden } breaks programmatic scroll/sticky (found during audit) | Platform bug to fix regardless of design |

What is worth keeping: navy + gold brand, Lora-era serif instinct (upgraded), the live events
API surface, the hero video (real church footage), the real building photos in `public/`
(mcc.jpg, church.webp), all actual content: schedule, phones, address, verse, vision line.

---

## 3. Design tokens

```
Paper        #F4F5F2   (cool neutral paper, page base)
Panel        #FFFFFF   (cards/panels only where elevation is earned)
Ink          #0B2447   (brand navy, all primary text on light)
Ink-deep     #071830   (dark scripture block background)
Muted        #5C6570   (secondary text on light, AA on paper)
Hairline     #D9DDE2   (1px rules)
Gold         #C9A84C   (ornament only on light: rules, numerals, marks)
Gold-text    #8A6B21   (gold as text on light, AA at small sizes)
Gold-bright  #E6C878   (gold as text on dark, AA)
```

- One accent (gold). Blue #1565C0 is retired from the landing page.
- Language tags PH/KR become 1px-bordered quiet tags, monochrome.
- Type: **Cormorant Garamond** (display + scripture italic; justified: liturgical heritage
  institution, high-contrast serif in the manuscript tradition; replaces Lora) + **Archivo**
  (UI/body; replaces Inter). React implementation self-hosts both via @font-face
  (font-display: swap); the static mockup links Google Fonts for speed.
- Radius system: **all-sharp (0)** everywhere, with one documented exception: media panels use
  the cathedral arch (border-radius: 999px 999px 0 0). Nothing else is rounded.
- Shadows: none on light sections except one tinted navy ambient shadow on the hero media arch.
- Theme lock: light paper for the whole page; exactly ONE dark block (scripture interlude).

---

## 4. Section plan (content preserved, layout rebuilt)

1. **Nav** (64px, single line, paper bg, hairline bottom)
   Keep: logo, Bible Seminar, Sermon, World Mission, Introduction, EN, Member Login.
2. **Hero, asymmetric split 7/5**
   - Left: small-caps "Philippine Life Word Mission" (plain, no pill, no dot);
     headline "Welcome to Our Church" in display serif, 2 lines; subtext = Psalm 118:17 verse
     (13 words, italic); CTAs: [Become a Member] primary ink, [Watch Sermon] ghost.
     Max 4 text elements. CTA label unified page-wide (no more Join/Learn More duplication).
   - Right: cathedral-arch panel with the existing muted YouTube loop, slight ink tint
     (35%, not 88%), thin gold inner rule. Panel drifts at 0.85x scroll (parallax layer 1).
   - Removed: scroll cue, stat box, extra paragraphs, pulsing dot.
3. **Stats band** (replaces PLWM banner strip + scattered stat boxes)
   Hairline top + bottom; lead line "The mother church of Philippine Life Word Mission";
   four typographic numerals, no cards: 17 Active Cellgroups (live from API) · 108 PLWM
   Churches · 60 Mission Branches · 3 Major Islands. Tabular numerals in Cormorant, gold
   hairline separators.
4. **Gatherings, editorial timetable** (kills the 4-card grid)
   Grouped by day: Sunday / Wednesday / Saturday as functional group headers.
   Each row: time (tabular, left) · service name (serif) · pastor + hall (right, muted).
   PH/KR quiet tags. Sparse hairlines (per group, not per row). Hover: ink-wash row tint.
5. **Events, live section** (API preserved)
   One small-caps header + a single live indicator dot (real semantic state: live data);
   helper line "Posted by the registration team and admins."
   Cards: horizontal scroll-snap; big date numeral, serif title, location; whole card is the
   link; no pills on thumbnails, no per-card buttons. Empty state: quiet italic line.
6. **Bible Seminar, asymmetric split (flipped: media-left rhythm broken by index-right)**
   Left: headline "Are you looking for answers about life and eternal life?", copy, CTA
   "View the five sessions" to /bible-seminar. The three affirmations (Prove / Testify /
   Preach) as a compact hairline list, no icon boxes.
   Right: the 5 sessions as an editorial index: large ghost numerals 01–05, hairline between
   rows. This is the section that replaces the numbered navy pills.
7. **Scripture interlude (the one dark block)**
   Full-bleed Ink-deep. Giant verse in Cormorant italic (drifts at 0.85x, parallax layer 2),
   "PSALM 118:17" in gold-bright small caps. Below: the mother-church paragraph and the vision
   line kept verbatim ("Vision 26/800 · Love One Another · One Mind | Obedience | Sacrifice").
8. **Leadership & Visit, split**
   Left: leadership list (name serif, role small caps, phone tabular link), hairline rows.
   Right: church.webp in a second arch panel with parallax (layer 3), address, landline,
   YouTube/Facebook/jbch.org as text links.
9. **CTA band**
   "Become a Member" display serif, one line of copy (absorbs the three gold-dot bullets),
   single gold-bordered ink button "Become a Member" to /introduction.
10. **Footer**
    Same real info, re-typeset into 3 columns: brand line / service times / contact + links.
    © 2026 line. No version strings, no added strips.

Eyebrow count: hero small-caps line + seminar small-caps header = 2 of 9 sections (budget 3).

---

## 5. Motion & parallax spec

Principle: every animation communicates (depth, sequence, or live-ness). Nothing loops except
the hero video itself. All motion collapses under prefers-reduced-motion.

| Layer | Effect | Mockup tech | React tech |
|---|---|---|---|
| Hero media arch | translateY drift 0→-10% as page scrolls away; hero copy fades/lifts 0→-24px | CSS `animation-timeline: scroll()` | Motion `useScroll` + `useTransform` |
| Scripture verse | Drifts up 6% slower than scroll inside its block | CSS `animation-timeline: view()` | same pattern |
| Visit photo arch | 4% counter-drift (depth against scroll direction) | CSS `view()` | same |
| Section reveals | opacity 0→1, y 24→0, 0.7s cubic-bezier(0.16,1,0.3,1), 60ms stagger | IntersectionObserver + `.in` class | Motion `whileInView` |
| Row hovers | background tint only (no translate) | CSS :hover | CSS |
| Live dot | none (static green dot, real state) | CSS | CSS |

Hard rules honored: no window scroll listeners, animate transform/opacity only, reveals fire
once, marquee count 0, no scroll hijack.

---

## 6. React implementation map (after mockup approval)

- Files: rework `src/pages/public/HomePage.jsx` (split inline styles into a
  `homePage.css`), keep `PublicLayout.jsx` nav/footer routes untouched.
- New dependency: `motion` (for useScroll/whileInView). Icons: `@phosphor-icons/react`
  (play, map-pin, phone only). Fonts: self-host Cormorant Garamond + Archivo woff2 in
  `public/fonts` with @font-face; remove Google Fonts <link> from index.html.
- Data: `/public/stats` fetch unchanged; events carousel unchanged logic, new skin.
- Hero video: keep YT IFrame API loop (extract start/end to constants), add poster fallback.
- Fix regardless of design: html overflow-x quirk (move overflow-x hidden to body-level
  wrapper or use `overflow-x: clip`), so programmatic scroll + sticky work.
- SEO: same single <h1>, same route slugs, meta/OG untouched, alt text on the two photos.
- Performance: two webp/jpg photos + one YouTube embed; no new heavy deps beyond motion;
  parallax via transform-only. LCP = hero media panel (poster + preload).

## 7. Deliberately out of scope

Other public pages (Bible Seminar, Sermon, World Mission, Introduction), member portal,
admin UI. Nav/footer stay functional but only the landing page gets the new design language
in this pass.
