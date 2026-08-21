package com.ibitvalley.writon.modern

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.navigation.compose.rememberNavController
import com.ibitvalley.writon.modern.core.database.WritOnDatabase
import com.ibitvalley.writon.modern.core.preferences.UserPreferences
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnTheme
import com.ibitvalley.writon.modern.core.network.NetworkClient
import com.ibitvalley.writon.modern.data.repository.PostRepository
import com.ibitvalley.writon.modern.ui.navigation.WritOnNavigation

class WritOnModernActivity : ComponentActivity() {

    private lateinit var database: WritOnDatabase
    private lateinit var repository: PostRepository
    private lateinit var userPreferences: UserPreferences

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        database = WritOnDatabase.getDatabase(this)
        userPreferences = UserPreferences(this)
        
        // FOR TESTING: Set a dummy token
        NetworkClient.setAuthToken("test-token-julian-ross")

        repository = PostRepository(
            apiService = NetworkClient.apiService,
            postDao = database.postDao(),
            commentDao = database.commentDao(),
            outboxDao = database.outboxDao()
        )

        setContent {
            WritOnTheme(darkTheme = false) { // Force light mode for "Editorial 2.0" look
                val navController = rememberNavController()

                WritOnNavigation(
                    navController = navController,
                    repository = repository,
                    userPreferences = userPreferences,
                    database = database
                )
            }
        }
    }
}
