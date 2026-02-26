(function() {
  var style = document.createElement('style');
  style.id = 'ifx-torrent-styles';
  style.textContent = `
    /* Рамки для всей строки */
    .ifx-tor-best { border-left: 6px solid #2ecc71 !important; background: rgba(46, 204, 113, 0.1) !important; }
    .ifx-tor-good { border-left: 6px solid #f1c40f !important; background: rgba(241, 196, 15, 0.07) !important; }
    .ifx-tor-low  { border-left: 6px solid #e67e22 !important; background: rgba(230, 126, 34, 0.05) !important; }
    .ifx-tor-dead { border-left: 6px solid #e74c3c !important; background: rgba(231, 76, 60, 0.05) !important; }
    
    /* Цвет самого текста раздающих для надежности */
    .ifx-tor-best .torrent-item__seeds { color: #2ecc71 !important; font-weight: bold; }
    .ifx-tor-dead .torrent-item__seeds { color: #e74c3c !important; }

    /* Бейджи HDR/DV */
    .ifx-hdr-badge { 
      background: #ff8c00 !important; 
      color: #fff !important; 
      padding: 0px 4px !important; 
      border-radius: 3px !important; 
      font-size: 11px !important; 
      margin-left: 8px !important; 
      display: inline-block !important;
      vertical-align: middle !important;
    }
  `;
  document.head.appendChild(style);

  function process(el) {
    // Убираем старые классы, если они были наложены некорректно
    el.classList.remove('ifx-tor-best', 'ifx-tor-good', 'ifx-tor-low', 'ifx-tor-dead');

    // 1. Поиск раздающих
    var sEl = el.querySelector('.torrent-item__seeds');
    if (sEl) {
      // Очищаем текст от лишних символов, оставляем только цифры
      var s = parseInt(sEl.textContent.replace(/\s+/g, '')) || 0;
      
      if (s >= 50) el.classList.add('ifx-tor-best'); 
      else if (s >= 10) el.classList.add('ifx-tor-good');
      else if (s >= 3) el.classList.add('ifx-tor-low');
      else el.classList.add('ifx-tor-dead');
    }

    // 2. Битрейт (делаем ярче)
    var bEl = el.querySelector('.torrent-item__bitrate');
    if (bEl) {
      var b = parseFloat(bEl.textContent.replace(/[^\d.]/g, '')) || 0;
      if (b >= 20) {
          bEl.style.setProperty('color', '#00d0ff', 'important');
          bEl.style.setProperty('font-weight', 'bold', 'important');
      }
    }

    // 3. Бейджи (проверка на дубликаты)
    var titleEl = el.querySelector('.torrent-item__title');
    if (titleEl && !el.querySelector('.ifx-hdr-badge')) {
      var t = titleEl.textContent.toUpperCase();
      var badge = '';
      if (t.includes('DOLBY VISION') || t.includes('DV')) badge = 'DV';
      else if (t.includes('HDR')) badge = 'HDR';
      
      if (badge) {
        titleEl.insertAdjacentHTML('beforeend', '<span class="ifx-hdr-badge">' + badge + '</span>');
      }
    }
  }

  // Наблюдатель за изменениями
  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(m) {
      m.addedNodes.forEach(function(node) {
        if (node.nodeType === 1) {
          if (node.classList.contains('torrent-item')) process(node);
          node.querySelectorAll('.torrent-item').forEach(process);
        }
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
  // Запуск по уже существующим
  document.querySelectorAll('.torrent-item').forEach(process);
})();
