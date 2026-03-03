// --- GA4 event tracking ---
const trackEvent = (eventName, params = {}) => {
  if (typeof gtag === "function") {
    gtag("event", eventName, params);
  }
};

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

const desktopDropdownItems = Array.from(
  document.querySelectorAll(".main-nav .has-children")
);

const closeDesktopDropdowns = (exceptItem = null) => {
  desktopDropdownItems.forEach((item) => {
    if (item === exceptItem) return;
    item.classList.remove("open");
    item
      .querySelector(".menu-toggle")
      ?.setAttribute("aria-expanded", "false");
  });
};

const isDesktopNav = () => window.matchMedia("(min-width: 769px)").matches;

window.addEventListener("scroll", setHeaderState, { passive: true });
setHeaderState();

desktopDropdownItems.forEach((item) => {
  const button = item.querySelector(".menu-toggle");
  if (!button) return;

  button.addEventListener("click", (event) => {
    if (!isDesktopNav()) return;
    event.preventDefault();
    event.stopPropagation();
    const willOpen = !item.classList.contains("open");
    closeDesktopDropdowns(item);
    item.classList.toggle("open", willOpen);
    button.setAttribute("aria-expanded", String(willOpen));
  });

  item.addEventListener("mouseenter", () => {
    if (!isDesktopNav()) return;
    closeDesktopDropdowns(item);
    item.classList.add("open");
    button.setAttribute("aria-expanded", "true");
  });

  item.addEventListener("mouseleave", () => {
    if (!isDesktopNav()) return;
    item.classList.remove("open");
    button.setAttribute("aria-expanded", "false");
  });
});

menuToggle?.addEventListener("click", () => {
  const open = !mobileNav?.classList.contains("open");
  mobileNav?.classList.toggle("open", open);
  overlay?.classList.toggle("open", open);
  menuToggle.setAttribute("aria-expanded", String(open));
});

overlay?.addEventListener("click", closeMobileNav);
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMobileNav();
    closeDesktopDropdowns();
  }
});

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Node)) return;
  if (!target.closest(".main-nav")) {
    closeDesktopDropdowns();
  }
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

const inquiryForms = Array.from(document.querySelectorAll(".js-inquiry-form"));

const toTrimmedString = (value) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const setFormStatus = (form, message, statusClass = "") => {
  const statusElement = form.querySelector(".form-status");
  if (!(statusElement instanceof HTMLElement)) return;
  statusElement.textContent = message;
  statusElement.classList.remove("is-success", "is-error");
  if (statusClass) statusElement.classList.add(statusClass);
};

const getInquiryPayload = (form) => {
  const formData = new FormData(form);
  return {
    source: toTrimmedString(formData.get("source")),
    loanType: toTrimmedString(formData.get("loanType")),
    loanAmount: toTrimmedString(formData.get("loanAmount")),
    businessType: toTrimmedString(formData.get("businessType")),
    timeline: toTrimmedString(formData.get("timeline")),
    firstName: toTrimmedString(formData.get("firstName")),
    lastName: toTrimmedString(formData.get("lastName")),
    email: toTrimmedString(formData.get("email")),
    phone: toTrimmedString(formData.get("phone")),
    bestTimeToCall: toTrimmedString(formData.get("bestTimeToCall")),
    details: toTrimmedString(formData.get("details")),
    website: toTrimmedString(formData.get("website")),
  };
};

// --- Form start tracking (first field interaction) ---
inquiryForms.forEach((form) => {
  if (!(form instanceof HTMLFormElement)) return;
  let started = false;

  form.addEventListener("focusin", () => {
    if (started) return;
    started = true;
    const source =
      form.querySelector('input[name="source"]')?.value ?? "unknown";
    trackEvent("form_start", { form_source: source });
  });
});

inquiryForms.forEach((form) => {
  if (!(form instanceof HTMLFormElement)) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const endpoint = toTrimmedString(form.getAttribute("action"));
    if (!endpoint) {
      setFormStatus(
        form,
        "Form endpoint is missing. Please contact support.",
        "is-error"
      );
      return;
    }

    const payload = getInquiryPayload(form);
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = true;
    }
    setFormStatus(form, "Submitting your request...");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      trackEvent("form_submit", {
        form_source: payload.source,
        loan_type: payload.loanType,
        loan_amount: payload.loanAmount,
      });

      setFormStatus(form, "Thanks. Redirecting you now...", "is-success");
      window.location.assign("/thank-you/");
    } catch (error) {
      console.error("Inquiry submission failed", error);
      trackEvent("form_error", {
        form_source: payload.source,
        error_message:
          error instanceof Error ? error.message : "Unknown error",
      });
      setFormStatus(
        form,
        "We could not submit your request right now. Please call 518-791-9771.",
        "is-error"
      );
    } finally {
      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = false;
      }
    }
  });
});

