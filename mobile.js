(function () {
    const oldStyle = document.getElementById('lampa-prisma-v14');
    if (oldStyle) oldStyle.remove();

    var style = document.createElement('style');
    style.id = 'lampa-prisma-v14';
    style.textContent = `
        .prisma-box {
            margin: 10px 12px 12px 12px !important;
            padding: 12px 15px !important;
            border-radius: 4px !important;
            background: rgba(255, 255, 255, 0.03) !important;
            border-left: 5px solid #555;
        }
        .prisma-status-text { font-weight: bold; font-size: 1.1em !important; margin-bottom: 4px; display: block; }
        .prisma-stats-line { font-size: 0.9em !important; color: rgba(255,255,255,0.7); margin-bottom: 6px; }
        .prisma-warning-text { font-size: 0.85em !important; line-height: 1.3; font-weight: 500; }

        .p-ideal { border-left-color: #2ecc71 !important; } .p-ideal .prisma-status-text { color: #2ecc71 !important; }
        .p-good  { border-left-color: #27ae60 !important; } .p-good .prisma-status-text { color: #27ae60 !important; }
        .p-warn  { border-left-color: #f1c40f !important; background: rgba(241, 196, 15, 0.1) !important; } .p-warn .prisma-status-text { color: #f1c40f !important; }
        .p-bad   { border-left-color: #e74c3c !important; background: rgba(231, 76, 60, 0.1) !important; } .p-bad .prisma-status-text { color: #e74c3c !important; }
    `;
    document.head.appendChild(style);

    // Минимальное соотношение сидов к личам для "зелёной зоны"
    // Например, 0.5 = на каждого лича должно быть хотя бы 0.5 сида (т.е. сидов >= личей * 0.5)
    const MIN_SEED_RATIO = 0.5;

    function getNetworkStatus(s, l) {
        if (s === 0 && l === 0) return null; // нет данных, не блокируем
        if (s < 5) return { status: "Раздача мертва", type: "bad", note: "Почти нет раздающих" };

        const ratio = l === 0 ? Infinity : s / l;

        if (ratio < MIN_SEED_RATIO) {
            // Сильный дефицит: личей в 2+ раза больше сидов
            return {
                status: "Дефицит сидов",
                type: "bad",
                note: `Критическая нагрузка: ${l} качают, раздают ${s}. Скорость будет низкой.`
            };
        }

        if (l >= s) {
            // Личей больше или столько же — предупреждение, но не блок
            return {
                status: "Сеть загружена",
                type: "warn",
                note: `${l} качают, раздают ${s}. Скорость может быть нестабильной.`
            };
        }

        return null; // сеть здорова
    }

    function getPrismaVerdict(d) {
        const idealB = d.is4K ? (d.isHDR ? 25 : 20) : (d.isHEVC ? 4 : 7);

        // ЭТАП 1: Треш-источник
        if (d.title.match(/ TS |TELESYNC| CAM /i)) {
            return { status: "Не рекомендуется", type: "bad", note: "TS/CAM — качество из кинозала" };
        }

        // ЭТАП 2: Проверка сети — ВСЕГДА ПЕРВАЯ, блокирует зелёную зону
        const netStatus = getNetworkStatus(d.s, d.l);
        if (netStatus) return netStatus;

        // ЭТАП 3: Оценка качества (только если сеть здорова)
        if (d.b >= idealB && d.is4K && d.isHDR) {
            return { status: "Идеально", type: "ideal", note: "Высокий битрейт и профицит сидов" };
        }

        if (d.b >= (idealB * 0.7)) {
            return { status: "Рекомендуется", type: "good", note: "Хорошее качество и свободные сиды" };
        }

        return { status: "Низкий битрейт", type: "warn", note: `Битрейт ${d.b} Mbps ниже нормы (${idealB})` };
    }

    function processTorrent(el) {
        el.querySelectorAll('.prisma-box').forEach(b => b.remove());

        const getVal = (sel) => el.querySelector(sel)?.textContent || '0';
        const title = getVal('.torrent-item__title').toUpperCase();

        const seeds  = parseInt(getVal('.torrent-item__seeds').replace(/\D/g, ''))   || 0;
        const leechs = parseInt(getVal('.torrent-item__leechs').replace(/\D/g, ''))  || 0;
        const bitrate = parseFloat(getVal('.torrent-item__bitrate').replace(/[^\d.]/g, '')) || 0;

        const data = {
            title: title, s: seeds, l: leechs, b: bitrate,
            is4K:  title.includes('2160') || title.includes('4K'),
            isHEVC: title.includes('HEVC') || title.includes('X265'),
            isHDR:  title.match(/HDR|DV|DOLBY VISION|HDR10/i)
        };

        const v = getPrismaVerdict(data);

        // Отладочная строка (убери, если не нужна)
        const debugLine = `<div style="font-size:0.75em;opacity:0.4;margin-top:4px;">seeds:${seeds} leechs:${leechs} ratio:${leechs ? (seeds/leechs).toFixed(2) : '∞'}</div>`;

        const card = document.createElement('div');
        card.className = `prisma-box p-${v.type}`;
        card.innerHTML = `
            <span class="prisma-status-text">${v.status}</span>
            <div class="prisma-stats-line">${data.is4K ? '2160p' : '1080p'} • ${bitrate} Mbps • WEB-DL</div>
            <div class="prisma-warning-text">${v.note}</div>
            ${debugLine}
        `;

        el.appendChild(card);
    }

    const observer = new MutationObserver(mutations => {
        mutations.forEach(m => m.addedNodes.forEach(node => {
            if (node.nodeType === 1) {
                if (node.classList.contains('torrent-item')) processTorrent(node);
                node.querySelectorAll('.torrent-item').forEach(processTorrent);
            }
        }));
    });

    observer.observe(document.body, { childList: true, subtree: true });
    document.querySelectorAll('.torrent-item').forEach(processTorrent);
})();
