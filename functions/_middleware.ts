/**
 * Cloudflare Pages Functions middleware for multi-domain routing.
 *
 * Domain mapping:
 *   rexfordfleetfinance.com     → /services/equipment-financing/
 *   rexfordequipmentfinance.com → /services/equipment-financing/
 *   rexfordpropertyfinance.com  → /services/commercial-real-estate/
 *   rexfordfundingpros.com      → standard home page
 *   rexfordlendinggroup.com     → standard home page
 *
 * For service-landing domains the middleware:
 *   1. Rewrites the root path (/) to serve the mapped service page.
 *   2. Uses HTMLRewriter to redirect Home / logo links to the canonical
 *      site (rexfordcommercialcapital.com) so visitors can reach the
 *      full homepage without a routing loop.
 *   3. Rewrites the <link rel="canonical"> to point at the current domain
 *      so each landing domain is SEO-distinct.
 */

/** Canonical origin for the main website. */
const CANONICAL_ORIGIN = "https://rexfordcommercialcapital.com";

/**
 * Map of hostnames (without www) to the service path they should display
 * at their root URL.  Domains absent from this map serve the standard
 * home page with no rewriting.
 */
const SERVICE_DOMAIN_MAP: Record<string, string> = {
  "rexfordfleetfinance.com": "/services/equipment-financing/",
  "rexfordequipmentfinance.com": "/services/equipment-financing/",
  "rexfordpropertyfinance.com": "/services/commercial-real-estate/",
};

/**
 * Strip a leading "www." from a hostname so both www and bare domain match.
 */
function normalizeHostname(hostname: string): string {
  return hostname.replace(/^www\./, "");
}

/**
 * Determine whether a given hostname is a service-landing domain.
 */
function isServiceDomain(hostname: string): boolean {
  return normalizeHostname(hostname) in SERVICE_DOMAIN_MAP;
}

/**
 * Return the internal service path for a service-landing domain,
 * or undefined if the domain is not a service-landing domain.
 */
function servicePath(hostname: string): string | undefined {
  return SERVICE_DOMAIN_MAP[normalizeHostname(hostname)];
}

// ---------------------------------------------------------------------------
// HTMLRewriter handlers
// ---------------------------------------------------------------------------

/**
 * Rewrite <a> tags that point to "/" so they redirect to the canonical site
 * instead of looping back to the service landing page.
 */
class HomeLinksRewriter implements HTMLRewriterElementContentHandlers {
  element(el: Element): void {
    const href = el.getAttribute("href");
    if (href === "/") {
      el.setAttribute("href", CANONICAL_ORIGIN + "/");
    }
  }
}

/**
 * Rewrite <link rel="canonical"> to reference the current landing domain
 * so each domain has its own canonical URL.
 */
class CanonicalRewriter implements HTMLRewriterElementContentHandlers {
  private readonly origin: string;

  constructor(origin: string) {
    this.origin = origin;
  }

  element(el: Element): void {
    const rel = el.getAttribute("rel");
    if (rel === "canonical") {
      // Service domains always land on "/", so canonical is the root.
      el.setAttribute("href", this.origin + "/");
    }
  }
}

/**
 * Rewrite <meta property="og:url"> to match the landing domain.
 */
class OGUrlRewriter implements HTMLRewriterElementContentHandlers {
  private readonly origin: string;

  constructor(origin: string) {
    this.origin = origin;
  }

  element(el: Element): void {
    const property = el.getAttribute("property");
    if (property === "og:url") {
      el.setAttribute("content", this.origin + "/");
    }
  }
}

// ---------------------------------------------------------------------------
// Middleware entry point
// ---------------------------------------------------------------------------

export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const hostname = url.hostname;

  const targetPath = servicePath(hostname);

  // Standard domain or non-root path — pass through unchanged.
  if (!targetPath || url.pathname !== "/") {
    // For service domains on non-root paths, still rewrite Home links so
    // the nav logo always points to the canonical site.
    if (isServiceDomain(hostname)) {
      const response = await context.next();
      const origin = `${url.protocol}//${url.host}`;
      return new HTMLRewriter()
        .on('a[href="/"]', new HomeLinksRewriter())
        .transform(response);
    }
    return context.next();
  }

  // Service-landing domain at root path — internally rewrite to the service page.
  const rewrittenUrl = new URL(url);
  rewrittenUrl.pathname = targetPath;

  const serviceRequest = new Request(rewrittenUrl.toString(), context.request);
  const response = await context.env.ASSETS.fetch(serviceRequest);

  // Rewrite the HTML so Home links, canonical, and OG URL reflect this domain.
  const origin = `${url.protocol}//${url.host}`;
  return new HTMLRewriter()
    .on('a[href="/"]', new HomeLinksRewriter())
    .on("link", new CanonicalRewriter(origin))
    .on("meta", new OGUrlRewriter(origin))
    .transform(response);
};
