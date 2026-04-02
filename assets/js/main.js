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
  const keepSolid = header.classList.contains("site-header-solid");
  header.classList.toggle("scrolled", keepSolid || window.scrollY > 60);
};

const isVisible = (element) =>
  element instanceof HTMLElement && element.getClientRects().length > 0;

const closeMobileNav = ({ restoreFocus = true } = {}) => {
  const wasOpen = mobileNav?.classList.contains("open");
  mobileNav?.classList.remove("open");
  overlay?.classList.remove("open");
  menuToggle?.setAttribute("aria-expanded", "false");
  mobileNav?.setAttribute("aria-hidden", "true");
  mobileNav?.setAttribute("inert", "");
  if (restoreFocus && wasOpen && isVisible(menuToggle)) {
    menuToggle.focus();
  }
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
  if (open) {
    mobileNav?.setAttribute("aria-hidden", "false");
    mobileNav?.removeAttribute("inert");
  } else {
    mobileNav?.setAttribute("aria-hidden", "true");
    mobileNav?.setAttribute("inert", "");
  }
});

overlay?.addEventListener("click", closeMobileNav);
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (mobileNav?.classList.contains("open")) {
      closeMobileNav();
    }
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
    const expanded = button.parentElement?.classList.toggle("expanded");
    button.setAttribute("aria-expanded", String(!!expanded));
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

// --- UTM / GA context persistence via sessionStorage ---
const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
];

const persistUtmParams = () => {
  const params = new URLSearchParams(window.location.search);
  UTM_KEYS.forEach((key) => {
    const value = params.get(key);
    if (value) sessionStorage.setItem(key, value);
  });
  if (!sessionStorage.getItem("landing_page")) {
    sessionStorage.setItem("landing_page", window.location.href);
  }
  if (!sessionStorage.getItem("referrer")) {
    sessionStorage.setItem("referrer", document.referrer);
  }
};

persistUtmParams();

// --- Populate hidden GA/UTM fields on lead forms ---
const populateHiddenFields = (form) => {
  const set = (name, value) => {
    const input = form.querySelector(`input[name="${name}"]`);
    if (input) input.value = value || "";
  };

  // Read from sessionStorage (survives navigation from landing page to /get-started/)
  set("utmSource", sessionStorage.getItem("utm_source"));
  set("utmMedium", sessionStorage.getItem("utm_medium"));
  set("utmCampaign", sessionStorage.getItem("utm_campaign"));
  set("utmTerm", sessionStorage.getItem("utm_term"));
  set("utmContent", sessionStorage.getItem("utm_content"));
  set("gclid", sessionStorage.getItem("gclid"));
  set("landingPage", sessionStorage.getItem("landing_page"));
  set("referrer", sessionStorage.getItem("referrer"));

  // GA4 identifiers (async — gtag may not be loaded yet)
  const ga4Id = window.__GA4_MEASUREMENT_ID;
  if (typeof gtag === "function" && ga4Id) {
    gtag("get", ga4Id, "client_id", (v) => set("gaClientId", v));
    gtag("get", ga4Id, "session_id", (v) => set("gaSessionId", v));
    gtag("get", ga4Id, "session_number", (v) => set("gaSessionNumber", v));
  }
};

inquiryForms.forEach((form) => {
  if (form instanceof HTMLFormElement) populateHiddenFields(form);
});

const toTrimmedString = (value) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const runtimeConfig = window.__REXFORD_RUNTIME_CONFIG ?? {};
const CONTACT_INTENT_ENDPOINT = toTrimmedString(
  runtimeConfig.contactIntentEndpoint
);
const FALLBACK_PHONE = toTrimmedString(runtimeConfig.phone) || "518-791-1885";
const FALLBACK_EMAIL =
  toTrimmedString(runtimeConfig.email) || "info@rexfordcc.com";
const FORM_ERROR_MESSAGE =
  `We could not submit your request right now. Please call ${FALLBACK_PHONE} or email ${FALLBACK_EMAIL}.`;

