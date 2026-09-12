const PLAY_STORE_BASE = "https://play.google.com/store/apps/details?id=com.ibitvalley.writon";
const API_BASE_URL = "https://api.writon.cc";

// Capture incoming URL campaign attribution params
const pageParams = new URLSearchParams(window.location.search);
const incomingSource = pageParams.get('utm_source');
const incomingMedium = pageParams.get('utm_medium');
const incomingCampaign = pageParams.get('utm_campaign') || 'writon_growth_2026_09';
const incomingContent = pageParams.get('utm_content');

function buildTrackedPlayUrl(ctaName = 'website_cta') {
  const source = incomingSource || 'website';
  const medium = incomingMedium || ctaName;
  const campaign = incomingCampaign;
  const content = incomingContent || ctaName;

  const referrer = `utm_source=${encodeURIComponent(source)}&utm_medium=${encodeURIComponent(medium)}&utm_campaign=${encodeURIComponent(campaign)}&utm_content=${encodeURIComponent(content)}`;
  return `${PLAY_STORE_BASE}&referrer=${encodeURIComponent(referrer)}`;
}

// Update all Google Play links with context-specific and campaign-preserved tracking
document.querySelectorAll('.play-store-link, .btn-play-store, a[href*="play.google.com"]').forEach(link => {
  let ctaIdentifier = 'homepage_cta';
  if (link.closest('.site-header') || link.classList.contains('nav-cta')) {
    ctaIdentifier = 'header_cta';
  } else if (link.closest('.hero-actions') || link.classList.contains('btn-play-store')) {
    ctaIdentifier = 'hero_cta';
  } else if (link.closest('.split-section')) {
    ctaIdentifier = 'writers_cta';
  } else if (link.closest('.cta-card')) {
    ctaIdentifier = 'community_banner_cta';
  } else if (link.closest('.site-footer')) {
    ctaIdentifier = 'footer_link';
  }
  link.href = buildTrackedPlayUrl(ctaIdentifier);
});

// Mobile navigation toggle
const navToggle = document.querySelector('.nav-toggle');
const mainNav = document.querySelector('.main-nav');

