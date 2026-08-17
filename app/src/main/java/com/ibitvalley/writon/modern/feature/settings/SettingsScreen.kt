package com.ibitvalley.writon.modern.feature.settings

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ibitvalley.writon.modern.core.designsystem.components.ModernTopBar
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandBeige
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed
import androidx.compose.runtime.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onBackClick: () -> Unit,
    onInterestsClick: () -> Unit
) {
    var notificationsEnabled by remember { mutableStateOf(true) }
    var emailUpdatesEnabled by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            ModernTopBar(
                title = "Settings",
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
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
                SettingsSection("Account")
                SettingsItem("Edit Profile", Icons.Default.Person)
                SettingsItem("Account Settings", Icons.Default.Settings)
                SettingsItem("Privacy", Icons.Default.Shield)
                SettingsItem("Blocked Users", Icons.Default.Block)
                
                Spacer(modifier = Modifier.height(24.dp))
                
                SettingsSection("Preferences")
                SettingsItem(
                    title = "Content Preferences", 
                    icon = Icons.Default.GridOn,
                    onClick = onInterestsClick
                )
                SettingsItem("Reading Preferences", Icons.Default.MenuBook)
                SettingsItem(
                    title = "Notifications", 
                    icon = Icons.Default.Notifications,
                    trailing = {
                        Switch(
                            checked = notificationsEnabled,
                            onCheckedChange = { notificationsEnabled = it },
                            colors = SwitchDefaults.colors(checkedThumbColor = BrandRed, checkedTrackColor = BrandRed.copy(alpha = 0.5f))
                        )
                    }
                )
                SettingsItem(
                    title = "Email Updates", 
                    icon = Icons.Default.Mail,
                    trailing = {
                        Switch(
                            checked = emailUpdatesEnabled,
                            onCheckedChange = { emailUpdatesEnabled = it },
                            colors = SwitchDefaults.colors(checkedThumbColor = BrandRed, checkedTrackColor = BrandRed.copy(alpha = 0.5f))
                        )
                    }
                )
                SettingsItem("App Appearance", Icons.Default.Brightness6, "Light")

                Spacer(modifier = Modifier.height(32.dp))

                Button(
                    onClick = { /* Logout logic */ },
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = BrandRed.copy(alpha = 0.1f), contentColor = BrandRed),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("Logout", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
fun SettingsSection(title: String) {
    Text(
        text = title,
        fontWeight = FontWeight.Bold,
        fontSize = 14.sp,
        modifier = Modifier.padding(vertical = 8.dp)
    )
}

@Composable
fun SettingsItem(
    title: String, 
    icon: ImageVector, 
    value: String? = null, 
    trailing: @Composable (() -> Unit)? = null,
    onClick: () -> Unit = {}
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, contentDescription = null, modifier = Modifier.size(24.dp), tint = Color.Black)
        Spacer(modifier = Modifier.width(16.dp))
        Text(title, modifier = Modifier.weight(1f), fontSize = 16.sp)
        if (value != null) {
            Text(value, color = Color.Gray, fontSize = 14.sp, modifier = Modifier.padding(end = 8.dp))
        }
        if (trailing != null) {
            trailing()
        } else {
            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = Color.LightGray)
        }
    }
}
