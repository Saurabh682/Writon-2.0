const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=com.ibitvalley.writon";

document.querySelectorAll('.play-store-link').forEach(link => {
  link.href = GOOGLE_PLAY_URL;
});

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

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('is-visible');
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

const categoryButtons = [...document.querySelectorAll('.category')];
const storyCards = [...document.querySelectorAll('.story-card')];

categoryButtons.forEach(button => {
  button.addEventListener('click', () => {
    categoryButtons.forEach(b => b.classList.remove('active'));
    button.classList.add('active');

    const selected = button.textContent.trim();
    storyCards.forEach(card => {
      const matches = selected === 'All' || card.dataset.category === selected;
      card.style.display = matches ? '' : 'none';
    });
  });
});
