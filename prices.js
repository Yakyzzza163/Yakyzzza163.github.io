(() => {
  const section = document.querySelector('#prices');
  if (!section) return;
  const tabs = Array.from(section.querySelectorAll('[role="tab"]'));
  const panels = Array.from(section.querySelectorAll('[role="tabpanel"]'));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const modeControls = section.querySelector('.price-modes');
  const modes = Array.from(modeControls.querySelectorAll('[data-price-mode]'));
  const byService = section.querySelector('#price-by-service');
  const byMaster = section.querySelector('#price-by-master');
  const serviceSelect = section.querySelector('#price-compare-service');
  const compareList = section.querySelector('#price-compare-list');
  const compareStatus = section.querySelector('#price-compare-status');
  const compareBooking = section.querySelector('#price-compare-booking');

  function showMode(mode) {
    byService.hidden = mode !== 'service';
    byMaster.hidden = mode !== 'master';
    modes.forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.priceMode === mode));
    });
  }

  function bookingUrl(base, staffId, serviceIds) {
    const url = new URL(base);
    if (serviceIds.length) {
      url.pathname = url.pathname.replace('/select-services', '/select-time');
      url.searchParams.set('o', `m${staffId}${serviceIds.map(id => `s${id}`).join('')}`);
    }
    return url.href;
  }

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
    link.addEventListener('click', () => {
      showMode('master');
      select(link.dataset.priceBarber);
    });
  });

  const servicesByName = new Map();
  const masters = panels.map(panel => {
    const staffId = panel.dataset.staff;
    const name = tabs.find(tab => tab.dataset.staff === staffId).textContent.trim();
    const booking = panel.querySelector('.price-booking');
    const defaultUrl = booking.href;
    const services = Array.from(panel.querySelectorAll('.price-service')).map(button => {
      const row = button.closest('.price-row');
      const label = button.textContent.trim();
      const key = label.replace(/\s+/g, ' ').toLocaleLowerCase('ru');
      servicesByName.set(key, label);
      return { key, row, button, id: button.dataset.serviceId, price: row.querySelector('dd').textContent.trim() };
    });

    services.forEach(({ row, button }) => {
      button.addEventListener('click', () => {
        const chosen = button.getAttribute('aria-pressed') !== 'true';
        button.setAttribute('aria-pressed', String(chosen));
        row.dataset.selected = String(chosen);
        const selectedIds = services.filter(service => service.button.getAttribute('aria-pressed') === 'true').map(service => service.id);
        booking.href = bookingUrl(defaultUrl, staffId, selectedIds);
      });
    });
    return { staffId, name, defaultUrl, services };
  });

  function renderComparison() {
    compareList.replaceChildren();
    compareStatus.textContent = 'Выберите мастера';
    compareBooking.removeAttribute('href');
    compareBooking.setAttribute('aria-disabled', 'true');
    compareBooking.removeAttribute('aria-label');

    masters.forEach(master => {
      const service = master.services.find(item => item.key === serviceSelect.value);
      const row = document.createElement('div');
      row.className = 'price-row';
      const name = document.createElement('dt');
      const price = document.createElement('dd');
      if (service) {
        const selectMaster = document.createElement('button');
        selectMaster.type = 'button';
        selectMaster.className = 'price-service';
        selectMaster.textContent = master.name;
        selectMaster.setAttribute('aria-pressed', 'false');
        selectMaster.setAttribute('aria-label', `${master.name}, ${service.price}`);
        selectMaster.addEventListener('click', () => {
          const previous = compareList.querySelector('[aria-pressed="true"]');
          if (previous) {
            previous.setAttribute('aria-pressed', 'false');
            delete previous.closest('.price-row').dataset.selected;
          }
          selectMaster.setAttribute('aria-pressed', 'true');
          row.dataset.selected = 'true';
          compareStatus.textContent = `${master.name} · ${service.price}`;
          compareBooking.href = bookingUrl(master.defaultUrl, master.staffId, [service.id]);
          compareBooking.removeAttribute('aria-disabled');
          compareBooking.setAttribute('aria-label', `Запись: ${master.name}, ${servicesByName.get(service.key)}`);
        });
        name.append(selectMaster);
        price.textContent = service.price;
      } else {
        row.classList.add('price-row-unavailable');
        name.textContent = master.name;
        price.textContent = 'Нет в прайсе';
      }
      row.append(name, price);
      compareList.append(row);
    });
  }

  servicesByName.forEach((label, key) => serviceSelect.add(new Option(label, key)));
  serviceSelect.addEventListener('change', renderComparison);
  modes.forEach(button => button.addEventListener('click', () => showMode(button.dataset.priceMode)));
  document.querySelector('[data-price-service-view]').addEventListener('click', () => showMode('service'));
  renderComparison();
  showMode('service');
  modeControls.hidden = false;
})();
