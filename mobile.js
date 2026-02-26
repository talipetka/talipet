(function () {
    const style = document.createElement('style');
    style.textContent = `
        .prisma-card {
            margin: 10px 12px !important;
            padding: 14px !important;
            border-radius: 6px !important;
            background: rgba(10, 10, 10, 0.95) !important;
            border-left: 5px solid #444;
            font-family: 'Roboto', sans-serif;
        }
        .prisma-status { font-weight: bold; font-size: 15px !important; margin-bottom: 4px; display: flex; align-items: center; }
        .prisma-meta { font-size: 13px !important; color: #ccc; opacity: 0.9; margin-bottom: 8px; }
        .prisma-warning { font-size: 12px !important; color: #f1c40f; line-height: 1.4; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.1); }
        
        /* Цвета статусов Prisma */
        .status-ideal { border-left-color: #2ecc71 !important; } .status-ideal .prisma-status { color: #2ecc71 !important; }
        .status-good  { border-left-color: #3498db !important; } .status-good .prisma-status { color: #3498db !important; }
        .status-warn  { border-left-color: #f1c40f !important; } .status-warn .prisma-status { color: #f1c40f !important; }
        .status-bad   { border-left-color: #e74c3c !important; } .status-bad .prisma-status { color: #e74c3c !important; }
    `;
    document.head.appendChild(style);

    function getPrismaVerdict(d) {
        let v = { status: "Рекомендуется", type: "good", note: "Битрейт в норме" };
        let warns = [];

        // 1. ПРОВЕРКА ИСТОЧНИКА (TS/WEB)
        if (d.title.includes(' TS ') || d.title.includes('TELESYNC')) {
            return { status: "Не рекомендуется", type: "bad", note: "TS — запись из кинотеатра, низкое качество звука и видео" };
        }

        // 2. ЭТАЛОНЫ БИТРЕЙТА (Таблица Prisma)
        let minIdeal = 0;
        if (d.is4K) {
            minIdeal = d.isHDR ? 25 : 20; 
        } else {
            minIdeal = d.isHEVC ? 4 : 7;
        }

        // Сравнение битрейта
        if (d.b >= minIdeal) {
            v.status = "Идеально";
            v.type = "ideal";
        } else if (d.b < (minIdeal * 0.7)) {
            v.status = "Низкий битрейт";
            v.type = "warn";
            v.note = `Идеально ${minIdeal}-${minIdeal + 10}+ Mbps • Текущий ${d.b} Mbps`;
        } else {
            v.status = "Рекомендуется";
            v.type = "good";
        }

        // 3. ПРОВЕРКА СИДОВ (Логика Prisma)
        if (d.s > 500) v.status = `Отличная раздача (${d.s})`;
        if (d.s < 20) warns.push("Мало раздающих");
        if (d.l > d.s) warns.push("Качающих больше чем раздающих — может быть медленная загрузка");

        if (warns.length) v.note = warns.join(' • ');
        return v;
    }

    function render(el) {
        if (el.classList.contains('prisma-applied')) return;

        const title = el.querySelector('.torrent-item__title')?.textContent.toUpperCase() || '';
        const rawS = el.querySelector('.torrent-item__seeds')?.textContent || '0';
        const rawL = el.querySelector('.torrent-item__leechs')?.textContent || '0';
        const rawB = el.querySelector('.torrent-item__bitrate')?.textContent || '0';

        const data = {
            title: title,
            s: parseInt(rawS.replace(/[^\d]/g, '')),
            l: parseInt(rawL.replace(/[^\d]/g, '')),
            b: parseFloat(rawB.replace(/[^\d.]/g, '')),
            is4K: title.includes('2160') || title.includes('4K'),
            isHEVC: title.includes('HEVC') || title.includes('X265'),
            isHDR: title.match(/HDR|DV|DOLBY VISION/i)
        };

        const res = getPrismaVerdict(data);
        
        el.querySelectorAll('.prisma-card').forEach(c => c.remove());
        const card = document.createElement('div');
        card.className = `prisma-card status-${res.type}`;
        
        card.innerHTML = `
            <div class="prisma-status">${res.status}</div>
            <div class="prisma-meta">
                ${data.is4K ? '2160p' : '1080p'} • ${data.isHEVC ? 'HEVC' : 'AVC'} • 
                ${data.isHDR ? 'HDR/DV' : 'SDR'} • ${data.b} Mbps • WEB-DL
            </div>
            <div class="prisma-warning">${res.note}</div>
        `;

        el.appendChild(card);
        el.classList.add('prisma-applied');
    }

    const observer = new MutationObserver(m => m.forEach(r => r.addedNodes.forEach(n => {
        if (n.nodeType === 1) {
            if (n.classList.contains('torrent-item')) render(n);
            n.querySelectorAll('.torrent-item').forEach(render);
        }
    })));
    observer.observe(document.body, { childList: true, subtree: true });
    document.querySelectorAll('.torrent-item').forEach(render);
})();
