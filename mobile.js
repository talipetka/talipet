(function () {
    var style = document.createElement('style');
    style.id = 'ifx-smart-torrents';
    style.textContent = `
        .ifx-res-block {
            margin: 8px 12px 12px 12px !important;
            padding: 10px 15px !important;
            border-radius: 6px !important;
            background: rgba(0,0,0,0.4) !important;
            border-left: 5px solid #555;
        }
        .ifx-res-title { font-weight: bold; font-size: 15px !important; margin-bottom: 3px; }
        .ifx-res-tech { opacity: 0.8; font-size: 12px !important; color: #fff; }
        .ifx-res-note { margin-top: 5px; font-size: 12px !important; line-height: 1.4; }

        /* Статусы качества */
        .ifx-status-ideal { border-left-color: #2ecc71 !important; background: rgba(46, 204, 113, 0.1) !important; }
        .ifx-status-ideal .ifx-res-title { color: #2ecc71 !important; }

        .ifx-status-good { border-left-color: #3498db !important; background: rgba(52, 152, 219, 0.1) !important; }
        .ifx-status-good .ifx-res-title { color: #3498db !important; }

        .ifx-status-warn { border-left-color: #f1c40f !important; background: rgba(241, 196, 15, 0.08) !important; }
        .ifx-status-warn .ifx-res-title { color: #f1c40f !important; }

        .ifx-status-bad { border-left-color: #e74c3c !important; background: rgba(231, 76, 60, 0.08) !important; }
        .ifx-status-bad .ifx-res-title { color: #e74c3c !important; }
    `;
    document.head.appendChild(style);

    function processItem(el) {
        if (el.classList.contains('ifx-v4-ready')) return;

        // --- ТОЧНЫЙ ПАРСИНГ ДАННЫХ ---
        const getVal = (selector) => el.querySelector(selector)?.textContent || '';
        
        // Извлекаем цифры, игнорируя текст (Раздают, Мбит/с и т.д.)
        const seeds = parseInt(getVal('.torrent-item__seeds').replace(/[^\d]/g, '')) || 0;
        const leechs = parseInt(getVal('.torrent-item__leechs').replace(/[^\d]/g, '')) || 0;
        const bitrate = parseFloat(getVal('.torrent-item__bitrate').replace(/[^\d.]/g, '')) || 0;
        const title = getVal('.torrent-item__title').toUpperCase();

        // Определение тех-характеристик
        const is4K = title.includes('2160') || title.includes('4K');
        const isTS = title.includes(' TS ') || title.includes('TELESYNC');
        const codec = title.includes('HEVC') || title.includes('X265') || title.includes('H.265') ? 'HEVC' : 'AVC';
        const hdr = title.match(/HDR|DV|DOLBY VISION/i) ? 'HDR/DV' : 'SDR';

        // --- ЛОГИКА ОЦЕНКИ ---
        let rating = { label: "Хорошая раздача", note: "Параметры в норме.", type: "good" };

        if (isTS) {
            rating = { label: "Не рекомендуется - низкое качество", note: "TS - запись с кинотеатра, может быть реклама и шумы.", type: "bad" };
        } else if (is4K) {
            if (bitrate >= 25) rating = { label: "Идеально", note: "Отличный битрейт для 4K. Рекомендуется для больших экранов.", type: "ideal" };
            else if (bitrate >= 15) rating = { label: "Рекомендуется", note: "Средний битрейт для 4K. Хорошее качество изображения.", type: "good" };
            else rating = { label: "Низкий битрейт", note: "Низкий битрейт: Идеально 25-35+ Mbps • Текущий " + bitrate + " Mbps", type: "warn" };
        } else {
            // Для 1080p
            if (bitrate >= 8) rating = { label: "Отличная раздача", note: "Битрейт в норме для Full HD.", type: "ideal" };
            else rating = { label: "Среднее качество", note: "Подходит для небольших экранов или мобильных устройств.", type: "good" };
        }

        // Предупреждение о скорости загрузки
        if (leechs > seeds && seeds < 20) {
            rating.note = "На данной раздаче качающих больше чем раздающих - может быть медленная загрузка.";
            if (rating.type === "ideal") rating.type = "good"; // Снижаем приоритет из-за скорости
        }

        // --- ВИЗУАЛИЗАЦИЯ ---
        el.querySelectorAll('.ifx-res-block').forEach(b => b.remove());
        
        const infoBlock = document.createElement('div');
        infoBlock.className = `ifx-res-block ifx-status-${rating.type}`;
        infoBlock.innerHTML = `
            <div class="ifx-res-title">${rating.label} (${seeds})</div>
            <div class="ifx-res-tech">${is4K ? '2160p' : '1080p'} • ${codec} • ${hdr} • ${bitrate} Mbps • WEB-DL</div>
            <div class="ifx-res-note">${rating.note}</div>
        `;

        el.appendChild(infoBlock);
        el.classList.add('ifx-v4-ready');
    }

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((m) => {
            m.addedNodes.forEach((node) => {
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
