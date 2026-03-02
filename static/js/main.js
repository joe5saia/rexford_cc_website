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

      setFormStatus(form, "Thanks. Redirecting you now...", "is-success");
      window.location.assign("/thank-you/");
    } catch (error) {
      console.error("Inquiry submission failed", error);
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
