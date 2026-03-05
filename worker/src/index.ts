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
  ATTIO_API_KEY?: string;
  ATTIO_LIST_ID?: string;
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
  gaClientId: string;
  gaSessionId: string;
  gaSessionNumber: string;
  gclid: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
  landingPage: string;
  referrer: string;
}

/** Shape of the contact-intent beacon payload sent by the frontend. */
interface ContactIntentPayload {
  type: string;
  gaClientId: string;
  gaSessionId: string;
  gaSessionNumber: string;
  landingPage: string;
  referrer: string;
  timestamp: string;
}

const DEFAULT_ALLOWED_ORIGINS =
  "https://rexfordcommercialcapital.com,https://www.rexfordcommercialcapital.com,https://rexford-cc-website.pages.dev,http://localhost:1313";
const DEFAULT_MAIL_TO = "info@rexfordcc.com";
const DEFAULT_MAIL_FROM = "website@rexfordcc.com";
const DEFAULT_THANK_YOU_URL = "https://rexfordcommercialcapital.com/thank-you/";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_LENGTHS: Record<string, number> = {
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
  gaClientId: 100,
  gaSessionId: 100,
  gaSessionNumber: 20,
  gclid: 200,
  utmSource: 200,
  utmMedium: 200,
  utmCampaign: 200,
  utmTerm: 200,
  utmContent: 200,
  landingPage: 2000,
  referrer: 2000,
};

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
const MAX_INTENTS_PER_IP_WINDOW = 20;
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const MAX_TURNSTILE_TOKEN_LENGTH = 2048;
const ATTIO_BASE_URL = "https://api.attio.com";

