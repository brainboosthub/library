(() => {
  'use strict';

  const BUS_WEB_APP_URL =
    'https://script.google.com/macros/s/AKfycbzq9SWm2mEBe_gsusJKNEj7hlORO29BejRrOI7CoapwBj145UCyUBccmzdv4pzLAHlW/exec';
  const BUS_API_URL = BUS_WEB_APP_URL + '?mode=bus';

  let busItems = [];
  let busIndex = 0;

  const escapeHtml = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  function normalizeBusItem(row) {
    return {
      place: String(row.place || row.location || row['สถานที่จัดกิจกรรม'] || '').trim(),
      vehicle: String(row.vehicle || row.busType || row['ประเภทรถ'] || '').trim(),
      date: String(row.date || row.activityDate || row['วันที่จัดกิจกรรม'] || '').trim(),
      time: String(row.time || row.activityTime || row['เวลาจัดกิจกรรม'] || '').trim(),
      detail: String(row.detail || row.activity || row['กิจกรรมที่น่าสนใจ'] || '').trim()
    };
  }

  function hideBusBox() {
    document.getElementById('busBox')?.setAttribute('hidden', '');
    document.getElementById('newsBusLayout')?.classList.add('bus-is-hidden');
  }

  function showBusBox() {
    document.getElementById('busBox')?.removeAttribute('hidden');
    document.getElementById('newsBusLayout')?.classList.remove('bus-is-hidden');
  }

  function renderBus() {
    const content = document.getElementById('busContent');
    const dots = document.getElementById('busDots');
    const controls = document.getElementById('busControls');
    if (!content || !dots || !controls || !busItems.length) return;

const item = busItems[busIndex];

    content.innerHTML = `
      <h3 class="bus-title">กิจกรรมรถโมบาย</h3>
      <div class="bus-info-grid">
        <div class="bus-info-item">
          <strong>สถานที่จัดกิจกรรม</strong>
          <span>${escapeHtml(item.place || '-')}</span>
        </div>
        <div class="bus-info-item">
          <strong>ประเภทรถ</strong>
          <span>${escapeHtml(item.vehicle || '-')}</span>
        </div>
        <div class="bus-info-item">
          <strong>วันที่จัดกิจกรรม</strong>
          <span>${escapeHtml(item.date || '-')}</span>
        </div>
        <div class="bus-info-item">
          <strong>เวลาจัดกิจกรรม</strong>
          <span>${escapeHtml(item.time || '-')}</span>
        </div>
      </div>
${item.detail ? `
    <div class="bus-detail">
        <strong>กิจกรรมที่น่าสนใจ</strong>
        <div class="bus-detail-text">
            ${escapeHtml(item.detail)}
        </div>
    </div>
` : ''}
    `;

    dots.innerHTML = busItems.map((_, index) => `
      <button
        class="bus-dot ${index === busIndex ? 'active' : ''}"
        type="button"
        data-bus-index="${index}"
        aria-label="กิจกรรมที่ ${index + 1}">
      </button>
    `).join('');

    dots.querySelectorAll('[data-bus-index]').forEach(button => {
      button.addEventListener('click', () => {
        busIndex = Number(button.dataset.busIndex) || 0;
        renderBus();
      });
    });

    controls.hidden = busItems.length <= 1;
  }

  async function loadBus() {
    try {
      const response = await fetch(BUS_API_URL + '&_t=' + Date.now(), {
        method: 'GET',
        cache: 'no-store'
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const result = await response.json();
      if (result.success === false) {
        throw new Error(result.message || 'โหลดข้อมูลรถโมบายไม่สำเร็จ');
      }

      const raw = result.items || result.data?.items || result.data || [];
      busItems = (Array.isArray(raw) ? raw : [])
        .map(normalizeBusItem)
        .filter(item => item.place || item.vehicle || item.date || item.time || item.detail);

      if (!busItems.length) {
        hideBusBox();
        return;
      }

      busIndex = 0;
      showBusBox();
      renderBus();
    } catch (error) {
      console.error('โหลดข้อมูลกิจกรรมรถโมบายไม่สำเร็จ:', error);
      hideBusBox();
    }
  }

  function bindBusControls() {
    document.getElementById('busPrev')?.addEventListener('click', () => {
      if (!busItems.length) return;
      busIndex = (busIndex - 1 + busItems.length) % busItems.length;
      renderBus();
    });

    document.getElementById('busNext')?.addEventListener('click', () => {
      if (!busItems.length) return;
      busIndex = (busIndex + 1) % busItems.length;
      renderBus();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindBusControls();
    loadBus();
  });
})();
