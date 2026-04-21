# Stuxen Design Toolkit

A complete, portable design system extracted from [stuxen.webflow.io](https://stuxen.webflow.io). Use this toolkit to replicate the Stuxen design language in any project — any framework, any stack.

## Quick Start

### Option 1: Import everything
```html
<link rel="stylesheet" href="tokens/index.css">
<link rel="stylesheet" href="layouts/responsive.css">
<link rel="stylesheet" href="layouts/containers.css">
<link rel="stylesheet" href="components/index.css">
<link rel="stylesheet" href="interactions/hover-effects.css">
<link rel="stylesheet" href="interactions/scroll-animations.css">
<script src="interactions/webflow-interactions.js"></script>
```

### Option 2: Import only tokens (for new projects)
```html
<link rel="stylesheet" href="tokens/index.css">
<link rel="stylesheet" href="layouts/responsive.css">
```

### Fonts
```html
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
```

---

## Folder Structure

```
stuxen-design-toolkit/
├── tokens/                         # Design tokens as CSS custom properties
│   ├── colors.css                  # Brand colors, opacity variants, semantic map
│   ├── typography.css              # Font families, sizes, weights, line-heights, letter-spacings
│   ├── spacing.css                 # Spacing scale (margins, gaps, padding)
│   ├── borders.css                 # Border radii, border presets
│   └── index.css                   # Imports all token files
│
├── components/                     # Component patterns with structure docs
│   ├── buttons.css                 # Primary button, more button, sub-title badge
│   ├── navigation.css              # Navbar, dropdowns, mobile menu
│   ├── cards.css                   # About, project, blog, testimonial, service cards
│   ├── faq.css                     # FAQ accordion with tabs
│   ├── footer.css                  # Footer layout and links
│   └── index.css                   # Imports all component files
│
├── interactions/                   # Animation & interaction system
│   ├── hover-effects.css           # Pure CSS hover animations (text swap, card bg, etc.)
│   ├── scroll-animations.css       # Scroll-triggered reveal system (CSS classes)
│   ├── webflow-interactions.js     # Full JS interaction engine (FAQ, dropdowns, scroll, nav)
│   └── interaction-map.json        # Machine-readable catalog of every interaction
│
├── layouts/                        # Layout system
│   ├── responsive.css              # 4-breakpoint token override system
│   └── containers.css              # Container, section, box-wrapper, grid patterns
│
├── assets/                         # All site assets, reorganized
│   ├── images/
│   │   ├── hero/                   # Hero slider images
│   │   ├── about/                  # About section images
│   │   ├── projects/               # Project thumbnails
│   │   ├── blog/                   # Blog thumbnails and author avatars
│   │   └── testimonials/           # Testimonial images
│   ├── icons/
│   │   ├── nav/                    # Navigation icons
│   │   ├── buttons/                # Button arrow icons
│   │   ├── about/                  # About feature icons
│   │   ├── projects/               # Project icons
│   │   ├── testimonials/           # Quote and star icons
│   │   ├── blog/                   # Date and slider arrow icons
│   │   ├── faq/                    # Plus/minus icons
│   │   └── misc/                   # Favicon, cart, pricing icons
│   ├── fonts/                      # Poppins woff2 font files (14 files)
│   └── asset-catalog.json          # Complete asset inventory
│
└── pages/                          # Page composition maps
    └── (page maps documenting section order per page)
```

---

## Design System Overview

### Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--primary-clr` | `#5235f6` | Purple — buttons, accents, active states |
| `--secondary-clr` | `#212121` | Dark — headings, primary text |
| `--white-smoke` | `whitesmoke` | Page background |
| `--white` | `white` | Card backgrounds, text on dark |
| `--dark-70` | `#212121b3` | Body text (70% opacity dark) |
| `--dark-12` | `#2121211f` | Borders, dividers (12% opacity) |
| `--dark-16` | `#21212129` | Subtle borders (16% opacity) |

### Typography
- **Primary font**: Poppins (300, 400, 500, 600, 700, 800)
- **Heading scale**: 22px → 56px (7 levels)
- **Display scale**: 40px, 102px (for large service titles)
- **Body scale**: 14px, 16px, 18px, 20px, 24px
- **Every size has paired line-height and letter-spacing tokens**

### Breakpoints
| Breakpoint | Width | Effect |
|------------|-------|--------|
| Large desktop | `>= 1440px` | Enhanced spacing, wider grids |
| Desktop (default) | `992px – 1439px` | Base tokens apply |
| Tablet | `<= 991px` | Headings shrink ~10-15%, spacing reduces |
| Mobile landscape | `<= 767px` | Headings shrink ~25%, layout stacks |
| Mobile portrait | `<= 479px` | Headings shrink ~40%, tight spacing |

### Key Interactions
| Interaction | Trigger | Timing | Implementation |
|-------------|---------|--------|----------------|
| Text swap hover | Mouse over | 400ms ease | CSS (`hover-effects.css`) |
| Project card hover | Mouse over | 400ms ease | CSS (`hover-effects.css`) |
| Service image reveal | Mouse over | 400ms ease | CSS (`hover-effects.css`) |
| Nav bracket fade | Mouse over | 400ms ease | CSS (`hover-effects.css`) |
| Footer text swap | Mouse over | 400ms ease | CSS (`hover-effects.css`) |
| Scroll slide-in | Scroll into view | 600ms ease + stagger | CSS + JS |
| FAQ accordion | Click | 400ms ease | JS (`webflow-interactions.js`) |
| Nav dropdown | Mouse over | 400ms ease | JS (`webflow-interactions.js`) |
| Service divider | Scroll into view | 600ms ease | JS (`webflow-interactions.js`) |
| Navbar scroll bg | Scroll 10% | 400ms ease | JS (`webflow-interactions.js`) |
| Counter ticker | Scroll into view | 2500ms custom bezier | JS (`webflow-interactions.js`) |

---

## Using in a New Project

### 1. Copy the toolkit
Copy `stuxen-design-toolkit/` into your project.

### 2. Import tokens
```css
@import url('./stuxen-design-toolkit/tokens/index.css');
@import url('./stuxen-design-toolkit/layouts/responsive.css');
```

### 3. Use the variables
```css
.my-heading {
  font-family: var(--_font-typography---font-family--primary-font);
  font-size: var(--_font-sizing---heading--heading-lg);
  color: var(--secondary-clr);
  letter-spacing: var(--_letter-spacing---ls-xl);
}

.my-card {
  background: var(--white);
  border: 1px solid var(--dark-12);
  border-radius: var(--_radius---radius-md);
  padding: var(--_spacing---padding--pd-md);
}
```

### 4. Add interactions
```html
<!-- Scroll reveal -->
<div data-scroll-reveal data-delay="200">Content appears on scroll</div>

<!-- Counter ticker -->
<span data-counter-target="150">0</span>

<!-- Include the JS -->
<script src="stuxen-design-toolkit/interactions/webflow-interactions.js"></script>
```

### 5. Use component HTML structures
Each component CSS file includes the exact HTML structure as a comment at the top. Copy the structure, swap the content, and the styles apply automatically.

---

## Interaction Map (for programmatic use)
See `interactions/interaction-map.json` for a machine-readable catalog of every interaction with exact trigger, target, timing, and easing values.
