package com.ibitvalley.writon.modern.feature.profile
import androidx.compose.ui.res.stringResource

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.network.model.PostDto
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandBeige
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed
import com.ibitvalley.writon.modern.core.designsystem.theme.SurfacePaper
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnElevation
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnRadius
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnSpacing

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
    onApplaudsClick: () -> Unit = {}
) {
    val user by viewModel.userProfile.collectAsState()
    val stories by viewModel.userStories.collectAsState()
    val highlights by viewModel.highlights.collectAsState()
    val isUpdating by viewModel.isLoading.collectAsState()

    var selectedTab by remember { mutableIntStateOf(0) }
    var overflowExpanded by remember { mutableStateOf(false) }
    var showEditDialog by remember { mutableStateOf(false) }

    val name = user?.fullName ?: stringResource(R.string.profile_title)
    val penName = user?.penName ?: ""
    val bio = user?.bio?.takeIf { it.isNotBlank() } ?: "Essayist, architectural critic, and student of quiet spaces. Writing about design systems, stillness, and human craft."
    val initials = initialsOf(name)

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
                    IconButton(onClick = { }) {
                        Image(
                            painterResource(R.drawable.ic_share),
                            contentDescription = "Share profile",
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
            item { ProfileIdentity(name, penName, bio, initials, user?.location, user?.joinedAt, onEditClick = { showEditDialog = true }) }
            item { ProfileStats(stories.size, user?.applaudsReceived ?: 0, user?.followersCount ?: 0, user?.followingCount ?: 0, onApplaudsClick) }
            item { ProfileTabs(selectedTab) { selectedTab = it } }

            when (selectedTab) {
                0 -> item { ProfileAboutTab(name, bio, user?.location, user?.joinedAt, user?.quoteOfDay, onEditClick = { showEditDialog = true }) }
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
            isLoading = isUpdating,
            onDismiss = { showEditDialog = false },
            onSave = { newName, newPenName, newBio, newLocation ->
                viewModel.updateProfile(newName, newPenName, newBio, newLocation, onSuccess = {
                    showEditDialog = false
                })
            }
        )
    }
}

@Composable
private fun ProfileIdentity(
    name: String,
    penName: String,
    bio: String,
    initials: String,
    location: String?,
    joinedAt: String?,
    onEditClick: () -> Unit
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.Top) {
            Box {
                Surface(shape = CircleShape, color = Color(0xFFF2ECE4), modifier = Modifier.size(88.dp)) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(initials, style = MaterialTheme.typography.displayMedium.copy(fontSize = 31.sp, fontFamily = ProfileEditorialFamily))
                    }
                }
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
                Spacer(Modifier.height(WritOnSpacing.xxs))
                Text(bio, style = MaterialTheme.typography.bodyMedium.copy(fontSize = 14.sp, lineHeight = 19.sp), maxLines = 3, overflow = TextOverflow.Ellipsis)
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
private fun ProfileStats(stories: Int, applauds: Int, followers: Int, following: Int, onApplaudsClick: () -> Unit) {
    Surface(
        shape = RoundedCornerShape(WritOnRadius.card),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
        tonalElevation = WritOnElevation.flat,
        shadowElevation = WritOnElevation.raised,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(modifier = Modifier.fillMaxWidth().padding(vertical = WritOnSpacing.lg), horizontalArrangement = Arrangement.SpaceEvenly) {
            ProfileStat(stories.toString(), "Stories\npublished")
            VerticalDivider(Modifier.height(54.dp), color = MaterialTheme.colorScheme.outlineVariant)
            ProfileStat(formatProfileCount(applauds), "Applauds\nreceived", accent = true, modifier = Modifier.clickable(onClick = onApplaudsClick))
            VerticalDivider(Modifier.height(54.dp), color = MaterialTheme.colorScheme.outlineVariant)
            ProfileStat(followers.toString(), "Followers")
            VerticalDivider(Modifier.height(54.dp), color = MaterialTheme.colorScheme.outlineVariant)
            ProfileStat(following.toString(), "Following")
        }
    }
}

@Composable
private fun ProfileStat(value: String, label: String, accent: Boolean = true, modifier: Modifier = Modifier) {
    Column(modifier = modifier.widthIn(min = 54.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, style = MaterialTheme.typography.titleLarge.copy(fontSize = 20.sp), color = if (accent) BrandRed else MaterialTheme.colorScheme.onSurface)
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
private fun ProfileAboutTab(name: String, bio: String, location: String?, joinedAt: String?, quoteOfDay: String?, onEditClick: () -> Unit) {
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
                        Text("Edit Bio", color = BrandRed, style = MaterialTheme.typography.labelLarge)
                    }
                }
                Spacer(Modifier.height(WritOnSpacing.sm))
                Text(bio, style = MaterialTheme.typography.bodyMedium.copy(fontSize = 15.sp, lineHeight = 22.sp), color = MaterialTheme.colorScheme.onSurfaceVariant)

                quoteOfDay?.takeIf { it.isNotBlank() }?.let { quote ->
                    Spacer(Modifier.height(WritOnSpacing.md))
                    Surface(
                        color = MaterialTheme.colorScheme.surfaceVariant,
                        shape = RoundedCornerShape(8.dp),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(Modifier.padding(12.dp)) {
                            Text("MOTTO / QUOTE", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = BrandRed, letterSpacing = 1.sp)
                            Spacer(Modifier.height(4.dp))
                            Text("\"$quote\"", fontStyle = androidx.compose.ui.text.font.FontStyle.Italic, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface)
                        }
                    }
                }

                Spacer(Modifier.height(WritOnSpacing.md))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Image(painterResource(R.drawable.ic_bookmark_orange), contentDescription = null, modifier = Modifier.size(22.dp))
                    Spacer(Modifier.width(WritOnSpacing.sm))
                    Text("Writer on WritOn since ${joinedAt?.take(4) ?: "2024"}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
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
                    Text("Top Stories", style = MaterialTheme.typography.headlineSmall.copy(fontFamily = ProfileEditorialFamily), color = MaterialTheme.colorScheme.onSurface)
                    Spacer(Modifier.weight(1f))
                    Row(
                        modifier = Modifier.clickable(onClick = onSeeAllClick),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("See all", style = MaterialTheme.typography.titleMedium, color = BrandRed)
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
                    Text("Published stories and writer highlights will appear here.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
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
            Text("No $type yet", style = MaterialTheme.typography.headlineSmall.copy(fontFamily = ProfileEditorialFamily), color = MaterialTheme.colorScheme.onSurface)
            Spacer(Modifier.height(WritOnSpacing.xs))
            Text("Stories you write and publish will be presented here on your writer profile.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
            Spacer(Modifier.height(WritOnSpacing.md))
            Button(
                onClick = onAction,
                colors = ButtonDefaults.buttonColors(containerColor = BrandRed),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text("Write a Story ✍️", color = Color.White)
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
    isLoading: Boolean,
    onDismiss: () -> Unit,
    onSave: (fullName: String, penName: String, bio: String, location: String) -> Unit
) {
    var fullName by remember { mutableStateOf(initialName) }
    var penName by remember { mutableStateOf(initialPenName) }
    var bio by remember { mutableStateOf(initialBio) }
    var location by remember { mutableStateOf(initialLocation) }

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.surface,
            tonalElevation = 6.dp,
            modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
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
                    label = { Text("Full Name") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                )

                OutlinedTextField(
                    value = penName,
                    onValueChange = { penName = it },
                    label = { Text("Pen Name / Username") },
                    prefix = { Text("@") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                )

                OutlinedTextField(
                    value = bio,
                    onValueChange = { bio = it },
                    label = { Text("Bio (About your writing)") },
                    minLines = 3,
                    maxLines = 5,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                )

                OutlinedTextField(
                    value = location,
                    onValueChange = { location = it },
                    label = { Text("Location (e.g. San Francisco, CA)") },
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
                        Text("Cancel", color = Color(0xFF6D6963))
                    }
                    Spacer(Modifier.width(8.dp))
                    Button(
                        onClick = {
                            if (fullName.isNotBlank() && penName.isNotBlank()) {
                                onSave(fullName, penName, bio, location)
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


