package com.ibitvalley.writon.modern.core.update

enum class InAppUpdateUiState {
    Hidden,
    Available,
    Downloading,
    ReadyToInstall
}

enum class InAppUpdateInstallPhase {
    Idle,
    Pending,
    Downloading,
    Downloaded,
    Installed
}

internal fun shouldReportUpdateAvailable(
    previouslyReportedVersionCode: Int?,
    availableVersionCode: Int,
    updateAvailable: Boolean
): Boolean = updateAvailable && previouslyReportedVersionCode != availableVersionCode

internal fun resolveInAppUpdateUiState(
    updateAvailable: Boolean,
    flexibleUpdateAllowed: Boolean,
    installPhase: InAppUpdateInstallPhase
): InAppUpdateUiState = when (installPhase) {
    InAppUpdateInstallPhase.Downloaded -> InAppUpdateUiState.ReadyToInstall
    InAppUpdateInstallPhase.Pending,
    InAppUpdateInstallPhase.Downloading -> InAppUpdateUiState.Downloading
    InAppUpdateInstallPhase.Installed -> InAppUpdateUiState.Hidden
    InAppUpdateInstallPhase.Idle -> {
        if (updateAvailable && flexibleUpdateAllowed) {
            InAppUpdateUiState.Available
        } else {
            InAppUpdateUiState.Hidden
        }
    }
}
