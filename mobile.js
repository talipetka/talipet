(function() {
  var style = document.createElement('style');
  style.textContent = `
    /* Рамки сидов */
    .ifx-tor-best { border-left: 5px solid #2ecc71 !important; background: rgba(46, 204, 113, 0.08) !important; }
    .ifx-tor-good { border-left: 5px solid #f1c40f !important; background: rgba(241, 196, 15, 0.05) !important; }
    .ifx-tor-low  { border-left: 5px solid #e67e22 !important; }
    .ifx-tor-dead { border-left: 5px solid #e74c3c !important; opacity: 0.8; }
    
    /* Битрейт */
    .ifx-bit-ultra { color: #00d0ff !important; font-weight: bold; text-shadow: 0 0 3px #00d0ff; }
    .ifx-bit-high  { color: #2ecc71 !important; }

    /* Дополнительные метки */
    .ifx-hdr-badge { 
      background: linear-gradient(90deg, #ff8c00, #ff4d4d); 
      color: #fff; padding: 1px 4px; border-radius: 3px; font-size: 10px; margin-left: 5px; font-weight: bold;
    }
  `;
  document.head.appendChild(style);

  function process(el) {
    if (el.classList.contains('ifx-v2-done')) return;

    // 1. Логика СИДОВ (Скорректированная под ваш скриншот)
    var sEl = el.querySelector('.torrent-item__seeds');
    if (sEl) {
      var s = parseInt(sEl.textContent) || 0;
      if (s >= 50) el.classList.add('ifx-tor-best');     // Много
      else if (s >= 10) el.classList.add('ifx-tor-good'); // Средне (теперь желтый)
      else if (s >= 3) el.classList.add('ifx-tor-low');   // Мало (оранжевый)
      else el.classList.add('ifx-tor-dead');              // Почти мертв (красный)
    }

    // 2. Логика БИТРЕЙТА
    var bEl = el.querySelector('.torrent-item__bitrate');
    if (bEl) {
      var b = parseFloat(bEl.textContent) || 0;
      if (b >= 30) bEl.classList.add('ifx-bit-ultra');
      else if (b >= 15) bEl.classList.add('ifx-bit-high');
    }

    // 3. Поиск HDR / DV в названии
    var titleEl = el.querySelector('.torrent-item__title');
    if (titleEl && !el.querySelector('.ifx-hdr-badge')) {
      var t = titleEl.textContent.toUpperCase();
      var label = '';
      if (t.includes('DOLBY VISION') || t.includes(' DV ')) label = 'DV';
      else if (t.includes('HDR')) label = 'HDR';
      
      if (label) {
        titleEl.insertAdjacentHTML('beforeend', '<span class="ifx-hdr-badge">' + label + '</span>');
      }
    }

    el.classList.add('ifx-v2-done');
  }

  var observer = new MutationObserver(function(m) {
    m.forEach(function(n) {
      n.addedNodes.forEach(function(node) {
        if (node.nodeType === 1) {
          if (node.classList.contains('torrent-item')) process(node);
          node.querySelectorAll('.torrent-item').forEach(process);
        }
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
