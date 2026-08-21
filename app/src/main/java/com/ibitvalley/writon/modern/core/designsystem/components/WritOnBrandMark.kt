package com.ibitvalley.writon.modern.core.designsystem.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.ibitvalley.writon.R

@Composable
fun WritOnBrandMark(
    modifier: Modifier = Modifier,
    width: Dp = 128.dp
) {
    Image(
        painter = painterResource(R.drawable.writon_primary_logo),
        contentDescription = "WritOn",
        contentScale = ContentScale.Fit,
        modifier = modifier
            .width(width)
            .aspectRatio(640f / 246f)
    )
}
