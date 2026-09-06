# Stillroom — reviewed design system

## Brief and verified skill result
Botanical private-access society: an intimate reading room rather than a blockchain dashboard. React/Vite. Ran `python .agents/skills/ui-ux-pro-max/scripts/search.py "botanical membership editorial accessible" --design-system -p "Stillroom" --density 2`. Verified the returned Minimalism & Swiss Style / Hero + Features + CTA recommendation: spacious structure, accessible contrast, little animation and clear hierarchy fit. Its generic black/pink palette and geometric type do **not** fit this brief and are rejected.

## First-pass plan and review
A cream editorial site with three matching cards would be a generic template. Revised to one expressive, photographic garden doorway: asymmetric giant serif title anchored at left, small circular society seal at right, utility/status shelf beneath. The rest uses differently sized reading spaces, generous plain surfaces, a photographic botanical note, and a sequential three-step process (numbering is meaningful here). No invented membership counts, quotes, collections, events or partner logos. Forest, olive and saffron come directly from the botanical subject.

## Tokens
| Name | Day | Night | Purpose |
|---|---|---|---|
| Parchment | #F4F3E8 | #18231C | Canvas |
| Paper | #FCFBF4 | #202D24 | Raised reading surfaces |
| Forest ink | #263D2C | #F1F1DF | Primary text |
| Olive | #4B5935 | #CCD6AC | Brand / primary actions |
| Saffron | #D9B963 | #D9B963 | Hero CTA, highlights (dark ink) |
| Quiet ink | #65705E | #B3BDAA | Secondary copy |

Display: locally hosted Fraunces 400, natural optical character; no single-word highlight gimmick. Body/controls: locally hosted Manrope 400/600. Display scale 44–100px, body 15–17px, supporting labels 12–13px. Lines under 75 characters. Responsive 24/40/64px gutters, 8px spacing foundation, 64–112px between major ideas. Buttons have an understated rounded 6px edge; the photograph has a 10px edge; no identical-card dashboard grid or decorative gradients.

## Layout
```
[ botanical wordmark | rooms navigation | network theme wallet ]
[                                                      ]
[ Private access,                 circular society seal ]
[ a little more human.       foliage photograph         ]
[ explanation + enter gate                             ]
[                                                      ]
[ network / deployment state      public observatory    ]
[ society introduction      | three sequential steps    ]
[ botanical still life      | privacy reading note      ]
[ final invitation + enter gate                         ]
[ wordmark / product description | real room links      ]
```
Application: a small breadcrumb, left-aligned display heading and explanatory copy, context rail, then honest configuration/interaction panes. Persistent shared chrome. No landing-only visual skin.

## Interaction and safety rules
- Day/night defaults to OS preference, persists on deliberate choice; accessible action label and state.
- All controls keyboard reachable, 44px minimum main targets, visible saffron/forest focus rings, reduced motion respected.
- Navigation collapses without hiding network/wallet functionality. Skip link, main landmark, route title updates.
- No fabricated ledger state, no fake transaction history. Unconfigured states link to /admin.
- Self-attested score is explicitly not an issuer credential. Proof submission is not finality; do not label submitted transactions accepted.
- Never claim wallet infrastructure or proving inputs remain exclusively in the browser. No universal unlinkability claims.

## Assets
See `frontend/public/images/SOURCES.md` and `frontend/public/fonts/SOURCES.md`. Assets are locally hosted; no external image/font fetch on page load.
