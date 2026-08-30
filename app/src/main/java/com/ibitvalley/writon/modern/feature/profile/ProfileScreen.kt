package com.ibitvalley.writon.modern.feature.profile
import androidx.compose.ui.res.stringResource

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogWindowProvider
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.network.model.PostDto
import com.ibitvalley.writon.modern.core.network.model.MilestoneDto
import com.ibitvalley.writon.modern.core.network.model.MilestoneJourneyDto
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandBeige
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed
import com.ibitvalley.writon.modern.core.designsystem.theme.SurfacePaper
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnElevation
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnRadius
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnSpacing
import com.ibitvalley.writon.modern.core.designsystem.components.UserAvatar

private val ProfileEditorialFamily = FontFamily(
    Font(R.font.source_serif_4_regular, weight = FontWeight.Normal),
    Font(R.font.source_serif_4_semibold, weight = FontWeight.SemiBold),
    Font(R.font.source_serif_4_semibold, weight = FontWeight.Bold)
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    viewModel: ProfileViewModel,
    onBackClick: () -> Unit,
    onStoryClick: (String) -> Unit,
    onWriteClick: () -> Unit,
    onSettingsClick: () -> Unit,
    onStoriesClick: () -> Unit,
    onApplaudsClick: () -> Unit,
    onFollowersClick: () -> Unit,
    onFollowingClick: () -> Unit,
) {
    val user by viewModel.userProfile.collectAsState()
    val stories by viewModel.userStories.collectAsState()
    val highlights by viewModel.highlights.collectAsState()
    val milestoneJourney by viewModel.milestoneJourney.collectAsState()
    val isUpdating by viewModel.isLoading.collectAsState()

    var selectedTab by remember { mutableIntStateOf(0) }
    var overflowExpanded by remember { mutableStateOf(false) }
    var showEditDialog by remember { mutableStateOf(false) }
    var profileSaveError by remember { mutableStateOf<String?>(null) }
    var unlockedMilestone by remember { mutableStateOf<MilestoneDto?>(null) }

    LaunchedEffect(milestoneJourney?.newlyEarned) {
        unlockedMilestone = milestoneJourney?.newlyEarned?.firstOrNull()
    }

    val name = user?.fullName ?: stringResource(R.string.profile_title)
    val penName = user?.penName ?: ""
    // A missing legacy bio must remain missing. Fabricated copy makes imported
    // writer profiles look incorrect and prevents the owner from spotting it.
    val bio = user?.bio?.trim()?.takeIf { it.isNotBlank() }

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text(stringResource(R.string.profile_writer_title), style = MaterialTheme.typography.headlineSmall.copy(fontFamily = ProfileEditorialFamily)) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Image(
                            painterResource(R.drawable.ic_back),
                            contentDescription = "Back",
                            modifier = Modifier.size(24.dp),
                            colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onBackground)
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { showEditDialog = true }) {
                        Image(
                            painterResource(R.drawable.ic_edit_pencil),
                            contentDescription = stringResource(R.string.profile_edit_button),
                            modifier = Modifier.size(24.dp),
                            colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onBackground)
                        )
                    }
                    Box {
                        IconButton(onClick = { overflowExpanded = true }) {
                            Image(
                                painterResource(R.drawable.ic_more_vertical),
                                contentDescription = "Profile options",
                                modifier = Modifier.size(24.dp),
                                colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onBackground)
                            )
                        }
                        DropdownMenu(expanded = overflowExpanded, onDismissRequest = { overflowExpanded = false }) {
                            DropdownMenuItem(text = { Text(stringResource(R.string.profile_edit_button)) }, onClick = { overflowExpanded = false; showEditDialog = true })
                            DropdownMenuItem(text = { Text("Settings") }, onClick = { overflowExpanded = false; onSettingsClick() })
                        }
                    }
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = MaterialTheme.colorScheme.background)
            )
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(innerPadding),
            contentPadding = PaddingValues(horizontal = WritOnSpacing.lg, vertical = WritOnSpacing.md),
            verticalArrangement = Arrangement.spacedBy(WritOnSpacing.lg)
        ) {
            item {
                ProfileIdentity(name, penName, bio, user?.avatarUrl, user?.location, user?.joinedAt, onEditClick = {
                    profileSaveError = null
                    showEditDialog = true
                })
            }
            item {
                ProfileStats(
                    stories = user?.storiesCount ?: stories.size,
                    applauds = user?.applaudsReceived ?: 0,
                    followers = user?.followersCount ?: 0,
                    following = user?.followingCount ?: 0,
                    onStoriesClick = onStoriesClick,
                    onApplaudsClick = onApplaudsClick,
                    onFollowersClick = onFollowersClick,
                    onFollowingClick = onFollowingClick,
                )
            }
            milestoneJourney?.let { journey ->
                item { MilestoneJourneyCard(journey) }
            }
            item { ProfileTabs(selectedTab) { selectedTab = it } }

            when (selectedTab) {
                0 -> item {
                    ProfileAboutTab(name, bio, user?.location, user?.joinedAt, user?.quoteOfDay, onEditClick = {
                        profileSaveError = null
                        showEditDialog = true
                    })
                }
                1 -> {
                    if (stories.isEmpty()) {
                        item { ProfileEmptyTab("stories", onWriteClick) }
                    } else {
                        items(stories.size) { index ->
                            ProfileStoryCard(story = stories[index], onClick = { onStoryClick(stories[index].id) })
                        }
                    }
                }
                2 -> item { ProfileSeriesTab(stories = stories, onStoryClick = onStoryClick, onWriteClick = onWriteClick) }
                3 -> item {
                    ProfileHighlightsTab(
                        highlights = highlights,
                        onStoryClick = onStoryClick,
                        onSeeAllClick = { selectedTab = 1 }
                    )
                }
            }
        }
    }

    if (showEditDialog) {
        EditProfileDialog(
            initialName = user?.fullName ?: "",
            initialPenName = user?.penName ?: "",
            initialBio = user?.bio ?: "",
            initialLocation = user?.location ?: "",
            initialAvatarUrl = user?.avatarUrl,
            isLoading = isUpdating,
            errorMessage = profileSaveError,
            onDismiss = {
                profileSaveError = null
                showEditDialog = false
            },
            onSave = { newName, newPenName, newBio, newLocation, avatarContext, avatarUri ->
                profileSaveError = null
                viewModel.updateProfile(
                    newName,
                    newPenName,
                    newBio,
                    newLocation,
                    avatarContext,
                    avatarUri,
                    onSuccess = {
                        showEditDialog = false
                    },
                    onError = { error ->
                        profileSaveError = error.toUserFacingProfileError()
                    }
                )
            }
        )
    }

    unlockedMilestone?.let { milestone ->
        AlertDialog(
            onDismissRequest = { unlockedMilestone = null },
            title = { Text(stringResource(R.string.profile_milestone_unlocked), fontFamily = ProfileEditorialFamily) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(milestoneSymbol(milestone.icon), fontSize = 36.sp)
                    Text(milestone.title, style = MaterialTheme.typography.titleLarge, fontFamily = ProfileEditorialFamily)
                    Text(milestone.description, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            },
            confirmButton = {
                TextButton(onClick = { unlockedMilestone = null }) { Text(stringResource(R.string.common_done)) }
            }
        )
    }
}

