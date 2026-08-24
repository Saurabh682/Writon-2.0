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
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
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
    onBackClick: () -> Unit,
    onContinueClick: (List<String>) -> Unit,
    onSkipClick: () -> Unit
) {
    val topics = remember {
        listOf(
            Topic("poetry", "Poetry", R.drawable.ic_write_quill_orange),
            Topic("essays", "Essays", R.drawable.ic_book_orange),
            Topic("philosophy", "Philosophy", R.drawable.ic_category_orange),
            Topic("short_stories", "Short Stories", R.drawable.ic_book_orange),
            Topic("shayari", "Shayari", R.drawable.ic_heart_orange),
            Topic("journalism", "Journalism", R.drawable.ic_write_quill_orange),
            Topic("humour", "Humour", R.drawable.ic_category_orange),
            Topic("life_wellness", "Life & Wellness", R.drawable.ic_heart_orange),
            Topic("sci_fi_fantasy", "Sci-Fi & Fantasy", R.drawable.ic_category_orange),
            Topic("travel", "Travel", R.drawable.ic_public_orange),
            Topic("career_growth", "Career & Growth", R.drawable.ic_collection_orange),
            Topic("more_topics", "More Topics", R.drawable.ic_category_orange)
        )
    }
    var selectedTopics by remember { mutableStateOf(setOf<String>()) }

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
                            selectedTopics = if (topic.id in selectedTopics) selectedTopics - topic.id else selectedTopics + topic.id
                        }
                    )
                }
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
                onClick = { onContinueClick(topics.filter { it.id in selectedTopics }.map(Topic::title)) },
                modifier = Modifier.fillMaxWidth().height(56.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Accent, contentColor = SurfacePaper)
            ) {
                Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    Text(stringResource(R.string.common_continue), style = MaterialTheme.typography.titleMedium.copy(fontSize = 18.sp))
                    Image(
                        painter = painterResource(R.drawable.ic_forward_white),
                        contentDescription = null,
                        modifier = Modifier.align(Alignment.CenterEnd).size(27.dp)
                    )
                }
            }

            TextButton(
                onClick = onSkipClick,
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
                    fontWeight = FontWeight.SemiBold
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
            .background(SurfacePaper)
            .border(1.dp, if (isSelected) Accent else Border, RoundedCornerShape(18.dp))
            .clickable(onClick = onClick)
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
    WritOnTheme { InterestsScreen(onBackClick = {}, onContinueClick = {}, onSkipClick = {}) }
}
