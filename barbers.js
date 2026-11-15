(() => {
  const grid = document.querySelector('#barber-grid');
  const navigation = document.querySelector('.barber-nav');
  if (!grid || !navigation) return;

  const cards = [...grid.querySelectorAll('.barber-card')];
  if (!cards.length) return;

  const previous = navigation.querySelector('[data-barber-prev]');
  const next = navigation.querySelector('[data-barber-next]');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const edgeTolerance = 2;
  const scrollLimit = () => Math.max(0, grid.scrollWidth - grid.clientWidth);

  function updateArrows() {
    const limit = scrollLimit();
    navigation.hidden = limit <= edgeTolerance;
    previous.disabled = grid.scrollLeft <= edgeTolerance;
    next.disabled = grid.scrollLeft >= limit - edgeTolerance;
  }

  function move(direction) {
    const start = cards[0].getBoundingClientRect().left;
    const limit = scrollLimit();
    const current = grid.scrollLeft;
    const stops = cards.map(card => Math.min(limit, card.getBoundingClientRect().left - start));
    const target = direction > 0
      ? stops.find(stop => stop > current + edgeTolerance)
      : stops.reverse().find(stop => stop < current - edgeTolerance);
    if (target !== undefined) {
      grid.scrollTo({ left: target, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    }
  }

  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  grid.addEventListener('scroll', updateArrows, { passive: true });
  window.addEventListener('resize', updateArrows);
  updateArrows();

  if (!('IntersectionObserver' in window) || reducedMotion.matches) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: .08 });
  cards.forEach(card => {
    card.dataset.reveal = '';
    observer.observe(card);
  });
})();
