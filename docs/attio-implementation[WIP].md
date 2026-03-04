# Attio Website Lead Capture — Implementation Document (March 2026)

## 1) Objective

Implement a **server-side** integration so that:

1. **Website lead form submissions** create or update a **Person** in Attio (idempotent by email), then add them to an **Inbound Leads** list, and attach a **Note** containing the full context.
2. **“Call us” (tel:)** and **“Email us” (mailto:)** link clicks are captured in Google Analytics *and* stored server-side so they can be attached to the eventual Attio lead record if the visitor later submits the form.
3. Capture **Google Analytics context** (client/session IDs + UTMs + landing page/referrer) and store it with the lead.

Attio API access will use a **single-workspace API key** (Bearer token) and will be called only from the backend. ([docs.attio.com][1])

---

## 2) High-level architecture

### Data flow

```mermaid
flowchart LR
  A[Website] -->|Lead form POST /api/leads| B[Backend]
  A -->|tel/mailto click POST /api/contact-intent (sendBeacon)| B
  B -->|Persist lead + intents| D[(DB)]
  B -->|Upsert Person| C[Attio API]
  B -->|Upsert List Entry (Inbound Leads)| C
  B -->|Create Note on Person| C
  B -->|Optional: alert/Slack/email| E[Notifications]
```

### Why server-side

* Keeps the Attio API key private.
* Lets us do dedupe, retries, and auditing cleanly.
* Lets us correlate tel/mailto clicks with later form submissions.

---

## 3) Attio configuration (one-time setup)

### 3.1 Create an Attio API key

Create a workspace API key and store it in your secret manager. Use it as:

`Authorization: Bearer <access_token>` ([docs.attio.com][1])

**Minimum scopes (recommended)**

* People record upsert: `record_permission:read-write`, `object_configuration:read` ([docs.attio.com][2])
* List entry upsert: `list_entry:read-write`, `list_configuration:read` ([docs.attio.com][3])
* Notes: `note:read-write`, `object_configuration:read`, `record_permission:read` ([docs.attio.com][4])

### 3.2 Create a List: “Inbound Leads”

Create an Attio **List** based on the **People** object named **Inbound Leads**.

**Statuses (configure in Attio UI)**

* New (default)
* Contacted
* Qualified
* Disqualified

Attio status attributes are managed on **lists** (people/companies objects don’t support status attributes). ([docs.attio.com][5])

> Recommendation: ensure **New** is the default/first status so the API doesn’t have to set it explicitly on entry creation.

### 3.3 (Optional but recommended) Custom attributes

Keep the base record clean; put “sales workflow” fields either on the **Inbound Leads list entry** or on the **Person** depending on whether they’re globally true.

**Recommended Person attributes**

* `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`
* `gclid`
* `ga_client_id`
* `landing_page`
* `referrer`

You can create attributes via API if you want to automate it (e.g., `POST /v2/{target}/{identifier}/attributes`). ([docs.attio.com][6])

---

## 4) Data model decisions

### 4.1 Person-first (company optional)

Your leads are usually **small business owners** and you often **don’t know the business name** at first.

**Decision**

* Always create/update **Person**.
* Only create/link **Company** when:

  * the user explicitly provides it, **or**
  * we can infer a likely company domain from the email (e.g., not gmail/outlook/yahoo).

Attio supports linking a Person to a Company either via an existing company record id, or by providing a domain reference. ([docs.attio.com][7])

### 4.2 Dedupe rule

**Email is the unique key** for people in Attio.

Use Attio’s **Assert a person record** endpoint with:

* `PUT /v2/objects/people/records`
* query param `matching_attribute=email_addresses`

Attio documents that for person records, `email_addresses` is the only unique attribute used for matching. ([docs.attio.com][2])

---

## 5) Website implementation requirements

### 5.1 Lead form fields

**Visible fields (typical)**

* name (or first + last)
* email (required)
* phone (optional but recommended)
* message / “what are you looking for?” (optional)
* (optional) business name

**Hidden fields (auto-captured)**

* `ga_client_id`
* `ga_session_id`
* `ga_session_number`
* `gclid` (if available)
* `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`
* `landing_page` (full URL)
* `referrer`
* `submitted_at` (ISO timestamp)

#### Getting GA identifiers (gtag.js)

Use the Google tag `get` command to retrieve GA4 values:

* `client_id`
* `session_id`
* `session_number`
* and `gclid` for Ads targets

This is supported in the official gtag API. ([Google for Developers][8])

Example pattern (JS pseudocode):