@Composable
private fun ProfileIdentity(
    name: String,
    penName: String,
    bio: String?,
    avatarUrl: String?,
    location: String?,
    joinedAt: String?,
    onEditClick: () -> Unit
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.Top) {
            Box {
                UserAvatar(url = avatarUrl, name = name, size = 88.dp)
                Surface(
                    color = BrandRed,
                    shape = CircleShape,
                    modifier = Modifier.align(Alignment.BottomEnd).size(32.dp),
                    border = BorderStroke(2.dp, MaterialTheme.colorScheme.background)
                ) {
                    Box(contentAlignment = Alignment.Center) { Text("★", color = Color(0xFFFFFDF9), fontSize = 15.sp) }
                }
            }
            Spacer(Modifier.width(WritOnSpacing.md))
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(name, style = MaterialTheme.typography.headlineLarge.copy(fontFamily = ProfileEditorialFamily, fontSize = 25.sp, lineHeight = 30.sp), maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Spacer(Modifier.width(WritOnSpacing.xxs))
                    Surface(color = BrandRed, shape = CircleShape, modifier = Modifier.size(20.dp)) {
                        Box(contentAlignment = Alignment.Center) { Text("✓", color = Color(0xFFFFFDF9), style = MaterialTheme.typography.labelMedium) }
                    }
                }
                if (penName.isNotBlank()) Text("@$penName", style = MaterialTheme.typography.bodyMedium.copy(fontSize = 15.sp), color = MaterialTheme.colorScheme.onSurfaceVariant)
                bio?.let {
                    Spacer(Modifier.height(WritOnSpacing.xxs))
                    Text(it, style = MaterialTheme.typography.bodyMedium.copy(fontSize = 14.sp, lineHeight = 19.sp), maxLines = 3, overflow = TextOverflow.Ellipsis)
                }
                Spacer(Modifier.height(WritOnSpacing.sm))
                if (!location.isNullOrBlank() || !joinedAt.isNullOrBlank()) Column(verticalArrangement = Arrangement.spacedBy(WritOnSpacing.xxs)) {
                    if (!location.isNullOrBlank()) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Image(
                                painterResource(R.drawable.ic_location),
                                contentDescription = null,
                                modifier = Modifier.size(15.dp),
                                colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onSurfaceVariant)
                            )
                            Spacer(Modifier.width(WritOnSpacing.xxs))
                            Text(location, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                    if (!joinedAt.isNullOrBlank()) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Image(
                                painterResource(R.drawable.ic_calendar),
                                contentDescription = null,
                                modifier = Modifier.size(15.dp),
                                colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onSurfaceVariant)
                            )
                            Spacer(Modifier.width(WritOnSpacing.xxs))
                            Text("Joined ${joinedAt.take(10)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        }
        Spacer(Modifier.height(WritOnSpacing.sm))
        OutlinedButton(
            onClick = onEditClick,
            modifier = Modifier.fillMaxWidth().height(38.dp),
            shape = RoundedCornerShape(WritOnRadius.field),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
            colors = ButtonDefaults.outlinedButtonColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Image(
                painterResource(R.drawable.ic_edit_pencil),
                contentDescription = null,
                modifier = Modifier.size(16.dp),
                colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onSurface)
            )
            Spacer(Modifier.width(8.dp))
            Text("Edit Profile & Bio", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurface)
        }
    }
}

