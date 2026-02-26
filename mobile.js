// Функция для определения цвета в зависимости от битрейта (Мбит/с)
function getBitrateColor(bitrate) {
    if (bitrate >= 40) return '#ff3f3f'; // Тяжелый 4K (Remux) - красный акцент
    if (bitrate >= 20) return '#ff8c00'; // Хороший 1080p/4K - оранжевый
    if (bitrate >= 10) return '#00d0ff'; // Средний - голубой
    return '#aaaaaa'; // Низкий - серый
}

// Функция для определения цвета сидеров
function getSeedersColor(seeds) {
    if (seeds <= 5) return '#ff4d4d';  // Мало - красный
    if (seeds <= 20) return '#ffcc00'; // Средне - желтый
    return '#2ecc71';                // Много - зеленый
}

// Основной хук на отрисовку торрентов
Lampa.Listener.follow('full', function(e) {
    if (e.type === 'complite' && e.name === 'torrent') {
        var items = e.object.items || [];
        
        // Ждем отрисовки DOM
        setTimeout(function() {
            $('.torrent-item').each(function(i, item) {
                var data = items[i];
                if (!data) return;

                var $item = $(item);
                
                // 1. Рамка по количеству сидов (если включено в настройках)
                if (settings.tor_frame) {
                    var sColor = getSeedersColor(data.seeds);
                    $item.css({
                        'border-left': '4px solid ' + sColor,
                        'margin-bottom': '5px',
                        'background': 'rgba(255,255,255,0.03)'
                    });
                }

                // 2. Подсветка битрейта
                if (settings.tor_bitrate && data.bitrate) {
                    var bColor = getBitrateColor(parseFloat(data.bitrate));
                    $item.find('.torrent-item__bitrate').css({
                        'color': bColor,
                        'font-weight': 'bold'
                    });
                }

                // 3. Добавление метки кодека (HEVC/AVC)
                if (!$item.find('.ifx-codec-badge').length) {
                    var codec = data.title.match(/HEVC|H\.265|x265/i) ? 'HEVC' : 'AVC';
                    var badgeColor = (codec === 'HEVC') ? '#9b59b6' : '#34495e';
                    
                    $item.find('.torrent-item__title').after(
                        '<span class="ifx-codec-badge" style="background:' + badgeColor + 
                        '; color:#fff; font-size:0.6em; padding:2px 4px; border-radius:3px; margin-left:10px; vertical-align:middle;">' + 
                        codec + '</span>'
                    );
                }
            });
        }, 100);
    }
});
