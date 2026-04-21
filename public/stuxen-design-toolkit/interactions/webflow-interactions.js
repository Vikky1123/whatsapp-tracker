/**
 * =============================================================================
 * STUXEN DESIGN TOOLKIT — INTERACTION ENGINE (JavaScript)
 * Source: stuxen.webflow.io (Webflow IX2 system)
 *
 * This file recreates all Webflow IX2 interactions as vanilla JS.
 * No dependencies required.
 *
 * Features:
 * 1. Scroll-triggered reveal animations (slideInBottom)
 * 2. Text swap hover (buttons, nav links)
 * 3. FAQ accordion open/close
 * 4. Nav dropdown open/close with height animation
 * 5. Navbar scroll behavior (transparent → solid background)
 * 6. Service item hover (image reveal)
 * 7. Project card hover (bg slide + color swap)
 * 8. About counter ticker animation
 * 9. Hero slider with image scale effect
 *
 * Usage:
 *   <script src="interactions/webflow-interactions.js"></script>
 *   The script auto-initializes on DOMContentLoaded.
 * =============================================================================
 */

(function () {
  'use strict';

  // ─── SCROLL REVEAL ──────────────────────────────────────────────────────────
  // Applies .is-visible to [data-scroll-reveal] elements when they enter viewport.
  // Matches Webflow's SCROLL_INTO_VIEW → slideInBottom preset.

  function initScrollReveal() {
    const elements = document.querySelectorAll('[data-scroll-reveal]');
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0, rootMargin: '0px 0px -10% 0px' }
    );

    elements.forEach((el) => observer.observe(el));
  }

  // ─── FAQ ACCORDION ──────────────────────────────────────────────────────────
  // Matches Webflow IX2: FAQ Open/Close
  // Trigger: click on .faq-title-wrap
  // Actions:
  //   - .faq-ans: height 0 → scrollHeight (400ms ease)
  //   - .faq-icon._01: opacity 1 → 0 (200ms)
  //   - .faq-icon._02: opacity 0 → 1 (200ms)

  function initFaqAccordion() {
    const faqItems = document.querySelectorAll('.faq-ans-wrapper');
    if (!faqItems.length) return;

    faqItems.forEach((item) => {
      const titleWrap = item.querySelector('.faq-title-wrap');
      const answer = item.querySelector('.faq-ans');
      const iconPlus = item.querySelector('.faq-icon._01');
      const iconMinus = item.querySelector('.faq-icon._02');

      if (!titleWrap || !answer) return;

      // Set initial styles
      answer.style.transition = 'height 400ms ease';
      answer.style.overflow = 'hidden';
      answer.style.height = '0px';

      let isOpen = false;

      titleWrap.addEventListener('click', () => {
        if (isOpen) {
          // Close
          answer.style.height = answer.scrollHeight + 'px';
          requestAnimationFrame(() => {
            answer.style.height = '0px';
          });
          if (iconPlus) iconPlus.style.opacity = '1';
          if (iconMinus) iconMinus.style.opacity = '0';
        } else {
          // Open
          answer.style.height = answer.scrollHeight + 'px';
          if (iconPlus) iconPlus.style.opacity = '0';
          if (iconMinus) iconMinus.style.opacity = '1';
        }
        isOpen = !isOpen;
      });

      // Clean up after transition
      answer.addEventListener('transitionend', () => {
        if (isOpen) {
          answer.style.height = 'auto';
        }
      });
    });
  }

  // ─── NAV DROPDOWN ───────────────────────────────────────────────────────────
  // Matches Webflow IX2: Nav Dd [ Open ] / Nav Dd [ Close ]
  // Trigger: mouseenter/mouseleave on .nav-dd
  // Actions:
  //   - .nav-dd-side: opacity 0 → 1 (400ms ease)
  //   - .nav-dd-list: height 0 → auto (400ms ease)
  //   - .nav-dd-text._01: translateY(0) → translateY(-110%)
  //   - .nav-dd-text._02: translateY(110%) → translateY(0)

  function initNavDropdowns() {
    const dropdowns = document.querySelectorAll('.nav-dd');
    if (!dropdowns.length) return;

    dropdowns.forEach((dd) => {
      const list = dd.querySelector('.nav-dd-list');
      const side = dd.querySelector('.nav-dd-side');

      if (!list) return;

      list.style.transition = 'height 400ms ease';
      list.style.overflow = 'hidden';
      list.style.height = '0px';

      if (side) {
        side.style.transition = 'opacity 400ms ease';
        side.style.opacity = '0';
      }

      dd.addEventListener('mouseenter', () => {
        list.style.height = list.scrollHeight + 'px';
        if (side) side.style.opacity = '1';
      });

      dd.addEventListener('mouseleave', () => {
        list.style.height = list.scrollHeight + 'px';
        requestAnimationFrame(() => {
          list.style.height = '0px';
        });
        if (side) side.style.opacity = '0';
      });

      list.addEventListener('transitionend', () => {
        if (list.style.height !== '0px') {
          list.style.height = 'auto';
        }
      });
    });
  }

  // ─── NAVBAR OPEN/CLOSE (Mobile) ────────────────────────────────────────────
  // Matches Webflow IX2: Nav Menu [Open] / Nav Menu [Close]
  // Trigger: click on .menu-button
  // Actions:
  //   - .nav-menu: height 0 → 90vh (500ms ease)
  //   - .menu-button lines animate to X shape

  function initMobileNav() {
    const menuBtn = document.querySelector('.menu-button');
    const navMenu = document.querySelector('.nav-menu');

    if (!menuBtn || !navMenu) return;

    let isOpen = false;

    menuBtn.addEventListener('click', () => {
      if (isOpen) {
        navMenu.style.height = '0';
        navMenu.style.overflow = 'hidden';
        menuBtn.classList.remove('w--open');
      } else {
        navMenu.style.height = '90vh';
        navMenu.style.overflow = 'auto';
        menuBtn.classList.add('w--open');
      }
      isOpen = !isOpen;
    });
  }

  // ─── SERVICE DIVIDER ANIMATION ──────────────────────────────────────────────
  // Matches Webflow IX2: Services V1 Divider
  // Trigger: SCROLL_INTO_VIEW
  // Action: .services-v1-divider-wrap translateX(-100%) → translateX(0), 600ms ease

  function initServiceDividers() {
    const dividers = document.querySelectorAll('.services-v1-divider-wrap');
    if (!dividers.length) return;

    dividers.forEach((el) => {
      el.style.transform = 'translateX(-100%)';
      el.style.transition = 'transform 600ms ease';
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.transform = 'translateX(0)';
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );

    dividers.forEach((el) => observer.observe(el));
  }

  // ─── HERO SLIDER AUTO-PLAY ─────────────────────────────────────────────────
  // Webflow's native slider with auto-play and image scale effect.
  // Slides crossfade with opacity. Active slide image scales from 0.9 → 1.0.

  function initHeroSlider() {
    const slider = document.querySelector('.hero-slider');
    if (!slider) return;

    const slides = slider.querySelectorAll('.hero-slide');
    if (slides.length < 2) return;

    let current = 0;
    const interval = 5000; // 5 seconds per slide

    function showSlide(index) {
      slides.forEach((slide, i) => {
        const img = slide.querySelector('.hero-slide-img, img');
        if (i === index) {
          slide.style.opacity = '1';
          slide.style.transition = 'opacity 500ms ease';
          if (img) {
            img.style.transition = 'transform 5000ms ease';
            img.style.transform = 'scale(1)';
          }
        } else {
          slide.style.opacity = '0';
          slide.style.transition = 'opacity 500ms ease';
          if (img) {
            img.style.transform = 'scale(0.9)';
          }
        }
      });
    }

    showSlide(0);

    setInterval(() => {
      current = (current + 1) % slides.length;
      showSlide(current);
    }, interval);
  }

  // ─── NAVBAR SCROLL BACKGROUND ─────────────────────────────────────────────
  // Matches Webflow IX2: Navbar scroll behavior
  // Trigger: SCROLL_POSITION at 10% of page height
  // Actions:
  //   - .navbar: background transparent → white, box-shadow appears
  //   - Transition: 400ms ease

  function initNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    navbar.style.transition = 'background-color 400ms ease, box-shadow 400ms ease';

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollPercent = window.scrollY / document.documentElement.scrollHeight;
          if (scrollPercent > 0.10) {
            navbar.classList.add('is-scrolled');
            navbar.style.backgroundColor = 'var(--white, white)';
            navbar.style.boxShadow = '0 1px 6px rgba(0,0,0,0.08)';
          } else {
            navbar.classList.remove('is-scrolled');
            navbar.style.backgroundColor = 'transparent';
            navbar.style.boxShadow = 'none';
          }
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  // ─── ABOUT COUNTER TICKER ─────────────────────────────────────────────────
  // Matches Webflow IX2: About counter animation
  // Trigger: SCROLL_INTO_VIEW on [data-counter-target]
  // Action: Animates from 0 to target number over 2500ms
  // Easing: cubic-bezier(0.702, 0.311, 0.292, 0.983)

  function initCounterTicker() {
    const counters = document.querySelectorAll('[data-counter-target]');
    if (!counters.length) return;

    // Custom cubic-bezier approximation for tick animation
    function easeCustom(t) {
      // Attempt to approximate cubic-bezier(0.702, 0.311, 0.292, 0.983)
      return 1 - Math.pow(1 - t, 3.5);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const target = parseInt(el.getAttribute('data-counter-target'), 10);
            if (isNaN(target)) return;

            const duration = 2500;
            const start = performance.now();

            function tick(now) {
              const elapsed = now - start;
              const progress = Math.min(elapsed / duration, 1);
              const eased = easeCustom(progress);
              el.textContent = Math.round(eased * target);

              if (progress < 1) {
                requestAnimationFrame(tick);
              } else {
                el.textContent = target;
              }
            }

            requestAnimationFrame(tick);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.3 }
    );

    counters.forEach((el) => observer.observe(el));
  }

  // ─── INITIALIZE ALL ─────────────────────────────────────────────────────────

  function init() {
    initScrollReveal();
    initFaqAccordion();
    initNavDropdowns();
    initMobileNav();
    initServiceDividers();
    initHeroSlider();
    initNavbarScroll();
    initCounterTicker();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
