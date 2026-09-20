package com.ibitvalley.writon.modern.core.telemetry

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class WritOnTelemetryExclusionTest {

    @Test
    fun `identifies excluded tester user IDs`() {
        assertTrue(WritOnTelemetry.isExcludedUser("FMpu4Aqe25R07h8Mz0TrHzRliVp1"))
        assertTrue(WritOnTelemetry.isExcludedUser("2da1tH0nPIhYmsSXuKtwdSONj542"))
    }

    @Test
    fun `allows regular user IDs`() {
        assertFalse(WritOnTelemetry.isExcludedUser("regular_user_uid_12345"))
        assertFalse(WritOnTelemetry.isExcludedUser(null))
        assertFalse(WritOnTelemetry.isExcludedUser(""))
    }
}
