package com.ibitvalley.writon.modern.core.telemetry

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class CampaignAttributionTest {
    @Test
    fun `accepts Instagram Story delivery IDs and extracts language`() {
        assertEquals(
            "bn",
            CampaignAttribution.validatedDeliveryLanguage(
                "2609_d24_ig_story_story_bn_verified_quote_poem"
            )
        )
    }

    @Test
    fun `accepts regular platform delivery IDs`() {
        assertEquals(
            "mr",
            CampaignAttribution.validatedDeliveryLanguage(
                "2609_d27_x_post_mr_story_spotlight"
            )
        )
    }

    @Test
    fun `rejects unknown platforms and unsupported languages`() {
        assertNull(
            CampaignAttribution.validatedDeliveryLanguage(
                "2609_d27_unknown_post_mr_story_spotlight"
            )
        )
        assertNull(
            CampaignAttribution.validatedDeliveryLanguage(
                "2609_d27_x_post_fr_story_spotlight"
            )
        )
    }
}
