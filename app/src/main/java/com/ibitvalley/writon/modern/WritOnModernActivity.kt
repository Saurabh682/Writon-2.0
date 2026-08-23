package com.ibitvalley.writon.modern

import android.Manifest
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.navigation.compose.rememberNavController
import com.ibitvalley.writon.modern.core.database.WritOnDatabase
import com.ibitvalley.writon.modern.core.auth.FirebaseAuthManager
import com.ibitvalley.writon.modern.core.preferences.UserPreferences
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnTheme
import com.ibitvalley.writon.modern.core.network.NetworkClient
import com.ibitvalley.writon.modern.core.notification.WritOnNotificationManager
import com.ibitvalley.writon.modern.data.repository.PostRepository
import com.ibitvalley.writon.modern.data.sync.OutboxSyncScheduler
import com.ibitvalley.writon.modern.ui.navigation.WritOnNavigation

class WritOnModernActivity : ComponentActivity() {

    private lateinit var database: WritOnDatabase
    private lateinit var repository: PostRepository
    private lateinit var userPreferences: UserPreferences

    private val requestNotificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { _ -> }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        WritOnNotificationManager.createNotificationChannels(this)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            requestNotificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }

        database = WritOnDatabase.getDatabase(this)
        userPreferences = UserPreferences(this)
        FirebaseAuthManager.syncNetworkAuthToken()

        repository = PostRepository(
            apiService = NetworkClient.apiService,
            postDao = database.postDao(),
            commentDao = database.commentDao(),
            outboxDao = database.outboxDao()
        )
        OutboxSyncScheduler.schedule(applicationContext)

        setContent {
            var activeTheme by androidx.compose.runtime.remember {
                androidx.compose.runtime.mutableStateOf(userPreferences.themeMode)
            }
            WritOnTheme(themeMode = activeTheme) {
                val navController = rememberNavController()

                WritOnNavigation(
                    navController = navController,
                    repository = repository,
                    userPreferences = userPreferences,
                    database = database,
                    onThemeChanged = { activeTheme = it }
                )
            }
        }
    }
}
