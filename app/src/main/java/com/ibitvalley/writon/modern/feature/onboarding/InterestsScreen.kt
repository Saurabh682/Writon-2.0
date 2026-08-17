package com.ibitvalley.writon.modern.feature.onboarding

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnTheme

private val BrandBeigeColor = Color(0xFFF9F7F2)
private val BrandRedColor = Color(0xFFB0301B)

data class Topic(
    val id: String,
    val title: String,
    val description: String,
    val icon: ImageVector,
    val iconBackground: Color
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InterestsScreen(
    onBackClick: () -> Unit,
    onContinueClick: (List<String>) -> Unit,
    onSkipClick: () -> Unit
) {
    val topics = remember {
        listOf(
            Topic("poetry", "Poetry", "The soul in few words", Icons.Default.Edit, Color(0xFFFFE8E8)),
            Topic("essays", "Essays", "Thoughts that stay with you", Icons.Default.MenuBook, Color(0xFFF0F0F0)),
            Topic("philosophy", "Philosophy", "Ideas that shape life", Icons.Default.Psychology, Color(0xFFE8F5E9)),
            Topic("short_stories", "Short Stories", "Little worlds in minutes", Icons.Default.Coffee, Color(0xFFFFF3E0)),
            Topic("shayari", "Shayari", "Feelings in beautiful lines", Icons.Default.Favorite, Color(0xFFFFEBEE)),
            Topic("journalism", "Journalism", "Truth. Context. Perspective.", Icons.Default.Create, Color(0xFFE3F2FD)),
            Topic("humour", "Humour", "Because laughter heals", Icons.Default.SentimentSatisfied, Color(0xFFFFF9C4)),
            Topic("wellness", "Life & Wellness", "Better mind, better you", Icons.Default.Grass, Color(0xFFE8F5E9)),
            Topic("scifi", "Sci-Fi & Fantasy", "Beyond imagination", Icons.Default.Public, Color(0xFFF3E5F5)),
            Topic("career", "Career & Growth", "Learn. Grow. Move ahead.", Icons.Default.BusinessCenter, Color(0xFFE0F2F1)),
            Topic("travel", "Travel", "Stories from around the world", Icons.Default.PhotoCamera, Color(0xFFFFF3E0)),
            Topic("more", "More Topics", "Politics, Tech, Reviews & more", Icons.Default.GridView, Color(0xFFEEEEEE))
        )
    }

    var selectedTopics by remember { mutableStateOf(setOf<String>()) }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = BrandBeigeColor
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 20.dp)
        ) {
            Spacer(modifier = Modifier.height(16.dp))

            // Top Bar
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onBackClick) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                }

                Column(horizontalAlignment = Alignment.End) {
                    Text(text = "Step 1 of 2", style = MaterialTheme.typography.labelMedium)
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(modifier = Modifier.width(60.dp).height(4.dp)) {
                        Box(modifier = Modifier.weight(0.5f).fillMaxHeight().background(BrandRedColor))
                        Box(modifier = Modifier.weight(0.5f).fillMaxHeight().background(Color.LightGray))
                    }
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Header
            Text(
                text = "What do you love reading?",
                style = MaterialTheme.typography.headlineLarge.copy(
                    fontSize = 36.sp,
                    fontWeight = FontWeight.Bold
                )
            )

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = "Choose a few topics that inspire you.\nWe’ll personalize your experience.",
                style = MaterialTheme.typography.bodyLarge,
                color = Color.Gray
            )

            Spacer(modifier = Modifier.height(32.dp))

            // Grid
            LazyVerticalGrid(
                columns = GridCells.Fixed(3),
                modifier = Modifier.weight(1f),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                contentPadding = PaddingValues(bottom = 16.dp)
            ) {
                items(topics) { topic ->
                    TopicCard(
                        topic = topic,
                        isSelected = selectedTopics.contains(topic.id),
                        onClick = {
                            selectedTopics = if (selectedTopics.contains(topic.id)) {
                                selectedTopics - topic.id
                            } else {
                                selectedTopics + topic.id
                            }
                        }
                    )
                }
            }

            // Footer
            Row(
                modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.FavoriteBorder,
                    contentDescription = null,
                    tint = BrandRedColor,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "You can always change these later in Settings.",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.Gray
                )
            }

            // Buttons
            Button(
                onClick = { onContinueClick(selectedTopics.map { id -> topics.find { it.id == id }?.title ?: "" }) },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                colors = ButtonDefaults.buttonColors(containerColor = BrandRedColor),
                shape = RoundedCornerShape(12.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Spacer(modifier = Modifier.width(24.dp))
                    Text(text = "Continue", fontSize = 18.sp)
                    Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null)
                }
            }

            TextButton(
                onClick = onSkipClick,
                modifier = Modifier.align(Alignment.CenterHorizontally).padding(vertical = 8.dp)
            ) {
                Text(
                    text = "Skip for now",
                    color = Color.Gray,
                    textDecoration = androidx.compose.ui.text.style.TextDecoration.Underline
                )
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@Composable
fun TopicCard(
    topic: Topic,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .aspectRatio(0.8f)
            .clip(RoundedCornerShape(12.dp))
            .background(Color.White)
            .border(
                width = 1.dp,
                color = if (isSelected) BrandRedColor else Color(0xFFF0F0F0),
                shape = RoundedCornerShape(12.dp)
            )
            .clickable { onClick() }
            .padding(8.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(topic.iconBackground),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = topic.icon,
                    contentDescription = null,
                    tint = Color.DarkGray,
                    modifier = Modifier.size(24.dp)
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = topic.title,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = topic.description,
                style = MaterialTheme.typography.bodySmall.copy(fontSize = 10.sp),
                color = Color.Gray,
                textAlign = TextAlign.Center,
                lineHeight = 14.sp
            )
        }

        if (isSelected) {
            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(4.dp)
                    .size(16.dp)
                    .clip(CircleShape)
                    .background(BrandRedColor),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Check,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(12.dp)
                )
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
fun InterestsScreenPreview() {
    WritOnTheme {
        InterestsScreen(onBackClick = {}, onContinueClick = {}, onSkipClick = {})
    }
}
