// ======================================================
// L3G3NDARY
// Main JavaScript
// ======================================================

document.addEventListener("DOMContentLoaded", () => {

    // Each init runs in isolation — a failure in one (e.g. a wallet-UI
    // element missing) must never prevent the others, especially the
    // scroll-reveal, from running and making the page visible.
    const safeInit = (fn) => {
        try { fn(); } catch (err) { console.error(fn.name + " failed:", err); }
    };

    safeInit(initSmoothScroll);
    safeInit(initRevealAnimation);
    safeInit(initCardRevealAnimation);
    safeInit(initFAQ);
    safeInit(initMobileMenu);
    safeInit(initHeaderScrollState);
    safeInit(initActiveNavLink);

});

// ======================================================
// SMOOTH SCROLL
// ======================================================

function initSmoothScroll() {

    document.querySelectorAll('a[href^="#"]').forEach(link => {

        link.addEventListener("click", function (e) {

            const href = this.getAttribute("href");

            if (href === "#") return;

            const target = document.querySelector(href);

            if (!target) return;

            e.preventDefault();

            target.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

            closeMobileMenu();

        });

    });

}

// ======================================================
// REVEAL ON SCROLL
// ======================================================
//
// Safety-first: content must NEVER stay permanently invisible if the
// IntersectionObserver fails to fire (unsupported/old browsers, some
// embedded WebViews, throttled callbacks on certain new devices, JS
// errors elsewhere on the page, etc). Every hidden element gets both
// an observer AND a fallback timer that forces it visible no matter what.

function initRevealAnimation() {

    const sections = document.querySelectorAll("section");

    // Old/unsupported browsers (or observer construction failing for any
    // reason) → skip the animation entirely, just show everything.
    if (!("IntersectionObserver" in window)) {
        sections.forEach(section => section.classList.add("show"));
        return;
    }

    let observer;

    try {

        observer = new IntersectionObserver((entries) => {

            entries.forEach(entry => {

                if (entry.isIntersecting) {

                    entry.target.classList.add("show");
                    observer.unobserve(entry.target);

                }

            });

        }, {
            threshold: 0.01,
            rootMargin: "0px 0px -10% 0px"
        });

    } catch (err) {
        sections.forEach(section => section.classList.add("show"));
        return;
    }

    sections.forEach(section => {

        section.classList.add("hidden");
        observer.observe(section);

        // Hard safety net: whatever happens with the observer, this
        // section is guaranteed to be visible within 2.5s of load.
        setTimeout(() => section.classList.add("show"), 2500);

    });

}

// ======================================================
// STAGGERED CARD REVEAL
// ======================================================

function initCardRevealAnimation() {

    // Slide + fade — elements with no competing hover transition
    const slideSelectors = [
        ".manifesto-item",
        ".manifesto-collection",
        ".roadmap-item",
        ".hero-stat"
    ];

    // Fade only — cards that already own their own hover transition
    // (opacity delay is defined alongside it in their own stylesheet)
    const fadeSelectors = [
        ".collection-card",
        ".staking-card",
        ".faq-item"
    ];

    const allSelectors = slideSelectors.concat(fadeSelectors);

    // Same safety-first approach as initRevealAnimation() above.
    if (!("IntersectionObserver" in window)) {
        allSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(item => item.classList.add("show"));
        });
        return;
    }

    let observer;

    try {

        observer = new IntersectionObserver((entries) => {

            entries.forEach(entry => {

                if (entry.isIntersecting) {

                    entry.target.classList.add("show");
                    observer.unobserve(entry.target);

                }

            });

        }, {
            threshold: 0.01,
            rootMargin: "0px 0px -10% 0px"
        });

    } catch (err) {
        allSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(item => item.classList.add("show"));
        });
        return;
    }

    const register = (selector, className) => {

        document.querySelectorAll(selector).forEach((item, index) => {

            item.classList.add(className);
            item.style.setProperty("--i", index % 8);

            observer.observe(item);

            // Hard safety net, same guarantee as the section-level reveal.
            setTimeout(() => item.classList.add("show"), 2500);

        });

    };

    slideSelectors.forEach(selector => register(selector, "reveal-item"));
    fadeSelectors.forEach(selector => register(selector, "reveal-fade"));

}

// ======================================================
// FAQ
// ======================================================

function initFAQ() {

    const items = document.querySelectorAll(".faq-item");

    items.forEach(item => {

        const button = item.querySelector(".faq-question");

        if (!button) return;

        button.addEventListener("click", () => {

            items.forEach(other => {

                if (other !== item) {

                    other.classList.remove("active");

                }

            });

            item.classList.toggle("active");

        });

    });

}

// ======================================================
// MOBILE MENU
// ======================================================

function initMobileMenu() {

    const toggle = document.getElementById("menu-toggle");
    const nav = document.getElementById("primary-nav");

    if (!toggle || !nav) return;

    toggle.addEventListener("click", () => {

        const isOpen = nav.classList.toggle("open");

        toggle.classList.toggle("active", isOpen);
        toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");

    });

}

function closeMobileMenu() {

    const toggle = document.getElementById("menu-toggle");
    const nav = document.getElementById("primary-nav");

    if (!toggle || !nav) return;

    nav.classList.remove("open");
    toggle.classList.remove("active");
    toggle.setAttribute("aria-expanded", "false");

}

// ======================================================
// HEADER SCROLL STATE
// ======================================================

function initHeaderScrollState() {

    const header = document.querySelector(".header");

    if (!header) return;

    const update = () => {

        header.classList.toggle("scrolled", window.scrollY > 40);

    };

    update();

    window.addEventListener("scroll", update, { passive: true });

}

// ======================================================
// ACTIVE NAV LINK ON SCROLL
// ======================================================

function initActiveNavLink() {

    const navLinks = document.querySelectorAll('#primary-nav a[href^="#"]');
    const sections = Array.from(navLinks)
        .map(link => link.getAttribute("href"))
        .filter(href => href.length > 1)
        .map(href => document.querySelector(href))
        .filter(Boolean);

    if (!sections.length) return;

    const observer = new IntersectionObserver((entries) => {

        entries.forEach(entry => {

            if (!entry.isIntersecting) return;

            const id = "#" + entry.target.id;

            navLinks.forEach(link => {

                link.classList.toggle("active", link.getAttribute("href") === id);

            });

        });

    }, {
        rootMargin: "-45% 0px -50% 0px",
        threshold: 0
    });

    sections.forEach(section => observer.observe(section));

}
