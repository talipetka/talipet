(function() {
  // 1. Добавляем стили в HEAD для мгновенного применения
  var style = document.createElement('style');
  style.textContent = `
    /* Стили для строк торрентов */
    .ifx-torrent-high-seeds { border-left: 4px solid #2ecc71 !important; background: rgba(46, 204, 113, 0.05) !important; }
    .ifx-torrent-mid-seeds  { border-left: 4px solid #f1c40f !important; background: rgba(241, 196, 15, 0.05) !important; }
    .ifx-torrent-low-seeds  { border-left: 4px solid #e74c3c !important; background: rgba(231, 76, 60, 0.05) !important; }
    
    /* Стили для битрейта */
    .ifx-bitrate-heavy { color: #ff3f3f !important; font-weight: bold; text-shadow: 0 0 5px rgba(255,63,63,0.3); }
    .ifx-bitrate-good  { color: #ff8c00 !important; }
    .ifx-bitrate-mid   { color: #00d0ff !important; }
    
    .torrent-item { transition: all 0.2s; margin-bottom: 2px !important; }
  `;
  document.head.appendChild(style);

  // 2. Функция обработки каждой строки торрента
  function processTorrentItem(el) {
    if (el.classList.contains('ifx-processed')) return;

    // Ищем количество сидов
    var seedsEl = el.querySelector('.torrent-item__seeds');
    if (seedsEl) {
      var seeds = parseInt(seedsEl.textContent) || 0;
      if (seeds >= 20) el.classList.add('ifx-torrent-high-seeds');
      else if (seeds >= 6) el.classList.add('ifx-torrent-mid-seeds');
      else el.classList.add('ifx-torrent-low-seeds');
    }

    // Ищем битрейт
    var bitrateEl = el.querySelector('.torrent-item__bitrate');
    if (bitrateEl) {
      var bitrate = parseFloat(bitrateEl.textContent) || 0;
      if (bitrate >= 40) bitrateEl.classList.add('ifx-bitrate-heavy');
      else if (bitrate >= 20) bitrateEl.classList.add('ifx-bitrate-good');
      else if (bitrate >= 10) bitrateEl.classList.add('ifx-bitrate-mid');
    }

    el.classList.add('ifx-processed');
  }

  // 3. Следим за появлением торрентов в DOM
  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        if (node.nodeType === 1) {
          // Если это сама строка торрента или она внутри добавленного узла
          if (node.classList.contains('torrent-item')) processTorrentItem(node);
          var items = node.querySelectorAll('.torrent-item');
          items.forEach(processTorrentItem);
        }
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
