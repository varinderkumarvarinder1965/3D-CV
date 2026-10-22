document.documentElement.classList.add("js");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const header = document.querySelector("#siteHeader");
const nav = document.querySelector("#nav");
const menuToggle = document.querySelector("#menuToggle");
const progressBar = document.querySelector("#progressBar");
const toTop = document.querySelector("#toTop");
const toast = document.querySelector("#toast");
const year = document.querySelector("#year");

if (year) year.textContent = new Date().getFullYear();

function closeMenu() {
  if (!nav || !menuToggle) return;
  nav.classList.remove("is-open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Open menu");
  document.body.classList.remove("menu-open");
}

if (menuToggle && nav) {
  menuToggle.addEventListener("click", () => {
    const open = !nav.classList.contains("is-open");
    nav.classList.toggle("is-open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.classList.toggle("menu-open", open);
  });

  nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  document.addEventListener("pointerdown", (event) => {
    if (!nav.classList.contains("is-open")) return;
    if (nav.contains(event.target) || menuToggle.contains(event.target)) return;
    closeMenu();
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 860) closeMenu();
  });
}

const navLinks = Array.from(document.querySelectorAll("[data-nav]"));
const sections = navLinks
  .map((link) => document.getElementById(link.dataset.nav))
  .filter(Boolean);

function updateActiveSection(scrollTop, max) {
  if (!sections.length) return;

  let currentId = "";
  if (scrollTop >= max - 2) {
    currentId = sections[sections.length - 1].id;
  } else {
    const probe = scrollTop + window.innerHeight * 0.36;
    sections.forEach((section) => {
      if (section.offsetTop <= probe) currentId = section.id;
    });
  }

  navLinks.forEach((link) => {
    const active = link.dataset.nav === currentId;
    link.classList.toggle("is-active", active);
    if (active) {
      link.setAttribute("aria-current", "true");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

let scrollQueued = false;

function updateScrollUI() {
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const max = document.documentElement.scrollHeight - window.innerHeight;

  if (progressBar) {
    progressBar.style.width = `${max > 0 ? Math.min((scrollTop / max) * 100, 100) : 0}%`;
  }

  if (header) header.classList.toggle("is-scrolled", scrollTop > 6);
  if (toTop) toTop.hidden = scrollTop < 700;
  updateActiveSection(scrollTop, max);
}

function queueScrollUpdate() {
  if (scrollQueued) return;
  scrollQueued = true;
  requestAnimationFrame(() => {
    updateScrollUI();
    scrollQueued = false;
  });
}

window.addEventListener("scroll", queueScrollUpdate, { passive: true });
window.addEventListener("resize", queueScrollUpdate);
updateScrollUI();

if (toTop) {
  toTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  });
}

const revealElements = Array.from(document.querySelectorAll(".reveal"));

if ("IntersectionObserver" in window && !reduceMotion) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.1 }
  );

  revealElements.forEach((element) => revealObserver.observe(element));
} else {
  revealElements.forEach((element) => element.classList.add("is-visible"));
}

const counters = Array.from(document.querySelectorAll("[data-count]"));

function formatCounter(element, value) {
  const suffix = element.dataset.suffix || "";
  const rounded = Math.round(value);
  const text = element.dataset.format === "comma" ? rounded.toLocaleString("en-US") : String(rounded);
  element.textContent = `${text}${suffix}`;
}

if (counters.length) {
  if (reduceMotion || !("IntersectionObserver" in window)) {
    counters.forEach((counter) => formatCounter(counter, Number(counter.dataset.count)));
  } else {
    counters.forEach((counter) => formatCounter(counter, 0));

    const counterObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const element = entry.target;
          const target = Number(element.dataset.count);
          const duration = 1200;
          const start = performance.now();

          function tick(now) {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            formatCounter(element, target * eased);
            if (progress < 1) requestAnimationFrame(tick);
          }

          requestAnimationFrame(tick);
          observer.unobserve(element);
        });
      },
      { threshold: 0.4 }
    );

    counters.forEach((counter) => counterObserver.observe(counter));
  }
}

