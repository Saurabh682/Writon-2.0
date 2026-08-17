package com.ibitvalley.writon.modern.feature.editor

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.ibitvalley.writon.modern.core.designsystem.theme.AccentAIGlow
import com.ibitvalley.writon.modern.core.designsystem.theme.AccentPrimary
import com.ibitvalley.writon.modern.feature.feed.CATEGORIES
import kotlin.math.ceil

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StoryEditorScreen(
    viewModel: EditorViewModel,
    onBackClick: () -> Unit,
    onPublished: () -> Unit
) {
    val title by viewModel.title.collectAsState()
    val summary by viewModel.summary.collectAsState()
    val category by viewModel.category.collectAsState()
    val content by viewModel.content.collectAsState()
    val isPublishing by viewModel.isPublishing.collectAsState()
    val aiSuggestion by viewModel.aiSuggestion.collectAsState()

    val scrollState = rememberScrollState()
    
    // Metrics
    val wordCount = content.split(Regex("\\s+")).filter { it.isNotBlank() }.size
    val readTime = ceil(wordCount / 200.0).toInt()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "Drafting Story",
                            fontFamily = FontFamily.Serif,
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp
                        )
                        Text(
                            text = "Auto-saved to local Room outbox",
                            fontSize = 10.sp,
                            color = Color.Gray
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    Button(
                        onClick = { viewModel.publishStory(onPublished) },
                        enabled = !isPublishing && title.isNotBlank() && content.isNotBlank(),
                        contentPadding = PaddingValues(),
                        colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
                        shape = RoundedCornerShape(20.dp),
                        modifier = Modifier
                            .padding(end = 8.dp)
                            .background(
                                brush = Brush.horizontalGradient(listOf(AccentPrimary, AccentAIGlow)),
                                shape = RoundedCornerShape(20.dp)
                            )
                            .height(40.dp)
                            .widthIn(min = 100.dp)
                    ) {
                        if (isPublishing) {
                            CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                        } else {
                            Text("Publish", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    }
                }
            )
        },
        bottomBar = {
            // Floating Copilot Bar
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                shape = RoundedCornerShape(32.dp),
                color = MaterialTheme.colorScheme.surfaceVariant,
                tonalElevation = 8.dp,
                shadowElevation = 4.dp
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    AssistantActionButton(
                        icon = Icons.Default.AutoFixHigh,
                        label = "Tighten",
                        onClick = { viewModel.runAICopilot("polish") }
                    )
                    AssistantActionButton(
                        icon = Icons.Default.AutoAwesome,
                        label = "Enrich",
                        onClick = { viewModel.runAICopilot("enrich") }
                    )
                    AssistantActionButton(
                        icon = Icons.Default.Lightbulb,
                        label = "Headlines",
                        onClick = { viewModel.runAICopilot("headlines") }
                    )
                }
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(scrollState)
                .padding(bottom = 120.dp) // Space for bottom bar
        ) {
            // AI Suggestion Overlay
            AnimatedVisibility(
                visible = aiSuggestion != null,
                enter = expandVertically() + fadeIn(),
                exit = shrinkVertically() + fadeOut()
            ) {
                aiSuggestion?.let { suggestion ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        colors = CardDefaults.cardColors(containerColor = AccentAIGlow.copy(alpha = 0.05f)),
                        shape = RoundedCornerShape(16.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, AccentAIGlow.copy(alpha = 0.3f))
                    ) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = AccentAIGlow, modifier = Modifier.size(16.dp))
                                Text("AI SUGGESTION", fontWeight = FontWeight.Bold, fontSize = 11.sp, color = AccentAIGlow, letterSpacing = 1.sp)
                            }
                            Text(suggestion, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
                            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                Button(
                                    onClick = { viewModel.applySuggestion() },
                                    colors = ButtonDefaults.buttonColors(containerColor = AccentAIGlow),
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Text("Apply Changes", fontSize = 12.sp)
                                }
                                TextButton(onClick = { viewModel.dismissSuggestion() }) {
                                    Text("Dismiss", color = Color.Gray, fontSize = 12.sp)
                                }
                            }
                        }
                    }
                }
            }

            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp)
            ) {
                // Cover Image Preview & Input
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    AsyncImage(
                        model = "https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=1000",
                        contentDescription = null,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(140.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(MaterialTheme.colorScheme.surfaceVariant),
                        contentScale = ContentScale.Crop
                    )
                    Text("Cover Image URL (Optional)", style = MaterialTheme.typography.labelSmall, color = Color.Gray)
                }

                // Category Selection
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Category", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(CATEGORIES.filter { it != "All" }) { cat ->
                            FilterChip(
                                selected = category == cat,
                                onClick = { viewModel.category.value = cat },
                                label = { Text(cat, fontSize = 12.sp) },
                                shape = RoundedCornerShape(12.dp),
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = AccentPrimary.copy(alpha = 0.1f),
                                    selectedLabelColor = AccentPrimary
                                )
                            )
                        }
                    }
                }

                // Title
                TextField(
                    value = title,
                    onValueChange = { viewModel.title.value = it },
                    placeholder = { Text("Title of your story...", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = Color.Gray) },
                    modifier = Modifier.fillMaxWidth(),
                    textStyle = MaterialTheme.typography.headlineLarge.copy(fontFamily = FontFamily.Serif),
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = Color.Transparent,
                        unfocusedContainerColor = Color.Transparent,
                        focusedIndicatorColor = Color.Transparent,
                        unfocusedIndicatorColor = Color.Transparent
                    )
                )

                // Subtitle
                TextField(
                    value = summary,
                    onValueChange = { viewModel.summary.value = it },
                    placeholder = { Text("Add a short teaser...", fontSize = 16.sp, color = Color.Gray) },
                    modifier = Modifier.fillMaxWidth(),
                    textStyle = MaterialTheme.typography.bodyLarge.copy(fontStyle = FontStyle.Italic),
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = Color.Transparent,
                        unfocusedContainerColor = Color.Transparent,
                        focusedIndicatorColor = Color.Transparent,
                        unfocusedIndicatorColor = Color.Transparent
                    )
                )

                HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))

                // Body Content
                TextField(
                    value = content,
                    onValueChange = { viewModel.content.value = it },
                    placeholder = { Text("Start writing your masterpiece...", fontSize = 17.sp, color = Color.Gray) },
                    modifier = Modifier.fillMaxWidth().heightIn(min = 400.dp),
                    textStyle = MaterialTheme.typography.bodyLarge.copy(lineHeight = 28.sp),
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = Color.Transparent,
                        unfocusedContainerColor = Color.Transparent,
                        focusedIndicatorColor = Color.Transparent,
                        unfocusedIndicatorColor = Color.Transparent
                    )
                )

                // Metrics Footer
                Row(
                    modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "$wordCount words",
                        fontSize = 12.sp,
                        fontFamily = FontFamily.Monospace,
                        color = Color.Gray
                    )
                    Text(
                        text = "$readTime min read",
                        fontSize = 12.sp,
                        fontFamily = FontFamily.Monospace,
                        color = Color.Gray
                    )
                }
            }
        }
    }
}

@Composable
fun AssistantActionButton(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, onClick: () -> Unit) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .clickable { onClick() }
            .padding(horizontal = 16.dp, vertical = 8.dp)
    ) {
        Icon(icon, contentDescription = null, tint = AccentAIGlow, modifier = Modifier.size(20.dp))
        Text(label, fontSize = 10.sp, fontWeight = FontWeight.Medium, color = AccentAIGlow)
    }
}

