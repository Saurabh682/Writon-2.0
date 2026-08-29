package com.ibitvalley.writon.modern.ui.navigation

import android.util.Log
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import com.google.firebase.auth.FirebaseAuth
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandBeige
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed
import com.ibitvalley.writon.modern.core.database.WritOnDatabase
import com.ibitvalley.writon.modern.core.auth.FirebaseAuthManager
import com.ibitvalley.writon.modern.core.preferences.UserPreferences
import com.ibitvalley.writon.modern.core.network.WritOnApiService
import com.ibitvalley.writon.modern.core.notification.PushNotificationRegistration
import com.ibitvalley.writon.modern.data.repository.PostRepository
import com.ibitvalley.writon.modern.data.repository.DraftRepository
import com.ibitvalley.writon.modern.data.repository.MediaRepository
import com.ibitvalley.writon.modern.feature.auth.LoginScreen
import com.ibitvalley.writon.modern.feature.auth.SignupScreen
import com.ibitvalley.writon.modern.feature.editor.EditorViewModel
import com.ibitvalley.writon.modern.feature.editor.PublishStoryScreen
import com.ibitvalley.writon.modern.feature.editor.StoryEditorScreen
import com.ibitvalley.writon.modern.feature.collections.CollectionsViewModel
import com.ibitvalley.writon.modern.feature.explore.ExploreScreen
import com.ibitvalley.writon.modern.feature.explore.ExploreViewModel
import com.ibitvalley.writon.modern.feature.feed.FeedScreen
import com.ibitvalley.writon.modern.feature.feed.FeedViewModel
import com.ibitvalley.writon.modern.feature.library.LibraryScreen
import com.ibitvalley.writon.modern.feature.library.ReadingHistoryScreen
import com.ibitvalley.writon.modern.feature.notifications.NotificationsScreen
import com.ibitvalley.writon.modern.feature.onboarding.InterestsScreen
import com.ibitvalley.writon.modern.feature.onboarding.InterestsViewModel
import com.ibitvalley.writon.modern.feature.profile.ApplaudsScreen
import com.ibitvalley.writon.modern.feature.profile.AuthorProfileScreen
import com.ibitvalley.writon.modern.feature.profile.ProfileScreen
import com.ibitvalley.writon.modern.feature.profile.ProfileViewModel
import com.ibitvalley.writon.modern.feature.profile.ProfileStatsDestination
import com.ibitvalley.writon.modern.feature.profile.ProfileStatsDetailScreen
import com.ibitvalley.writon.modern.feature.profile.ProfileStatsDetailViewModel
import com.ibitvalley.writon.modern.feature.reader.ReaderScreen
import com.ibitvalley.writon.modern.feature.reader.ReaderViewModel
import com.ibitvalley.writon.modern.feature.search.SearchScreen
import com.ibitvalley.writon.modern.feature.search.SearchViewModel
import com.ibitvalley.writon.modern.feature.settings.SettingsScreen
import com.ibitvalley.writon.modern.feature.welcome.WelcomeScreen
import kotlinx.coroutines.launch

sealed class WritOnRoute(val route: String) {
    object Welcome : WritOnRoute("welcome")
    object Login : WritOnRoute("login")
    object Signup : WritOnRoute("signup")
    object Interests : WritOnRoute("interests?fromSettings={fromSettings}") {
        fun createRoute(fromSettings: Boolean = false) = "interests?fromSettings=$fromSettings"
    }
    object Home : WritOnRoute("home")
    object Explore : WritOnRoute("explore")
    object Search : WritOnRoute("search")
    object Write : WritOnRoute("write")
    object Publish : WritOnRoute("publish")
    object Library : WritOnRoute("library")
    object ReadingHistory : WritOnRoute("reading-history")
    object Notifications : WritOnRoute("notifications")
    object Settings : WritOnRoute("settings")
    object Appearance : WritOnRoute("appearance")
    object Applauds : WritOnRoute("applauds")
    object Profile : WritOnRoute("profile")
    object ProfileStats : WritOnRoute("profile-stats/{type}") {
        fun createRoute(destination: ProfileStatsDestination) = "profile-stats/${destination.routeValue}"
    }
    object AuthorProfile : WritOnRoute("author/{authorId}") {
        fun createRoute(authorId: String) = "author/${android.net.Uri.encode(authorId)}"
    }
    object Reader : WritOnRoute("reader/{storyId}") {
        fun createRoute(storyId: String) = "reader/$storyId"
    }
    object Comments : WritOnRoute("comments/{storyId}") {
        fun createRoute(storyId: String) = "comments/$storyId"
    }
}