@Composable
private fun ProfileStats(
    stories: Int,
    applauds: Int,
    followers: Int,
    following: Int,
    onStoriesClick: () -> Unit,
    onApplaudsClick: () -> Unit,
    onFollowersClick: () -> Unit,
    onFollowingClick: () -> Unit,
) {
    Surface(
        shape = RoundedCornerShape(WritOnRadius.card),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
        tonalElevation = WritOnElevation.flat,
        shadowElevation = WritOnElevation.raised,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(modifier = Modifier.fillMaxWidth().padding(vertical = WritOnSpacing.lg), horizontalArrangement = Arrangement.SpaceEvenly) {
            ProfileStat(stories.toString(), "Stories\npublished", onClick = onStoriesClick)
            VerticalDivider(Modifier.height(54.dp), color = MaterialTheme.colorScheme.outlineVariant)
            ProfileStat(formatProfileCount(applauds), "Applauds\nreceived", onClick = onApplaudsClick)
            VerticalDivider(Modifier.height(54.dp), color = MaterialTheme.colorScheme.outlineVariant)
            ProfileStat(followers.toString(), "Followers", onClick = onFollowersClick)
            VerticalDivider(Modifier.height(54.dp), color = MaterialTheme.colorScheme.outlineVariant)
            ProfileStat(following.toString(), "Following", onClick = onFollowingClick)
        }
    }
}