const getInteractionLocation = (element) => {
  if (!(element instanceof Element)) return "other";

  const explicitContactLocation = element.closest("[data-contact-location]");
  if (explicitContactLocation instanceof HTMLElement) {
    return explicitContactLocation.dataset.contactLocation || "other";
  }

  const explicitCtaLocation = element.closest("[data-cta-location]");
  if (explicitCtaLocation instanceof HTMLElement) {
    return explicitCtaLocation.dataset.ctaLocation || "other";
  }

  if (element.closest(".service-sidebar")) return "service_sidebar";
  if (element.closest(".service-mobile-form")) return "service_mobile_form";
  if (element.closest(".service-hero-panel")) return "service_hero";
  if (element.closest(".sticky-bar")) return "sticky_bar";
  if (element.closest(".hero-form-card")) return "hero_form";
  if (element.closest(".site-header")) return "header";
  if (element.closest(".mobile-nav")) return "mobile_nav";
  if (element.closest(".hero")) return "hero";
  if (element.closest(".blog-inline-cta")) return "blog_inline";
  if (element.closest(".blog-aside")) return "blog_aside";
  if (element.closest(".how-it-works")) return "how_it_works";
  if (element.closest(".cta-band")) return "cta_band";
  if (element.closest(".gs-sidebar")) return "get_started";
  if (element.closest(".team")) return "team";
  if (element.closest(".site-footer")) return "footer";

  return "other";
};

const getEventTargetElement = (event) =>
  event.target instanceof Element ? event.target : null;

const setFormStatus = (form, message, statusClass = "") => {
  const statusElement = form.querySelector(".form-status");
  if (!(statusElement instanceof HTMLElement)) return;
  statusElement.textContent = message;
  statusElement.classList.remove("is-success", "is-error");
  if (statusClass) statusElement.classList.add(statusClass);
};

const getInquiryPayload = (form) => {
  const formData = new FormData(form);
  const turnstileToken =
    toTrimmedString(formData.get("turnstileToken")) ||
    toTrimmedString(formData.get("cf-turnstile-response"));

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
    gaClientId: toTrimmedString(formData.get("gaClientId")),
    gaSessionId: toTrimmedString(formData.get("gaSessionId")),
    gaSessionNumber: toTrimmedString(formData.get("gaSessionNumber")),
    gclid: toTrimmedString(formData.get("gclid")),
    utmSource: toTrimmedString(formData.get("utmSource")),
    utmMedium: toTrimmedString(formData.get("utmMedium")),
    utmCampaign: toTrimmedString(formData.get("utmCampaign")),
    utmTerm: toTrimmedString(formData.get("utmTerm")),
    utmContent: toTrimmedString(formData.get("utmContent")),
    landingPage: toTrimmedString(formData.get("landingPage")),
    referrer: toTrimmedString(formData.get("referrer")),
    turnstileToken,
  };
};

const formUsesTurnstile = (form) =>
  form.querySelector(".cf-turnstile") instanceof HTMLElement;

const resetTurnstile = (form) => {
  if (!formUsesTurnstile(form)) return;
  if (typeof window.turnstile?.reset !== "function") return;
  window.turnstile.reset();
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
      setFormStatus(
        form,
        "Please complete all required fields marked with * before submitting.",
        "is-error"
      );
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
    if (formUsesTurnstile(form) && !payload.turnstileToken) {
      setFormStatus(
        form,
        "Please complete the security verification before submitting.",
        "is-error"
      );
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = true;
    }
    form.setAttribute("aria-busy", "true");
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
        let serverErrorMessage = `Request failed with status ${response.status}`;
        try {
          const responseBody = await response.json();
          if (
            responseBody &&
            typeof responseBody === "object" &&
            typeof responseBody.error === "string"
          ) {
            serverErrorMessage = responseBody.error;
          }
        } catch {}
        throw new Error(serverErrorMessage);
      }

      setFormStatus(form, "Thanks. Redirecting you now...", "is-success");

      // Wait for GA to confirm the event was sent before navigating.
      // Falls back to a timeout so the redirect is never blocked.
      // Redirects immediately if gtag is unavailable (ad blockers, etc.).
      await new Promise((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          window.location.assign("/thank-you/");
          resolve();
        };

        if (typeof gtag !== "function") {
          finish();
          return;
        }

        const fallback = setTimeout(finish, 1000);
        gtag("event", "generate_lead", {
          form_source: payload.source,
          loan_type: payload.loanType,
          loan_amount: payload.loanAmount,
          event_callback: () => { clearTimeout(fallback); finish(); },
          event_timeout: 1000,
        });
      });
    } catch (error) {
      console.error("Inquiry submission failed", error);
      resetTurnstile(form);
      trackEvent("form_error", {
        form_source: payload.source,
        error_message:
          error instanceof Error ? error.message : "Unknown error",
      });
      setFormStatus(
        form,
        FORM_ERROR_MESSAGE,
        "is-error"
      );
      form.removeAttribute("aria-busy");
      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = false;
      }
    }
  });
});