if (navToggle && mainNav) {
  navToggle.addEventListener('click', () => {
    const open = mainNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
  });

  mainNav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      mainNav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// Scroll reveal animations
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('is-visible');
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// Dynamic Stories Discovery Deck & Infinite Scroll Lazy Loader
(function initStoryDiscoveryDeck() {
  const grid = document.getElementById('live-story-grid');
  if (!grid) return;

  const spinner = document.getElementById('stories-spinner');
  const loadMoreBtn = document.getElementById('load-more-stories-btn');
  const endMsg = document.getElementById('end-of-stories-msg');
  const categoryButtons = document.querySelectorAll('.category-row .category');

  let currentPage = 1;
  let currentCategory = '';
  let isLoading = false;
  let hasMore = true;

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  const categoryFallbacks = {
    'Tech': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
    'Essays': 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&auto=format&fit=crop&q=80',
    'Poetry': 'https://images.unsplash.com/photo-1519692933481-e162a57d6721?w=800&auto=format&fit=crop&q=80',
    'Shayari': 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=800&auto=format&fit=crop&q=80',
    'Humour': 'https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=800&auto=format&fit=crop&q=80',
    'Culture': 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop&q=80',
    'Short Stories': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80',
    'Philosophy': 'https://images.unsplash.com/photo-1507842229451-7f01be7f612c?w=800&auto=format&fit=crop&q=80'
  };

  function renderCard(s) {
    const card = document.createElement('a');
    card.className = 'story-card reveal is-visible';
    card.href = '/stories/' + encodeURIComponent(s.slug);
    card.setAttribute('data-category', s.category || 'Story');
    card.style.textDecoration = 'none';
    card.style.color = 'inherit';

    const categoryBadge = (s.category || 'Story').toUpperCase();
    const readTime = (s.readingTimeMin || 2) + ' MIN READ';
    const authorName = s.author?.fullName || s.author?.penName || 'WritOn Writer';
    const authorPen = s.author?.penName || 'writon';
    const summary = s.summary || s.title;
    const initials = authorName.trim().split(/\s+/).slice(0, 2).map(p => p[0] ? p[0].toUpperCase() : '').join('') || 'W';
    const fallbackCover = categoryFallbacks[s.category] || 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=800&auto=format&fit=crop&q=80';
    const coverUrl = s.coverImage || s.cover_image_url || fallbackCover;

    card.innerHTML = `
      <div class="story-card-cover" style="width: 100%; height: 180px; overflow: hidden; position: relative; background: #f0e6dd;">
        <img src="${escapeHtml(coverUrl)}" alt="${escapeHtml(s.title)}" loading="lazy" class="story-card-img" onerror="if(this.dataset.triedFallback){this.style.display='none';}else{this.dataset.triedFallback='1';this.src='${escapeHtml(fallbackCover)}';}" style="width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.35s ease;" />
        <span style="position: absolute; top: 12px; left: 12px; background: rgba(26, 23, 21, 0.74); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); color: #fff; font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; padding: 4px 10px; border-radius: 999px;">
          ${escapeHtml(categoryBadge)}
        </span>
      </div>
      <div class="story-card-body" style="padding: 20px 20px 18px; display: flex; flex-direction: column; justify-content: space-between; flex: 1;">
        <div>
          <div class="story-meta" style="color: var(--primary); font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
            <span style="color: var(--muted); font-weight: 500; font-size: 11.5px;">${escapeHtml(readTime)}</span>
          </div>
          <h3 style="font-family: Newsreader, Georgia, serif; font-size: 21px; font-weight: 600; line-height: 1.25; margin: 0 0 10px; color: var(--ink); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
            ${escapeHtml(s.title)}
          </h3>
          <p style="color: var(--muted); font-size: 13.5px; line-height: 1.5; margin: 0 0 18px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            ${escapeHtml(summary)}
          </p>
        </div>
        <footer style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border); padding-top: 12px; margin-top: auto;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 26px; height: 26px; border-radius: 50%; background: #f3d5c7; color: var(--primary); display: grid; place-items: center; font-weight: 700; font-size: 11px; font-family: Newsreader, serif;">
              ${escapeHtml(initials)}
            </div>
            <div>
              <div style="font-size: 12.5px; font-weight: 700; color: var(--ink); line-height: 1.1;">${escapeHtml(authorName)}</div>
              <div style="font-size: 10.5px; color: var(--muted);">@${escapeHtml(authorPen)}</div>
            </div>
          </div>
          <div class="card-arrow" style="width: 26px; height: 26px; border-radius: 50%; background: #f1e8df; display: grid; place-items: center; color: var(--ink); font-size: 12px; transition: transform 0.2s ease, background 0.2s ease;">
            &rarr;
          </div>
        </footer>
      </div>
    `;

    return card;
  }

  async function loadPosts(reset = false) {
    if (isLoading || (!hasMore && !reset)) return;

    isLoading = true;
    if (spinner) spinner.style.display = 'block';
    if (loadMoreBtn) loadMoreBtn.style.display = 'none';

    if (reset) {
      currentPage = 1;
      hasMore = true;
      grid.innerHTML = '';
      if (endMsg) endMsg.style.display = 'none';
    }

    try {
      let url = `${API_BASE_URL}/api/v1/posts?page=${currentPage}&limit=20`;
      if (currentCategory) {
        url += `&category=${encodeURIComponent(currentCategory)}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to load stories (${res.status})`);
      }
      const data = await res.json();
      const posts = data.posts || [];

      if (posts.length === 0) {
        hasMore = false;
        if (endMsg) endMsg.style.display = 'block';
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';
      } else {
        posts.forEach(post => {
          const cardEl = renderCard(post);
          grid.appendChild(cardEl);
        });

        hasMore = data.pagination?.hasMore ?? (posts.length === 20);
        if (!hasMore) {
          if (endMsg) endMsg.style.display = 'block';
          if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        } else {
          if (loadMoreBtn) loadMoreBtn.style.display = 'block';
          currentPage++;
        }
      }
    } catch (err) {
      console.error('Failed to load stories from WritOn API:', err);
      if (loadMoreBtn) loadMoreBtn.style.display = 'block';
    } finally {
      isLoading = false;
      if (spinner) spinner.style.display = 'none';
    }
  }

  // Category switching
  categoryButtons.forEach(button => {
    button.addEventListener('click', () => {
      categoryButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      button.classList.add('active');
      button.setAttribute('aria-selected', 'true');

      currentCategory = button.getAttribute('data-category') || '';
      loadPosts(true);
    });
  });

  // Manual Load More button
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => loadPosts(false));
  }

  // Infinite scroll observer for smooth lazy loading
  if ('IntersectionObserver' in window && spinner) {
    const scrollObserver = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !isLoading) {
        loadPosts(false);
      }
    }, { rootMargin: '350px' });
    scrollObserver.observe(spinner);
  }

  // Initial load of 20 live posts
  loadPosts(true);
})();
