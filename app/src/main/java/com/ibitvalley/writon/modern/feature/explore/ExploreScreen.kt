package com.ibitvalley.writon.modern.feature.explore

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ibitvalley.writon.modern.core.designsystem.components.ModernTopBar
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandBeige
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed
import androidx.compose.runtime.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.ImeAction

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExploreScreen() {
    var searchQuery by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf("All") }
    var isSearchActive by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            if (!isSearchActive) {
                ModernTopBar(
                    title = "Explore",
                    actions = {
                        IconButton(onClick = { isSearchActive = true }) {
                            Icon(Icons.Default.Search, contentDescription = "Search")
                        }
                    }
                )
            } else {
                TopAppBar(
                    title = {
                        TextField(
                            value = searchQuery,
                            onValueChange = { searchQuery = it },
                            placeholder = { Text("Search stories...") },
                            modifier = Modifier.fillMaxWidth(),
                            colors = TextFieldDefaults.colors(
                                focusedContainerColor = Color.Transparent,
                                unfocusedContainerColor = Color.Transparent,
                                focusedIndicatorColor = Color.Transparent,
                                unfocusedIndicatorColor = Color.Transparent
                            ),
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search)
                        )
                    },
                    navigationIcon = {
                        IconButton(onClick = { 
                            isSearchActive = false
                            searchQuery = ""
                        }) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = BrandBeige)
                )
            }
        },
        containerColor = BrandBeige
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier.padding(innerPadding).fillMaxSize(),
            contentPadding = PaddingValues(16.dp)
        ) {
            item {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Your Interests", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Text("Manage", color = BrandRed, fontSize = 12.sp, modifier = Modifier.clickable {  })
                }
                Spacer(modifier = Modifier.height(12.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    val interests = listOf("Essays", "Poetry", "Tech", "Fiction")
                    items(interests) { interest ->
                        FilterChip(
                            selected = selectedCategory == interest,
                            onClick = { selectedCategory = if (selectedCategory == interest) "All" else interest },
                            label = { Text(interest) },
                            leadingIcon = { Icon(Icons.Default.FavoriteBorder, contentDescription = null, modifier = Modifier.size(16.dp)) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = BrandRed,
                                selectedLabelColor = Color.White,
                                containerColor = Color.White
                            ),
                            border = FilterChipDefaults.filterChipBorder(
                                enabled = true, 
                                selected = selectedCategory == interest, 
                                borderColor = BrandRed, 
                                selectedBorderColor = BrandRed
                            )
                        )
                    }
                }
                Spacer(modifier = Modifier.height(32.dp))
            }

            item {
                Text("Browse Categories", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Spacer(modifier = Modifier.height(16.dp))
            }

            val categories = listOf(
                "All" to Icons.Default.Public,
                "Short Stories" to Icons.Default.MenuBook,
                "Poetry" to Icons.Default.Edit,
                "Shayari" to Icons.Default.Favorite,
                "Essays" to Icons.Default.Article,
                "Reviews" to Icons.Default.Star,
                "Journalism" to Icons.Default.Feed
            )

            items(categories) { (name, icon) ->
                CategoryItem(name, icon, selected = selectedCategory == name) {
                    selectedCategory = name
                }
            }

            item {
                Spacer(modifier = Modifier.height(32.dp))
                Text("Trending Now", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Spacer(modifier = Modifier.height(16.dp))
            }

            val trending = listOf(
                TrendingData("The future of work", "1.2K", "Julian Ross"),
                TrendingData("Digital minimalism", "982", "Sarah Chen"),
                TrendingData("Letters to a younger me", "876", "Aiden Cross")
            )

            items(trending) { data ->
                TrendingItem(data)
            }
        }
    }
}

data class TrendingData(val title: String, val views: String, val author: String)

@Composable
fun CategoryItem(name: String, icon: androidx.compose.ui.graphics.vector.ImageVector, selected: Boolean, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            icon, 
            contentDescription = null, 
            modifier = Modifier.size(24.dp), 
            tint = if (selected) BrandRed else Color.Black
        )
        Spacer(modifier = Modifier.width(16.dp))
        Text(
            name, 
            modifier = Modifier.weight(1f), 
            fontSize = 16.sp,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
            color = if (selected) BrandRed else Color.Black
        )
        Icon(Icons.Default.ChevronRight, contentDescription = null, tint = Color.LightGray)
    }
}

@Composable
fun TrendingItem(data: TrendingData) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(Icons.Default.Waves, contentDescription = null, modifier = Modifier.size(16.dp), tint = BrandRed)
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(data.title, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            Text(data.author, fontSize = 12.sp, color = Color.Gray)
        }
        Icon(Icons.Default.Visibility, contentDescription = null, modifier = Modifier.size(14.dp), tint = Color.Gray)
        Text(data.views, modifier = Modifier.padding(start = 4.dp), color = Color.Gray, fontSize = 12.sp)
    }
}
