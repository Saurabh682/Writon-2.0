package com.ibitvalley.writon.modern.core.designsystem.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.ibitvalley.writon.R
import androidx.compose.material3.MaterialTheme

@Composable
fun WritOnBrandMark(
    modifier: Modifier = Modifier,
    width: Dp = 128.dp
) {
    val isDarkSurface = MaterialTheme.colorScheme.background.luminance() < 0.5f
    Image(
        painter = painterResource(R.drawable.writon_primary_logo),
        contentDescription = "WritOn",
        contentScale = ContentScale.Fit,
        colorFilter = if (isDarkSurface) {
            ColorFilter.tint(MaterialTheme.colorScheme.onBackground)
        } else {
            null
        },
        modifier = modifier
            .width(width)
            .aspectRatio(640f / 246f)
    )
}
