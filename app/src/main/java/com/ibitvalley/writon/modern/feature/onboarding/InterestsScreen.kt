package com.ibitvalley.writon.modern.feature.onboarding

import androidx.compose.ui.res.stringResource
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnTheme

private val ScreenBackground = Color(0xFFF8F4EE)
private val SurfacePaper = Color(0xFFFFFDF9)
private val PrimaryText = Color(0xFF151718)
private val SecondaryText = Color(0xFF6D6963)
private val Accent = Color(0xFFE75A2A)
private val Border = Color(0xFFE9E1D7)
private val MutedChip = Color(0xFFF2ECE4)

private val InterestsEditorialFamily = FontFamily(
    Font(R.font.source_serif_4_regular, FontWeight.Normal),
    Font(R.font.source_serif_4_semibold, FontWeight.SemiBold),
    Font(R.font.source_serif_4_semibold, FontWeight.Bold)
)

private data class Topic(val id: String, val title: String, val icon: Int)

@Composable
fun InterestsScreen(
    initialSelectedTopicIds: Set<String>,
    isSaving: Boolean,
    errorMessage: String?,
    onBackClick: () -> Unit,
    onContinueClick: (Set<String>) -> Unit,
    onContinueWithSavedChoices: () -> Unit,
    onSkipClick: () -> Unit
) {
    val topics = remember {
        listOf(
            Topic("poetry", "Poetry", R.drawable.ic_write_quill_orange),
            Topic("essays", "Essays", R.drawable.ic_book_orange),
            Topic("philosophy", "Philosophy", R.drawable.ic_quote_orange),
            Topic("short_stories", "Short Stories", R.drawable.ic_collection_open_orange),
            Topic("shayari", "Shayari", R.drawable.ic_heart_orange),
            Topic("journalism", "Journalism", R.drawable.ic_tag_orange),
            Topic("humour", "Humour", R.drawable.ic_achievement_orange),
            Topic("life_wellness", "Life & Wellness", R.drawable.ic_sun_orange),
            Topic("sci_fi_fantasy", "Sci-Fi & Fantasy", R.drawable.ic_shuffle_orange),
            Topic("travel", "Travel", R.drawable.ic_explore_orange),
            Topic("career_growth", "Career & Growth", R.drawable.ic_folder_orange),
            Topic("more_topics", "More Topics", R.drawable.ic_category_orange)
        )
    }
    var selectedTopicsCsv by rememberSaveable { mutableStateOf(initialSelectedTopicIds.sorted().joinToString(",")) }
    val selectedTopics = selectedTopicsCsv
        .split(',')
        .filter(String::isNotBlank)
        .toSet()

    LaunchedEffect(initialSelectedTopicIds) {
        selectedTopicsCsv = initialSelectedTopicIds.sorted().joinToString(",")
    }

    Surface(modifier = Modifier.fillMaxSize(), color = ScreenBackground) {
        Column(modifier = Modifier.fillMaxSize().padding(horizontal = 24.dp)) {
            InterestsHeader(onBackClick)

            LazyVerticalGrid(
                columns = GridCells.Fixed(3),
                modifier = Modifier.weight(1f),
                contentPadding = PaddingValues(vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(topics, key = Topic::id) { topic ->
                    TopicCard(
                        topic = topic,
                        isSelected = topic.id in selectedTopics,
                        onClick = {
                            selectedTopicsCsv = (if (topic.id in selectedTopics) selectedTopics - topic.id else selectedTopics + topic.id)
                                .sorted()
                                .joinToString(",")
                        }
                    )
                }
            }

            Text(
                text = if (selectedTopics.isEmpty()) "Choose topics to personalize your feed." else "${selectedTopics.size} ${if (selectedTopics.size == 1) "topic" else "topics"} selected",
                style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.SemiBold),
                color = if (selectedTopics.isEmpty()) SecondaryText else Accent,
                modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                textAlign = TextAlign.Center,
            )

            errorMessage?.let { message ->
                Text(
                    text = message,
                    style = MaterialTheme.typography.bodySmall,
                    color = Accent,
                    modifier = Modifier.fillMaxWidth().padding(top = 6.dp),
                    textAlign = TextAlign.Center,
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Image(painter = painterResource(R.drawable.ic_heart_orange), contentDescription = null, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(8.dp))
                Text(
                    "You can always change these later in Settings.",
                    style = MaterialTheme.typography.bodySmall.copy(fontSize = 13.sp),
                    color = SecondaryText,
                    textAlign = TextAlign.Center
                )
            }

            Button(
                onClick = { onContinueClick(selectedTopics) },
                enabled = !isSaving,
                modifier = Modifier.fillMaxWidth().height(56.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Accent, contentColor = SurfacePaper)
            ) {
                Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    Text(if (isSaving) "Saving…" else stringResource(R.string.common_continue), style = MaterialTheme.typography.titleMedium.copy(fontSize = 18.sp))
                    Image(
                        painter = painterResource(R.drawable.ic_forward_white),
                        contentDescription = null,
                        modifier = Modifier.align(Alignment.CenterEnd).size(27.dp)
                    )
                }
            }

            if (errorMessage != null) {
                TextButton(
                    onClick = onContinueWithSavedChoices,
                    enabled = !isSaving,
                    modifier = Modifier.align(Alignment.CenterHorizontally),
                ) {
                    Text(
                        "Continue with saved choices",
                        style = MaterialTheme.typography.labelLarge,
                        color = Accent,
                    )
                }
            }

            TextButton(
                onClick = onSkipClick,
                enabled = !isSaving,
                modifier = Modifier.align(Alignment.CenterHorizontally).padding(vertical = 8.dp)
            ) {
                Text(
                    stringResource(R.string.common_skip),
                    style = MaterialTheme.typography.titleMedium.copy(fontSize = 17.sp),
                    color = SecondaryText,
                    textDecoration = TextDecoration.Underline
                )
            }
        }
    }
}

