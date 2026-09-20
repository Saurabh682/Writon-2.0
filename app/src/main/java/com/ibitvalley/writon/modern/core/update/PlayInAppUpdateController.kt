package com.ibitvalley.writon.modern.core.update

import com.ibitvalley.writon.modern.core.telemetry.WritOnTelemetry

import android.app.Activity
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.IntentSenderRequest
import com.google.android.play.core.appupdate.AppUpdateInfo
import com.google.android.play.core.appupdate.AppUpdateManager
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.appupdate.AppUpdateOptions
import com.google.android.play.core.install.InstallState
import com.google.android.play.core.install.InstallStateUpdatedListener
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.InstallStatus
import com.google.android.play.core.install.model.UpdateAvailability
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Owns the Google Play flexible-update lifecycle. Failures are intentionally silent because
 * sideloaded, debug, and non-Play installs cannot use the Play update flow.
 */
class PlayInAppUpdateController(
    private val activity: Activity,
    private val updateManager: AppUpdateManager = AppUpdateManagerFactory.create(activity)
) : InstallStateUpdatedListener {

    private val _uiState = MutableStateFlow(InAppUpdateUiState.Hidden)
    val uiState: StateFlow<InAppUpdateUiState> = _uiState.asStateFlow()

    private var latestUpdateInfo: AppUpdateInfo? = null
    private var reportedAvailableVersionCode: Int? = null
    private var dismissedForSession = false
    private var downloadedReported = false
    private var installedReported = false

    init {
        updateManager.registerListener(this)
    }

    fun checkForUpdate() {
        updateManager.appUpdateInfo
            .addOnSuccessListener { updateInfo ->
                val phase = updateInfo.installStatus().toInstallPhase()
                if (dismissedForSession && phase != InAppUpdateInstallPhase.Downloaded) {
                    _uiState.value = InAppUpdateUiState.Hidden
                    return@addOnSuccessListener
                }
                val isAvailable = updateInfo.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE
                if (shouldReportUpdateAvailable(reportedAvailableVersionCode, updateInfo.availableVersionCode(), isAvailable)) {
                    WritOnTelemetry.inAppUpdateAvailable(activity, updateInfo.availableVersionCode())
                    reportedAvailableVersionCode = updateInfo.availableVersionCode()
                }
                latestUpdateInfo = updateInfo
                _uiState.value = resolveInAppUpdateUiState(
                    updateAvailable = isAvailable,
                    flexibleUpdateAllowed = updateInfo.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE),
                    installPhase = phase
                )
            }
            .addOnFailureListener {
                if (_uiState.value != InAppUpdateUiState.Downloading &&
                    _uiState.value != InAppUpdateUiState.ReadyToInstall
                ) {
                    _uiState.value = InAppUpdateUiState.Hidden
                }
            }
    }

    fun startFlexibleUpdate(launcher: ActivityResultLauncher<IntentSenderRequest>) {
        val updateInfo = latestUpdateInfo ?: run {
            checkForUpdate()
            return
        }
        if (_uiState.value != InAppUpdateUiState.Available ||
            !updateInfo.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE)
        ) return

        WritOnTelemetry.inAppUpdateStarted(activity)
        runCatching {
            updateManager.startUpdateFlowForResult(
                updateInfo,
                launcher,
                AppUpdateOptions.newBuilder(AppUpdateType.FLEXIBLE).build()
            )
        }.onFailure {
            _uiState.value = InAppUpdateUiState.Hidden
        }
    }

    fun onUpdateFlowResult(resultCode: Int) {
        if (resultCode != Activity.RESULT_OK) {
            WritOnTelemetry.inAppUpdateDismissed(activity)
            dismissedForSession = true
            _uiState.value = InAppUpdateUiState.Hidden
        }
    }

    fun completeUpdate() {
        if (_uiState.value == InAppUpdateUiState.ReadyToInstall) {
            WritOnTelemetry.inAppUpdateCompletionRequested(activity)
            updateManager.completeUpdate()
        }
    }

    override fun onStateUpdate(state: InstallState) {
        _uiState.value = resolveInAppUpdateUiState(
            updateAvailable = latestUpdateInfo?.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE,
            flexibleUpdateAllowed = latestUpdateInfo?.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE) == true,
            installPhase = state.installStatus().toInstallPhase()
        )
        if (state.installStatus() == InstallStatus.DOWNLOADED && !downloadedReported) {
            downloadedReported = true
            WritOnTelemetry.inAppUpdateDownloaded(activity)
        }
        if (state.installStatus() == InstallStatus.INSTALLED && !installedReported) {
            installedReported = true
            WritOnTelemetry.inAppUpdateInstalled(activity)
        }
        if (state.installStatus() == InstallStatus.FAILED ||
            state.installStatus() == InstallStatus.CANCELED
        ) {
            dismissedForSession = true
            _uiState.value = InAppUpdateUiState.Hidden
        }
    }

    fun close() {
        updateManager.unregisterListener(this)
    }
}

private fun Int.toInstallPhase(): InAppUpdateInstallPhase = when (this) {
    InstallStatus.PENDING -> InAppUpdateInstallPhase.Pending
    InstallStatus.DOWNLOADING -> InAppUpdateInstallPhase.Downloading
    InstallStatus.DOWNLOADED -> InAppUpdateInstallPhase.Downloaded
    InstallStatus.INSTALLED -> InAppUpdateInstallPhase.Installed
    else -> InAppUpdateInstallPhase.Idle
}