// --- Sticky bottom bar: show after hero/page-band scrolls away ---
const stickyBar = document.querySelector(".sticky-bar");
if (stickyBar) {
  const trigger = document.querySelector(
    ".hero, .page-band, .service-hero-panel"
  );
  const ctaBand = document.querySelector(".cta-band");

  if (trigger) {
    const showObserver = new IntersectionObserver(
      (entries) => {
        const heroVisible = entries[0].isIntersecting;
        if (heroVisible) {
          stickyBar.classList.remove("is-visible");
          stickyBar.setAttribute("aria-hidden", "true");
          stickyBar.setAttribute("inert", "");
        } else {
          stickyBar.classList.add("is-visible");
          stickyBar.setAttribute("aria-hidden", "false");
          stickyBar.removeAttribute("inert");
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
            stickyBar.setAttribute("aria-hidden", "true");
            stickyBar.setAttribute("inert", "");
          } else if (trigger.getBoundingClientRect().bottom <= 0) {
            stickyBar.classList.add("is-visible");
            stickyBar.setAttribute("aria-hidden", "false");
            stickyBar.removeAttribute("inert");
          }
        },
        { threshold: 0.1 }
      );
      hideObserver.observe(ctaBand);
    }
  }
}

// --- Contact intent beacon (tel/mailto clicks → Worker /contact-intent) ---
const sendContactIntent = (type) => {
  if (!CONTACT_INTENT_ENDPOINT || typeof navigator.sendBeacon !== "function") {
    return;
  }

  const intentPayload = {
    type,
    gaClientId: "",
    gaSessionId: "",
    gaSessionNumber: "",
    landingPage: sessionStorage.getItem("landing_page") || window.location.href,
    referrer: sessionStorage.getItem("referrer") || document.referrer,
    timestamp: new Date().toISOString(),
  };

  const ga4Id = window.__GA4_MEASUREMENT_ID;
  if (typeof gtag === "function" && ga4Id) {
    gtag("get", ga4Id, "client_id", (v) => {
      intentPayload.gaClientId = v;
    });
    gtag("get", ga4Id, "session_id", (v) => {
      intentPayload.gaSessionId = v;
    });
    gtag("get", ga4Id, "session_number", (v) => {
      intentPayload.gaSessionNumber = v;
    });
  }

  // Short delay lets gtag async callbacks populate GA IDs before sending
  setTimeout(() => {
    navigator.sendBeacon(
      CONTACT_INTENT_ENDPOINT,
      new Blob([JSON.stringify(intentPayload)], { type: "application/json" })
    );
  }, 100);
};

// --- GA4: Phone click tracking ---
document.addEventListener("click", (event) => {
  const target = getEventTargetElement(event);
  if (!target) return;

  const link = target.closest('a[href^="tel:"]');
  if (!link) return;

  trackEvent("phone_click", { link_location: getInteractionLocation(link) });
  sendContactIntent("tel_click");
});

// --- GA4: Email click tracking ---
document.addEventListener("click", (event) => {
  const target = getEventTargetElement(event);
  if (!target) return;

  const link = target.closest('a[href^="mailto:"]');
  if (!link) return;

  trackEvent("email_click", { link_location: getInteractionLocation(link) });
  sendContactIntent("mailto_click");
});

// --- GA4: CTA click tracking ---
document.addEventListener("click", (event) => {
  const target = getEventTargetElement(event);
  if (!target) return;

  const link = target.closest(
    'a[href="/get-started/"], a[href*="get-started"]'
  );
  if (!link) return;

  trackEvent("cta_click", {
    link_text: link.textContent.trim(),
    link_location: getInteractionLocation(link),
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
const blogProse = document.querySelector("[data-blog-prose]");
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
  const target = getEventTargetElement(event);
  if (!target) return;

  const link = target.closest("a[href]");
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
