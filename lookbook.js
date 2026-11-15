(() => {
  const cuts = [
    { id: 'mod', name: 'Модкат', file: 'modcut' },
    { id: 'curtains', name: 'Шторки', file: 'curtains' },
    { id: 'classic', name: 'Классика', file: 'classic' },
    { id: 'crop', name: 'Кроп', file: 'textured-crop' },
    { id: 'buzz', name: 'Баззкат', file: 'buzzcut' }
  ];
  const views = ['Фас', 'Три четверти', 'Профиль', 'Затылок'];
  const $ = selector => document.querySelector(selector);
  const section = $('.lookbook');
  const sticky = $('.lookbook-sticky');
  const footer = $('.lb-footer');
  const canvas = $('#lookbook-canvas');
  const styleButtons = [...document.querySelectorAll('[data-look]')];
  const viewButtons = [...document.querySelectorAll('[data-view]')];
  const save = $('#save-look');
  const viewTrigger = $('#view-look');
  const angleSave = $('.angles-save');
  const next = $('#next-look');
  const progress = $('#lookbook-progress');
  const dialog = $('#look-card');
  const anglesDialog = $('#angles-dialog');
  const angleCanvas = $('#angles-canvas');
  const cardImage = $('#card-image');
  const download = $('#download-card');
  const status = $('#lookbook-status');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const images = new Map();
  const loads = new Map();
  const heroes = new Map();
  const heroLoads = new Map();
  const frames = new Map();
  let angle = 1;
  let angleCut = cuts[0];
  let activeIndex = 0;
  let manualIndex = 0;
  let manualExploring = false;
  let position = 0;
  let lastTime = 0;
  let animation = 0;
  let sceneReady = false;
  let cardUrl;
  let cardOrigin;
  let pointerStart;
  let navigation = 0;
  let modalRequest = 0;
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const smooth = value => { const p = clamp((value - .16) / .68); return p * p * (3 - 2 * p); };

  function message(text) {
    status.textContent = text;
    status.hidden = !text;
  }

  function loadAsset(id, directory, cache, pending) {
    if (cache.has(id)) return Promise.resolve(cache.get(id));
    if (pending.has(id)) return pending.get(id);
    const promise = new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => { cache.set(id, img); schedule(); resolve(img); };
      img.onerror = () => { pending.delete(id); reject(new Error('image')); };
      img.src = `./assets/${directory}/${id}.webp`;
    });
    pending.set(id, promise);
    return promise;
  }
  const loadImage = id => loadAsset(id, 'haircuts', images, loads);
  const loadHero = id => loadAsset(id, 'editorial', heroes, heroLoads);

  function feather(ctx, w, h) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    const x = ctx.createLinearGradient(0, 0, w, 0);
    x.addColorStop(0, 'transparent'); x.addColorStop(.07, '#fff');
    x.addColorStop(.93, '#fff'); x.addColorStop(1, 'transparent');
    ctx.fillStyle = x; ctx.fillRect(0, 0, w, h);
    const y = ctx.createLinearGradient(0, 0, 0, h);
    y.addColorStop(0, 'transparent'); y.addColorStop(.04, '#fff');
    y.addColorStop(.88, '#fff'); y.addColorStop(1, 'transparent');
    ctx.fillStyle = y; ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  function portrait(id, view) {
    if (!images.has(id)) return null;
    const key = `${id}-${view}`;
    if (frames.has(key)) {
      const frame = frames.get(key);
      frames.delete(key); frames.set(key, frame);
      return frame;
    }
    const frame = document.createElement('canvas');
    frame.width = 512; frame.height = 768;
    const ctx = frame.getContext('2d');
    const img = images.get(id);
    const sw = img.naturalWidth / 2;
    const sh = img.naturalHeight / 2;
    ctx.drawImage(img, (view % 2) * sw + 1, Math.floor(view / 2) * sh + 1, sw - 2, sh - 2, 0, 0, 512, 768);
    feather(ctx, 512, 768);
    frames.set(key, frame);
    if (frames.size > 8) frames.delete(frames.keys().next().value);
    return frame;
  }

  function target(element) {
    const rect = element.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 1.7);
    const width = Math.round(rect.width * dpr);
    const height = Math.round(rect.height * dpr);
    if (element.width !== width || element.height !== height) { element.width = width; element.height = height; }
    const ctx = element.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    return { ctx, w: rect.width, h: rect.height };
  }

  function paintHero(ctx, img, w, h) {
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const x = (w - dw) * (innerWidth <= 700 ? .72 : .65);
    ctx.drawImage(img, x, 0, dw, dh);
  }

  function drawAngles() {
    if (!anglesDialog.open) return;
    const image = portrait(angleCut.id, angle);
    if (!image) return;
    const t = target(angleCanvas);
    const h = Math.min(t.h, t.w * 1.5);
    const w = h / 1.5;
    t.ctx.drawImage(image, (t.w - w) / 2, (t.h - h) / 2, w, h);
    angleCanvas.setAttribute('aria-label', `${angleCut.name}, ${views[angle].toLowerCase()}. Стрелки переключают ракурс.`);
    angleCanvas.dataset.cut = angleCut.id;
    angleCanvas.dataset.view = angle;
  }

  function draw(time) {
    animation = 0;
    if (!sceneReady) return;
    const rect = section.getBoundingClientRect();
    const range = Math.max(0, section.offsetHeight - sticky.offsetHeight);
    const raw = range > 1 ? clamp(-rect.top / range) : 0;
    const desired = range > 1 ? raw * (cuts.length - 1) : manualIndex;
    const delta = Math.min(64, lastTime ? time - lastTime : 16);
    lastTime = time;
    if (reduced.matches || rect.bottom <= 0 || rect.top >= innerHeight || !range) position = desired;
    else position += (desired - position) * (1 - Math.exp(-delta / 75));
    if (Math.abs(desired - position) < .001) position = desired;
    const engaged = raw > .018 || manualExploring || range <= 1 || reduced.matches;
    section.dataset.engaged = String(engaged);
    footer.inert = !engaged;
    footer.setAttribute('aria-hidden', String(!engaged));
    const left = Math.min(cuts.length - 1, Math.floor(position));
    const right = Math.min(cuts.length - 1, left + 1);
    const blend = reduced.matches ? Number(position - left > .5) : smooth(position - left);
    const a = heroes.get(cuts[left].id);
    const b = heroes.get(cuts[right].id);
    const candidate = blend < .5 ? left : right;
    if (heroes.has(cuts[candidate].id)) activeIndex = candidate;
    const fallback = heroes.get(cuts[activeIndex].id) || heroes.get(cuts[0].id);
    const t = target(canvas);
    if (a && b) {
      paintHero(t.ctx, blend > .999 ? b : a, t.w, t.h);
      if (blend > 0 && blend < .999) { t.ctx.globalAlpha = blend; paintHero(t.ctx, b, t.w, t.h); t.ctx.globalAlpha = 1; }
    } else if (fallback) paintHero(t.ctx, fallback, t.w, t.h);
    const cut = cuts[activeIndex];
    styleButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.look === cut.id)));
    canvas.setAttribute('aria-label', `${cut.name} — персонаж лукбука`);
    canvas.dataset.ready = 'true';
    canvas.dataset.cut = cut.id;
    canvas.dataset.progress = (position / (cuts.length - 1)).toFixed(3);
    canvas.dataset.blend = blend.toFixed(3);
    $('.lb-still').hidden = true;
    const percent = Math.round(position / (cuts.length - 1) * 100);
    progress.setAttribute('aria-valuenow', String(percent));
    progress.querySelector('span').style.transform = `scaleX(${percent / 100})`;
    next.setAttribute('aria-label', activeIndex === cuts.length - 1 ? 'К мастерам' : 'Следующая стрижка');
    save.setAttribute('aria-label', `Сохранить образ: ${cut.name}`);
    viewTrigger.setAttribute('aria-label', `Ракурсы: ${cut.name}`);
    drawAngles();
    if (Math.abs(desired - position) > .001) schedule();
  }

  function schedule() { if (!animation) animation = requestAnimationFrame(draw); }

  function startScene() {
    if (sceneReady) return;
    sceneReady = true;
    save.disabled = viewTrigger.disabled = false;
  }

  async function choose(index, animate = false) {
    const request = ++navigation;
    try {
      await loadHero(cuts[index].id);
      if (request !== navigation) return;
      startScene();
      manualExploring = true;
      manualIndex = index;
      const range = Math.max(0, section.offsetHeight - sticky.offsetHeight);
      if (!animate || !range || reduced.matches) { activeIndex = index; position = index; }
      if (range > 1) {
        const top = scrollY + section.getBoundingClientRect().top;
        scrollTo({ top: top + range * index / (cuts.length - 1), behavior: animate && !reduced.matches ? 'smooth' : 'auto' });
      }
      message(''); schedule();
    } catch { if (request === navigation) message('Не удалось загрузить этот образ. Попробуйте ещё раз.'); }
  }

  function changeView(index) {
    angle = clamp(index, 0, 3);
    viewButtons.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.view) === angle)));
    drawAngles();
  }

  viewTrigger.addEventListener('click', async () => {
    const request = ++modalRequest;
    const cut = cuts[activeIndex];
    viewTrigger.disabled = true;
    try {
      await loadImage(cut.id);
      if (request !== modalRequest) return;
      manualExploring = true;
      angleCut = cut;
      $('#angles-title').textContent = cut.name;
      anglesDialog.showModal();
      changeView(angle); schedule(); message('');
    } catch { message('Не удалось загрузить ракурсы. Попробуйте ещё раз.'); }
    finally { viewTrigger.disabled = false; }
  });

  async function makeCard(cut, selectedView) {
    await loadImage(cut.id);
    if (document.fonts) await document.fonts.ready;
    const card = document.createElement('canvas'); card.width = 1440; card.height = 2160;
    const ctx = card.getContext('2d');
    ctx.fillStyle = '#242523'; ctx.fillRect(0, 0, 1440, 2160);
    ctx.fillStyle = '#eeeee8'; ctx.font = '800 76px Onest, Arial, sans-serif'; ctx.fillText('СИБ БАРБЕР', 80, 143);
    ctx.font = '500 60px Onest, Arial, sans-serif'; ctx.textAlign = 'right'; ctx.fillText(cut.name, 1360, 143);
    ctx.fillStyle = '#a9f0d4'; ctx.fillRect(80, 228, 1280, 3);
    for (let view = 0; view < 4; view++) {
      const x = view % 2 ? 800 : 140;
      const y = view > 1 ? 1150 : 300;
      ctx.drawImage(portrait(cut.id, view), x, y, 500, 750);
      ctx.fillStyle = view === selectedView ? '#a9f0d4' : '#c4c8bc';
      ctx.font = '400 28px Onest, Arial, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(views[view], x + 250, y + 801);
      if (view === selectedView) ctx.fillRect(x + 200, y + 818, 100, 2);
    }
    ctx.textAlign = 'left'; ctx.fillStyle = '#bfc5b7'; ctx.font = '400 25px Onest, Arial, sans-serif';
    ctx.fillText('Сгенерированный референс. Форму и длину обсудите с мастером.', 80, 2056);
    ctx.font = '400 24px Onest, Arial, sans-serif'; ctx.fillStyle = '#eeeee8';
    ctx.fillText('СИБ БАРБЕР · Новосибирск, Красный проспект, 49', 80, 2111);
    return new Promise((resolve, reject) => card.toBlob(blob => blob ? resolve(blob) : reject(new Error('export')), 'image/jpeg', .94));
  }

  async function openCard(origin, cut) {
    const request = ++modalRequest;
    const view = angle;
    manualExploring = true;
    save.disabled = angleSave.disabled = true;
    origin.setAttribute('aria-busy', 'true');
    const oldText = origin.textContent; origin.textContent = 'Готовим JPG…';
    let pendingUrl;
    try {
      const blob = await makeCard(cut, view);
      if (request !== modalRequest) return;
      pendingUrl = URL.createObjectURL(blob);
      cardImage.src = pendingUrl;
      cardImage.alt = `${cut.name}: фас, три четверти, профиль и затылок`;
      await cardImage.decode();
      if (cardUrl) URL.revokeObjectURL(cardUrl);
      cardUrl = pendingUrl; cardOrigin = origin;
      $('#card-title').textContent = cut.name;
      download.href = cardUrl; download.download = `sib-barber-${cut.file}.jpg`; download.dataset.cut = cut.id;
      dialog.showModal(); message(''); schedule();
    } catch { if (pendingUrl && pendingUrl !== cardUrl) URL.revokeObjectURL(pendingUrl); message('Не удалось подготовить карточку. Попробуйте ещё раз.'); }
    finally { save.disabled = angleSave.disabled = false; origin.removeAttribute('aria-busy'); origin.textContent = oldText; }
  }

  save.addEventListener('click', () => openCard(save, cuts[activeIndex]));
  angleSave.addEventListener('click', () => openCard(angleSave, angleCut));
  $('.card-close').addEventListener('click', () => dialog.close());
  $('.angles-close').addEventListener('click', () => anglesDialog.close());
  [dialog, anglesDialog].forEach(modal => modal.addEventListener('click', event => {
    if (event.target !== modal) return;
    const r = modal.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) modal.close();
  }));
  dialog.addEventListener('close', () => cardOrigin?.focus({ preventScroll: true }));
  anglesDialog.addEventListener('close', () => viewTrigger.focus({ preventScroll: true }));
  styleButtons.forEach(button => button.addEventListener('click', () => choose(cuts.findIndex(cut => cut.id === button.dataset.look))));
  viewButtons.forEach(button => button.addEventListener('click', () => changeView(Number(button.dataset.view))));
  $('.lb-home').addEventListener('click', () => { manualExploring = false; schedule(); });
  next.addEventListener('click', () => {
    if (activeIndex < cuts.length - 1) choose(activeIndex + 1, true);
    else $('#barbers').scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth' });
  });
  angleCanvas.addEventListener('pointerdown', event => { pointerStart = { x: event.clientX, y: event.clientY }; });
  angleCanvas.addEventListener('pointerup', event => {
    if (!pointerStart) return;
    const dx = event.clientX - pointerStart.x; const dy = event.clientY - pointerStart.y; pointerStart = null;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) changeView(angle + (dx < 0 ? 1 : -1));
  });
  angleCanvas.addEventListener('pointercancel', () => { pointerStart = null; });
  angleCanvas.addEventListener('keydown', event => {
    const keys = { ArrowLeft: angle - 1, ArrowRight: angle + 1, Home: 0, End: 3 };
    if (Object.hasOwn(keys, event.key)) { event.preventDefault(); changeView(keys[event.key]); }
  });
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  if (reduced.addEventListener) reduced.addEventListener('change', schedule);
  else if (reduced.addListener) reduced.addListener(schedule);
  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(schedule);
    observer.observe($('.lb-photo'));
    observer.observe($('.angles-frame'));
  }
  addEventListener('pagehide', () => { if (cardUrl) URL.revokeObjectURL(cardUrl); });
  loadHero(cuts[0].id).then(() => {
    startScene(); schedule();
    Promise.allSettled(cuts.slice(1).map(cut => loadHero(cut.id))).then(schedule);
  }).catch(() => {
    if (!sceneReady) message('Лукбук не загрузился. Обновите страницу.');
  });
})();
