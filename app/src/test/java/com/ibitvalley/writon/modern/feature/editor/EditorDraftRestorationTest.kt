package com.ibitvalley.writon.modern.feature.editor

import com.ibitvalley.writon.modern.core.database.model.DraftEntity
import com.ibitvalley.writon.modern.data.repository.DraftRepository
import com.ibitvalley.writon.modern.data.repository.MediaRepository
import com.ibitvalley.writon.modern.data.repository.PostRepository
import com.ibitvalley.writon.modern.data.repository.PostPageResult
import com.ibitvalley.writon.modern.core.network.model.PostDto
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.mockito.kotlin.mock
import org.mockito.kotlin.any
import org.mockito.kotlin.anyOrNull
import org.mockito.kotlin.eq
import org.mockito.kotlin.verify
import org.mockito.kotlin.times
import org.mockito.kotlin.whenever

@OptIn(ExperimentalCoroutinesApi::class)
class EditorDraftRestorationTest {
    private val dispatcher = StandardTestDispatcher()
    private val posts: PostRepository = mock()
    private val drafts: DraftRepository = mock()
    private val media: MediaRepository = mock()
    private val storedDrafts = MutableSharedFlow<DraftEntity?>()

    @Before
    fun setUp() {
        Dispatchers.setMain(dispatcher)
        runBlocking { whenever(posts.getCategories()).thenReturn(emptyList()) }
        whenever(drafts.observeLatestDraft()).thenReturn(storedDrafts)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `typing before restoration keeps new content and restores untouched fields`() = runTest(dispatcher) {
        val viewModel = EditorViewModel(posts, drafts, media)
        runCurrent()

        viewModel.updateContent("A new opening written immediately")
        storedDrafts.emit(savedDraft())
        runCurrent()

        assertEquals("A new opening written immediately", viewModel.content.value)
        assertEquals("Recovered title", viewModel.title.value)
        assertEquals("Recovered summary", viewModel.summary.value)
        assertEquals("Poetry", viewModel.category.value)
    }

    @Test
    fun `typing before restoration enters autosave after the stored draft arrives`() = runTest(dispatcher) {
        val stored = savedDraft()
        val persisted = stored.copy(content = "A new opening written immediately")
        whenever(
            drafts.saveLocal(
                existing = eq(stored),
                title = any(),
                content = any(),
                summary = any(),
                category = any(),
                coverImage = anyOrNull(),
                visibility = any()
            )
        ).thenReturn(persisted)
        whenever(drafts.syncDraft(persisted)).thenReturn(Result.success(persisted))
        val viewModel = EditorViewModel(posts, drafts, media)
        runCurrent()

        viewModel.updateContent("A new opening written immediately")
        storedDrafts.emit(stored)
        runCurrent()
        advanceTimeBy(801)
        runCurrent()

        verify(drafts).saveLocal(
            existing = stored,
            title = "Recovered title",
            content = "A new opening written immediately",
            summary = "Recovered summary",
            category = "Poetry",
            coverImage = null,
            visibility = "public"
        )
    }

    @Test
    fun `publishing cancels the pending autosave timer`() = runTest(dispatcher) {
        val stored = savedDraft()
        val finalDraft = stored.copy(content = "Final publishable content")
        whenever(
            drafts.saveLocal(
                existing = anyOrNull(),
                title = any(),
                content = any(),
                summary = any(),
                category = any(),
                coverImage = anyOrNull(),
                visibility = any()
            )
        ).thenReturn(finalDraft)
        whenever(drafts.publish(finalDraft)).thenReturn(Result.success("post-1"))
        whenever(posts.refreshPosts()).thenReturn(PostPageResult(hasMore = false, loadedCount = 0, wasFetched = true))
        val viewModel = EditorViewModel(posts, drafts, media)
        runCurrent()
        storedDrafts.emit(stored)
        runCurrent()

        viewModel.updateContent("Final publishable content")
        viewModel.publishStory(onSuccess = {})
        runCurrent()
        advanceTimeBy(801)
        runCurrent()

        verify(drafts, times(1)).saveLocal(
            existing = anyOrNull(),
            title = any(),
            content = any(),
            summary = any(),
            category = any(),
            coverImage = anyOrNull(),
            visibility = any()
        )
    }

    @Test
    fun `local save failure releases publishing state and keeps a retryable error`() = runTest(dispatcher) {
        val stored = savedDraft()
        whenever(
            drafts.saveLocal(
                existing = anyOrNull(),
                title = any(),
                content = any(),
                summary = any(),
                category = any(),
                coverImage = anyOrNull(),
                visibility = any()
            )
        ).thenThrow(IllegalStateException("database full"))
        val viewModel = EditorViewModel(posts, drafts, media)
        runCurrent()
        storedDrafts.emit(stored)
        runCurrent()

        viewModel.publishStory(onSuccess = {})
        runCurrent()

        assertFalse(viewModel.isPublishing.value)
        assertTrue(viewModel.draftStatus.value is EditorDraftStatus.Failed)
    }

    @Test
    fun `published edit restores the complete story returned by the repository`() = runTest(dispatcher) {
        val completeDraft = savedDraft().copy(syncState = "published_edit")
        val summaryOnlyStory = PostDto(id = "post-1", title = "Recovered title", content = "")
        whenever(drafts.preparePublishedEdit(summaryOnlyStory)).thenReturn(Result.success(completeDraft))
        val viewModel = EditorViewModel(posts, drafts, media)
        runCurrent()

        viewModel.beginEditingPublishedStory(summaryOnlyStory)
        runCurrent()

        assertEquals("Older stored content", viewModel.content.value)
        assertTrue(viewModel.isEditingPublished.value)
        assertEquals(EditorDraftStatus.Saved, viewModel.draftStatus.value)
    }

    @Test
    fun `published edit failure never replaces the editor with an empty story`() = runTest(dispatcher) {
        val summaryOnlyStory = PostDto(id = "post-1", title = "Recovered title", content = "")
        whenever(drafts.preparePublishedEdit(summaryOnlyStory)).thenReturn(
            Result.failure(IllegalStateException("The story text could not be loaded. Please try again."))
        )
        val viewModel = EditorViewModel(posts, drafts, media)
        runCurrent()

        viewModel.beginEditingPublishedStory(summaryOnlyStory)
        runCurrent()

        assertEquals("", viewModel.content.value)
        assertFalse(viewModel.isEditingPublished.value)
        assertTrue(viewModel.draftStatus.value is EditorDraftStatus.Failed)
    }

    private fun savedDraft() = DraftEntity(
        localId = "draft-1",
        ownerKey = "account-a",
        title = "Recovered title",
        content = "Older stored content",
        summary = "Recovered summary",
        category = "Poetry",
        createdAt = 1L,
        updatedAt = 2L
    )
}