private data class BottomNavItem(
    val route: String,
    @androidx.annotation.StringRes val labelRes: Int,
    @androidx.annotation.DrawableRes val unselectedIcon: Int,
    @androidx.annotation.DrawableRes val selectedIcon: Int
)

private val bottomNavItems = listOf(
    BottomNavItem(WritOnRoute.Home.route, R.string.nav_home, R.drawable.ic_home_muted, R.drawable.ic_home_orange),
    BottomNavItem(WritOnRoute.Explore.route, R.string.nav_explore, R.drawable.ic_explore_muted, R.drawable.ic_explore_orange),
    BottomNavItem(WritOnRoute.Library.route, R.string.nav_library, R.drawable.ic_library_muted, R.drawable.ic_library_orange),
    BottomNavItem(WritOnRoute.Profile.route, R.string.nav_profile, R.drawable.ic_profile_muted, R.drawable.ic_profile_orange)
)

@Composable
fun WritOnNavigation(
    navController: NavHostController,
    repository: PostRepository,
    draftRepository: DraftRepository,
    mediaRepository: MediaRepository,
    userPreferences: UserPreferences,
    database: WritOnDatabase,
    apiService: WritOnApiService,
    initialNotificationRoute: String? = null,
    onNotificationRouteConsumed: () -> Unit = {},
    onThemeChanged: (String) -> Unit = {}
) {
    val feedViewModel = remember { FeedViewModel(repository) }
    val editorViewModel = remember { EditorViewModel(repository, draftRepository, mediaRepository) }
    val collectionsViewModel = remember { CollectionsViewModel(apiService) }
    val exploreViewModel = remember { ExploreViewModel(apiService) }
    val searchViewModel = remember { SearchViewModel(apiService, database.postDao(), database.userDao()) }
    val coroutineScope = rememberCoroutineScope()
    val context = LocalContext.current
    var firebaseUser by remember { mutableStateOf(FirebaseAuth.getInstance().currentUser) }
    DisposableEffect(Unit) {
        val auth = FirebaseAuth.getInstance()
        val listener = FirebaseAuth.AuthStateListener { firebaseUser = it.currentUser }
        auth.addAuthStateListener(listener)
        onDispose { auth.removeAuthStateListener(listener) }
    }
    val signedIn = firebaseUser != null
    val openLogin = {
        navController.navigate(WritOnRoute.Login.route) { launchSingleTop = true }
    }
    val continueAfterAuthentication = {
        FirebaseAuthManager.syncNetworkAuthToken { hasToken ->
            if (!hasToken) {
                Log.w("WritOnAuth", "Authentication succeeded but no Firebase token was available.")
            } else if (userPreferences.isOnboardingComplete) {
                userPreferences.isVisitorMode = false
                navController.navigate(WritOnRoute.Home.route) {
                    popUpTo(WritOnRoute.Welcome.route) { inclusive = true }
                }
            } else {
                navController.navigate(WritOnRoute.Interests.createRoute())
            }
        }
    }
    val startDestination = remember {
        if (FirebaseAuth.getInstance().currentUser != null ||
            (userPreferences.isVisitorMode && userPreferences.isOnboardingComplete)) {
            WritOnRoute.Home.route
        } else {
            WritOnRoute.Welcome.route
        }
    }
    val currentBackStackEntry by navController.currentBackStackEntryAsState()
    val isWritingFlow = currentBackStackEntry?.destination?.route in setOf(
        WritOnRoute.Write.route,
        WritOnRoute.Publish.route
    )

    LaunchedEffect(Unit) {
        FirebaseAuthManager.syncNetworkAuthToken { hasToken ->
            if (!hasToken) return@syncNetworkAuthToken

            coroutineScope.launch {
                runCatching {
                    apiService.getMyProfile()
                }.onSuccess { response ->
                    if (response.isSuccessful) {
                        Log.i("WritOnAuth", "Server session and Supabase profile are ready.")
                    } else {
                        Log.w("WritOnAuth", "Server rejected the profile request: ${response.code()}")
                    }
                }.onFailure { error ->
                    Log.w("WritOnAuth", "Could not verify the server session.", error)
                }
            }
        }
    }

    LaunchedEffect(firebaseUser?.uid) {
        if (firebaseUser != null) {
            PushNotificationRegistration.syncCurrentDevice(context.applicationContext)
                .onFailure { error -> Log.w("WritOnFCM", "Push registration will retry after the next app launch.", error) }
        }
    }

    LaunchedEffect(initialNotificationRoute) {
        val safeRoute = resolveNotificationRoute(initialNotificationRoute) ?: return@LaunchedEffect
        navController.navigate(safeRoute) { launchSingleTop = true }
        onNotificationRouteConsumed()
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        bottomBar = {
            if (!isWritingFlow) {
                WritOnBottomNavigation(navController = navController, isSignedIn = signedIn, onLoginRequired = openLogin)
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = startDestination,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(WritOnRoute.Welcome.route) {
                WelcomeScreen(
                    onGetStarted = { navController.navigate(WritOnRoute.Signup.route) },
                    onLogin = { navController.navigate(WritOnRoute.Login.route) },
                    onContinueAsVisitor = {
                        userPreferences.isVisitorMode = true
                        navController.navigate(WritOnRoute.Interests.createRoute())
                    }
                )
            }
            composable(WritOnRoute.Login.route) {
                LoginScreen(
                    onBackClick = { navController.popBackStack() },
                    onSignInClick = continueAfterAuthentication,
                    onSignUpClick = { navController.navigate(WritOnRoute.Signup.route) }
                )
            }
            composable(WritOnRoute.Signup.route) {
                SignupScreen(
                    onBackClick = { navController.popBackStack() },
                    onSignInClick = { navController.navigate(WritOnRoute.Login.route) },
                    onCreateAccountClick = continueAfterAuthentication
                )
            }
            composable(
                route = WritOnRoute.Interests.route,
                arguments = listOf(
                    androidx.navigation.navArgument("fromSettings") {
                        type = androidx.navigation.NavType.BoolType
                        defaultValue = false
                    }
                )
            ) { backStackEntry ->
                val fromSettings = backStackEntry.arguments?.getBoolean("fromSettings") ?: false
                val interestsViewModel = remember(fromSettings, signedIn) {
                    InterestsViewModel(apiService, userPreferences, signedIn)
                }
                val interestsUiState by interestsViewModel.uiState.collectAsState()
                val continueFromInterests: () -> Unit = {
                    feedViewModel.selectCategory("All")
                    if (fromSettings) {
                        navController.popBackStack()
                    } else {
                        navController.navigate(WritOnRoute.Home.route) {
                            popUpTo(WritOnRoute.Welcome.route) { inclusive = true }
                        }
                    }
                }
                InterestsScreen(
                    initialSelectedTopicIds = interestsUiState.selectedTopicIds,
                    isSaving = interestsUiState.isSaving,
                    errorMessage = interestsUiState.errorMessage,
                    onBackClick = { navController.popBackStack() },
                    onContinueClick = { selected ->
                        interestsViewModel.save(selected, continueFromInterests)
                    },
                    onContinueWithSavedChoices = {
                        interestsViewModel.continueWithSavedChoices(continueFromInterests)
                    },
                    onSkipClick = {
                        interestsViewModel.save(emptySet(), continueFromInterests)
                    }
                )
            }
            composable(WritOnRoute.Home.route) {
                FeedScreen(
                    viewModel = feedViewModel,
                    onStoryClick = { id -> navController.navigate(WritOnRoute.Reader.createRoute(id)) },
                    onWriteClick = {
                        if (signedIn) {
                            navController.navigate(WritOnRoute.Write.route) {
                                popUpTo(WritOnRoute.Home.route) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        } else openLogin()
                    },
                    onLibraryClick = {
                        if (signedIn) {
                            navController.navigate(WritOnRoute.Library.route) {
                                popUpTo(WritOnRoute.Home.route) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        } else openLogin()
                    },
                    onSearchClick = { navController.navigate(WritOnRoute.Search.route) },
                    onNotificationsClick = { if (signedIn) navController.navigate(WritOnRoute.Notifications.route) else openLogin() },
                    onProfileClick = {
                        if (signedIn) {
                            navController.navigate(WritOnRoute.Profile.route) {
                                popUpTo(WritOnRoute.Home.route) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        } else openLogin()
                    },
                    onAuthorClick = { authorId -> navController.navigate(WritOnRoute.AuthorProfile.createRoute(authorId)) },
                    isAuthenticated = signedIn,
                    onLoginRequired = openLogin
                )
            }
            composable(WritOnRoute.Explore.route) {
                ExploreScreen(
                    viewModel = exploreViewModel,
                    onStoryClick = { id -> navController.navigate(WritOnRoute.Reader.createRoute(id)) },
                    onSearchClick = { navController.navigate(WritOnRoute.Search.route) }
                )
            }
            composable(WritOnRoute.Search.route) {
                SearchScreen(
                    viewModel = searchViewModel,
                    onStoryClick = { id -> navController.navigate(WritOnRoute.Reader.createRoute(id)) },
                    onExploreClick = { navController.navigate(WritOnRoute.Explore.route) },
                    onNotificationsClick = {
                        if (signedIn) navController.navigate(WritOnRoute.Notifications.route) else openLogin()
                    },
                    onAuthorClick = { authorId -> navController.navigate(WritOnRoute.AuthorProfile.createRoute(authorId)) },
                )
            }
            composable(WritOnRoute.Write.route) {
                if (signedIn) {
                    StoryEditorScreen(
                        viewModel = editorViewModel,
                        onBackClick = { navController.popBackStack() },
                        onPublishClick = { navController.navigate(WritOnRoute.Publish.route) }
                    )
                } else LaunchedEffect(Unit) { openLogin() }
            }
            composable(WritOnRoute.Publish.route) {
                if (signedIn) {
                    PublishStoryScreen(
                        viewModel = editorViewModel,
                        onBackClick = { navController.popBackStack() },
                        onPublished = {
                            navController.navigate(WritOnRoute.Home.route) {
                                popUpTo(WritOnRoute.Home.route) { inclusive = false }
                            }
                        }
                    )
                } else LaunchedEffect(Unit) { openLogin() }
            }
            composable(WritOnRoute.Library.route) {
                if (signedIn) {
                    LibraryScreen(
                        viewModel = collectionsViewModel,
                        onStoryClick = { id -> navController.navigate(WritOnRoute.Reader.createRoute(id)) },
                        onSearchClick = { navController.navigate(WritOnRoute.Search.route) },
                        onHistoryClick = { navController.navigate(WritOnRoute.ReadingHistory.route) }
                    )
                } else LaunchedEffect(Unit) { openLogin() }
            }
            composable(WritOnRoute.ReadingHistory.route) {
                if (signedIn) {
                    ReadingHistoryScreen(
                        viewModel = collectionsViewModel,
                        onStoryClick = { id -> navController.navigate(WritOnRoute.Reader.createRoute(id)) },
                        onSearchClick = { navController.navigate(WritOnRoute.Search.route) },
                        onSettingsClick = { navController.navigate(WritOnRoute.Settings.route) }
                    )
                } else LaunchedEffect(Unit) { openLogin() }
            }
            composable(WritOnRoute.Notifications.route) {
                if (signedIn) {
                    NotificationsScreen(
                        viewModel = collectionsViewModel,
                        onSearchClick = { navController.navigate(WritOnRoute.Search.route) },
                        onSettingsClick = { navController.navigate(WritOnRoute.Settings.route) },
                        onStoryClick = { id -> navController.navigate(WritOnRoute.Reader.createRoute(id)) }
                    )
                } else LaunchedEffect(Unit) { openLogin() }
            }
            composable(WritOnRoute.Settings.route) {
                if (signedIn) SettingsScreen(
                    userPreferences = userPreferences,
                    deleteAccount = { apiService.deleteMyAccount() },
                    onBackClick = { navController.popBackStack() },
                    onAppearanceClick = { navController.navigate(WritOnRoute.Appearance.route) },
                    onInterestsClick = { navController.navigate(WritOnRoute.Interests.createRoute(true)) },
                    onSearchClick = { navController.navigate(WritOnRoute.Search.route) },
                    onNotificationsClick = { navController.navigate(WritOnRoute.Notifications.route) },
                    onSavedStoriesClick = { navController.navigate(WritOnRoute.Library.route) },
                    onLogOut = {
                        FirebaseAuthManager.signOut()
                        userPreferences.clear()
                        navController.navigate(WritOnRoute.Welcome.route) {
                            popUpTo(navController.graph.id) { inclusive = true }
                            launchSingleTop = true
                        }
                    }
                ) else LaunchedEffect(Unit) { openLogin() }
            }
            composable(WritOnRoute.Appearance.route) {
                com.ibitvalley.writon.modern.feature.appearance.AppearanceScreen(
                    userPreferences = userPreferences,
                    onBackClick = { navController.popBackStack() },
                    onThemeChanged = onThemeChanged
                )
            }
            composable(WritOnRoute.Applauds.route) {
                if (signedIn) ApplaudsScreen(
                    viewModel = collectionsViewModel,
                    onBackClick = { navController.popBackStack() },
                    onStoryClick = { id -> navController.navigate(WritOnRoute.Reader.createRoute(id)) },
                    onSearchClick = { navController.navigate(WritOnRoute.Search.route) },
                    onSettingsClick = { navController.navigate(WritOnRoute.Settings.route) }
                ) else LaunchedEffect(Unit) { openLogin() }
            }
            composable(WritOnRoute.Profile.route) {
                if (signedIn) {
                    val profileViewModel = remember {
                        ProfileViewModel(apiService, database.userDao(), mediaRepository)
                    }
                    ProfileScreen(
                        viewModel = profileViewModel,
                        onBackClick = {
                            if (!navController.popBackStack()) {
                                navController.navigate(WritOnRoute.Home.route) {
                                    popUpTo(WritOnRoute.Home.route) { inclusive = false }
                                    launchSingleTop = true
                                }
                            }
                        },
                        onStoryClick = { id -> navController.navigate(WritOnRoute.Reader.createRoute(id)) },
                        onWriteClick = { navController.navigate(WritOnRoute.Write.route) },
                        onStoriesClick = { navController.navigate(WritOnRoute.ProfileStats.createRoute(ProfileStatsDestination.Stories)) },
                        onApplaudsClick = { navController.navigate(WritOnRoute.ProfileStats.createRoute(ProfileStatsDestination.Applauds)) },
                        onFollowersClick = { navController.navigate(WritOnRoute.ProfileStats.createRoute(ProfileStatsDestination.Followers)) },
                        onFollowingClick = { navController.navigate(WritOnRoute.ProfileStats.createRoute(ProfileStatsDestination.Following)) },
                        onSettingsClick = { navController.navigate(WritOnRoute.Settings.route) }
                    )

                } else {
                    LaunchedEffect(Unit) { openLogin() }
                }
            }
            composable(WritOnRoute.ProfileStats.route) { backStackEntry ->
                val destination = ProfileStatsDestination.fromRoute(backStackEntry.arguments?.getString("type"))
                    ?: return@composable
                val viewModel = remember(destination) {
                    ProfileStatsDetailViewModel(destination, apiService)
                }
                ProfileStatsDetailScreen(
                    destination = destination,
                    viewModel = viewModel,
                    onBackClick = { navController.popBackStack() },
                    onStoryClick = { id -> navController.navigate(WritOnRoute.Reader.createRoute(id)) },
                    onAuthorClick = { id -> navController.navigate(WritOnRoute.AuthorProfile.createRoute(id)) },
                )
            }
            composable(WritOnRoute.AuthorProfile.route) { backStackEntry ->
                val authorId = backStackEntry.arguments?.getString("authorId") ?: return@composable
                AuthorProfileScreen(
                    authorId = authorId,
                    apiService = apiService,
                    isAuthenticated = signedIn,
                    onBackClick = { navController.popBackStack() },
                    onStoryClick = { id -> navController.navigate(WritOnRoute.Reader.createRoute(id)) },
                    onLoginRequired = openLogin
                )
            }
            composable(WritOnRoute.Reader.route) { backStackEntry ->
                val storyId = backStackEntry.arguments?.getString("storyId") ?: ""
                val readerViewModel = remember(storyId) {
                    ReaderViewModel(storyId, repository)
                }
                ReaderScreen(
                    viewModel = readerViewModel,
                    userPreferences = userPreferences,
                    onBackClick = { navController.popBackStack() },
                    onAuthorClick = { authorId -> navController.navigate(WritOnRoute.AuthorProfile.createRoute(authorId)) },
                    onCommentsClick = { navController.navigate(WritOnRoute.Comments.createRoute(storyId)) },
                    onLoginRequired = openLogin
                )
            }
            composable(WritOnRoute.Comments.route) { backStackEntry ->
                val storyId = backStackEntry.arguments?.getString("storyId") ?: ""
                val readerViewModel = remember(storyId) {
                    ReaderViewModel(storyId, repository)
                }
                val comments by readerViewModel.comments.collectAsState()
                val post by readerViewModel.post.collectAsState()
                val user = FirebaseAuth.getInstance().currentUser
                val authorName = user?.displayName ?: user?.email?.substringBefore("@") ?: "You"

                com.ibitvalley.writon.modern.feature.comments.CommentsScreen(
                    comments = comments,
                    currentUserInitials = authorName,
                    totalCount = comments.size.coerceAtLeast(post?.commentsCnt ?: 0),
                    onBackClick = { navController.popBackStack() },
                    onSubmitComment = { content, parentId ->
                        if (user == null) {
                            openLogin()
                        } else {
                            readerViewModel.submitComment(content, authorName, parentId)
                        }
                    }
                )
            }
        }
    }
}

internal fun resolveNotificationRoute(route: String?): String? = when {
    route == null -> null
    route == WritOnRoute.Notifications.route -> route
    route.startsWith("reader/") && route.removePrefix("reader/").isNotBlank() -> route
    else -> WritOnRoute.Notifications.route
}

@Composable
private fun WritOnBottomNavigation(
    navController: NavHostController,
    isSignedIn: Boolean,
    onLoginRequired: () -> Unit
) {
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    // Define routes that should hide the bottom bar
    val hideBottomBarRoutes = listOf(
        WritOnRoute.Reader.route,
        WritOnRoute.Comments.route,
        WritOnRoute.AuthorProfile.route,
        WritOnRoute.ProfileStats.route,
        WritOnRoute.Publish.route,
        WritOnRoute.Welcome.route,
        WritOnRoute.Login.route,
        WritOnRoute.Signup.route,
        WritOnRoute.Interests.route,
        WritOnRoute.Appearance.route
    )

    if (currentRoute in hideBottomBarRoutes || currentRoute == null) {
        return
    }

    WritOnBottomBar(
        currentRoute = currentRoute,
        onNavigate = { targetRoute ->
            val requiresLogin = targetRoute == WritOnRoute.Library.route ||
                targetRoute == WritOnRoute.Profile.route ||
                targetRoute == WritOnRoute.Write.route
            if (requiresLogin && !isSignedIn) {
                onLoginRequired()
                return@WritOnBottomBar
            }

            if (currentRoute != targetRoute) {
                navController.navigate(targetRoute) {
                    popUpTo(WritOnRoute.Home.route) {
                        saveState = true
                    }
                    launchSingleTop = true
                    restoreState = true
                }
            }
        }
    )
}

@Composable
fun WritOnBottomBar(
    currentRoute: String,
    onNavigate: (String) -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(86.dp),
        contentAlignment = Alignment.BottomCenter
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .height(70.dp),
            color = MaterialTheme.colorScheme.surface,
            shadowElevation = 4.dp
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f), thickness = 1.dp)
                Row(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    bottomNavItems.forEachIndexed { index, item ->
                        if (index == 2) {
                            Spacer(modifier = Modifier.width(68.dp))
                        }
                        val selected = currentRoute == item.route ||
                            (currentRoute == WritOnRoute.Search.route && item.route == WritOnRoute.Explore.route) ||
                            (currentRoute == WritOnRoute.ReadingHistory.route && item.route == WritOnRoute.Library.route) ||
                            (currentRoute == WritOnRoute.Settings.route && item.route == WritOnRoute.Profile.route) ||
                            (currentRoute == WritOnRoute.Applauds.route && item.route == WritOnRoute.Profile.route)
                        NavigationItem(
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxHeight(),
                            selected = selected,
                            onClick = { onNavigate(item.route) },
                            icon = if (selected) item.selectedIcon else item.unselectedIcon,
                            label = androidx.compose.ui.res.stringResource(item.labelRes)
                        )
                    }
                }
            }
        }

        // Center Floating Action Button for Write
        Surface(
            modifier = Modifier
                .padding(bottom = 20.dp)
                .size(56.dp)
                .align(Alignment.BottomCenter),
            shape = CircleShape,
            color = BrandRed,
            shadowElevation = 8.dp,
            onClick = { onNavigate(WritOnRoute.Write.route) }
        ) {
            Box(contentAlignment = Alignment.Center) {
                Image(
                    painter = painterResource(R.drawable.ic_write_quill_white),
                    contentDescription = "Write story",
                    modifier = Modifier.size(28.dp)
                )
            }
        }
    }
}

@Composable
fun NavigationItem(
    modifier: Modifier = Modifier,
    selected: Boolean,
    onClick: () -> Unit,
    icon: Int,
    label: String
) {
    Box(
        modifier = modifier
            .clickable(
                onClick = onClick,
                interactionSource = remember { MutableInteractionSource() },
                indication = null
            ),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Image(
                painter = painterResource(icon),
                contentDescription = label,
                modifier = Modifier.size(26.dp),
                colorFilter = if (selected) null else ColorFilter.tint(MaterialTheme.colorScheme.onSurfaceVariant)
            )
            Spacer(modifier = Modifier.height(3.dp))
            Text(
                text = label,
                fontSize = 11.sp,
                fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
                color = if (selected) BrandRed else MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
