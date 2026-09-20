package com.ibitvalley.writon.modern.feature.search

import org.junit.Assert.assertEquals
import org.junit.Test

class SearchResultStateTest {
    @Test fun `server empty is distinct from offline empty`() {
        assertEquals(SearchResultState.EMPTY, resolveSearchResultState(remoteSucceeded = true, hasResults = false))
        assertEquals(SearchResultState.ERROR, resolveSearchResultState(remoteSucceeded = false, hasResults = false))
    }

    @Test fun `cached results are labelled only after remote failure`() {
        assertEquals(SearchResultState.CACHED, resolveSearchResultState(remoteSucceeded = false, hasResults = true))
        assertEquals(SearchResultState.FRESH, resolveSearchResultState(remoteSucceeded = true, hasResults = true))
    }
}