@Composable
private fun ProfileStat(value: String, label: String, onClick: () -> Unit) {
    Column(
        modifier = Modifier
            .widthIn(min = 54.dp)
            .heightIn(min = 64.dp)
            .clip(RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .semantics { contentDescription = "$value ${label.replace("\n", " ")}" }
            .padding(horizontal = 4.dp, vertical = 4.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(value, style = MaterialTheme.typography.titleLarge.copy(fontSize = 20.sp), color = BrandRed)
        Spacer(Modifier.height(WritOnSpacing.xxs))
        Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
    }
}

@Composable
private fun ProfileTabs(selectedTab: Int, onSelected: (Int) -> Unit) {
    val tabs = listOf(stringResource(R.string.profile_tab_about), "Stories", "Series", stringResource(R.string.profile_tab_highlights))
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        tabs.forEachIndexed { index, title ->
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    .clip(RoundedCornerShape(WritOnRadius.field))
                    .clickable { onSelected(index) }
                    .padding(vertical = WritOnSpacing.xs)
            ) {
                Text(
                    title,
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = if (index == selectedTab) FontWeight.Bold else FontWeight.Normal),
                    color = if (index == selectedTab) BrandRed else MaterialTheme.colorScheme.onSurface
                )
                Spacer(Modifier.height(WritOnSpacing.xs))
                Surface(
                    color = if (index == selectedTab) BrandRed else Color.Transparent,
                    modifier = Modifier.width(64.dp).height(3.dp),
                    shape = CircleShape
                ) { }
            }
        }
    }
}

