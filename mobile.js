(function () {
    // 1. Стили интерфейса
    var style = document.createElement('style');
    style.id = 'ifx-expert-torrents';
    style.textContent = `
        .ifx-res-block {
            margin: 10px 15px !important;
            padding: 12px 18px !important;
            border-radius: 8px !important;
            background: rgba(15, 15, 15, 0.85) !important;
            border: 1px solid rgba(255,255,255,0.1);
            border-left: 6px solid #555;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5);
        }
        .ifx-res-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
        .ifx-res-title { font-weight: bold; font-size: 16px !important; text-transform: uppercase; letter-spacing: 0.5px; }
        .ifx-res-tech { opacity: 0.9; font-size: 13px !important; color: #ccc; margin-bottom: 6px; }
        .ifx-res-note { font-size: 12px !important; line-height: 1.4; padding-top: 4px; border-top: 1px solid rgba(255,255,255,0.05); }
        .ifx-badge { padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; margin-left: 5px; text-transform: uppercase; }

        /* Статусы */
        .ifx-status-top   { border-left-color: #00ff88 !important; } .ifx-status-top .ifx-res-title { color: #00ff88 !important; }
        .ifx-status-ideal { border-left-color: #2ecc71 !important; } .ifx-status-ideal .ifx-res-title { color: #2ecc71 !important; }
        .ifx-status-good  { border-left-color: #3498db !important; } .ifx-status-good .ifx-res-title { color: #3498db !important; }
        .ifx-status-warn  { border-left-color: #f1c40f !important; } .ifx-status-warn .ifx-res-title { color: #f1c40f !important; }
        .ifx-status-bad   { border-left-color: #e74c3c !important; } .ifx-status-bad .ifx-res-title { color: #e74c3c !important; }
    `;
    document.head.appendChild(style);

    function analyzeTorrent(data) {
        let score = 0;
        let verdict = { title: "Среднее качество", note: "", type: "good" };
        let checks = [];

        // 1. Анализ СИДОВ
        if (data.seeds >= 1000) { verdict.title = "ТОП-РЕЛmapping"; score += 3; verdict.type = "top"; }
        else if (data.seeds >= 200) { verdict.title = "Отличная раздача"; score += 2; verdict.type = "ideal"; }
        else if (data.seeds >= 50) { verdict.title = "Стабильная раздача"; score += 1; verdict.type = "good"; }
        else if (data.seeds < 5) { verdict.title = "Рискованная раздача"; verdict.type = "bad"; checks.push("Критически мало сидов"); }

        // 2. Анализ БИТРЕЙТА и РАЗМЕРА
        const is4K = data.title.includes('2160') || data.title.includes('4K');
        const isRemux = data.title.includes('REMUX');
        const isHEVC = data.title.includes('HEVC') || data.title.includes('X265');

        if (isRemux) {
            verdict.title = "ЭТАЛОН КАЧЕСТВА (REMUX)";
            verdict.type = "top";
            if (data.bitrate < 40) checks.push("Странно низкий битрейт для Remux");
        } else if (is4K) {
            if (data.bitrate >= 15) score++; 
            else { verdict.type = "warn"; checks.push("Низкий битрейт для 4K (нужно 15-30+ Мбит/с)"); }
        } else if (data.title.includes('1080')) {
            const minBitrate = isHEVC ? 3 : 6;
            if (data.bitrate < minBitrate) { verdict.type = "warn"; checks.push("Низкий битрейт для 1080p"); }
        }

        // 3. Анализ АУДИО и ГРУПП
        if (data.title.match(/DTS-HD|TRUEHD|DTS/i)) { score++; checks.push("Качественный звук (DTS/TrueHD)"); }
        if (data.title.match(/FraMeSToR|CtrlHD|DON|QxR/i)) { score += 2; checks.push("Проверенная релиз-группа"); }
        
        // 4. Детектор "Мусора"
        if (data.title.includes(' 1 ГБ') && data.title.includes('1080')) { verdict.type = "bad"; checks.push("Подозрительно малый размер для 1080p"); }

        verdict.note = checks.length > 0 ? checks.join(' • ') : "Все параметры соответствуют норме";
        return verdict;
    }

    function processItem(el) {
        if (el.classList.contains('ifx-expert-ready')) return;

        const getVal = (sel) => el.querySelector(sel)?.textContent || '';
        const rawTitle = getVal('.torrent-item__title').toUpperCase();
        const seeds = parseInt(getVal('.torrent-item__seeds').replace(/[^\d]/g, '')) || 0;
        const bitrate = parseFloat(getVal('.torrent-item__bitrate').replace(/[^\d.]/g, '')) || 0;

        const analysis = analyzeTorrent({ title: rawTitle, seeds: seeds, bitrate: bitrate });

        // Технические метки
        const codec = rawTitle.includes('HEVC') || rawTitle.includes('X265') ? 'HEVC' : 'AVC';
        const audio = rawTitle.match(/DTS-HD|TRUEHD|AC3|EAC3|AAC/i)?.[0] || 'AC3';
        const container = rawTitle.includes('MKV') ? 'MKV' : 'MP4';

        el.querySelectorAll('.ifx-res-block').forEach(b => b.remove());

        const block = document.createElement('div');
        block.className = `ifx-res-block ifx-status-${analysis.type}`;
        block.innerHTML = `
            <div class="ifx-res-header">
                <div class="ifx-res-title">${analysis.title}</div>
                <div class="ifx-res-tech" style="margin-bottom:0">${seeds} сидов</div>
            </div>
            <div class="ifx-res-tech">
                ${codec} • ${container} • ${audio} • ${bitrate} Мбит/с
            </div>
            <div class="ifx-res-note">${analysis.note}</div>
        `;

        el.appendChild(block);
        el.classList.add('ifx-expert-ready');
    }

    const observer = new MutationObserver(mutations => {
        mutations.forEach(m => m.addedNodes.forEach(node => {
            if (node.nodeType === 1) {
                if (node.classList.contains('torrent-item')) processItem(node);
                node.querySelectorAll('.torrent-item').forEach(processItem);
            }
        }));
    });

    observer.observe(document.body, { childList: true, subtree: true });
    document.querySelectorAll('.torrent-item').forEach(processItem);
})();