export default {
  async fetch(request, env): Promise<Response> {
    const requestUrl = new URL(request.url);
    const cors = buildCorsHeaders(request, env);

    // --- Route: POST /contact-intent ---
    if (requestUrl.pathname === "/contact-intent") {
      return handleContactIntent(request, env, cors);
    }

    // --- Route: POST /inquiry ---
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
        raw_payload,
        ga_client_id,
        ga_session_id,
        ga_session_number,
        gclid,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_term,
        utm_content,
        landing_page,
        referrer
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
        JSON.stringify(payload),
        payload.gaClientId || null,
        payload.gaSessionId || null,
        payload.gaSessionNumber || null,
        payload.gclid || null,
        payload.utmSource || null,
        payload.utmMedium || null,
        payload.utmCampaign || null,
        payload.utmTerm || null,
        payload.utmContent || null,
        payload.landingPage || null,
        payload.referrer || null
      )
      .run();

    const inquiryId = Number(insertResult.meta.last_row_id ?? 0);

    // Attio CRM sync (best-effort — must not block email or break submission)
    const attioResult = await syncToAttio(env, payload, inquiryId, submittedAt);
    if (attioResult.error) {
      console.error("Attio sync failed:", attioResult.error);
    }

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

// ---------------------------------------------------------------------------
// Contact-intent endpoint
// ---------------------------------------------------------------------------

/** Handles the fire-and-forget /contact-intent beacon from tel/mailto clicks. */
async function handleContactIntent(
  request: Request,
  env: Env,
  cors: { allowed: boolean; headers: Headers }
): Promise<Response> {
  if (request.method === "OPTIONS") {
    if (!cors.allowed) {
      return jsonResponse({ ok: false, error: "Origin not allowed" }, 403, cors.headers);
    }
    return new Response(null, { status: 204, headers: cors.headers });
  }

  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405, cors.headers);
  }

  if (!cors.allowed) {
    return jsonResponse({ ok: false, error: "Origin not allowed" }, 403, cors.headers);
  }

  let body: ContactIntentPayload;
  try {
    body = await request.json<ContactIntentPayload>();
  } catch {
    return new Response(null, { status: 400, headers: cors.headers });
  }

  const clientIp = normalizeText(request.headers.get("cf-connecting-ip")) || null;
  const ipHash = await hashIp(clientIp);

  // Rate limit: 20 intents per IP per 10-minute window (silent drop on exceed)
  if (ipHash) {
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const row = await env.INQUIRY_DB.prepare(
      "SELECT COUNT(1) AS cnt FROM contact_intents WHERE ip_hash = ? AND created_at >= ?"
    )
      .bind(ipHash, windowStart)
      .first<{ cnt?: number | string }>();
    if (Number(row?.cnt ?? 0) >= MAX_INTENTS_PER_IP_WINDOW) {
      // Silent drop — return 204 to avoid leaking rate-limit info to bots
      return new Response(null, { status: 204, headers: cors.headers });
    }
  }

  const intentType = normalizeText(body.type);
  if (intentType !== "tel_click" && intentType !== "mailto_click") {
    return new Response(null, { status: 400, headers: cors.headers });
  }

  await env.INQUIRY_DB.prepare(
    `INSERT INTO contact_intents
       (created_at, type, ga_client_id, ga_session_id, ga_session_number,
        landing_page, referrer, ip_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    new Date().toISOString(),
    intentType,
    normalizeText(body.gaClientId) || null,
    normalizeText(body.gaSessionId) || null,
    normalizeText(body.gaSessionNumber) || null,
    normalizeText(body.landingPage) || null,
    normalizeText(body.referrer) || null,
    ipHash,
  ).run();

  return new Response(null, { status: 204, headers: cors.headers });
}

// ---------------------------------------------------------------------------
// Attio CRM integration
// ---------------------------------------------------------------------------

interface AttioSyncResult {
  personRecordId: string | null;
  listEntryId: string | null;
  noteId: string | null;
  error: string | null;
}

/** Shared fetch wrapper for Attio API calls with Bearer auth. */
async function attioFetch(
  env: Env,
  method: string,
  path: string,
  body?: unknown
): Promise<{ ok: boolean; status: number; data?: unknown; error?: string }> {
  if (!env.ATTIO_API_KEY) {
    return { ok: false, status: 0, error: "ATTIO_API_KEY not configured" };
  }

  let response: Response;
  try {
    response = await fetch(`${ATTIO_BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${env.ATTIO_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    return { ok: false, status: 0, error: message };
  }

  if (!response.ok) {
    const text = await response.text();
    return { ok: false, status: response.status, error: text.slice(0, 500) };
  }

  const data = await response.json();
  return { ok: true, status: response.status, data };
}

/** Creates or updates a Person in Attio, matching by email address. */
async function upsertAttioPerson(
  env: Env,
  payload: InquiryPayload
): Promise<{ personRecordId: string | null; error?: string }> {
  const result = await attioFetch(env, "PUT",
    "/v2/objects/people/records?matching_attribute=email_addresses",
    {
      data: {
        values: {
          email_addresses: [{ email_address: payload.email }],
          name: [{
            first_name: payload.firstName,
            last_name: payload.lastName,
            full_name: `${payload.firstName} ${payload.lastName}`,
          }],
          phone_numbers: payload.phone
            ? [{ original_phone_number: payload.phone }]
            : [],
          // Custom attributes (created via scripts/attio-create-attributes.sh)
          utm_source: payload.utmSource ? [{ value: payload.utmSource }] : [],
          utm_medium: payload.utmMedium ? [{ value: payload.utmMedium }] : [],
          utm_campaign: payload.utmCampaign ? [{ value: payload.utmCampaign }] : [],
          utm_term: payload.utmTerm ? [{ value: payload.utmTerm }] : [],
          utm_content: payload.utmContent ? [{ value: payload.utmContent }] : [],
          gclid: payload.gclid ? [{ value: payload.gclid }] : [],
          ga_client_id: payload.gaClientId ? [{ value: payload.gaClientId }] : [],
          landing_page: payload.landingPage ? [{ value: payload.landingPage }] : [],
          referrer: payload.referrer ? [{ value: payload.referrer }] : [],
        },
      },
    }
  );

  if (!result.ok) {
    return { personRecordId: null, error: result.error };
  }

  const record = result.data as { data?: { id?: { record_id?: string } } };
  return { personRecordId: record?.data?.id?.record_id ?? null };
}

/** Adds the Person to the "Inbound Leads" list (idempotent). */
async function assertAttioListEntry(
  env: Env,
  personRecordId: string
): Promise<{ entryId: string | null; error?: string }> {
  if (!env.ATTIO_LIST_ID) {
    return { entryId: null, error: "ATTIO_LIST_ID not configured" };
  }

  const result = await attioFetch(env, "PUT",
    `/v2/lists/${env.ATTIO_LIST_ID}/entries`,
    {
      data: {
        parent_record_id: personRecordId,
        parent_object: "people",
        entry_values: {},
      },
    }
  );

  if (!result.ok) {
    return { entryId: null, error: result.error };
  }

  const entry = result.data as { data?: { id?: { entry_id?: string } } };
  return { entryId: entry?.data?.id?.entry_id ?? null };
}

/** Attaches a markdown Note to the Person with full submission context. */
async function createAttioNote(
  env: Env,
  personRecordId: string,
  payload: InquiryPayload,
  inquiryId: number,
  submittedAt: string,
  contactIntents: Array<{ type: string; created_at: string; landing_page: string }>
): Promise<{ noteId: string | null; error?: string }> {
  const lines: string[] = [
    `# Website Inquiry #${inquiryId}`,
    "",
    "## Contact Information",
    `- **Name:** ${payload.firstName} ${payload.lastName}`,
    `- **Email:** ${payload.email}`,
    `- **Phone:** ${payload.phone || "N/A"}`,
    "",
    "## Loan Details",
    `- **Type:** ${payload.loanType}`,
    `- **Amount:** ${payload.loanAmount}`,
    `- **Business Type:** ${payload.businessType || "N/A"}`,
    `- **Timeline:** ${payload.timeline || "N/A"}`,
    `- **Best Time to Call:** ${payload.bestTimeToCall || "N/A"}`,
    "",
    "## Additional Details",
    payload.details || "N/A",
    "",
    "## Marketing Context",
    `- **Source Page:** ${payload.source}`,
    `- **Landing Page:** ${payload.landingPage || "N/A"}`,
    `- **Referrer:** ${payload.referrer || "N/A"}`,
    `- **UTM Source:** ${payload.utmSource || "N/A"}`,
    `- **UTM Medium:** ${payload.utmMedium || "N/A"}`,
    `- **UTM Campaign:** ${payload.utmCampaign || "N/A"}`,
    `- **UTM Term:** ${payload.utmTerm || "N/A"}`,
    `- **UTM Content:** ${payload.utmContent || "N/A"}`,
    `- **GCLID:** ${payload.gclid || "N/A"}`,
    "",
    "## Analytics",
    `- **GA Client ID:** ${payload.gaClientId || "N/A"}`,
    `- **GA Session ID:** ${payload.gaSessionId || "N/A"}`,
    `- **GA Session #:** ${payload.gaSessionNumber || "N/A"}`,
    `- **Submitted At:** ${submittedAt}`,
  ];

  if (contactIntents.length > 0) {
    lines.push("", "## Prior Contact Intents");
    for (const intent of contactIntents) {
      lines.push(`- **${intent.type}** at ${intent.created_at} (page: ${intent.landing_page || "N/A"})`);
    }
  }

  const result = await attioFetch(env, "POST", "/v2/notes", {
    data: {
      parent_object: "people",
      parent_record_id: personRecordId,
      title: `Website Inquiry #${inquiryId}: ${payload.firstName} ${payload.lastName}`,
      format: "markdown",
      content: lines.join("\n"),
    },
  });

  if (!result.ok) {
    return { noteId: null, error: result.error };
  }

  const note = result.data as { data?: { id?: { note_id?: string } } };
  return { noteId: note?.data?.id?.note_id ?? null };
}

/**
 * Orchestrates the three-step Attio sync: upsert Person → assert List Entry → create Note.
 * Returns partial results so the caller can log what succeeded before a failure.
 */
async function syncToAttio(
  env: Env,
  payload: InquiryPayload,
  inquiryId: number,
  submittedAt: string
): Promise<AttioSyncResult> {
  const result: AttioSyncResult = {
    personRecordId: null, listEntryId: null, noteId: null, error: null,
  };

  // Bail out early if Attio is not configured — not an error, just skip.
  if (!env.ATTIO_API_KEY) {
    return result;
  }

  try {
    // Step 1: Upsert Person
    const person = await upsertAttioPerson(env, payload);
    if (!person.personRecordId) {
      result.error = `Person upsert failed: ${person.error}`;
      await updateAttioSyncStatus(env, inquiryId, "failed", result);
      return result;
    }
    result.personRecordId = person.personRecordId;

    // Step 2: Assert List Entry
    const entry = await assertAttioListEntry(env, result.personRecordId);
    if (!entry.entryId) {
      result.error = `List entry failed: ${entry.error}`;
      await updateAttioSyncStatus(env, inquiryId, "failed", result);
      return result;
    }
    result.listEntryId = entry.entryId;

    // Step 3: Fetch prior contact intents for this GA client ID
    let contactIntents: Array<{ type: string; created_at: string; landing_page: string }> = [];
    if (payload.gaClientId) {
      const rows = await env.INQUIRY_DB.prepare(
        `SELECT type, created_at, landing_page FROM contact_intents
         WHERE ga_client_id = ? AND created_at >= datetime('now', '-30 days')
         ORDER BY created_at DESC LIMIT 20`
      ).bind(payload.gaClientId).all();
      contactIntents = (rows.results ?? []) as typeof contactIntents;
    }

    // Step 4: Create Note
    const note = await createAttioNote(
      env, result.personRecordId, payload, inquiryId, submittedAt, contactIntents
    );
    if (!note.noteId) {
      result.error = `Note creation failed: ${note.error}`;
      await updateAttioSyncStatus(env, inquiryId, "partial", result);
      return result;
    }
    result.noteId = note.noteId;

    await updateAttioSyncStatus(env, inquiryId, "success", result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    result.error = message;
    try {
      await updateAttioSyncStatus(env, inquiryId, "failed", result);
    } catch {
      console.error("Failed to update Attio sync status after error:", message);
    }
  }

  return result;
}

/** Persists Attio sync outcomes to D1 for auditability. */
async function updateAttioSyncStatus(
  env: Env,
  inquiryId: number,
  status: string,
  result: AttioSyncResult
): Promise<void> {
  await env.INQUIRY_DB.prepare(
    `UPDATE inquiries SET
       attio_person_id = ?,
       attio_list_entry_id = ?,
       attio_note_id = ?,
       attio_sync_status = ?,
       attio_sync_error = ?,
       attio_synced_at = ?
     WHERE id = ?`
  ).bind(
    result.personRecordId,
    result.listEntryId,
    result.noteId,
    status,
    result.error?.slice(0, 500) ?? null,
    new Date().toISOString(),
    inquiryId,
  ).run();
}

// ---------------------------------------------------------------------------
// Request parsing
// ---------------------------------------------------------------------------

/** Reads JSON or form-encoded bodies and normalizes values to plain string fields. */
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

/** Maps inbound field aliases to the canonical inquiry payload shape. */
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
    gaClientId: pickField(fields, ["gaClientId"]),
    gaSessionId: pickField(fields, ["gaSessionId"]),
    gaSessionNumber: pickField(fields, ["gaSessionNumber"]),
    gclid: pickField(fields, ["gclid"]),
    utmSource: pickField(fields, ["utmSource"]),
    utmMedium: pickField(fields, ["utmMedium"]),
    utmCampaign: pickField(fields, ["utmCampaign"]),
    utmTerm: pickField(fields, ["utmTerm"]),
    utmContent: pickField(fields, ["utmContent"]),
    landingPage: pickField(fields, ["landingPage"]),
    referrer: pickField(fields, ["referrer"]),
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Enforces required fields, basic email syntax, and per-field max lengths. */
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
    if (value && value.length > maxLength) {
      errors.push(`${field} exceeds ${maxLength} characters`);
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

/** Builds CORS headers and determines whether the request origin is allowed. */
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

// ---------------------------------------------------------------------------
// Body-size guard
// ---------------------------------------------------------------------------

/** Protects Worker resources by rejecting oversized request bodies early. */
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

// ---------------------------------------------------------------------------
// Turnstile verification
// ---------------------------------------------------------------------------

/** Accepts either Turnstile's default field name or a custom alias used by JS posts. */
function extractTurnstileToken(fields: Record<string, string>): string {
  return normalizeText(
    fields.turnstileToken || fields["cf-turnstile-response"] || fields.cf_turnstile_response
  );
}

/** Parses an origin into a hostname for strict Turnstile hostname matching. */
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

/** Verifies Turnstile tokens server-side so form submissions cannot bypass the widget. */
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

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

/** Small helper for consistent JSON responses with shared headers. */
function jsonResponse(
  payload: Record<string, unknown>,
  status: number,
  baseHeaders: Headers
): Response {
  const headers = new Headers(baseHeaders);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(payload), { status, headers });
}

/** Returns either a browser redirect (for plain form posts) or JSON (for JS submissions). */
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

/** Plain HTML form posts should redirect users to the thank-you page. */
function shouldRedirectToThankYou(request: Request): boolean {
  const contentType = request.headers.get("content-type") || "";
  return (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  );
}

// ---------------------------------------------------------------------------
// String utilities
// ---------------------------------------------------------------------------

/** Returns the first non-empty value across a list of possible field keys. */
function pickField(fields: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    const value = normalizeText(fields[key]);
    if (value) {
      return value;
    }
  }
  return "";
}

/** Normalizes unknown values into trimmed strings. */
function normalizeText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

/** Stores a one-way hash instead of raw IP addresses for basic privacy hardening. */
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

/** Limits repeated submissions to reduce spam and automated abuse. */
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

// ---------------------------------------------------------------------------
// Email notification
// ---------------------------------------------------------------------------

/** Builds and sends the inquiry notification email with the required subject format. */
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
    `Submitted At: ${new Date(submittedAt).toLocaleString("en-US", { timeZone: "America/New_York", weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit", timeZoneName: "short" })}`,
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
  const messageId = `<${crypto.randomUUID()}@rexfordcommercialcapital.com>`;
  const rawEmail = [
    `From: Rexford Commercial Capital <${fromAddress}>`,
    `To: ${toAddress}`,
    `Subject: ${subject}`,
    `Message-ID: ${messageId}`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="utf-8"',
    "",
    body,
  ].join("\r\n");

  const message = new EmailMessage(fromAddress, toAddress, rawEmail);
  await env.INQUIRY_EMAIL.send(message);
}

/** Prevents header injection by removing CRLF characters from header values. */
function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}
