const header = document.querySelector(".site-header");
const menuToggle = document.querySelector(".mobile-menu-toggle");
const mobileNav = document.querySelector(".mobile-nav");
const overlay = document.querySelector(".mobile-nav-overlay");

const setHeaderState = () => {
  if (!header) return;
  header.classList.toggle("scrolled", window.scrollY > 60);
};

const closeMobileNav = () => {
  mobileNav?.classList.remove("open");
  overlay?.classList.remove("open");
  menuToggle?.setAttribute("aria-expanded", "false");
};

window.addEventListener("scroll", setHeaderState, { passive: true });
setHeaderState();

menuToggle?.addEventListener("click", () => {
  const open = !mobileNav?.classList.contains("open");
  mobileNav?.classList.toggle("open", open);
  overlay?.classList.toggle("open", open);
  menuToggle.setAttribute("aria-expanded", String(open));
});

overlay?.addEventListener("click", closeMobileNav);
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMobileNav();
});

document.querySelectorAll(".mobile-parent-toggle").forEach((button) => {
  button.addEventListener("click", () => {
    button.parentElement?.classList.toggle("expanded");
  });
});

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const href = link.getAttribute("href");
    if (!href || href === "#") return;
    const target = document.querySelector(href);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth" });
  });
});
