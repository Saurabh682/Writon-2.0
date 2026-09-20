package com.ibitvalley.writon.modern.core.designsystem.components

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class UserAvatarTest {
    @Test
    fun `initials remain available as the remote image fallback`() {
        assertEquals("KS", extractInitials("Kumar Saurabh"))
        assertEquals("W", extractInitials(""))
    }

    @Test
    fun `only real custom URLs use the remote image loader`() {
        assertTrue(shouldLoadRemoteAvatar("https://cdn.writon.cc/profile/avatar.jpg"))
        assertTrue(shouldLoadRemoteAvatar("https://api.writon.cc/api/v1/media/profiles%2Fwriter%2Favatar.webp"))
        assertTrue(
            shouldLoadRemoteAvatar(
                "https://writon-app-api-staging-802112841589.asia-south1.run.app/api/v1/media/profiles%2Fwriter%2Favatar.webp",
                "https://writon-app-api-staging-802112841589.asia-south1.run.app"
            )
        )
        assertTrue(shouldLoadRemoteAvatar("https://lh3.googleusercontent.com/a/ACg8ocIS0V123abc456"))
        assertTrue(shouldLoadRemoteAvatar("https://lh5.googleusercontent.com/proxy/abc123xyz"))
        assertTrue(shouldLoadRemoteAvatar("https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300"))
        assertTrue(shouldLoadRemoteAvatar("https://firebasestorage.googleapis.com/v0/b/writon-app-2020.appspot.com/o/avatar.jpg"))
        assertFalse(shouldLoadRemoteAvatar(null))
        assertFalse(shouldLoadRemoteAvatar("  "))
        assertFalse(shouldLoadRemoteAvatar("http://api.writon.cc/api/v1/media/profile.webp"))
        assertFalse(shouldLoadRemoteAvatar("http://lh3.googleusercontent.com/a/ACg8oc"))
        assertFalse(shouldLoadRemoteAvatar("https://tracker.example/avatar.png"))
        assertFalse(shouldLoadRemoteAvatar("file:///data/user/0/private-avatar.png"))
        assertFalse(shouldLoadRemoteAvatar("content://media/external/images/1"))
        assertFalse(shouldLoadRemoteAvatar("javascript:alert('avatar')"))
        assertFalse(shouldLoadRemoteAvatar("https://ui-avatars.com/api/?name=Kumar"))
        assertFalse(shouldLoadRemoteAvatar("https://api.dicebear.com/9.x/initials/svg"))
    }

    @Test
    fun `photo picker content URI is accepted only as a local preview`() {
        assertTrue(shouldLoadLocalAvatarPreview("content://media/picker/0/com.android.providers.media.photopicker/media/42"))
        assertFalse(shouldLoadRemoteAvatar("content://media/picker/0/com.android.providers.media.photopicker/media/42"))
        assertFalse(shouldLoadLocalAvatarPreview("file:///data/user/0/private-avatar.png"))
        assertFalse(shouldLoadLocalAvatarPreview("https://api.writon.cc/avatar.webp"))
    }
}
