(function () {
    // 1. Добавляем улучшенные стили
    var style = document.createElement('style');
    style.textContent = `
        .ifx-res-block {
            margin: 10px !important;
            padding: 10px 15px !important;
            border-radius: 6px !important;
            font-family: sans-serif;
            border-left: 5px solid #555;
            background: rgba(0,0,0,0.3) !important;
        }
        .ifx-res-title { font-weight: bold; font-size: 16px !important; margin-bottom: 4px; }
        .ifx-res-tech { opacity: 0.9; font-size: 13px !important; color: #eee; }
        .ifx-res-note { margin-top: 6px; font-size: 12px !important; line-height: 1.3; }

        /* Идеально */
        .ifx-res-ideal { background: rgba(46, 204, 113, 0.12) !important; border-left-color: #2ecc71 !important; }
        .ifx-res-ideal .ifx-res-title { color: #2ecc71 !important; }
        
        /* Рекомендуется */
        .ifx-res-good { background: rgba(52, 152, 219, 0.12) !important; border-left-color: #3498db !important; }
        .ifx-res-good .ifx-res-title { color: #3498db !important; }

        /* Внимание / Низкий битрейт */
        .ifx-res-warn { background: rgba(241, 196, 15, 0.1) !important; border-left-color: #f1c40f !important; }
        .ifx-res-warn .ifx-res-title { color: #f1c40f !important; }
        .ifx-res-warn .ifx-res-note { color: #f1c40f !important; opacity: 0.9; }
    `;
    document.head.appendChild(style);

    function processItem(el) {
        if (el.classList.contains('ifx-v3-ready')) return;

        // --- ИЗВЛЕЧЕНИЕ ДАННЫХ (с защитой от ошибок) ---
        var rawSeeds = el.querySelector('.torrent-item__seeds')?.textContent || '0';
        var rawLeechs = el.querySelector('.torrent-item__leechs')?.textContent || '0';
        var rawBitrate = el.querySelector('.torrent-item__bitrate')?.textContent || '0';
        
        // Очищаем числа от мусора (пробелы, "Мбит/с" и т.д.)
        var seeds = parseInt(rawSeeds.replace(/[^\d]/g, '')) || 0;
        var leechs = parseInt(rawLeechs.replace(/[^\d]/g, '')) || 0;
        var bitrate = parseFloat(rawBitrate.replace(/[^\d.]/g, '')) || 0;

        // Данные из названия
        var titleText = el.querySelector('.torrent-item__title')?.textContent || '';
        var is4K = titleText.includes('2160') || titleText.includes('4K');
        var codec = titleText.includes('HEVC') || titleText.includes('H.265') || titleText.includes('x265') ? 'HEVC' : 'AVC';
        var hdr = titleText.match(/HDR|DV|Dolby Vision|HDR10\+/i)?.[0] || 'SDR';

        // --- ЛОГИКА АНАЛИЗА ---
        var result = { title: "Хорошая раздача", note: "Параметры в норме.", type: "good" };

        if (is4K) {
            if (bitrate >= 25) {
                result = { title: "Идеально", note: "Высокий битрейт для 4K. Максимальное качество.", type: "ideal" };
            } else if (bitrate < 15) {
                result = { 
                    title: "Низкий битрейт (" + seeds + ")", 
                    note: "Низкий битрейт для 4K: Идеально 25-50+ Mbps • Текущий " + (bitrate || 'неизвестен'), 
                    type: "warn" 
                };
            }
        } else {
            // Для 1080p
            if (bitrate >= 10) result = { title: "Отличная раздача", note: "Оптимально для Full HD.", type: "ideal" };
            else result = { title: "Среднее качество", note: "Битрейт ниже среднего для 1080p.", type: "good" };
        }

        // Проверка скорости (сиды vs личи)
        if (leechs > seeds && seeds < 50) {
            result.note = "Внимание: качающих больше чем раздающих. Возможна низкая скорость.";
            result.type = "warn";
        }

        // --- ОТРИСОВКА ---
        // Удаляем старые блоки, если они были созданы прошлым кодом
        el.querySelectorAll('.ifx-res-block').forEach(b => b.remove());

        var info = document.createElement('div');
        info.className = 'ifx-res-block ifx-res-' + result.type;
        info.innerHTML = `
            <div class="ifx-res-title">${result.title} (${seeds})</div>
            <div class="ifx-res-tech">${is4K ? '2160p' : '1080p'} • ${codec} • ${hdr} • ${bitrate} Mbps</div>
            <div class="ifx-res-note">${result.note}</div>
        `;

        el.appendChild(info);
        el.classList.add('ifx-v3-ready');
    }

    // Наблюдатель за появлением новых элементов
    var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(m) {
            m.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) {
                    if (node.classList.contains('torrent-item')) processItem(node);
                    node.querySelectorAll('.torrent-item').forEach(processItem);
                }
            });
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    document.querySelectorAll('.torrent-item').forEach(processItem);
})();
