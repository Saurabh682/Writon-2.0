(function initExplorePage() {
  const API_BASE_URL = 'https://api.writon.cc';

  const categoryFallbacks = {
    'Essays': 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=800&auto=format&fit=crop&q=80',
    'Poetry': 'https://images.unsplash.com/photo-1519692933481-e162a57d6721?w=800&auto=format&fit=crop&q=80',
    'Shayari': 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=800&auto=format&fit=crop&q=80',
    'Humour': 'https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=800&auto=format&fit=crop&q=80',
    'Culture': 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop&q=80',
    'Short Stories': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80',
    'Tech': 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
    'Philosophy': 'https://images.unsplash.com/photo-1507842229451-7f01be7f612c?w=800&auto=format&fit=crop&q=80'
  };

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- CAROUSEL MODULE ---
  const carouselTrack = document.getElementById('carousel-track');
  const carouselDots = document.getElementById('carousel-dots');
  const prevBtn = document.getElementById('carousel-prev');
  const nextBtn = document.getElementById('carousel-next');

  let carouselSlides = [];
  let currentSlideIndex = 0;
  let carouselTimer = null;

  function renderCarouselSlide(story, index) {
    const slide = document.createElement('a');
    slide.className = 'carousel-slide' + (index === 0 ? ' active' : '');
    slide.href = '/stories/' + encodeURIComponent(story.slug);
    slide.setAttribute('data-index', String(index));

    const categoryBadge = (story.category || 'Featured').toUpperCase();
    const readTime = (story.readingTimeMin || 3) + ' MIN READ';
    const authorName = story.author?.fullName || story.author?.penName || 'WritOn Author';
    const authorPen = story.author?.penName || 'writon';
    const summary = story.summary || story.title;
    const initials = authorName.trim().split(/\s+/).slice(0, 2).map(p => p[0] ? p[0].toUpperCase() : '').join('') || 'W';
    const fallbackCover = categoryFallbacks[story.category] || 'https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=1200&auto=format&fit=crop&q=80';
    const coverUrl = story.coverImage || story.cover_image_url || fallbackCover;

    slide.innerHTML = [
      '<div class="carousel-media">',
      '  <img src="' + escapeHtml(coverUrl) + '" alt="' + escapeHtml(story.title) + '" width="700" height="420" onerror="if(!this.dataset.fallback){this.dataset.fallback=1;this.src=\'' + escapeHtml(fallbackCover) + '\';}" />',
      '  <div class="carousel-badge">' + escapeHtml(categoryBadge) + '</div>',
      '</div>',
      '<div class="carousel-content">',
      '  <div>',
      '    <div class="carousel-meta">',
      '      ' + escapeHtml(categoryBadge) + ' · <span>' + escapeHtml(readTime) + '</span>',
      '    </div>',
      '    <h2 class="carousel-title">' + escapeHtml(story.title) + '</h2>',
      '    <p class="carousel-excerpt">' + escapeHtml(summary) + '</p>',
      '  </div>',
      '  <div class="carousel-author">',
      '    <div class="author-info">',
      '      <div class="author-avatar">' + escapeHtml(initials) + '</div>',
      '      <div>',
      '        <div class="author-name">' + escapeHtml(authorName) + '</div>',
      '        <div class="author-pen">@' + escapeHtml(authorPen) + '</div>',
      '      </div>',
      '    </div>',
      '    <div class="read-now-btn">Read Story &rarr;</div>',
      '  </div>',
      '</div>'
    ].join('\n');

    return slide;
  }

  function goToSlide(index) {
    if (!carouselSlides.length) return;
    carouselSlides[currentSlideIndex].classList.remove('active');
    
    currentSlideIndex = (index + carouselSlides.length) % carouselSlides.length;
    carouselSlides[currentSlideIndex].classList.add('active');

    if (carouselDots) {
      const dots = carouselDots.querySelectorAll('.carousel-dot');
      dots.forEach((dot, idx) => {
        dot.classList.toggle('active', idx === currentSlideIndex);
      });
    }
  }

  function startCarouselAutoPlay() {
    stopCarouselAutoPlay();
    carouselTimer = setInterval(() => {
      goToSlide(currentSlideIndex + 1);
    }, 6500);
  }

  function stopCarouselAutoPlay() {
    if (carouselTimer) {
      clearInterval(carouselTimer);
      carouselTimer = null;
    }
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.preventDefault();
      stopCarouselAutoPlay();
      goToSlide(currentSlideIndex - 1);
      startCarouselAutoPlay();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.preventDefault();
      stopCarouselAutoPlay();
      goToSlide(currentSlideIndex + 1);
      startCarouselAutoPlay();
    });
  }

  const carouselContainer = document.getElementById('top-carousel');
  if (carouselContainer) {
    carouselContainer.addEventListener('mouseenter', stopCarouselAutoPlay);
    carouselContainer.addEventListener('mouseleave', startCarouselAutoPlay);
  }

  async function loadTopStoriesForCarousel() {
    try {
      const res = await fetch(API_BASE_URL + '/api/v1/posts?limit=5&tab=popular');
      if (!res.ok) return;
      const data = await res.json();
      const topPosts = data.posts || [];
      if (!topPosts.length) return;

      carouselTrack.innerHTML = '';
      carouselDots.innerHTML = '';
      carouselSlides = [];

      topPosts.forEach((post, idx) => {
        const slide = renderCarouselSlide(post, idx);
        carouselTrack.appendChild(slide);
        carouselSlides.push(slide);

        const dot = document.createElement('button');
        dot.className = 'carousel-dot' + (idx === 0 ? ' active' : '');
        dot.type = 'button';
        dot.setAttribute('aria-label', 'Slide ' + (idx + 1));
        dot.addEventListener('click', () => {
          stopCarouselAutoPlay();
          goToSlide(idx);
          startCarouselAutoPlay();
        });
        carouselDots.appendChild(dot);
      });

      currentSlideIndex = 0;
      startCarouselAutoPlay();
    } catch (err) {
      console.warn('Carousel fetch note:', err.message);
    }
  }

  // --- 20-STORY GRID MODULE ---
  const grid = document.getElementById('explore-story-grid');
  const loadMoreBtn = document.getElementById('explore-load-more');
  const endMsg = document.getElementById('explore-end-msg');
  const filterPills = document.querySelectorAll('.filter-pill');

  let currentPage = 1;
  let currentCategory = '';
  let isLoading = false;
  let hasMore = true;

  function renderGridCard(s) {
    const card = document.createElement('a');
    card.className = 'story-card';
    card.href = '/stories/' + encodeURIComponent(s.slug);
    card.setAttribute('data-category', s.category || 'Story');

    const categoryBadge = (s.category || 'Story').toUpperCase();
    const readTime = (s.readingTimeMin || 3) + ' MIN READ';
    const authorName = s.author?.fullName || s.author?.penName || 'WritOn Writer';
    const authorPen = s.author?.penName || 'writon';
    const summary = s.summary || s.title;
    const initials = authorName.trim().split(/\s+/).slice(0, 2).map(p => p[0] ? p[0].toUpperCase() : '').join('') || 'W';
    const fallbackCover = categoryFallbacks[s.category] || 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=800&auto=format&fit=crop&q=80';
    const coverUrl = s.coverImage || s.cover_image_url || fallbackCover;

    card.innerHTML = [
      '<div class="story-card-cover">',
      '  <img src="' + escapeHtml(coverUrl) + '" alt="' + escapeHtml(s.title) + '" loading="lazy" class="story-card-img" onerror="if(!this.dataset.fallback){this.dataset.fallback=1;this.src=\'' + escapeHtml(fallbackCover) + '\';}" />',
      '  <span style="position: absolute; top: 12px; left: 12px; background: rgba(26, 23, 21, 0.74); backdrop-filter: blur(6px); color: #fff; font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; padding: 4px 10px; border-radius: 999px;">',
      '    ' + escapeHtml(categoryBadge),
      '  </span>',
      '</div>',
      '<div class="story-card-body">',
      '  <div>',
      '    <div class="story-meta">',
      '      <span>' + escapeHtml(readTime) + '</span>',
      '    </div>',
      '    <h3>' + escapeHtml(s.title) + '</h3>',
      '    <p>' + escapeHtml(summary) + '</p>',
      '  </div>',
      '  <footer>',
      '    <div class="story-card-author">',
      '      <div class="author-initials">' + escapeHtml(initials) + '</div>',
      '      <div>',
      '        <div class="author-meta-name">' + escapeHtml(authorName) + '</div>',
      '        <div class="author-meta-pen">@' + escapeHtml(authorPen) + '</div>',
      '      </div>',
      '    </div>',
      '    <div class="card-arrow">&rarr;</div>',
      '  </footer>',
      '</div>'
    ].join('\n');

    return card;
  }

  async function loadGridStories(reset = false) {
    if (isLoading || (!hasMore && !reset)) return;

    isLoading = true;
    if (loadMoreBtn) loadMoreBtn.style.display = 'none';

    if (reset) {
      currentPage = 1;
      hasMore = true;
      if (endMsg) endMsg.style.display = 'none';
    }

    try {
      let url = API_BASE_URL + '/api/v1/posts?page=' + currentPage + '&limit=20';
      if (currentCategory) {
        url += '&category=' + encodeURIComponent(currentCategory);
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('API returned status ' + res.status);
      const data = await res.json();
      const posts = data.posts || [];

      if (posts.length === 0) {
        hasMore = false;
        if (reset) grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 48px; color: var(--muted);">No stories found in this category.</div>';
        if (endMsg) endMsg.style.display = 'block';
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';
      } else {
        const frag = document.createDocumentFragment();
        posts.forEach(post => frag.appendChild(renderGridCard(post)));

        if (reset) {
          grid.innerHTML = '';
        }
        grid.appendChild(frag);

        hasMore = data.pagination?.hasMore ?? (posts.length === 20);
        if (!hasMore) {
          if (endMsg) endMsg.style.display = 'block';
          if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        } else {
          currentPage++;
          if (loadMoreBtn) {
            loadMoreBtn.style.display = 'inline-flex';
          }
        }
      }
    } catch (err) {
      console.warn('Grid stories fetch fallback:', err.message);
      if (loadMoreBtn) loadMoreBtn.style.display = 'inline-flex';
    } finally {
      isLoading = false;
    }
  }

  // Filter click handlers
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => {
        p.classList.remove('active');
        p.setAttribute('aria-selected', 'false');
      });
      pill.classList.add('active');
      pill.setAttribute('aria-selected', 'true');

      currentCategory = pill.getAttribute('data-category') || '';
      loadGridStories(true);
    });
  });

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      loadGridStories(false);
    });
  }

  // Mobile nav toggle
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

  // Run initial fetches
  loadTopStoriesForCarousel();
  loadGridStories(true);
})();