@Composable
private fun ProfileAboutTab(name: String, bio: String?, location: String?, joinedAt: String?, quoteOfDay: String?, onEditClick: () -> Unit) {
    val firstName = name.substringBefore(' ')
    Column(verticalArrangement = Arrangement.spacedBy(WritOnSpacing.md)) {
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(WritOnRadius.card),
            color = MaterialTheme.colorScheme.surface,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
            tonalElevation = WritOnElevation.flat,
            shadowElevation = WritOnElevation.raised
        ) {
            Column(Modifier.padding(WritOnSpacing.md)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("About $firstName", style = MaterialTheme.typography.headlineSmall.copy(fontFamily = ProfileEditorialFamily))
                    Spacer(Modifier.weight(1f))
                    TextButton(onClick = onEditClick, contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)) {
                        Image(painterResource(R.drawable.ic_edit_pencil), contentDescription = null, modifier = Modifier.size(14.dp))
                        Spacer(Modifier.width(4.dp))
                        Text(stringResource(R.string.profile_edit_bio), color = BrandRed, style = MaterialTheme.typography.labelLarge)
                    }
                }
                Spacer(Modifier.height(WritOnSpacing.sm))
                Text(
                    bio ?: "No bio has been added yet.",
                    style = MaterialTheme.typography.bodyMedium.copy(fontSize = 15.sp, lineHeight = 22.sp),
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                quoteOfDay?.takeIf { it.isNotBlank() }?.let { quote ->
                    Spacer(Modifier.height(WritOnSpacing.md))
                    Surface(
                        color = MaterialTheme.colorScheme.surfaceVariant,
                        shape = RoundedCornerShape(8.dp),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(Modifier.padding(12.dp)) {
                            Text(stringResource(R.string.profile_motto_quote), fontSize = 11.sp, fontWeight = FontWeight.Bold, color = BrandRed, letterSpacing = 1.sp)
                            Spacer(Modifier.height(4.dp))
                            Text("\"$quote\"", fontStyle = androidx.compose.ui.text.font.FontStyle.Italic, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface)
                        }
                    }
                }

                Spacer(Modifier.height(WritOnSpacing.md))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Image(painterResource(R.drawable.ic_bookmark_orange), contentDescription = null, modifier = Modifier.size(22.dp))
                    Spacer(Modifier.width(WritOnSpacing.sm))
                    Text(
                        joinedAt?.take(4)?.let { "Writer on WritOn since $it" } ?: "Writer on WritOn",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

@Composable
private fun ProfileStoryCard(story: PostDto, onClick: () -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(WritOnRadius.card),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
        tonalElevation = WritOnElevation.flat,
        shadowElevation = WritOnElevation.raised
    ) {
        Column(Modifier.padding(WritOnSpacing.md)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
                    Text(
                        story.category.uppercase(),
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = BrandRed
                    )
                }
                Spacer(Modifier.weight(1f))
                Text("${story.readingTimeMin} min read", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Spacer(Modifier.height(WritOnSpacing.sm))
            Text(
                story.title,
                style = MaterialTheme.typography.titleLarge.copy(fontFamily = ProfileEditorialFamily, fontWeight = FontWeight.SemiBold, fontSize = 21.sp),
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            story.summary?.takeIf { it.isNotBlank() }?.let { summary ->
                Spacer(Modifier.height(WritOnSpacing.xs))
                Text(summary, fontSize = 14.sp, lineHeight = 20.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
            Spacer(Modifier.height(WritOnSpacing.md))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Image(painterResource(R.drawable.ic_applaud_orange), contentDescription = "Applauds", modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Text("${story.likesCnt} applauds", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Medium)
            }
        }
    }
}

@Composable
private fun ProfileSeriesTab(stories: List<PostDto>, onStoryClick: (String) -> Unit, onWriteClick: () -> Unit) {
    val categories = stories.map { it.category }.distinct()
    if (categories.isEmpty()) {
        ProfileEmptyTab("series", onWriteClick)
    } else {
        Column(verticalArrangement = Arrangement.spacedBy(WritOnSpacing.md)) {
            categories.forEach { category ->
                val categoryStories = stories.filter { it.category == category }
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(WritOnRadius.card),
                    color = MaterialTheme.colorScheme.surface,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
                    tonalElevation = WritOnElevation.flat,
                    shadowElevation = WritOnElevation.raised
                ) {
                    Column(Modifier.padding(WritOnSpacing.md)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                "$category Collection",
                                style = MaterialTheme.typography.titleLarge.copy(fontFamily = ProfileEditorialFamily, fontWeight = FontWeight.SemiBold)
                            )
                            Spacer(Modifier.weight(1f))
                            Text("${categoryStories.size} parts", style = MaterialTheme.typography.labelMedium, color = BrandRed)
                        }
                        Spacer(Modifier.height(WritOnSpacing.sm))
                        categoryStories.take(3).forEach { story ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { onStoryClick(story.id) }
                                    .padding(vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("•", color = BrandRed, modifier = Modifier.padding(end = 8.dp))
                                Text(story.title, modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis, fontSize = 15.sp, color = MaterialTheme.colorScheme.onSurface)
                                Image(
                                    painterResource(R.drawable.ic_forward_muted),
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp),
                                    colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onSurfaceVariant)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ProfileHighlightsTab(
    highlights: List<PostDto>,
    onStoryClick: (String) -> Unit,
    onSeeAllClick: () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(WritOnSpacing.md)) {
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(WritOnRadius.card),
            color = MaterialTheme.colorScheme.surface,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
            tonalElevation = WritOnElevation.flat,
            shadowElevation = WritOnElevation.raised
        ) {
            Column(Modifier.padding(WritOnSpacing.md)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(stringResource(R.string.profile_top_stories), style = MaterialTheme.typography.headlineSmall.copy(fontFamily = ProfileEditorialFamily), color = MaterialTheme.colorScheme.onSurface)
                    Spacer(Modifier.weight(1f))
                    Row(
                        modifier = Modifier.clickable(onClick = onSeeAllClick),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(stringResource(R.string.profile_see_all), style = MaterialTheme.typography.titleMedium, color = BrandRed)
                        Spacer(Modifier.width(4.dp))
                        Image(
                            painterResource(R.drawable.ic_forward_muted),
                            contentDescription = "See all stories",
                            modifier = Modifier.size(18.dp),
                            colorFilter = ColorFilter.tint(BrandRed)
                        )
                    }
                }
                Spacer(Modifier.height(WritOnSpacing.md))
                if (highlights.isEmpty()) {
                    Text(stringResource(R.string.feed_empty_desc), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                } else {
                    highlights.take(3).forEach { story ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onStoryClick(story.id) }
                                .padding(vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(story.title, style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold), color = MaterialTheme.colorScheme.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Text("${story.category} • ${story.readingTimeMin} min read • ${story.likesCnt} applauds", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Image(
                                painterResource(R.drawable.ic_forward_muted),
                                contentDescription = "Read story",
                                modifier = Modifier.size(18.dp),
                                colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onSurfaceVariant)
                            )
                        }
                        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant, thickness = 0.5.dp)
                    }
                }
            }
        }
    }
}

@Composable
private fun ProfileEmptyTab(type: String, onAction: () -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(WritOnRadius.card),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
        tonalElevation = WritOnElevation.flat,
        shadowElevation = WritOnElevation.raised
    ) {
        Column(
            modifier = Modifier.padding(WritOnSpacing.xl),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(stringResource(R.string.feed_empty_title), style = MaterialTheme.typography.headlineSmall.copy(fontFamily = ProfileEditorialFamily), color = MaterialTheme.colorScheme.onSurface)
            Spacer(Modifier.height(WritOnSpacing.xs))
            Text(stringResource(R.string.feed_empty_desc), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
            Spacer(Modifier.height(WritOnSpacing.md))
            Button(
                onClick = onAction,
                colors = ButtonDefaults.buttonColors(containerColor = BrandRed),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text(stringResource(R.string.profile_write_story), color = Color.White)
            }
        }
    }
}

@Composable
private fun EditProfileDialog(
    initialName: String,
    initialPenName: String,
    initialBio: String,
    initialLocation: String,
    initialAvatarUrl: String?,
    isLoading: Boolean,
    errorMessage: String?,
    onDismiss: () -> Unit,
    onSave: (fullName: String, penName: String, bio: String, location: String, avatarContext: android.content.Context?, avatarUri: Uri?) -> Unit
) {
    var fullName by remember { mutableStateOf(initialName) }
    var penName by remember { mutableStateOf(initialPenName) }
    var bio by remember { mutableStateOf(initialBio) }
    var location by remember { mutableStateOf(initialLocation) }
    var selectedAvatarUri by remember { mutableStateOf<Uri?>(null) }
    val context = LocalContext.current
    val avatarPicker = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        selectedAvatarUri = uri
    }

    Dialog(onDismissRequest = onDismiss) {
        val dialogView = LocalView.current
        // The platform Dialog default is a heavy black dim. Keep the edit form
        // focused without turning the WritOn paper background into grey mud.
        SideEffect {
            (dialogView.parent as? DialogWindowProvider)?.window?.apply {
                setDimAmount(0.12f)
                setBackgroundDrawable(android.graphics.drawable.ColorDrawable(Color.Transparent.toArgb()))
            }
        }
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.surface,
            tonalElevation = 6.dp,
            modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        "Edit Writer Profile",
                        style = MaterialTheme.typography.headlineSmall.copy(fontFamily = ProfileEditorialFamily, fontSize = 22.sp),
                        color = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.weight(1f)
                    )
                    IconButton(onClick = onDismiss) {
                        Image(
                            painterResource(R.drawable.ic_close),
                            contentDescription = "Close",
                            modifier = Modifier.size(20.dp),
                            colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onSurface)
                        )
                    }
                }

                OutlinedTextField(
                    value = fullName,
                    onValueChange = { fullName = it },
                    label = { Text(stringResource(R.string.auth_full_name_hint)) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                )

                OutlinedTextField(
                    value = penName,
                    onValueChange = { penName = it.removePrefix("@").lowercase() },
                    label = { Text(stringResource(R.string.profile_pen_name_hint)) },
                    prefix = { Text("@") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                )

                errorMessage?.let { error ->
                    Text(
                        text = error,
                        style = MaterialTheme.typography.bodySmall,
                        color = BrandRed,
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    UserAvatar(
                        url = selectedAvatarUri?.toString() ?: initialAvatarUrl,
                        name = fullName.ifBlank { initialName },
                        size = 72.dp
                    )
                    OutlinedButton(
                        onClick = {
                            avatarPicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                        },
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text(stringResource(R.string.profile_change_photo))
                    }
                }

                OutlinedTextField(
                    value = bio,
                    onValueChange = { bio = it },
                    label = { Text(stringResource(R.string.profile_bio_hint)) },
                    minLines = 3,
                    maxLines = 5,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                )

                OutlinedTextField(
                    value = location,
                    onValueChange = { location = it },
                    label = { Text(stringResource(R.string.profile_location_hint)) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                )

                Spacer(Modifier.height(4.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(onClick = onDismiss) {
                        Text(stringResource(R.string.common_cancel), color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Spacer(Modifier.width(8.dp))
                    Button(
                        onClick = {
                            if (fullName.isNotBlank() && penName.isNotBlank()) {
                                onSave(
                                    fullName,
                                    penName.removePrefix("@").lowercase(),
                                    bio,
                                    location,
                                    context,
                                    selectedAvatarUri
                                )
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = BrandRed),
                        shape = RoundedCornerShape(10.dp),
                        enabled = !isLoading && fullName.isNotBlank() && penName.isNotBlank()
                    ) {
                        if (isLoading) {
                            CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                            Spacer(Modifier.width(6.dp))
                        }
                        Text(stringResource(R.string.profile_save_changes), color = Color.White)
                    }
                }
            }
        }
    }
}

private fun initialsOf(name: String): String = name.split(" ").mapNotNull { it.firstOrNull()?.uppercaseChar()?.toString() }.take(2).joinToString("")

private fun formatProfileCount(value: Int): String =
    if (value >= 1_000) String.format(java.util.Locale.getDefault(), "%.1fK", value / 1_000.0) else value.toString()

private fun String.toUserFacingProfileError(): String {
    val normalized = trim()
    return when {
        normalized.contains("username is already taken", ignoreCase = true) ->
            "That pen name is already taken. Please choose another one."
        normalized.contains("Username may contain only", ignoreCase = true) ->
            "Use 3–32 lowercase letters, numbers, or underscores only."
        normalized.contains("Invalid profile data", ignoreCase = true) ->
            "Please check your name and pen name, then try again."
        normalized.isBlank() -> "We couldn't save your profile. Please try again."
        else -> normalized.removePrefix("{\"error\":\"").substringBefore("\"}")
    }
}

@Composable
private fun MilestoneJourneyCard(journey: MilestoneJourneyDto) {
    val nextMilestones = journey.milestones
        .filterNot { it.earned }
        .sortedByDescending { if (it.target == 0) 0f else it.progress.toFloat() / it.target }
        .take(3)
    val earned = journey.milestones.filter { it.earned }.takeLast(3)
    val visible = if (nextMilestones.isNotEmpty()) nextMilestones else earned

    Surface(
        color = MaterialTheme.colorScheme.surface,
        shape = RoundedCornerShape(16.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(stringResource(R.string.profile_writer_journey), style = MaterialTheme.typography.titleLarge.copy(fontFamily = ProfileEditorialFamily, fontWeight = FontWeight.Bold))
                    Text(stringResource(R.string.profile_milestones_count, journey.summary.earned, journey.summary.total), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Text("✦", color = BrandRed, fontSize = 28.sp)
            }
            visible.forEach { milestone ->
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Surface(shape = CircleShape, color = if (milestone.earned) BrandRed.copy(alpha = 0.14f) else MaterialTheme.colorScheme.surfaceVariant, modifier = Modifier.size(42.dp)) {
                        Box(contentAlignment = Alignment.Center) { Text(milestoneSymbol(milestone.icon), fontSize = 20.sp) }
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text(milestone.title, fontWeight = FontWeight.SemiBold)
                        Text(milestone.description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2, overflow = TextOverflow.Ellipsis)
                        if (!milestone.earned) {
                            LinearProgressIndicator(
                                progress = { if (milestone.target == 0) 0f else milestone.progress.toFloat() / milestone.target },
                                modifier = Modifier.fillMaxWidth().padding(top = 6.dp),
                                color = BrandRed
                            )
                            Text("${milestone.progress}/${milestone.target}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        }
    }
}

private fun milestoneSymbol(icon: String): String = when (icon) {
    "book" -> "▤"
    "applause" -> "👏"
    "bookmark" -> "⌑"
    "comment" -> "◌"
    "quill" -> "✒"
    "reader" -> "◉"
    "compass" -> "◇"
    "signature" -> "✎"
    else -> "✦"
}


