(() => {
  const section = document.querySelector('#prices');
  if (!section) return;
  const tabs = Array.from(section.querySelectorAll('[role="tab"]'));
  const panels = Array.from(section.querySelectorAll('[role="tabpanel"]'));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  function select(id, focus = false) {
    const selected = tabs.find(tab => tab.dataset.staff === id);
    if (!selected) return;
    tabs.forEach(tab => {
      const active = tab === selected;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    panels.forEach(panel => { panel.hidden = panel.dataset.staff !== id; });
    section.dataset.staff = id;
    if (focus) {
      selected.focus({ preventScroll: true });
      selected.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduced.matches ? 'instant' : 'smooth' });
    }
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(tab.dataset.staff));
    tab.addEventListener('keydown', event => {
      const positions = { ArrowLeft: (index - 1 + tabs.length) % tabs.length, ArrowRight: (index + 1) % tabs.length, Home: 0, End: tabs.length - 1 };
      if (!Object.hasOwn(positions, event.key)) return;
      event.preventDefault();
      select(tabs[positions[event.key]].dataset.staff, true);
    });
  });
  document.querySelectorAll('[data-price-barber]').forEach(link => {
    link.addEventListener('click', () => select(link.dataset.priceBarber));
  });

  panels.forEach(panel => {
    const booking = panel.querySelector('.price-booking');
    const defaultUrl = booking.href;
    const services = Array.from(panel.querySelectorAll('.price-service'));
    services.forEach(button => {
      button.addEventListener('click', () => {
        const chosen = button.getAttribute('aria-pressed') !== 'true';
        button.setAttribute('aria-pressed', String(chosen));
        button.closest('.price-row').dataset.selected = String(chosen);
        const selected = services.filter(service => service.getAttribute('aria-pressed') === 'true');
        const url = new URL(defaultUrl);
        if (selected.length) {
          url.pathname = url.pathname.replace('/select-services', '/select-time');
          url.searchParams.set('o', `m${panel.dataset.staff}${selected.map(service => `s${service.dataset.serviceId}`).join('')}`);
        }
        booking.href = url.href;
      });
    });
  });
})();
