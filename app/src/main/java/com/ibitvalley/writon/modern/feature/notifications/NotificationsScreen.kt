package com.ibitvalley.writon.modern.feature.notifications

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.ibitvalley.writon.modern.core.designsystem.components.ModernTopBar
import com.ibitvalley.writon.modern.core.designsystem.components.UserAvatar
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandBeige
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsScreen() {
    val notifications = remember {
        mutableStateListOf(
            NotificationData("Aiden Cross", "applauded your story", "\"The Architecture of Solitude\"", "2m", true),
            NotificationData("Isha Verma", "commented on your story", "\"Letters to a Younger Me\"", "15m", true),
            NotificationData("Maya Patel", "started following you", null, "1h", false)
        )
    }

    Scaffold(
        topBar = {
            ModernTopBar(
                title = "Notifications",
                actions = {
                    TextButton(onClick = { /* Mark all as read */ }) {
                        Text("Mark all as read", color = BrandRed, fontSize = 12.sp)
                    }
                }
            )
        },
        containerColor = BrandBeige
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier.padding(innerPadding).fillMaxSize(),
            contentPadding = PaddingValues(16.dp)
        ) {
            item {
                Text("Recent", fontWeight = FontWeight.Bold, color = Color.Gray, fontSize = 12.sp)
                Spacer(modifier = Modifier.height(16.dp))
            }
            
            items(notifications) { notification ->
                NotificationItem(notification) {
                    // Update read state locally
                }
            }

            item {
                Spacer(modifier = Modifier.height(24.dp))
                Text("Earlier", fontWeight = FontWeight.Bold, color = Color.Gray, fontSize = 12.sp)
                Spacer(modifier = Modifier.height(16.dp))
            }

            items(3) {
                NotificationItem(NotificationData("Julian Ross", "applauded your story", "\"Quiet is a Superpower\"", "1d", false)) {}
            }
        }
    }
}

data class NotificationData(val name: String, val action: String, val target: String?, val time: String, val isUnread: Boolean = false)

@Composable
fun NotificationItem(data: NotificationData, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(vertical = 12.dp),
        verticalAlignment = Alignment.Top
    ) {
        UserAvatar(
            url = "https://ui-avatars.com/api/?name=${data.name}",
            name = data.name,
            size = 40.dp
        )
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = buildAnnotatedString {
                    withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append(data.name) }
                    append(" ${data.action}")
                },
                fontSize = 14.sp,
                color = if (data.isUnread) Color.Black else Color.Gray
            )
            data.target?.let {
                Text(it, fontSize = 14.sp, color = if (data.isUnread) Color.Black.copy(alpha = 0.7f) else Color.Gray)
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(data.time, color = Color.Gray, fontSize = 12.sp)
        }
        if (data.isUnread) {
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .clip(CircleShape)
                    .background(BrandRed)
                    .align(Alignment.CenterVertically)
            )
        }
    }
}