// --- Sticky bottom bar: show after hero/page-band scrolls away ---
const stickyBar = document.querySelector(".sticky-bar");
if (stickyBar) {
  const trigger = document.querySelector(".hero") || document.querySelector(".page-band");
  const ctaBand = document.querySelector(".cta-band");

  if (trigger) {
    const showObserver = new IntersectionObserver(
      (entries) => {
        const heroVisible = entries[0].isIntersecting;
        if (heroVisible) {
          stickyBar.classList.remove("is-visible");
        } else {
          stickyBar.classList.add("is-visible");
        }
      },
      { threshold: 0 }
    );
    showObserver.observe(trigger);

    if (ctaBand) {
      const hideObserver = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            stickyBar.classList.remove("is-visible");
          } else if (trigger.getBoundingClientRect().bottom <= 0) {
            stickyBar.classList.add("is-visible");
          }
        },
        { threshold: 0.1 }
      );
      hideObserver.observe(ctaBand);
    }
  }
}

// --- GA4: Phone click tracking ---
document.addEventListener("click", (event) => {
  const link = event.target.closest('a[href^="tel:"]');
  if (!link) return;

  const location = link.closest(".hero")
    ? "hero"
    : link.closest(".site-header")
      ? "header"
      : link.closest(".blog-inline-cta")
        ? "blog_inline"
        : link.closest(".blog-aside")
          ? "blog_aside"
      : link.closest(".cta-band")
        ? "cta_band"
        : link.closest(".gs-sidebar")
          ? "get_started"
          : link.closest(".site-footer")
            ? "footer"
            : "other";

  trackEvent("phone_click", { link_location: location });
});

// --- GA4: Email click tracking ---
document.addEventListener("click", (event) => {
  const link = event.target.closest('a[href^="mailto:"]');
  if (!link) return;

  const location = link.closest(".cta-band")
    ? "cta_band"
    : link.closest(".blog-inline-cta")
      ? "blog_inline"
      : link.closest(".blog-aside")
        ? "blog_aside"
    : link.closest(".team")
      ? "team"
      : link.closest(".site-footer")
        ? "footer"
        : "other";

  trackEvent("email_click", { link_location: location });
});

// --- GA4: CTA click tracking ---
document.addEventListener("click", (event) => {
  const link = event.target.closest(
    'a[href="/get-started/"], a[href*="get-started"]'
  );
  if (!link) return;

  const location = link.closest(".site-header")
    ? "header"
    : link.closest(".hero")
      ? "hero"
      : link.closest(".blog-inline-cta")
        ? "blog_inline"
        : link.closest(".blog-aside")
          ? "blog_aside"
      : link.closest(".how-it-works")
        ? "how_it_works"
        : link.closest(".cta-band")
          ? "cta_band"
          : "other";

  trackEvent("cta_click", {
    link_text: link.textContent.trim(),
    link_location: location,
  });
});

// --- GA4: Service page view tracking ---
if (window.location.pathname.startsWith("/services/")) {
  const slug = window.location.pathname.replace(/^\/services\/|\/$/g, "");
  if (slug) {
    trackEvent("service_view", { service_name: slug });
  }
}

// --- GA4: Blog scroll depth tracking ---
const blogProse = document.querySelector(".prose");
if (blogProse) {
  const marker = document.createElement("div");
  marker.style.height = "1px";
  const children = Array.from(blogProse.children);
  const insertAt = Math.floor(children.length * 0.75);
  if (children[insertAt]) {
    blogProse.insertBefore(marker, children[insertAt]);
  } else {
    blogProse.appendChild(marker);
  }

  const scrollObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      trackEvent("blog_read", {
        post_title: document.title.split(" | ")[0],
      });
      scrollObserver.disconnect();
    }
  });
  scrollObserver.observe(marker);
}

// --- GA4: Outbound click tracking ---
document.addEventListener("click", (event) => {
  const link = event.target.closest("a[href]");
  if (!link) return;
  const href = link.getAttribute("href") ?? "";
  if (!href.startsWith("http") || link.hostname === window.location.hostname) {
    return;
  }

  trackEvent("outbound_click", {
    link_url: href,
    link_text: link.textContent.trim().slice(0, 50),
  });
});
