package com.ibitvalley.writon.modern.feature.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.designsystem.components.ModernTabRow
import com.ibitvalley.writon.modern.core.designsystem.components.ModernTopBar
import com.ibitvalley.writon.modern.core.designsystem.components.UserListItem
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandBeige
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ApplaudsScreen(onBackClick: () -> Unit) {
    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("People", "Stories", "Timeline")

    Scaffold(
        topBar = {
            ModernTopBar(
                title = "Applauds",
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    TextButton(onClick = { /* Filter menu */ }) {
                        Text("All Time", color = Color.Black)
                        Icon(Icons.Default.KeyboardArrowDown, contentDescription = null, tint = Color.Black)
                    }
                }
            )
        },
        containerColor = BrandBeige
    ) { innerPadding ->
        Column(
            modifier = Modifier.padding(innerPadding).fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(32.dp))
            
            // Large Applaud Icon
            Box(
                modifier = Modifier
                    .size(120.dp)
                    .clip(CircleShape)
                    .background(BrandRed.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    painter = painterResource(id = R.drawable.speech), // Mock icon
                    contentDescription = null,
                    tint = BrandRed,
                    modifier = Modifier.size(60.dp)
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            Text("2,432", fontSize = 36.sp, fontWeight = FontWeight.Bold)
            Text("Total Applauds", color = Color.Gray, fontSize = 14.sp)
            Text("+348 this month", color = Color(0xFF4CAF50), fontSize = 14.sp, modifier = Modifier.padding(top = 4.dp))

            Spacer(modifier = Modifier.height(48.dp))

            ModernTabRow(
                selectedTabIndex = selectedTab,
                tabs = tabs,
                onTabSelected = { selectedTab = it }
            )

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp)
            ) {
                if (selectedTab == 0) {
                    items(listOf("Aiden Cross", "Isha Verma", "Maya Patel", "Julian Ross")) { name ->
                        UserListItem(
                            name = name,
                            penName = name.replace(" ", "").lowercase(),
                            avatarUrl = "https://ui-avatars.com/api/?name=$name",
                            trailingContent = {
                                Text("24s ago", color = Color.Gray, fontSize = 12.sp)
                            }
                        )
                    }
                } else {
                    item {
                        com.ibitvalley.writon.modern.core.designsystem.components.EmptyState(message = "No data for ${tabs[selectedTab].lowercase()}.")
                    }
                }
            }
        }
    }
}
