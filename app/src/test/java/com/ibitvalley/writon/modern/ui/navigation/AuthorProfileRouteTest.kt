package com.ibitvalley.writon.modern.ui.navigation

import org.junit.Assert.assertEquals
import org.junit.Test

class AuthorProfileRouteTest {
    @Test
    fun `following list carries its known relationship into the author profile`() {
        assertEquals(
            "author/writer-1?followingHint=true",
            WritOnRoute.AuthorProfile.createRoute("writer-1", followingHint = true),
        )
    }

    @Test
    fun `ordinary author navigation does not claim a following relationship`() {
        assertEquals(
            "author/writer-1?followingHint=false",
            WritOnRoute.AuthorProfile.createRoute("writer-1"),
        )
    }
}
