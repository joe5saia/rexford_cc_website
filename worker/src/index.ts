import { EmailMessage } from "cloudflare:email";

interface Env {
  INQUIRY_DB: D1Database;
  INQUIRY_EMAIL: {
    send(message: EmailMessage): Promise<void>;
  };
  MAIL_TO?: string;
  MAIL_FROM?: string;
  ALLOWED_ORIGINS?: string;
  THANK_YOU_URL?: string;
  TURNSTILE_SECRET_KEY?: string;
}

interface InquiryPayload {
  source: string;
  loanType: string;
  loanAmount: string;
  businessType: string;
  timeline: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bestTimeToCall: string;
  details: string;
  website: string;
}

const DEFAULT_ALLOWED_ORIGINS =
  "https://rexfordcommercialcapital.com,https://www.rexfordcommercialcapital.com,https://rexford-cc-website.pages.dev,http://localhost:1313";
const DEFAULT_MAIL_TO = "info@rexfordcc.com";
const DEFAULT_MAIL_FROM = "website@rexfordcc.com";
const DEFAULT_THANK_YOU_URL = "https://rexfordcommercialcapital.com/thank-you/";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_LENGTHS = {
  source: 80,
  loanType: 80,
  loanAmount: 40,
  businessType: 120,
  timeline: 50,
  firstName: 80,
  lastName: 80,
  email: 254,
  phone: 40,
  bestTimeToCall: 80,
  details: 4000,
  website: 255,
} as const;

const REQUIRED_FIELDS: Array<keyof InquiryPayload> = [
  "loanType",
  "loanAmount",
  "firstName",
  "lastName",
  "email",
  "phone",
];

const MAX_REQUEST_BYTES = 32 * 1024;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_INQUIRIES_PER_IP_WINDOW = 5;
const MAX_INQUIRIES_PER_EMAIL_WINDOW = 3;
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const MAX_TURNSTILE_TOKEN_LENGTH = 2048;

