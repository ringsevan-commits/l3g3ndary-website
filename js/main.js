// ======================================================
// L3G3NDARY
// Main JavaScript
// ======================================================

document.addEventListener("DOMContentLoaded", () => {

    initSmoothScroll();
    initRevealAnimation();
    initFAQ();
    initMobileMenu();
    initHeaderScrollState();
    initActiveNavLink();

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

function initRevealAnimation() {

    const sections = document.querySelectorAll("section");

    const sectionObserver = new IntersectionObserver((entries) => {

        entries.forEach(entry => {

            if (entry.isIntersecting) {

                entry.target.classList.add("show");
                sectionObserver.unobserve(entry.target);

            }

        });

    }, {
        threshold: 0.15
    });

    sections.forEach(section => {

        section.classList.add("hidden");

        sectionObserver.observe(section);

    });

    initStaggeredReveal();

}

function initStaggeredReveal() {

    const groups = [
        ".collections-grid > .collection-card",
        ".staking-grid > .staking-card",
        ".roadmap-timeline > .roadmap-item",
        ".faq-list > .faq-item",
        ".proof-grid > .proof-card",
        ".manifesto-body > .manifesto-item"
    ];

    const items = document.querySelectorAll(groups.join(", "));

    if (!items.length) return;

    // Stagger delay resets per parent group so each grid cascades
    // from its own start rather than accumulating page-wide.
    const counters = new Map();

    items.forEach(item => {

        const parent = item.parentElement;
        const index = counters.get(parent) || 0;
        counters.set(parent, index + 1);

        item.style.setProperty("--i", Math.min(index, 6));
        item.classList.add("reveal-item");

    });

    const observer = new IntersectionObserver((entries) => {

        entries.forEach(entry => {

            if (entry.isIntersecting) {

                entry.target.classList.add("show");
                observer.unobserve(entry.target);

            }

        });

    }, {
        threshold: 0.15
    });

    items.forEach(item => observer.observe(item));

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
