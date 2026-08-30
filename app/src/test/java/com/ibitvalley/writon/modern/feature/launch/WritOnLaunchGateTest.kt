package com.ibitvalley.writon.modern.feature.launch

import java.net.UnknownHostException
import com.ibitvalley.writon.modern.core.network.model.AppVersionResponseDto
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class WritOnLaunchGateTest {
    private val version = AppVersionResponseDto(
        latestVersionCode = 113,
        minSupportedVersionCode = 101,
        updateUrl = "https://play.google.com/store/apps/details?id=com.ibitvalley.writon"
    )

    @Test
    fun `optional request returns response`() = runBlocking {
        assertEquals("current", optionalNetworkRequest { "current" })
    }

    @Test
    fun `optional request treats DNS failure as offline`() = runBlocking {
        assertNull(optionalNetworkRequest<String> { throw UnknownHostException("offline") })
    }

    @Test
    fun `optional newer release never interrupts launch`() {
        assertNull(requiredAppUpdatePrompt(installedVersionCode = 108, remoteVersion = version))
    }

    @Test
    fun `fresh minimum version policy can require an update`() {
        val required = requiredAppUpdatePrompt(installedVersionCode = 100, remoteVersion = version)

        assertEquals(version.updateUrl, required?.url)
        assertEquals(true, required?.required)
    }

    @Test
    fun `offline launch never blocks on a cached policy`() {
        assertNull(requiredAppUpdatePrompt(installedVersionCode = 1, remoteVersion = null))
    }
}
