# WritOn onboarding baseline

Date: 2026-09-15. Scope: source and automated-check baseline for onboarding plan O0; physical-device validation remains open.

## Current entry routes

| Entry | Current source behavior | Status |
|---|---|---|
| Fresh signed-out launch | Compact Welcome with Start reading, I want to write, and existing-account sign-in | Implemented |
| Start reading | Marks local guest onboarding complete and opens Home without interests or authentication | Implemented |
| Start writing | Opens account creation and preserves Write as the destination through intent/interests | Implemented; guest draft ownership remains out of scope |
| Shared public story | Resolves supported HTTPS story URLs to `reader/{slug}` and now selects that reader as the initial destination | Implemented in this batch; device test open |
| Notification destination | Resolves Home, inbox, or reader route and consumes it once | Implemented; delivery matrix remains a device test |
| Returning guest/account | Opens Home when local guest completion or Firebase account state exists | Implemented |
| Protected guest action | Shows Sign in / Keep reading and preserves the readable destination | Implemented |
| New account | Optional Read/Write/Both, then interests, then preserved destination | Implemented |
| Existing account | Hydrates account preferences and avoids replay when completion is known | Implemented |

## Analytics dictionary

These are implementation facts, not proof that GA4 is receiving clean production data.

| Outcome | Event or evidence | Current limitation |
|---|---|---|
| App entry | `app_launched`; Welcome `screen_view` | Installation and person counts must not be conflated |
| Welcome decision | `onboarding_entry_selected`, choice `read`, `write`, or `sign_in` | Added in this batch; verify in DebugView/test property before analysis |
| Authentication | Firebase `login`/`sign_up` plus `auth_outcome` | Partial profile completion needs separate operational review |
| Story rendered/opened | `story_opened` | An open is not a qualified read |
| Qualified read | `story_completed`, progress/dwell fields | Product milestone code separately treats 70% progress as qualifying; document the reporting rule consistently |
| First and second distinct reads | `reader_first_story_completed`, `reader_second_story_completed` | Locally deduplicated per analytics profile; reinstalls remain separate installations |
| Next-story choice | `next_story_tapped` | Does not establish completion of the next story by itself |
| Writer activation | `writon_activation` with writer path after draft reaches 100 characters | Records meaningful drafting, not durable sync status |
| Reader activation | `writon_activation` after two qualifying stories and 180 seconds | Different from the first-story milestone; reports must label the definition |
| Publish operation | Performance trace `story_publish` | A dedicated confirmed-publication funnel event is still missing |
| Preferences | Screen views and stored completion state | Dedicated completion/skip outcome events are still missing |

## Prioritised gaps

1. Device-prove shared-story first screen, Back-to-Home behavior, fresh Start reading, relaunch and process recreation.
2. Add explicit preference completed/skipped measurement when O2 changes the interests experience; do it once at the durable-save boundary.
3. Define and emit confirmed durable-draft and confirmed-publication outcomes in O3 without logging writing content.
4. Reconcile `story_completed` reporting with the locally deduplicated 70%-progress milestone before building a funnel dashboard.
5. Verify test-device exclusion and campaign attribution before quoting conversion or retention rates.

## O1 changes made with this baseline

- A resolved incoming story or notification route is now the navigation graph's initial destination. A fresh shared-story visitor no longer has to render Welcome first.
- Welcome choices now emit one bounded event that distinguishes reading, writing and sign-in entry.
- Welcome copy in all six app languages now accurately says readers can read stories and poetry without signing in. It no longer claims all catalog content is verified human work.
- Both Firebase App Testing YAML copies now contain 24 matching journeys, including a fresh-install shared-story test, and use the current Start reading wording.

No API, cloud service, database, bot function, notification campaign or release artifact changed in this batch.
