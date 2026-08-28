package com.ibitvalley.writon.modern.feature.welcome

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.designsystem.components.WritOnBrandMark
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnTheme
import kotlinx.coroutines.launch

private val BrandBeigeColor = Color(0xFFF8F4EE)
private val BrandRedColor = Color(0xFFE75A2A)
private val TextDarkColor = Color(0xFF151718)
private val TextMutedColor = Color(0xFF6D6963)

data class TutorialSlide(
    val category: String,
    val headline: String,
    val highlight: String,
    val description: String,
    val bullets: List<String>,
    val iconRes: Int
)

private val tutorialSlides = listOf(
    TutorialSlide(
        category = "WELCOME TO WRITON",
        headline = "Words worth\nremembering",
        highlight = ".",
        description = "A modern editorial sanctuary for thoughtful writers, insightful essays, and curious readers.",
        bullets = listOf(
            "Curated feeds tailored to your reading interests",
            "A distraction-free community that values deep writing",
            "Direct reader applause to support your favorite authors"
        ),
        iconRes = R.drawable.welcome_feather
    ),
    TutorialSlide(
        category = "READER EXPERIENCE",
        headline = "Read comfortably,\nyour way",
        highlight = ".",
        description = "Every story is typeset with precision to provide the most relaxing reading experience.",
        bullets = listOf(
            "4 Signature Themes: Paper, Warm Sepia, Obsidian Dark & System",
            "Adjustable typography sizes (16sp–24sp) and line spacing",
            "Instant on-device AI key takeaways for long-form essays"
        ),
        iconRes = R.drawable.ic_book_orange
    ),
    TutorialSlide(
        category = "WRITER STUDIO",
        headline = "Write whenever\ninspiration strikes",
        highlight = ".",
        description = "Craft and format your stories anywhere, even when you're completely offline.",
        bullets = listOf(
            "Auto-saved drafts with background outbox synchronization",
            "Custom cover art and multi-topic classifications",
            "Live analytics on applause, comments, and readership"
        ),
        iconRes = R.drawable.ic_edit_orange
    ),
    TutorialSlide(
        category = "SECURITY & AUTONOMY",
        headline = "Your thoughts,\nstrictly protected",
        highlight = ".",
        description = "Native on-device biometric protection with full ownership over your account and data.",
        bullets = listOf(
            "Native Fingerprint & Face ID App Lock in Settings",
            "Fast 1-tap Google Sign-In with device passkeys",
            "Complete data sovereignty: delete account & data anytime"
        ),
        iconRes = R.drawable.ic_shield_orange
    )
)

