(() => {
  'use strict';

  /* เปลี่ยน URL นี้เป็น URL /exec ของโปรเจกต์ฐานแหล่งเรียนรู้ */
  const LEARNING_SOURCE_WEB_APP_URL =
    'https://script.google.com/macros/s/AKfycbyjcMsInyo-wEdhhCIsHsEWEyQXhYcsBEpx5oHCWiMTIA1gPmnY9nc0u7TSgBI8_eWCDg/exec';
  const API_URL = LEARNING_SOURCE_WEB_APP_URL + '?mode=learningBox';

  let sources = [];
  let pageIndex = 0;
  let cardsPerPage = 2;
  let pageCount = 0;
  let timer = null;

  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '')
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const formatNumber = value => number(value).toLocaleString('th-TH');

  async function loadLearningSourceBox() {
    const mapStage = $('lsbMapStage');
    const track = $('lsbTrack');
    if (!mapStage || !track) return;

    if (!/^https:\/\/script\.google\.com\//i.test(LEARNING_SOURCE_WEB_APP_URL)) {
      const message = 'กรุณาใส่ URL Web App ของระบบฐานแหล่งเรียนรู้ใน learning-source-box.js';
      mapStage.innerHTML = `<div class="lsb-loading">${esc(message)}</div>`;
      track.innerHTML = `<div class="lsb-loading">${esc(message)}</div>`;
      return;
    }

    try {
      const response = await fetch(API_URL + '&_t=' + Date.now(), { cache:'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (result.success === false) throw new Error(result.message || 'โหลดข้อมูลไม่สำเร็จ');

      const settings = result.settings || result.data?.settings || {};
      const rawSources = result.sources || result.data?.sources || [];
      sources = (Array.isArray(rawSources) ? rawSources : []).filter(item =>
        String(item.status || 'block').toLowerCase() === 'block'
      );

      $('lsbOpenAll').href = LEARNING_SOURCE_WEB_APP_URL;
      renderMap(settings);
      renderCards();
      bindControls();
      startAutoSlide();
    } catch (error) {
      console.error('Learning Source Box:', error);
      mapStage.innerHTML = `<div class="lsb-loading">โหลดแผนที่ไม่สำเร็จ: ${esc(error.message)}</div>`;
      track.innerHTML = `<div class="lsb-loading">โหลดรายการไม่สำเร็จ: ${esc(error.message)}</div>`;
    }
  }

  function renderMap(settings) {
    const mapStage = $('lsbMapStage');
    const mapImage = String(settings.map_image_url || '').trim();
    if (!mapImage) {
      mapStage.innerHTML = '<div class="lsb-loading">ยังไม่ได้กำหนดรูปภาพแผนที่</div>';
      return;
    }

    mapStage.innerHTML = `
      <img class="lsb-map-image" src="${esc(mapImage)}" alt="แผนที่แหล่งเรียนรู้"
        onerror="this.onerror=null;this.src='https://placehold.co/1000x650?text=Map';">
      <div class="lsb-markers">
        ${sources.map(source => markerHtml(source)).join('')}
      </div>`;

    mapStage.querySelectorAll('[data-lsb-source]').forEach(marker => {
      marker.addEventListener('click', () => openDetail(marker.dataset.lsbSource));
    });
  }

  function markerHtml(source) {
    const x = Math.min(100, Math.max(0, number(source.map_x || 50)));
    const y = Math.min(100, Math.max(0, number(source.map_y || 50)));
    const image = String(source.image_url || '').trim() || 'https://placehold.co/320x180?text=No+Image';
    return `
      <button class="lsb-marker" type="button" data-lsb-source="${esc(source.id)}"
        style="left:${x}%;top:${y}%;--lsb-marker:${esc(source.marker_color || '#ef4444')}"
        aria-label="${esc(source.name || 'แหล่งเรียนรู้')}">
        <span class="lsb-marker-pin"></span>
        <span class="lsb-marker-preview">
          <img src="${esc(image)}" alt="${esc(source.name || '')}"
            onerror="this.onerror=null;this.src='https://placehold.co/320x180?text=No+Image';">
          <span class="lsb-marker-preview-body">
            <strong>${esc(source.name || '-')}</strong>
            <small>${esc(source.area || source.address || 'ไม่ระบุพื้นที่')}</small>
          </span>
        </span>
      </button>`;
  }

  function renderCards() {
    const track = $('lsbTrack');
    if (!sources.length) {
      track.innerHTML = '<div class="lsb-empty">ยังไม่มีรายการแหล่งเรียนรู้</div>';
      $('lsbDots').innerHTML = '';
      return;
    }

    track.innerHTML = sources.map(source => cardHtml(source)).join('');
    track.querySelectorAll('[data-lsb-detail]').forEach(button => {
      button.addEventListener('click', () => openDetail(button.dataset.lsbDetail));
    });

    updateResponsiveCount();
    goToPage(0, false);
  }

  function cardHtml(source) {
    const image = String(source.image_url || '').trim() || 'https://placehold.co/600x400?text=No+Image';
    return `
      <article class="lsb-card">
        <div class="lsb-card-image">
          <img src="${esc(image)}" alt="${esc(source.name || '')}" loading="lazy"
            onerror="this.onerror=null;this.src='https://placehold.co/600x400?text=No+Image';">
          <span class="lsb-card-badge">● ${esc(source.category || 'ไม่ระบุประเภท')}</span>
        </div>
        <div class="lsb-card-body">
          <h3>${esc(source.name || '-')}</h3>
          <div class="lsb-meta">⌖ <span>${esc(source.area || source.address || '-')}</span></div>
          <div class="lsb-meta">♟ <span>${esc(source.manager || '-')}</span></div>
          <div class="lsb-card-footer">
            <span class="lsb-card-stats">★ ${number(source.averageRating).toFixed(1)} · 👁 ${formatNumber(source.views)}</span>
            <button class="lsb-detail-btn" type="button" data-lsb-detail="${esc(source.id)}">ดูรายละเอียด</button>
          </div>
        </div>
      </article>`;
  }

  function updateResponsiveCount() {
    cardsPerPage = window.matchMedia('(max-width:620px)').matches ? 1 : 2;
    pageCount = Math.max(1, Math.ceil(sources.length / cardsPerPage));
    if (pageIndex >= pageCount) pageIndex = pageCount - 1;
    renderDots();
  }

  function goToPage(index, restart = true) {
    if (!sources.length) return;
    pageIndex = (index + pageCount) % pageCount;
    const card = $('lsbTrack').querySelector('.lsb-card');
    if (!card) return;
    const gap = 14;
    const distance = (card.getBoundingClientRect().width + gap) * cardsPerPage;
    $('lsbTrack').style.transform = `translateX(-${pageIndex * distance}px)`;
    renderDots();
    if (restart) startAutoSlide();
  }

  function renderDots() {
    const dots = $('lsbDots');
    dots.innerHTML = Array.from({length:pageCount}, (_, index) =>
      `<button class="lsb-dot ${index === pageIndex ? 'active' : ''}" type="button" data-lsb-page="${index}" aria-label="หน้าที่ ${index+1}"></button>`
    ).join('');
    dots.querySelectorAll('[data-lsb-page]').forEach(button => {
      button.addEventListener('click', () => goToPage(Number(button.dataset.lsbPage)));
    });
    $('lsbPrev').disabled = sources.length <= cardsPerPage;
    $('lsbNext').disabled = sources.length <= cardsPerPage;
  }

  function bindControls() {
    $('lsbPrev').onclick = () => goToPage(pageIndex - 1);
    $('lsbNext').onclick = () => goToPage(pageIndex + 1);
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const previous = cardsPerPage;
        updateResponsiveCount();
        if (previous !== cardsPerPage) goToPage(0, false);
        else goToPage(pageIndex, false);
      }, 150);
    });
  }

  function startAutoSlide() {
    clearInterval(timer);
    if (pageCount <= 1) return;
    timer = setInterval(() => goToPage(pageIndex + 1, false), 4000);
  }

  function openDetail(id) {
    if (!id) return;
    const url = LEARNING_SOURCE_WEB_APP_URL + '?id=' + encodeURIComponent(id) + '&source=github';
    window.open(url, '_blank', 'noopener');
  }

  document.addEventListener('DOMContentLoaded', loadLearningSourceBox);
})();