@Composable
private fun InterestsHeader(onBackClick: () -> Unit) {
    Box(modifier = Modifier.fillMaxWidth().padding(top = 14.dp)) {
        Image(
            painter = painterResource(R.drawable.ic_back),
            contentDescription = "Back",
            modifier = Modifier.align(Alignment.TopStart).padding(top = 8.dp).size(30.dp).clip(CircleShape).clickable(onClick = onBackClick)
        )
        Image(
            painter = painterResource(R.drawable.welcome_feather),
            contentDescription = null,
            modifier = Modifier.align(Alignment.TopEnd).padding(top = 4.dp).size(138.dp),
            contentScale = ContentScale.Fit
        )
        Column(modifier = Modifier.padding(top = 50.dp, end = 72.dp)) {
            Text(
                "What do you\nlove reading?",
                style = MaterialTheme.typography.displayLarge.copy(
                    fontFamily = InterestsEditorialFamily,
                    fontSize = 38.sp,
                    lineHeight = 42.sp,
                    fontWeight = FontWeight.Normal
                ),
                color = PrimaryText
            )
            Spacer(Modifier.height(12.dp))
            Text(
                "Choose a few topics that inspire you.\nWe’ll personalize your experience.",
                style = MaterialTheme.typography.bodyLarge.copy(fontSize = 16.sp, lineHeight = 23.sp),
                color = SecondaryText
            )
        }
    }
}

@Composable
private fun TopicCard(topic: Topic, isSelected: Boolean, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(96.dp)
            .clip(RoundedCornerShape(18.dp))
            .background(if (isSelected) MutedChip else SurfacePaper)
            .border(if (isSelected) 2.dp else 1.dp, if (isSelected) Accent else Border, RoundedCornerShape(18.dp))
            .clickable(onClick = onClick)
            .semantics {
                role = Role.Checkbox
                contentDescription = "${topic.title}, ${if (isSelected) "selected" else "not selected"}"
            }
            .padding(8.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Surface(shape = CircleShape, color = MutedChip, modifier = Modifier.size(40.dp)) {
                Box(contentAlignment = Alignment.Center) {
                    Image(painterResource(topic.icon), contentDescription = null, modifier = Modifier.size(24.dp))
                }
            }
            Spacer(Modifier.height(6.dp))
            Text(
                topic.title,
                style = MaterialTheme.typography.titleMedium.copy(
                    fontFamily = InterestsEditorialFamily,
                    fontSize = if (topic.title.length > 13) 12.sp else 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    lineHeight = 15.sp
                ),
                color = PrimaryText,
                maxLines = 2,
                textAlign = TextAlign.Center
            )
        }
        if (isSelected) {
            Surface(shape = CircleShape, color = Accent, modifier = Modifier.align(Alignment.TopEnd).size(26.dp)) {
                Box(contentAlignment = Alignment.Center) {
                    Image(painterResource(R.drawable.ic_check_white), contentDescription = "Selected", modifier = Modifier.size(15.dp))
                }
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun InterestsScreenPreview() {
    WritOnTheme {
        InterestsScreen(
            initialSelectedTopicIds = emptySet(),
            isSaving = false,
            errorMessage = null,
            onBackClick = {},
            onContinueClick = {},
            onContinueWithSavedChoices = {},
            onSkipClick = {},
        )
    }
}