export default {
  async fetch(request, env): Promise<Response> {
    const requestUrl = new URL(request.url);
    const cors = buildCorsHeaders(request, env);

    if (requestUrl.pathname !== "/inquiry") {
      return jsonResponse({ ok: false, error: "Not found" }, 404, cors.headers);
    }

    if (request.method === "OPTIONS") {
      if (!cors.allowed) {
        return jsonResponse({ ok: false, error: "Origin not allowed" }, 403, cors.headers);
      }
      return new Response(null, { status: 204, headers: cors.headers });
    }

    if (request.method !== "POST") {
      return jsonResponse(
        { ok: false, error: "Method not allowed" },
        405,
        cors.headers
      );
    }

    if (!cors.allowed) {
      return jsonResponse({ ok: false, error: "Origin not allowed" }, 403, cors.headers);
    }

    if (!(await isBodyWithinLimit(request, MAX_REQUEST_BYTES))) {
      return jsonResponse({ ok: false, error: "Payload too large" }, 413, cors.headers);
    }

    let incoming: Record<string, string>;
    try {
      incoming = await readIncomingFields(request);
    } catch {
      return jsonResponse({ ok: false, error: "Invalid request payload" }, 400, cors.headers);
    }

    const origin = request.headers.get("Origin");
    const turnstileToken = extractTurnstileToken(incoming);
    const turnstileResult = await verifyTurnstileToken(
      env,
      turnstileToken,
      normalizeText(request.headers.get("cf-connecting-ip")) || null,
      getHostnameFromOrigin(origin)
    );
    if (!turnstileResult.allowed) {
      return jsonResponse(
        { ok: false, error: turnstileResult.error },
        turnstileResult.status,
        cors.headers
      );
    }

    const payload = mapInquiryPayload(incoming);
    const validationErrors = validatePayload(payload);
    if (validationErrors.length > 0) {
      return jsonResponse(
        { ok: false, error: "Validation failed", details: validationErrors },
        400,
        cors.headers
      );
    }

    // Honeypot: bots often fill hidden fields, so we silently ignore them.
    if (payload.website.length > 0) {
      return successResponse(request, env, cors.headers, 0);
    }

    const submittedAt = new Date().toISOString();
    const userAgent = normalizeText(request.headers.get("user-agent"));
    const clientIp = normalizeText(request.headers.get("cf-connecting-ip")) || null;
    const ipHash = await hashIp(clientIp);
    const rateLimitExceeded = await hasExceededRateLimit(env, ipHash, payload.email, submittedAt);
    if (rateLimitExceeded) {
      return jsonResponse(
        { ok: false, error: "Too many requests. Please try again shortly." },
        429,
        cors.headers
      );
    }

    const insertResult = await env.INQUIRY_DB.prepare(
      `INSERT INTO inquiries (
        submitted_at,
        source,
        loan_type,
        loan_amount,
        business_type,
        timeline,
        first_name,
        last_name,
        email,
        phone,
        best_time_to_call,
        details,
        ip_hash,
        user_agent,
        email_status,
        raw_payload
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        submittedAt,
        payload.source,
        payload.loanType,
        payload.loanAmount,
        payload.businessType || null,
        payload.timeline || null,
        payload.firstName,
        payload.lastName,
        payload.email,
        payload.phone,
        payload.bestTimeToCall || null,
        payload.details || null,
        ipHash,
        userAgent || null,
        "pending",
        JSON.stringify(payload)
      )
      .run();

    const inquiryId = Number(insertResult.meta.last_row_id ?? 0);

    try {
      await sendInquiryEmail(env, payload, submittedAt, inquiryId);
      await env.INQUIRY_DB.prepare(
        "UPDATE inquiries SET email_status = ?, emailed_at = ? WHERE id = ?"
      )
        .bind("sent", submittedAt, inquiryId)
        .run();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await env.INQUIRY_DB.prepare(
        "UPDATE inquiries SET email_status = ?, email_error = ? WHERE id = ?"
      )
        .bind("failed", message.slice(0, 500), inquiryId)
        .run();
      return jsonResponse(
        { ok: false, error: "Inquiry saved, but email delivery failed" },
        502,
        cors.headers
      );
    }

    return successResponse(request, env, cors.headers, inquiryId);
  },
} satisfies ExportedHandler<Env>;

// Reads JSON or form-encoded bodies and normalizes values to plain string fields.
async function readIncomingFields(request: Request): Promise<Record<string, string>> {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const payload = await request.json<unknown>();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("JSON body must be an object");
    }

    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      if (typeof value === "string") {
        result[key] = value;
      }
    }
    return result;
  }

  const formData = await request.formData();
  const result: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      result[key] = value;
    }
  }

  return result;
}

// Maps inbound field aliases to the canonical inquiry payload shape.
function mapInquiryPayload(fields: Record<string, string>): InquiryPayload {
  return {
    source: pickField(fields, ["source", "Source"]) || "Website Form",
    loanType: pickField(fields, ["loanType", "Loan Type"]),
    loanAmount: pickField(fields, ["loanAmount", "Loan Amount"]),
    businessType: pickField(fields, ["businessType", "Business Type"]),
    timeline: pickField(fields, ["timeline", "Timeline"]),
    firstName: pickField(fields, ["firstName", "First Name"]),
    lastName: pickField(fields, ["lastName", "Last Name"]),
    email: pickField(fields, ["email", "Email"]).toLowerCase(),
    phone: pickField(fields, ["phone", "Phone"]),
    bestTimeToCall: pickField(fields, ["bestTimeToCall", "Best Time to Call"]),
    details: pickField(fields, ["details", "Details"]),
    website: pickField(fields, ["website", "Website"]),
  };
}

// Enforces required fields, basic email syntax, and per-field max lengths.
function validatePayload(payload: InquiryPayload): string[] {
  const errors: string[] = [];

  for (const key of REQUIRED_FIELDS) {
    if (!payload[key]) {
      errors.push(`${key} is required`);
    }
  }

  if (payload.email && !EMAIL_PATTERN.test(payload.email)) {
    errors.push("email format is invalid");
  }

  for (const [field, maxLength] of Object.entries(MAX_LENGTHS)) {
    const value = payload[field as keyof InquiryPayload];
    if (value.length > maxLength) {
      errors.push(`${field} exceeds ${maxLength} characters`);
    }
  }

  return errors;
}

// Builds CORS headers and determines whether the request origin is allowed.
function buildCorsHeaders(request: Request, env: Env): { allowed: boolean; headers: Headers } {
  const origin = request.headers.get("Origin");
  const allowedOrigins = new Set(
    (env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS)
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
  );

  const headers = new Headers({
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });

  // Only browser requests are supported for this endpoint.
  if (!origin) {
    return { allowed: false, headers };
  }

  if (!allowedOrigins.has(origin)) {
    return { allowed: false, headers };
  }

  headers.set("Access-Control-Allow-Origin", origin);
  return { allowed: true, headers };
}

// Protects Worker resources by rejecting oversized request bodies early.
async function isBodyWithinLimit(request: Request, maxBytes: number): Promise<boolean> {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const parsedLength = Number(contentLength);
    if (Number.isFinite(parsedLength)) {
      return parsedLength <= maxBytes;
    }
  }

  const bodySize = (await request.clone().arrayBuffer()).byteLength;
  return bodySize <= maxBytes;
}

// Accepts either Turnstile's default field name or a custom alias used by JS posts.
function extractTurnstileToken(fields: Record<string, string>): string {
  return normalizeText(
    fields.turnstileToken || fields["cf-turnstile-response"] || fields.cf_turnstile_response
  );
}

// Parses an origin into a hostname for strict Turnstile hostname matching.
function getHostnameFromOrigin(origin: string | null): string | null {
  if (!origin) {
    return null;
  }

  try {
    return new URL(origin).hostname;
  } catch {
    return null;
  }
}

interface TurnstileVerifyResponse {
  success?: boolean;
  hostname?: string;
  "error-codes"?: string[];
}

interface TurnstileValidationResult {
  allowed: boolean;
  error: string;
  status: number;
}

// Verifies Turnstile tokens server-side so form submissions cannot bypass the widget.
async function verifyTurnstileToken(
  env: Env,
  token: string,
  remoteIp: string | null,
  expectedHostname: string | null
): Promise<TurnstileValidationResult> {
  if (!env.TURNSTILE_SECRET_KEY) {
    return { allowed: false, error: "Security verification is unavailable", status: 503 };
  }

  if (!token) {
    return { allowed: false, error: "Please complete the security verification", status: 400 };
  }

  if (token.length > MAX_TURNSTILE_TOKEN_LENGTH) {
    return { allowed: false, error: "Security verification token is invalid", status: 400 };
  }

  const body = new URLSearchParams();
  body.set("secret", env.TURNSTILE_SECRET_KEY);
  body.set("response", token);
  if (remoteIp) {
    body.set("remoteip", remoteIp);
  }

  let verificationResponse: Response;
  try {
    verificationResponse = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
  } catch {
    return { allowed: false, error: "Security verification failed", status: 502 };
  }

  if (!verificationResponse.ok) {
    return { allowed: false, error: "Security verification failed", status: 502 };
  }

  let verificationData: TurnstileVerifyResponse;
  try {
    verificationData = await verificationResponse.json<TurnstileVerifyResponse>();
  } catch {
    return { allowed: false, error: "Security verification failed", status: 502 };
  }

  if (!verificationData.success) {
    return { allowed: false, error: "Security verification failed", status: 403 };
  }

  if (expectedHostname && verificationData.hostname !== expectedHostname) {
    return { allowed: false, error: "Security verification failed", status: 403 };
  }

  return { allowed: true, error: "", status: 200 };
}

// Small helper for consistent JSON responses with shared headers.
function jsonResponse(
  payload: Record<string, unknown>,
  status: number,
  baseHeaders: Headers
): Response {
  const headers = new Headers(baseHeaders);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(payload), { status, headers });
}

// Returns either a browser redirect (for plain form posts) or JSON (for JS submissions).
function successResponse(
  request: Request,
  env: Env,
  baseHeaders: Headers,
  inquiryId: number
): Response {
  if (shouldRedirectToThankYou(request)) {
    return Response.redirect(env.THANK_YOU_URL || DEFAULT_THANK_YOU_URL, 303);
  }

  return jsonResponse({ ok: true, inquiryId }, 200, baseHeaders);
}

// Plain HTML form posts should redirect users to the thank-you page.
function shouldRedirectToThankYou(request: Request): boolean {
  const contentType = request.headers.get("content-type") || "";
  return (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  );
}

// Returns the first non-empty value across a list of possible field keys.
function pickField(fields: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    const value = normalizeText(fields[key]);
    if (value) {
      return value;
    }
  }
  return "";
}

// Normalizes unknown values into trimmed strings.
function normalizeText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

// Stores a one-way hash instead of raw IP addresses for basic privacy hardening.
async function hashIp(ipAddress: string | null): Promise<string | null> {
  if (!ipAddress) {
    return null;
  }

  const bytes = new TextEncoder().encode(ipAddress);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// Limits repeated submissions to reduce spam and automated abuse.
async function hasExceededRateLimit(
  env: Env,
  ipHash: string | null,
  email: string,
  submittedAt: string
): Promise<boolean> {
  const submittedTimestamp = Date.parse(submittedAt);
  const windowStart = new Date(submittedTimestamp - RATE_LIMIT_WINDOW_MS).toISOString();

  if (ipHash) {
    const row = await env.INQUIRY_DB.prepare(
      "SELECT COUNT(1) AS request_count FROM inquiries WHERE ip_hash = ? AND submitted_at >= ?"
    )
      .bind(ipHash, windowStart)
      .first<{ request_count?: number | string }>();
    const requestCount = Number(row?.request_count ?? 0);
    return requestCount >= MAX_INQUIRIES_PER_IP_WINDOW;
  }

  // In environments where client IP is unavailable, fall back to email as a coarse limit key.
  const row = await env.INQUIRY_DB.prepare(
    "SELECT COUNT(1) AS request_count FROM inquiries WHERE email = ? AND submitted_at >= ?"
  )
    .bind(email, windowStart)
    .first<{ request_count?: number | string }>();
  const requestCount = Number(row?.request_count ?? 0);
  return requestCount >= MAX_INQUIRIES_PER_EMAIL_WINDOW;
}

// Builds and sends the inquiry notification email with the required subject format.
async function sendInquiryEmail(
  env: Env,
  payload: InquiryPayload,
  submittedAt: string,
  inquiryId: number
): Promise<void> {
  const fromAddress = sanitizeHeaderValue(env.MAIL_FROM || DEFAULT_MAIL_FROM);
  const toAddress = sanitizeHeaderValue(env.MAIL_TO || DEFAULT_MAIL_TO);
  const subject = sanitizeHeaderValue(
    `Website Inquiry: ${payload.firstName} ${payload.lastName}`
  );

  const lines = [
    `Inquiry ID: ${inquiryId}`,
    `Submitted At (UTC): ${submittedAt}`,
    `Source: ${payload.source}`,
    "",
    `Name: ${payload.firstName} ${payload.lastName}`,
    `Email: ${payload.email}`,
    `Phone: ${payload.phone}`,
    `Loan Type: ${payload.loanType}`,
    `Loan Amount: ${payload.loanAmount}`,
    `Business Type: ${payload.businessType || "N/A"}`,
    `Timeline: ${payload.timeline || "N/A"}`,
    `Best Time To Call: ${payload.bestTimeToCall || "N/A"}`,
    "",
    "Details:",
    payload.details || "N/A",
  ];

  const body = lines.join("\n");
  const rawEmail = [
    `From: Rexford Commercial Capital <${fromAddress}>`,
    `To: ${toAddress}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="utf-8"',
    "",
    body,
  ].join("\r\n");

  const message = new EmailMessage(fromAddress, toAddress, rawEmail);
  await env.INQUIRY_EMAIL.send(message);
}

// Prevents header injection by removing CRLF characters from header values.
function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}