@Composable
fun WelcomeScreen(
    onGetStarted: () -> Unit,
    onLogin: () -> Unit,
    onContinueAsVisitor: () -> Unit
) {
    val pagerState = rememberPagerState(pageCount = { tutorialSlides.size })
    val coroutineScope = rememberCoroutineScope()
    val isLastPage = pagerState.currentPage == tutorialSlides.size - 1

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = BrandBeigeColor
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .padding(horizontal = 24.dp, vertical = 16.dp)
        ) {
            // Top App Bar with Brand Logo and Skip Button
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                WritOnBrandMark(width = 130.dp)

                if (!isLastPage) {
                    TextButton(
                        onClick = {
                            coroutineScope.launch {
                                pagerState.animateScrollToPage(tutorialSlides.size - 1)
                            }
                        }
                    ) {
                        Text(
                            text = "Skip",
                            style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold),
                            color = BrandRedColor
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Swipable Carousel
            HorizontalPager(
                state = pagerState,
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
            ) { pageIndex ->
                TutorialSlideContent(slide = tutorialSlides[pageIndex])
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Page Indicator Pills
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                tutorialSlides.indices.forEach { index ->
                    val isSelected = pagerState.currentPage == index
                    val width by animateDpAsState(
                        targetValue = if (isSelected) 24.dp else 8.dp,
                        label = "pillWidth"
                    )
                    Box(
                        modifier = Modifier
                            .height(8.dp)
                            .width(width)
                            .clip(CircleShape)
                            .background(if (isSelected) BrandRedColor else Color(0xFFE2DDD5))
                    )
                    if (index < tutorialSlides.size - 1) {
                        Spacer(modifier = Modifier.width(6.dp))
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Action Buttons
            if (!isLastPage) {
                Button(
                    onClick = {
                        coroutineScope.launch {
                            pagerState.animateScrollToPage(pagerState.currentPage + 1)
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = BrandRedColor),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Text(
                        text = "Next",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                        color = Color.White
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedButton(
                    onClick = onLogin,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                    border = BorderStroke(1.dp, Color(0xFFD4CDC3)),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = TextDarkColor)
                ) {
                    Text(
                        text = "I already have an account",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Medium)
                    )
                }
            } else {
                Button(
                    onClick = onGetStarted,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = BrandRedColor),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Text(
                        text = "Get Started",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                        color = Color.White
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedButton(
                    onClick = onLogin,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                    border = BorderStroke(1.dp, BrandRedColor),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = TextDarkColor)
                ) {
                    Text(
                        text = "I already have an account",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Medium)
                    )
                }

                TextButton(
                    onClick = onContinueAsVisitor,
                    modifier = Modifier
                        .align(Alignment.CenterHorizontally)
                        .padding(top = 4.dp)
                ) {
                    Text(
                        text = "Continue as a visitor",
                        style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold),
                        color = BrandRedColor
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Footer
            Text(
                text = buildAnnotatedString {
                    append("By continuing, you agree to WritOn's ")
                    withStyle(style = SpanStyle(color = BrandRedColor, fontWeight = FontWeight.Medium)) {
                        append("Terms of Service")
                    }
                    append(" and ")
                    withStyle(style = SpanStyle(color = BrandRedColor, fontWeight = FontWeight.Medium)) {
                        append("Privacy Policy")
                    }
                },
                style = MaterialTheme.typography.bodySmall.copy(fontSize = 11.sp, lineHeight = 15.sp),
                color = TextMutedColor,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

@Composable
private fun TutorialSlideContent(slide: TutorialSlide) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 4.dp, vertical = 8.dp),
        horizontalAlignment = Alignment.Start,
        verticalArrangement = Arrangement.Center
    ) {
        // Icon Badge
        Surface(
            shape = CircleShape,
            color = BrandRedColor.copy(alpha = 0.12f),
            modifier = Modifier.size(56.dp)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Image(
                    painter = painterResource(slide.iconRes),
                    contentDescription = null,
                    modifier = Modifier.size(30.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Category Tag
        Text(
            text = slide.category,
            style = MaterialTheme.typography.labelSmall.copy(
                letterSpacing = 2.5.sp,
                fontSize = 12.sp,
                fontWeight = FontWeight.Normal
            ),
            color = BrandRedColor
        )

        Spacer(modifier = Modifier.height(8.dp))

        // Main Headline
        Text(
            text = buildAnnotatedString {
                append(slide.headline)
                withStyle(style = SpanStyle(color = BrandRedColor)) {
                    append(slide.highlight)
                }
            },
            style = MaterialTheme.typography.headlineLarge.copy(
                fontSize = 32.sp,
                lineHeight = 38.sp,
                fontWeight = FontWeight.Bold
            ),
            color = TextDarkColor
        )

        Spacer(modifier = Modifier.height(12.dp))

        // Description
        Text(
            text = slide.description,
            style = MaterialTheme.typography.bodyMedium.copy(
                fontSize = 14.sp,
                lineHeight = 20.sp
            ),
            color = TextMutedColor
        )

        Spacer(modifier = Modifier.height(18.dp))

        // Feature Bullets
        slide.bullets.forEach { bulletText ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    shape = CircleShape,
                    color = BrandRedColor,
                    modifier = Modifier.size(6.dp)
                ) {}
                Spacer(modifier = Modifier.width(10.dp))
                Text(
                    text = bulletText,
                    style = MaterialTheme.typography.bodyMedium.copy(
                        fontSize = 13.5.sp,
                        fontWeight = FontWeight.Medium
                    ),
                    color = TextDarkColor
                )
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
fun WelcomeScreenPreview() {
    WritOnTheme {
        WelcomeScreen(onGetStarted = {}, onLogin = {}, onContinueAsVisitor = {})
    }
}
