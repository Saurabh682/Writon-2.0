# Interests onboarding value and loop review

Date: 2026-09-09  
Status: navigation and synchronization defects corrected; product-value gap remains

## Outcome

The interests screen should remain accessible as an optional preference editor, but it should not be treated as a mandatory first-use personalization step until Home actually consumes the saved choices. A visual redesign alone would not add user value.

## Verified behavior

- `InterestsViewModel` stores guest choices locally and signed-in choices in an account-scoped local key. Signed-in saves remain marked pending until the navigation-owned synchronization path confirms the existing account APIs accepted them.
- `retryPendingAccountPreferences` sends pending signed-in interests through the existing API and retains pending state when a request fails, allowing a later connectivity retry.
- Home's `FeedViewModel` still loads `refreshPosts` and `loadPostsPage`. These paths do not read the locally selected interest IDs.
- `PostRepository.loadPersonalizedFeed` exists, but there is no Android caller. Therefore the selected interests currently do not alter the visible first Home feed.
- The visitor entry path currently marks onboarding complete and opens Home directly, so guests do not encounter the interests screen during normal first use.

## Corrected defects

### Settings navigation loop

The prior stack was `Settings -> IntentOnboarding(fromSettings=true) -> Interests(fromSettings=true)`. Completion popped only Interests, revealing IntentOnboarding again and appearing to trap the reader in a loop.

Completion now targets Settings directly. It first pops to the existing Settings entry. If that entry is unexpectedly unavailable, it removes the onboarding edit subflow and opens a single Settings destination. A saved completion guard prevents rapid or repeated callbacks from navigating twice.

### Cancelled and competing synchronization

The interests ViewModel previously performed a local save, invoked the completion callback, and started its own network synchronization. Navigation simultaneously started another synchronization. Leaving the screen manually closed the ViewModel and could cancel its request, while the two owners could also race.

The ViewModel now owns only local persistence and pre-edit hydration/catalog loading. Navigation owns post-completion account synchronization under its existing mutex. Offline or API failure does not block navigation and leaves the local account choices marked pending.

## Tests

Focused command:

```text
gradlew.bat testDebugUnitTest
  --tests com.ibitvalley.writon.modern.ui.navigation.OnboardingRouteTest
  --tests com.ibitvalley.writon.modern.feature.onboarding.InterestsViewModelTest
```

Result: `BUILD SUCCESSFUL` in 14 seconds on 2026-09-09.

Coverage includes:

- Settings completion targets Settings rather than the preceding intent route.
- Ordinary completion resolves to a pending destination or Home.
- Signed-in choices are saved locally, marked pending, and complete immediately without a ViewModel-owned API request.
- Guest choices remain local.
- A stale account cannot save or navigate.
- Existing and legacy interest IDs are not silently discarded.

## Product recommendation

Keep the screen optional through Settings and keep the current guest-first reading path. Do not spend release time on the proposed pill-based visual redesign until one of these evidence-backed integrations is implemented and tested:

1. Home calls the existing personalized-feed path and selected interests measurably alter its candidate mix; or
2. the initial feed applies a deterministic, diverse interest allocation locally without reducing inventory or causing one-story feeds.

Once integration exists, validate that a chosen topic is visible in the first 20 items while preserving language targets, author diversity, exploration inventory, pagination stability, and offline fallback. Until then, forcing the screen adds friction without changing what the reader sees.

## Firebase Anonymous Authentication

Anonymous Authentication does not fix either the navigation loop or the missing feed integration. Guest browsing, local learning, and topic broadcasts already work without creating a Firebase account.

Enabling anonymous accounts later would require an explicit migration design:

- every `FirebaseAuth.currentUser != null`, `firebaseUser != null`, and `signedIn` guard must treat `isAnonymous` separately from a registered account;
- social writes, publishing, profile, library synchronization, and account-only notifications must remain gated for anonymous users;
- signup/login must link or merge the anonymous identity without losing local reading state or creating duplicate profiles;
- collision, logout, deletion, cleanup, abuse, and cross-device behavior need dedicated tests and privacy documentation.

Recommendation: do not enable Anonymous Authentication as an onboarding-loop workaround. Reconsider it only if Firebase Security Rules require installation-scoped guest identity for a concrete feature that cannot remain local.

## Remaining validation

- Run a physical-device Settings flow after the complete candidate is assembled: Settings -> reading preferences -> intent -> interests -> save -> Settings.
- Double-tap Continue during a slow or offline connection and confirm only one navigation occurs.
- Reopen preferences after reconnection and confirm the server-confirmed selection is retained.
- Do not claim interest personalization success until the first Home feed is demonstrably influenced by the chosen topics.
