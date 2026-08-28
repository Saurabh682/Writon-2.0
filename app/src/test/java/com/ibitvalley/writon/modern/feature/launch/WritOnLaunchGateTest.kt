package com.ibitvalley.writon.modern.feature.launch

import java.net.UnknownHostException
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class WritOnLaunchGateTest {
    @Test
    fun `optional request returns response`() = runBlocking {
        assertEquals("current", optionalNetworkRequest { "current" })
    }

    @Test
    fun `optional request treats DNS failure as offline`() = runBlocking {
        assertNull(optionalNetworkRequest<String> { throw UnknownHostException("offline") })
    }
}
