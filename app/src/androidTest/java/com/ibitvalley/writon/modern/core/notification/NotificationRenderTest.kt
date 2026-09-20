package com.ibitvalley.writon.modern.core.notification

import android.Manifest
import android.app.NotificationManager
import android.os.Build
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class NotificationRenderTest {
    @Test
    fun brandedNotificationIsPostedWithItsProductionChannel() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val context = instrumentation.targetContext
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            instrumentation.uiAutomation.grantRuntimePermission(
                context.packageName,
                Manifest.permission.POST_NOTIFICATIONS
            )
        }

        WritOnNotificationManager.createNotificationChannels(context)
        WritOnNotificationManager.sendTestNotification(context)

        val manager = context.getSystemService(NotificationManager::class.java)
        assertTrue(
            manager.activeNotifications.any { notification ->
                notification.id == 777 &&
                    notification.notification.channelId == WritOnNotificationManager.CHANNEL_INTERACTIONS
            }
        )
    }
}
