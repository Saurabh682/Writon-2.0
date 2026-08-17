package com.ibitvalley.writon.modern.feature.reader

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandBeige
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReaderScreen(
    viewModel: ReaderViewModel,
    onBackClick: () -> Unit
) {
    val post by viewModel.post.collectAsState()
    val scrollState = rememberScrollState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(end = 48.dp),
                        horizontalArrangement = Arrangement.Center
                    ) {
                        // Progress Segments Mock
                        repeat(4) { index ->
                            Box(
                                modifier = Modifier
                                    .padding(horizontal = 2.dp)
                                    .weight(1f)
                                    .height(4.dp)
                                    .clip(RoundedCornerShape(2.dp))
                                    .background(if (index == 0) BrandRed else Color.LightGray)
                            )
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { /* TODO */ }) {
                        Icon(Icons.Outlined.BookmarkBorder, contentDescription = "Bookmark")
                    }
                    IconButton(onClick = { /* TODO */ }) {
                        Icon(Icons.Default.MoreHoriz, contentDescription = "More")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = BrandBeige)
            )
        },
        bottomBar = {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = BrandBeige,
                tonalElevation = 8.dp
            ) {
                Row(
                    modifier = Modifier
                        .padding(horizontal = 16.dp, vertical = 12.dp)
                        .fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    AsyncImage(
                        model = "https://ui-avatars.com/api/?name=User",
                        contentDescription = null,
                        modifier = Modifier.size(40.dp).clip(CircleShape)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    OutlinedTextField(
                        value = "",
                        onValueChange = {},
                        placeholder = { Text("Write a response...", fontSize = 14.sp) },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(24.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            unfocusedContainerColor = Color.White,
                            focusedContainerColor = Color.White,
                            unfocusedBorderColor = Color.Transparent,
                            focusedBorderColor = BrandRed
                        )
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    FloatingActionButton(
                        onClick = { /* TODO */ },
                        containerColor = BrandRed,
                        contentColor = Color.White,
                        shape = CircleShape,
                        modifier = Modifier.size(48.dp)
                    ) {
                        Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "Send", modifier = Modifier.size(20.dp))
                    }
                }
            }
        },
        containerColor = BrandBeige
    ) { innerPadding ->
        post?.let { p ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .verticalScroll(scrollState)
                    .padding(24.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = p.category.uppercase(),
                        color = BrandRed,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp
                    )
                    Text(
                        text = " • ${p.readingTimeMin} min read",
                        fontSize = 12.sp,
                        color = Color.Gray,
                        modifier = Modifier.padding(start = 8.dp)
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                Text(
                    text = p.title,
                    style = MaterialTheme.typography.headlineLarge,
                    fontFamily = FontFamily.Serif,
                    fontWeight = FontWeight.Bold,
                    fontSize = 36.sp,
                    lineHeight = 44.sp
                )

                Box(
                    modifier = Modifier
                        .padding(top = 16.dp)
                        .width(40.dp)
                        .height(4.dp)
                        .background(BrandRed)
                )

                Spacer(modifier = Modifier.height(24.dp))

                p.summary?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodyLarge,
                        color = Color.DarkGray,
                        lineHeight = 26.sp
                    )
                }

                Spacer(modifier = Modifier.height(32.dp))

                // Author Row
                Row(verticalAlignment = Alignment.CenterVertically) {
                    AsyncImage(
                        model = p.authorAvatarUrl ?: "https://ui-avatars.com/api/?name=${p.authorName}",
                        contentDescription = null,
                        modifier = Modifier.size(56.dp).clip(CircleShape)
                    )
                    Column(modifier = Modifier.padding(start = 12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(text = p.authorName, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            Icon(
                                Icons.Default.Verified,
                                contentDescription = null,
                                tint = BrandRed,
                                modifier = Modifier.size(14.dp).padding(start = 4.dp)
                            )
                        }
                        Text(text = "@${p.authorPenName}", color = Color.Gray, fontSize = 13.sp)
                        Text(text = "April 28, 2025 • 7:30 AM", color = Color.Gray, fontSize = 11.sp)
                    }
                }

                HorizontalDivider(modifier = Modifier.padding(vertical = 24.dp), color = Color.LightGray)

                // Body Content
                Text(
                    text = p.content,
                    style = MaterialTheme.typography.bodyLarge,
                    fontFamily = FontFamily.Serif,
                    lineHeight = 28.sp,
                    color = Color.Black
                )

                Spacer(modifier = Modifier.height(48.dp))

                // Interaction Stats
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(painterResource(R.drawable.speech), contentDescription = null, tint = BrandRed, modifier = Modifier.size(20.dp))
                        Text("1.2K", modifier = Modifier.padding(start = 8.dp), fontSize = 14.sp, fontWeight = FontWeight.Medium)
                        Spacer(modifier = Modifier.width(24.dp))
                        Icon(Icons.Default.ChatBubbleOutline, contentDescription = null, tint = Color.Gray, modifier = Modifier.size(20.dp))
                        Text("128", modifier = Modifier.padding(start = 8.dp), fontSize = 14.sp, fontWeight = FontWeight.Medium)
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Outlined.BookmarkBorder, contentDescription = null, tint = Color.Black, modifier = Modifier.size(20.dp))
                            Text("Save", modifier = Modifier.padding(start = 4.dp), fontSize = 14.sp)
                        }
                        Spacer(modifier = Modifier.width(16.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Outlined.Share, contentDescription = null, tint = Color.Black, modifier = Modifier.size(20.dp))
                            Text("Share", modifier = Modifier.padding(start = 4.dp), fontSize = 14.sp)
                        }
                    }
                }
            }
        }
    }
}
