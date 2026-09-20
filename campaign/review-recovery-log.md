# WritOn Play Store Review Recovery & Operations Log

> **Objective**: Maintain a structured rating baseline, track user-visible complaint categories, log active investigations, and record 48-hour response SLAs for all actionable 1–3 star Play Store reviews.

---

## 📊 1. Product-Quality & Ratings Baseline (Phase 0)

| Metric Category | Metric Name | Baseline Value (v2.0.29 / Code 131) | 30-Day Target | Measurement Source |
| :--- | :--- | :--- | :--- | :--- |
| **Ratings** | Current Average Play Rating | `Pending Founder Play Console Export` | $\ge 4.5\star$ | Play Console > Ratings & Reviews > Overview |
| **Ratings** | Total Lifetime Written Reviews | `Pending Founder Play Console Export` | +50 to +100 reviews | Play Console > Reviews |
| **Ratings** | 1–3 Star Negative Review Ratio | `Pending Founder Play Console Export` | $< 5\%$ of new reviews | Play Console > Rating distribution |
| **Stability** | Crash-Free Users (7d) | $> 99.8\%$ (Guardrail) | $\ge 99.9\%$ | Firebase Crashlytics |
| **Stability** | ANR Rate (7d) | $< 0.05\%$ (Guardrail) | $< 0.02\%$ | Google Play Console > Vitals |
| **Core Journeys** | Google Sign-in / Auth Success | $> 99.0\%$ (Guardrail) | $\ge 99.5\%$ | Firebase Auth + App Telemetry |
| **Core Journeys** | Story Publishing Success Rate | $> 99.2\%$ (Guardrail) | $\ge 99.8\%$ | Server Outbox & PostgreSQL logs |
| **Engagement** | Median Engaged Reading Time | $180\text{ s}$ (Eligibility gate) | $> 240\text{ s}$ | In-App Telemetry (`reader_engaged`) |
| **Engagement** | Story Completion Rate ($\ge 70\%$) | $70\%$ (Eligibility gate) | $> 60\%$ reader cohort | In-App Telemetry (`review_eligible`) |

> [!IMPORTANT]
> **Action for Founder before public launch**: Open Google Play Console $\to$ **Rating analysis**, record the exact current lifetime rating and review count into this table, and commit.

---

## 🏷️ 2. User-Visible Failure Taxonomy (Phase 3)

| Failure Category | Classification | Suppresses Review? | Quiet Period After Resolution |
| :--- | :--- | :--- | :--- |
| `auth_failure` | **User Visible** | ✅ Yes (blocks review flow) | **72 hours** after successful login |
| `publish_failure` | **User Visible** | ✅ Yes (blocks review flow) | **72 hours** after successful publication |
| `draft_loss` | **User Visible** | ✅ Yes (blocks review flow) | **72 hours** after draft recovery |
| `sync_conflict` | **User Visible** | ✅ Yes (blocks review flow) | **72 hours** after sync resolution |
| `feed_load_error` | **User Visible** | ✅ Yes (blocks review flow) | **72 hours** after successful feed fetch |
| `install_referrer_error` | **Background Recovered** | ❌ No (diagnostic only) | N/A (Crashlytics non-fatal only) |
| `push_token_error` | **Background Recovered** | ❌ No (diagnostic only) | N/A (Crashlytics non-fatal only) |
| `prefetch_cache_miss` | **Background Recovered** | ❌ No (diagnostic only) | N/A (Crashlytics non-fatal only) |

---

## 📝 3. Actionable Review Log (1–3 Star Reviews)

| Date | Star Rating | Language | Version | Complaint Category | Description & User Feedback | Associated Bug / Ticket | Response Date | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| *YYYY-MM-DD* | `★☆☆☆☆` | `en` | `v2.0.26` | `login_failure` | *Sample complaint description* | `#WRITON-101` | *YYYY-MM-DD* | `Investigating` / `Resolved` |

---

## 💬 4. Standard Response Principles & Templates

### Response Rules (Play Policy Compliant):
1. **Never ask for a rating upgrade**: Never say "Please give us 5 stars if we fix this."
2. **Never offer incentives**: No promo codes, gifts, or financial compensation for reviews.
3. **Acknowledge specific pain points**: Cite the actual bug or feature without generic boilerplate.
4. **Respond within 48 hours**: Speed and empathy convert critical reviews into loyal advocates.

### Templates:

#### A. Sync / Story Loading Issue:
> *"Hello [User], thank you for sharing your feedback. We apologize for the issue loading stories on the feed. In version 2.0.26, we updated our network routing and offline caching to resolve this. Please update the app, and if you continue to experience issues, contact us at support@writon.cc so we can assist directly."*

#### B. Draft Autosave / Editor Feedback:
> *"Hello [User], we understand how crucial your drafts are. WritOn includes local biometric autosave and offline drafting. We're actively improving our manuscript editor based on your feedback. Please reach out to us at support@writon.cc if any content was affected so we can help."*

#### C. Feature Request / Language Support:
> *"Hello [User], thank you for the wonderful suggestion! We are constantly expanding our regional language curation and typography across Hindi, Bengali, Marathi, and English. Stay tuned for upcoming updates!"*