function setupFilter(barId, gridId, countId, singular, plural) {
  const bar = document.getElementById(barId);
  const grid = document.getElementById(gridId);
  const count = document.getElementById(countId);
  if (!bar || !grid) return;

  const buttons = Array.from(bar.querySelectorAll("[data-filter]"));
  const cards = Array.from(grid.querySelectorAll("[data-category]"));

  function applyFilter(filter) {
    let visible = 0;

    cards.forEach((card) => {
      const show = filter === "all" || card.dataset.category === filter;
      card.hidden = !show;
      if (show) {
        visible += 1;
        card.classList.add("is-visible");
      }
    });

    buttons.forEach((button) => {
      const active = button.dataset.filter === filter;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    if (count) count.textContent = `${visible} ${visible === 1 ? singular : plural}`;
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => applyFilter(button.dataset.filter));
  });
}

setupFilter("skillFilters", "skillGrid", "skillCount", "domain", "domains");
setupFilter("projectFilters", "projectGrid", "projectCount", "project", "projects");

const roles = Array.from(document.querySelectorAll("[data-role]"));
const toggleAll = document.querySelector("#toggleAll");

function setRole(role, open) {
  const button = role.querySelector(".role-toggle");
  const body = role.querySelector(".role-body");
  if (!button || !body) return;

  role.classList.toggle("is-open", open);
  button.setAttribute("aria-expanded", String(open));
  button.setAttribute("aria-label", open ? "Hide details" : "Show details");
  body.hidden = !open;
}

function syncToggleAll() {
  if (!toggleAll) return;
  const allOpen = roles.length > 0 && roles.every((role) => role.classList.contains("is-open"));
  toggleAll.textContent = allOpen ? "Collapse all" : "Expand all";
  toggleAll.setAttribute("aria-expanded", String(allOpen));
}

roles.forEach((role) => {
  const button = role.querySelector(".role-toggle");
  if (!button) return;
  button.addEventListener("click", () => {
    setRole(role, !role.classList.contains("is-open"));
    syncToggleAll();
  });
});

if (toggleAll) {
  toggleAll.addEventListener("click", () => {
    const allOpen = roles.every((role) => role.classList.contains("is-open"));
    roles.forEach((role) => setRole(role, !allOpen));
    syncToggleAll();
  });
}

syncToggleAll();

let printStates = [];

window.addEventListener("beforeprint", () => {
  printStates = roles.map((role) => role.classList.contains("is-open"));
  roles.forEach((role) => setRole(role, true));
});

window.addEventListener("afterprint", () => {
  roles.forEach((role, index) => setRole(role, printStates[index] ?? true));
  syncToggleAll();
});

document.querySelectorAll("[data-print]").forEach((button) => {
  button.addEventListener("click", () => window.print());
});

let toastTimer;

function showToast(message, duration = 3200) {
  if (!toast) return;
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = window.setTimeout(() => {
    toast.hidden = true;
  }, duration);
}

function copyWithFallback(text) {
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.top = "0";
  field.style.left = "-9999px";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  field.setSelectionRange(0, text.length);

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch (error) {
    copied = false;
  }

  field.remove();
  return copied;
}

function selectEmailForCopy(text) {
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.top = "0";
  field.style.left = "-9999px";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.focus();
  field.select();
  field.setSelectionRange(0, text.length);
  window.setTimeout(() => field.remove(), 12000);
}

async function copyEmail(email) {
  if (!email) return;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(email);
    } else if (!copyWithFallback(email)) {
      throw new Error("copy failed");
    }
    showToast("Email copied to clipboard");
  } catch (error) {
    selectEmailForCopy(email);
    showToast("Email selected — press Ctrl+C to copy", 6000);
  }
}

document.querySelectorAll("[data-copy-email]").forEach((button) => {
  button.addEventListener("click", () => copyEmail(button.dataset.copyEmail));
});