* On page load, call:

  * `gtag('get', 'G-XXXX', 'client_id', cb)`
  * `gtag('get', 'G-XXXX', 'session_id', cb)`
  * `gtag('get', 'G-XXXX', 'session_number', cb)`
* Store results in memory and inject into hidden form fields before submit.

### 5.2 GA event tracking (no PII)

* On successful form submit, send GA4 recommended event: `generate_lead`
* Do **not** include email/phone/name in GA parameters.

`generate_lead` is the recommended event for lead generation via a form; it supports an optional `lead_source` parameter. ([Google for Developers][9])

### 5.3 Tel/mailto click capture

You have two goals:

1. Track in GA
2. Persist server-side so it can be attached to a later lead

**Implementation**

* Add click handlers on `a[href^="tel:"]` and `a[href^="mailto:"]`
* Fire a GA event (custom name is fine; don’t include PII)
* Send a backend event using `navigator.sendBeacon()` (preferred) or `fetch(..., { keepalive: true })` so it survives navigation to the dialer/email client.

Payload should include:

* `type`: `"tel_click"` | `"mailto_click"`
* `ga_client_id`, `ga_session_id`, `ga_session_number`
* `landing_page`, `referrer`, `utm_*`
* `timestamp`

> Note: this tracks *intent to contact*. It does not guarantee the call/email actually happened.

---

## 6) Backend implementation

### 6.1 Endpoints

#### `POST /api/contact-intent`

Records tel/mailto click “intent” events keyed by GA client id.

* Validates payload shape
* Persists to DB
* Returns 204 (no content)

#### `POST /api/leads`

Receives the form submission.

* Validates inputs (email required)
* Spam controls (rate limiting + captcha if you use one)
* Persists the submission
* Performs Attio sync (inline or async job)
* Returns 200 with a simple success payload

### 6.2 Database tables (minimal)

#### `lead_submissions`

* `id` (uuid)
* `created_at`
* `name_first`, `name_last`, `name_full`
* `email`
* `phone`
* `message`
* `business_name` (nullable)
* `landing_page`, `referrer`
* `utm_*`
* `ga_client_id`, `ga_session_id`, `ga_session_number`
* `gclid` (nullable)
* `user_agent`, `ip` (optional)

#### `contact_intents`

* `id` (uuid)
* `created_at`
* `type` (`tel_click`/`mailto_click`)
* `ga_client_id` (index)
* `landing_page`, `referrer`
* `utm_*`
* `ga_session_id`, `ga_session_number`

#### `attio_sync_log`

* `lead_submission_id`
* `attio_person_record_id`
* `attio_list_entry_id`
* `attio_note_id`
* `status` (`success`/`failed`)
* `attempt_count`
* `last_error`

---

## 7) Attio API integration details

### 7.1 Upsert Person (idempotent by email)

Use **Assert a person Record**:

* `PUT /v2/objects/people/records`
* query param: `matching_attribute=email_addresses` ([docs.attio.com][2])

Example payload structure (based on Attio docs) includes `email_addresses`, `name`, optional `phone_numbers`, and optional `company` reference. ([docs.attio.com][2])

**Company handling**

* If business name is present: (phase 1) store it as text attribute and let humans normalize later.
* If email domain looks like a company domain (not a free provider): attach `company` by domain reference (supported by Attio). ([docs.attio.com][7])

### 7.2 Add to “Inbound Leads” list (idempotent)

Use **Assert a list entry by parent**:

* `PUT /v2/lists/{list}/entries` ([docs.attio.com][3])

This ensures there is only one list entry for this Person in that list; Attio warns it will error with `MULTIPLE_MATCH_RESULTS` if multiple entries already exist for the same parent record in that list. ([docs.attio.com][3])

**Important**: Make “New” the default list status in Attio UI so we don’t have to write status values programmatically.

### 7.3 Create a Note on the Person

Use **Create a note**:

* `POST /v2/notes`
* body includes `parent_object`, `parent_record_id`, `title`, `format`, `content` ([docs.attio.com][4])

**Note content should include**

* The form fields (message, phone, business name if given)
* The marketing context (UTMs, landing page, referrer)
* GA identifiers (client/session IDs, gclid)
* Any related `contact_intents` pulled from DB for that `ga_client_id` (last 7–30 days)

---

## 8) Handling tel/mailto that never submit a form

### 8.1 What we can do in Phase 1 (recommended)

* Track clicks in GA + store `contact_intents` in DB.
* If a form later arrives from the same GA client id, attach those intents in the Attio note.

### 8.2 What requires additional tooling (Phase 2 options)

If you want **actual inbound emails/calls** to create Attio leads even without a form:

* **Inbound email automation**: route email to a shared inbox and build an ingestion job that upserts the sender as a Person + creates a note (subject, snippet). (This is easiest if you standardize on a single “sales@” inbox.)
* **Call tracking**: use a provider that can webhook call events with caller id; then upsert by phone/email (email is better, but phone can at least create a placeholder record). Without this, “click-to-call” is only intent.

---

## 9) Error handling, retries, and rate limits

### 9.1 Retry strategy

* Prefer an async job queue if you want strong delivery guarantees.
* Retry on:

  * network errors
  * 429 / rate limit
  * 5xx
* Do not retry on:

  * 4xx validation errors (log and drop)

### 9.2 Idempotency

* Person: upsert by `email_addresses` (Attio-supported unique match). ([docs.attio.com][2])
* List entry: upsert by parent record id. ([docs.attio.com][3])
* Note: can create duplicates if you retry; mitigate by:

  * writing a deterministic `title` including `lead_submission_id`
  * storing `attio_note_id` in `attio_sync_log` after success so retries don’t re-create

---

## 10) Acceptance criteria

### Lead form → Attio

* Submitting the form creates/updates a Person in Attio with:

  * email + name (+ phone if provided) ([docs.attio.com][7])
* The person appears in the “Inbound Leads” list (exactly one entry per person).
* A note is attached to the person containing:

  * form content + UTMs + landing page/referrer + GA ids ([docs.attio.com][4])

### Tel/mailto

* Clicking tel/mailto creates:

  * a GA event (custom)
  * a `contact_intents` row in DB (via `sendBeacon` or `keepalive`)
* If the same user later submits the form (same GA client id), the lead note includes a section listing prior contact intents.

### Reliability

* If Attio is down or returns rate limits, the submission is still saved server-side and will retry (or at least is visible in logs for manual replay).

---

## 11) Implementation checklist (engineer task breakdown)

1. **Attio**

   * Create API key + store in secrets manager. ([docs.attio.com][1])
   * Create “Inbound Leads” list + statuses (“New” default). ([docs.attio.com][5])
   * (Optional) Create custom attributes for UTMs/GA metadata. ([docs.attio.com][6])

2. **Frontend**

   * Add hidden fields to lead form for GA/UTM context.
   * Implement GA id retrieval via `gtag('get', ...)`. ([Google for Developers][8])
   * Implement tel/mailto click listeners + `sendBeacon` to `/api/contact-intent`.

3. **Backend**

   * Build `/api/contact-intent` endpoint + DB persistence.
   * Build `/api/leads` endpoint + validation + persistence.
   * Implement Attio client:

     * Upsert person (`matching_attribute=email_addresses`). ([docs.attio.com][2])
     * Upsert list entry by parent. ([docs.attio.com][3])
     * Create note. ([docs.attio.com][4])
   * Add structured logs + `attio_sync_log`.

4. **QA**

   * Verify dedupe by submitting same email twice (updates, no duplicates).
   * Verify tel/mailto intent appears in later lead note.
   * Verify GA events fire without PII.


[1]: https://docs.attio.com/rest-api/guides/authentication "https://docs.attio.com/rest-api/guides/authentication"
[2]: https://docs.attio.com/rest-api/endpoint-reference/people/assert-a-person-record "https://docs.attio.com/rest-api/endpoint-reference/people/assert-a-person-record"
[3]: https://docs.attio.com/rest-api/endpoint-reference/entries/assert-a-list-entry-by-parent "https://docs.attio.com/rest-api/endpoint-reference/entries/assert-a-list-entry-by-parent"
[4]: https://docs.attio.com/rest-api/endpoint-reference/notes/create-a-note "https://docs.attio.com/rest-api/endpoint-reference/notes/create-a-note"
[5]: https://docs.attio.com/rest-api/endpoint-reference/attributes/list-statuses "https://docs.attio.com/rest-api/endpoint-reference/attributes/list-statuses"
[6]: https://docs.attio.com/rest-api/endpoint-reference/attributes/create-an-attribute "https://docs.attio.com/rest-api/endpoint-reference/attributes/create-an-attribute"
[7]: https://docs.attio.com/rest-api/endpoint-reference/people/create-a-person-record "https://docs.attio.com/rest-api/endpoint-reference/people/create-a-person-record"
[8]: https://developers.google.com/tag-platform/gtagjs/reference "https://developers.google.com/tag-platform/gtagjs/reference"
[9]: https://developers.google.com/analytics/devguides/collection/ga4/reference/events "https://developers.google.com/analytics/devguides/collection/ga4/reference/events"
