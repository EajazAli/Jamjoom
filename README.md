# Jamjoom Printing & Packaging — site rebuild

Drop-in replacement for the `jamjoom-web` GitHub Pages repo.

## Deploy
1. Copy everything in this folder into the repo root, overwriting `index.html`, `process.html`, `solution.html`, `color.html` and `about.html`.
2. The project is self-contained: every image and video the pages use is inside `assets/`. The old `Images/`, `videos/`, `css/`, `js/`, `fonts/` folders, `style.css` and `technology.html` are no longer referenced and can be deleted.
3. Commit and push. Nothing to build; it is plain HTML/CSS/JS.

## Languages
- English pages are at the root, Arabic pages in `ar/` (same file names, `lang="ar" dir="rtl"`).
- First visit: a browser set to Arabic is sent to the Arabic version, everyone else gets English. The header and menu toggle switches language and saves the choice (`localStorage` key `jpp-lang`), and a saved choice always wins over the browser language.
- Arabic uses IBM Plex Sans Arabic, self-hosted in `assets/fonts/` (SIL Open Font License included).
- Each page declares its `hreflang` alternates using `https://eajazali.github.io/jamjoom-web/`. If the site moves to a custom domain, search-and-replace that URL in the ten HTML files.
- To change Arabic wording, edit the text directly in `ar/*.html`.

## What's inside
- `assets/images/` — all images from the original site, sorted into brand, factory, team, certificates, process, colour-management, packaging, industries, icons and misc. See `assets/images/README.md` for the old-name → new-name table.
- `assets/videos/` — site videos, plus MP4 versions of the heavy animated GIFs.
- `assets/css/site.css` — design system and components.
- `assets/js/site.js` — motion engine (preloader, CMYK page transitions, smooth scroll, pinned video chapters, horizontal process rail, split-text reveals, custom cursor, magnetic buttons, marquees, counters, lightbox).
- GSAP 3.15 (+ ScrollTrigger, SplitText) and Lenis 1.3 load from the jsDelivr CDN.

## Notes
- Fonts (Manrope, Instrument Serif, JetBrains Mono) load from Google Fonts.
- The JP&P logo is navy on transparent, so it sits on a light chip in the header and footer. If you have a white version, swap it in and remove the `.brand__chip` background in `site.css`.
- Every video has a poster image, so something shows before playback starts.
- The site respects `prefers-reduced-motion` and works without JavaScript (content is only hidden for animation when the scripts are running).
