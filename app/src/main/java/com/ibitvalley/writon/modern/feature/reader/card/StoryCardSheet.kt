package com.ibitvalley.writon.modern.feature.reader.card

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.SheetState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ibitvalley.writon.modern.core.database.model.PostEntity
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandBeige
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed
import com.ibitvalley.writon.modern.core.designsystem.theme.Ink
import com.ibitvalley.writon.modern.core.designsystem.theme.InkMuted
import com.ibitvalley.writon.modern.core.designsystem.theme.ObsidianBackground
import com.ibitvalley.writon.modern.core.designsystem.theme.ObsidianBorderStroke
import com.ibitvalley.writon.modern.core.designsystem.theme.ObsidianPrimary
import com.ibitvalley.writon.modern.core.designsystem.theme.ObsidianTextPrimary
import com.ibitvalley.writon.modern.core.designsystem.theme.SurfacePaper
import com.ibitvalley.writon.modern.core.telemetry.WritOnTelemetry
import androidx.compose.runtime.rememberCompositionContext
import androidx.compose.ui.platform.LocalView
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Bottom Sheet for customizing, previewing, and exporting Story Cards.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StoryCardSheet(
    sheetState: SheetState,
    initialExcerpt: String,
    post: PostEntity,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val currentView = LocalView.current
    val parentComposition = rememberCompositionContext()
    val coroutineScope = rememberCoroutineScope()

    var selectedSize by remember { mutableStateOf(CardExportSize.PORTRAIT_4_5) }
    var selectedTheme by remember { mutableStateOf(CardTheme.PAPER) }
    var excerptText by remember { mutableStateOf(initialExcerpt.take(selectedSize.maxChars)) }
    var isGenerating by remember { mutableStateOf(false) }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = MaterialTheme.colorScheme.surface,
        dragHandle = null
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 16.dp)
                .verticalScroll(rememberScrollState())
        ) {
            // Header: Title & Close Button
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Share Story Card",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = "Generate a branded aesthetic quote card",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                IconButton(onClick = onDismiss) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Close",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Card Live Preview Area
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(if (selectedTheme == CardTheme.OBSIDIAN) Color(0xFF0E0F10) else Color(0xFFEDE7DC))
                    .padding(16.dp),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .width(selectedSize.previewWidthDp)
                        .height(selectedSize.previewHeightDp)
                        .clip(RoundedCornerShape(8.dp))
                        .border(
                            width = 1.dp,
                            color = if (selectedTheme == CardTheme.OBSIDIAN) ObsidianBorderStroke else Color(0xFFDDD4C5),
                            shape = RoundedCornerShape(8.dp)
                        )
                ) {
                    StoryCardContent(
                        excerpt = excerptText.ifBlank { "Select or type an excerpt..." },
                        title = post.title,
                        authorName = post.authorName,
                        authorPenName = post.authorPenName,
                        theme = selectedTheme,
                        exportSize = selectedSize,
                        isExportRender = false
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Format / Size Selector
            Text(
                text = "Format & Size",
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface
            )
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                CardExportSize.entries.forEach { size ->
                    val isSelected = size == selectedSize
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(
                                if (isSelected) BrandRed.copy(alpha = 0.12f)
                                else MaterialTheme.colorScheme.surfaceVariant
                            )
                            .border(
                                width = if (isSelected) 1.5.dp else 1.dp,
                                color = if (isSelected) BrandRed else Color.Transparent,
                                shape = RoundedCornerShape(8.dp)
                            )
                            .clickable {
                                selectedSize = size
                                if (excerptText.length > size.maxChars) {
                                    excerptText = excerptText.take(size.maxChars)
                                }
                            }
                            .padding(horizontal = 14.dp, vertical = 8.dp)
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = size.ratioLabel,
                                style = MaterialTheme.typography.labelLarge,
                                fontWeight = FontWeight.Bold,
                                color = if (isSelected) BrandRed else MaterialTheme.colorScheme.onSurface
                            )
                            Text(
                                text = size.description,
                                style = MaterialTheme.typography.labelSmall,
                                color = if (isSelected) BrandRed else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Theme Selector
            Text(
                text = "Theme Palette",
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface
            )
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                CardTheme.entries.forEach { theme ->
                    val isSelected = theme == selectedTheme
                    Row(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(8.dp))
                            .background(
                                if (isSelected) BrandRed.copy(alpha = 0.12f)
                                else MaterialTheme.colorScheme.surfaceVariant
                            )
                            .border(
                                width = if (isSelected) 1.5.dp else 1.dp,
                                color = if (isSelected) BrandRed else Color.Transparent,
                                shape = RoundedCornerShape(8.dp)
                            )
                            .clickable { selectedTheme = theme }
                            .padding(horizontal = 12.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Box(
                            modifier = Modifier
                                .size(16.dp)
                                .clip(CircleShape)
                                .background(if (theme == CardTheme.OBSIDIAN) ObsidianBackground else BrandBeige)
                                .border(1.dp, if (theme == CardTheme.OBSIDIAN) ObsidianPrimary else BrandRed, CircleShape)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = theme.label,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                            color = if (isSelected) BrandRed else MaterialTheme.colorScheme.onSurface
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Excerpt Editor Field
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Card Passage",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = "${excerptText.length}/${selectedSize.maxChars}",
                    style = MaterialTheme.typography.labelSmall,
                    color = if (excerptText.length >= selectedSize.maxChars) BrandRed else MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Spacer(modifier = Modifier.height(6.dp))
            OutlinedTextField(
                value = excerptText,
                onValueChange = { input ->
                    if (input.length <= selectedSize.maxChars) {
                        excerptText = input
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                maxLines = 4,
                textStyle = MaterialTheme.typography.bodyMedium,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = BrandRed,
                    unfocusedBorderColor = MaterialTheme.colorScheme.outline
                )
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Action Buttons: Save to Device & Share Card
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Save to Gallery
                OutlinedButton(
                    onClick = {
                        if (isGenerating) return@OutlinedButton
                        isGenerating = true
                        coroutineScope.launch {
                            val bitmap = withContext(Dispatchers.Main.immediate) {
                                StoryCardRenderer.renderComposableToBitmap(
                                    context = context,
                                    widthPx = selectedSize.targetWidthPx,
                                    heightPx = selectedSize.targetHeightPx,
                                    parentComposition = parentComposition,
                                    ownerView = currentView
                                ) {
                                    StoryCardContent(
                                        excerpt = excerptText,
                                        title = post.title,
                                        authorName = post.authorName,
                                        authorPenName = post.authorPenName,
                                        theme = selectedTheme,
                                        exportSize = selectedSize,
                                        isExportRender = true
                                    )
                                }
                            }

                            val saved = withContext(Dispatchers.IO) {
                                StoryCardRenderer.saveBitmapToGallery(
                                    context = context,
                                    bitmap = bitmap,
                                    title = post.title
                                )
                            }

                            isGenerating = false
                            if (saved) {
                                Toast.makeText(context, "Card saved to Pictures/WritOn", Toast.LENGTH_SHORT).show()
                                WritOnTelemetry.logCardGenerated(
                                    storyId = post.id,
                                    excerptLength = excerptText.length,
                                    sizeRatio = selectedSize.ratioLabel,
                                    theme = selectedTheme.label,
                                    context = context
                                )
                            } else {
                                Toast.makeText(context, "Failed to save card", Toast.LENGTH_SHORT).show()
                            }
                        }
                    },
                    modifier = Modifier.weight(1f),
                    enabled = !isGenerating && excerptText.isNotBlank(),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = BrandRed)
                ) {
                    Icon(
                        imageVector = Icons.Default.Download,
                        contentDescription = "Save",
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Save")
                }

                // Share Card
                Button(
                    onClick = {
                        if (isGenerating) return@Button
                        isGenerating = true
                        coroutineScope.launch {
                            val bitmap = withContext(Dispatchers.Main.immediate) {
                                StoryCardRenderer.renderComposableToBitmap(
                                    context = context,
                                    widthPx = selectedSize.targetWidthPx,
                                    heightPx = selectedSize.targetHeightPx,
                                    parentComposition = parentComposition,
                                    ownerView = currentView
                                ) {
                                    StoryCardContent(
                                        excerpt = excerptText,
                                        title = post.title,
                                        authorName = post.authorName,
                                        authorPenName = post.authorPenName,
                                        theme = selectedTheme,
                                        exportSize = selectedSize,
                                        isExportRender = true
                                    )
                                }
                            }

                            val uri = withContext(Dispatchers.IO) {
                                StoryCardRenderer.saveBitmapToShareCache(context, bitmap)
                            }
                            isGenerating = false

                            if (uri != null) {
                                WritOnTelemetry.logCardGenerated(
                                    storyId = post.id,
                                    excerptLength = excerptText.length,
                                    sizeRatio = selectedSize.ratioLabel,
                                    theme = selectedTheme.label,
                                    context = context
                                )
                                StoryCardRenderer.shareCard(
                                    context = context,
                                    imageUri = uri,
                                    post = post,
                                    sizeRatio = selectedSize.ratioLabel
                                )
                                onDismiss()
                            } else {
                                Toast.makeText(context, "Failed to prepare card for share", Toast.LENGTH_SHORT).show()
                            }
                        }
                    },
                    modifier = Modifier.weight(1.3f),
                    enabled = !isGenerating && excerptText.isNotBlank(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = BrandRed,
                        contentColor = SurfacePaper
                    )
                ) {
                    if (isGenerating) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(18.dp),
                            color = SurfacePaper,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Icon(
                            imageVector = Icons.Default.Share,
                            contentDescription = "Share",
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Share Card")
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))
        }
    }
}
