package com.ibitvalley.writon.modern.core.designsystem.components

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandBeige
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ModernTopBar(
    title: String,
    modifier: Modifier = Modifier,
    navigationIcon: @Composable (() -> Unit)? = null,
    actions: @Composable RowScope.() -> Unit = {},
) {
    TopAppBar(
        title = { Text(title, fontWeight = FontWeight.Bold, fontSize = 20.sp) },
        navigationIcon = navigationIcon ?: {},
        actions = actions,
        colors = TopAppBarDefaults.topAppBarColors(
            containerColor = BrandBeige,
            titleContentColor = Color.Black
        ),
        modifier = modifier
    )
}

@Composable
fun ModernTabRow(
    selectedTabIndex: Int,
    tabs: List<String>,
    onTabSelected: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    ScrollableTabRow(
        selectedTabIndex = selectedTabIndex,
        containerColor = BrandBeige,
        contentColor = BrandRed,
        edgePadding = 16.dp,
        divider = {},
        modifier = modifier,
        indicator = { tabPositions ->
            TabRowDefaults.SecondaryIndicator(
                Modifier.tabIndicatorOffset(tabPositions[selectedTabIndex]),
                color = BrandRed
            )
        }
    ) {
        tabs.forEachIndexed { index, title ->
            Tab(
                selected = selectedTabIndex == index,
                onClick = { onTabSelected(index) },
                text = { 
                    Text(
                        text = title,
                        fontWeight = if (selectedTabIndex == index) FontWeight.Bold else FontWeight.Normal,
                        fontSize = 14.sp
                    ) 
                }
            )
        }
    }
}

@Composable
fun EmptyState(
    message: String,
    modifier: Modifier = Modifier,
    icon: @Composable (() -> Unit)? = null
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        icon?.invoke()
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = message,
            color = Color.Gray,
            fontSize = 14.sp,
            fontWeight = FontWeight.Medium
        )
    }
}
