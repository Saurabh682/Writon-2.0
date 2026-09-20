package com.ibitvalley.writon.modern.core.update

import org.junit.Assert.assertEquals
import org.junit.Test

class InAppUpdatePolicyTest {

    // Regression: assigning latestUpdateInfo before comparing version codes suppressed every event.
    @Test
    fun `new available version is reported once`() {
        assertEquals(true, shouldReportUpdateAvailable(null, 140, updateAvailable = true))
        assertEquals(false, shouldReportUpdateAvailable(140, 140, updateAvailable = true))
        assertEquals(true, shouldReportUpdateAvailable(140, 141, updateAvailable = true))
        assertEquals(false, shouldReportUpdateAvailable(140, 141, updateAvailable = false))
    }

    // Regression: an update downloaded by Play could be hidden after availability changes.
    @Test
    fun `downloaded update is ready even when a new update is no longer reported`() {
        assertEquals(
            InAppUpdateUiState.ReadyToInstall,
            resolveInAppUpdateUiState(
                updateAvailable = false,
                flexibleUpdateAllowed = false,
                installPhase = InAppUpdateInstallPhase.Downloaded
            )
        )
    }

    // Regression: devices or installs ineligible for flexible updates could show a dead control.
    @Test
    fun `available indicator requires Play flexible update eligibility`() {
        assertEquals(
            InAppUpdateUiState.Hidden,
            resolveInAppUpdateUiState(
                updateAvailable = true,
                flexibleUpdateAllowed = false,
                installPhase = InAppUpdateInstallPhase.Idle
            )
        )
        assertEquals(
            InAppUpdateUiState.Available,
            resolveInAppUpdateUiState(
                updateAvailable = true,
                flexibleUpdateAllowed = true,
                installPhase = InAppUpdateInstallPhase.Idle
            )
        )
    }

    // Regression: an active Play download could incorrectly disappear from the Home UI.
    @Test
    fun `pending and downloading phases remain visible as progress`() {
        assertEquals(
            InAppUpdateUiState.Downloading,
            resolveInAppUpdateUiState(false, false, InAppUpdateInstallPhase.Pending)
        )
        assertEquals(
            InAppUpdateUiState.Downloading,
            resolveInAppUpdateUiState(false, false, InAppUpdateInstallPhase.Downloading)
        )
    }

    // Regression: stale availability metadata could make the update control reappear after install.
    @Test
    fun `installed phase always hides the update control`() {
        assertEquals(
            InAppUpdateUiState.Hidden,
            resolveInAppUpdateUiState(true, true, InAppUpdateInstallPhase.Installed)
        )
    }
}
