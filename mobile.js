(function () {
    var style = document.createElement('style');
    style.id = 'lampa-prisma-v11';
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

    function getPrismaVerdict(d) {
        const idealB = d.is4K ? (d.isHDR ? 25 : 20) : (d.isHEVC ? 4 : 7);
        
        // 1. БЛОКИРОВКА ПО КАЧЕСТВУ (TS/CAM)
        if (d.title.match(/ TS |TELESYNC| CAM /i)) {
            return { status: "Не рекомендуется", type: "bad", note: "Низкое качество (экранка)" };
        }

        // 2. БЛОКИРОВКА ПО СЕТИ (ГЛАВНОЕ ПРАВИЛО)
        // Если качающих БОЛЬШЕ чем раздающих — это ВСЕГДА желтый статус
        if (d.l > d.s) {
            return { 
                status: "Дефицит скорости", 
                type: "warn", 
                note: `Качающих (${d.l}) больше чем раздающих (${d.s}). Зеленый статус невозможен.` 
            };
        }

        if (d.s < 5) return { status: "Раздача мертва", type: "bad", note: "Слишком мало сидов" };

        // 3. ТОЛЬКО ЕСЛИ СЕТЬ В ПОРЯДКЕ (Сидов >= Личей), ПРОВЕРЯЕМ КАЧЕСТВО
        if (d.b >= idealB && d.is4K && d.isHDR) {
            return { status: "Идеально", type: "ideal", note: "Лучшее качество и свободная сеть" };
        }

        if (d.b >= (idealB * 0.7)) {
            return { status: "Рекомендуется", type: "good", note: "Хороший битрейт и профицит сидов" };
        }

        return { status: "Низкий битрейт", type: "warn", note: `Битрейт ${d.b} Mbps ниже нормы (${idealB} Mbps)` };
    }

    function processTorrent(el) {
        if (el.classList.contains('prisma-v11-strict')) return;

        const getVal = (sel) => el.querySelector(sel)?.textContent || '';
        const title = getVal('.torrent-item__title').toUpperCase();
        
        const seeds = parseInt(getVal('.torrent-item__seeds').replace(/[^\d]/g, '')) || 0;
        const leechs = parseInt(getVal('.torrent-item__leechs').replace(/[^\d]/g, '')) || 0;
        const bitrate = parseFloat(getVal('.torrent-item__bitrate').replace(/[^\d.]/g, '')) || 0;

        const data = {
            title: title, s: seeds, l: leechs, b: bitrate,
            is4K: title.includes('2160') || title.includes('4K'),
            isHEVC: title.includes('HEVC') || title.includes('X265'),
            isHDR: title.match(/HDR|DV|DOLBY VISION|HDR10/i)
        };

        const v = getPrismaVerdict(data);

        // Полная очистка старых блоков перед вставкой нового
        el.querySelectorAll('.prisma-box').forEach(b => b.remove());
        
        const card = document.createElement('div');
        card.className = `prisma-box p-${v.type}`;
        card.innerHTML = `
            <span class="prisma-status-text">${v.status}</span>
            <div class="prisma-stats-line">${data.is4K?'2160p':'1080p'} • ${bitrate} Mbps • WEB-DL</div>
            <div class="prisma-warning-text">${v.note}</div>
        `;

        el.appendChild(card);
        el.classList.add('prisma-v11-strict');
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
