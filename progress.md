Plan: WritOn Android-First Stabilization Roadmap (remaining non-bot work)

Task 1: complete — established exact architecture, test, UX, and release gaps
Task 2: complete — removed direct NetworkClient access from feature/UI layers
Task 3: complete for locally executable coverage — added unit coverage plus an Android 17 Room 1→2 migration and duplicate-outbox instrumentation suite; physical-device matrix remains external follow-up
Task 4: complete for this stabilization pass — corrected About version data/localization and verified Home status-bar contrast plus 48dp+ Search/Notification targets on an Android 17 emulator
Task 5: complete — serialized the server contract suite; current 28/28 tests pass without changing bot behavior
Task 6: complete — Android lint/unit/release gates, server tests, web build, signed artifact inspection, and Graphify refresh passed
Task 7: complete — external-only physical-device, Play upload, and branch synchronization gates documented

Additional local completion:
- Exported the current Room schema and executed three Android instrumentation tests directly through AndroidJUnitRunner (3/3 pass).
- Deduplicated pending offline draft mutations by operation and local draft id.
- Extracted health/version endpoints into `server/src/routes/app-meta.js` and the complete notification/device-preference surface into `server/src/routes/notifications.js`; the current server suite passes 28/28.

Known external gates:
- Physical-device matrix (two phones), interrupted upload, low storage, reinstall/upgrade.
- Play-delivered version 103 has confirmed Google login; remaining flows need device evidence.
- Android 17 emulator: version 104 debug build installed and launched; Home, Search, auth-required Notifications, Reader, and native Share chooser verified with an empty crash buffer.
- Branch synchronization must wait for an approved, committed release state.

Constraints:
- Do not modify bot implementation, bot routes, bot data, or deferred bot security behavior.
- Preserve the existing dirty `Till_29Aug` stabilization workspace.
