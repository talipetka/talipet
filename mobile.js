(function () {
    var style = document.createElement('style');
    style.id = 'lampa-prisma-expert';
    style.textContent = `
        .prisma-box {
            margin: 10px 12px 12px 12px !important;
            padding: 12px 15px !important;
            border-radius: 4px !important;
            background: rgba(255, 255, 255, 0.03) !important;
            border-left: 5px solid #555;
            position: relative;
        }
        .prisma-status-text { font-weight: bold; font-size: 1.1em !important; margin-bottom: 4px; display: block; }
        .prisma-stats-line { font-size: 0.9em !important; color: rgba(255,255,255,0.7); margin-bottom: 6px; }
        .prisma-warning-text { font-size: 0.85em !important; line-height: 1.3; font-weight: 500; }

        .p-ideal { border-left-color: #2ecc71 !important; } .p-ideal .prisma-status-text { color: #2ecc71 !important; }
        .p-good  { border-left-color: #3498db !important; } .p-good .prisma-status-text { color: #3498db !important; }
        .p-warn  { border-left-color: #f1c40f !important; background: rgba(241, 196, 15, 0.05) !important; } .p-warn .prisma-status-text { color: #f1c40f !important; }
        .p-bad   { border-left-color: #e74c3c !important; background: rgba(231, 76, 60, 0.05) !important; } .p-bad .prisma-status-text { color: #e74c3c !important; }
    `;
    document.head.appendChild(style);

    function getPrismaVerdict(data) {
        // 1. ПЕРВИЧНЫЕ ДАННЫЕ
        let isTopTech = data.is4K && data.bitrate >= 25 && data.isHDR; // Технический идеал
        let isHealthyNetwork = data.seeds >= 50 && data.seeds > data.leechs; // Хорошая сеть
        let isStruggling = data.leechs > data.seeds; // Перегрузка (качают больше чем раздают)
        let isCritical = data.seeds < 10; // Почти мертвая раздача

        let res = { status: "Рекомендуется", type: "good", note: "Параметры в норме" };
        let warns = [];

        // 2. ЛОГИКА ОЦЕНКИ (УЧИТЫВАЕМ ВСЁ)

        // Проверка на TS (всегда плохо)
        if (data.title.match(/ TS |TELESYNC| CAM /i)) {
            return { status: "Не рекомендуется", type: "bad", note: "TS — низкое качество видео и звука" };
        }

        // КРИТИЧЕСКАЯ ОШИБКА: Мало сидов
        if (isCritical) {
            res.status = "Низкая доступность";
            res.type = "bad";
            warns.push(`Критически мало раздающих (${data.seeds}). Скачивание может не завершиться.`);
        } 
        // ИДЕАЛЬНО: Только если и ТЕХНИКА и СЕТЬ в порядке
        else if (isTopTech && isHealthyNetwork) {
            res.status = "Идеально";
            res.type = "ideal";
            res.note = "Высокий битрейт и отличная скорость раздачи";
        }
        // ТЕХНИЧЕСКИЙ ТОП, НО СЕТЬ ТОРМОЗИТ
        else if (isTopTech && isStruggling) {
            res.status = "Высокое качество (Медленно)";
            res.type = "warn";
            warns.push(`Картинка топ, но личей (${data.leechs}) больше чем сидов (${data.seeds}). Скорость будет низкой.`);
        }
        // ХОРОШИЙ СЕРЕДНЯК
        else if (data.bitrate >= 14 || (data.isHEVC && data.bitrate >= 4)) {
            res.status = isStruggling ? "Рекомендуется (Очередь)" : "Рекомендуется";
            res.type = isStruggling ? "warn" : "good";
            if (isStruggling) warns.push("Возможна медленная загрузка из-за малого кол-ва сидов");
        }
        // НИЗКИЙ БИТРЕЙТ
        else {
            res.status = "Низкий битрейт";
            res.type = "warn";
            warns.push(`Битрейт ниже нормы для данного формата (${data.bitrate} Mbps)`);
        }

        // Дополнительный статус для гигантских раздач с кучей сидов
        if (data.seeds > 1000 && res.type === "good") {
            res.status = `Отличная раздача (${data.seeds})`;
            res.type = "ideal";
        }

        if (warns.length > 0) res.note = warns.join(' • ');
        return res;
    }

    function processTorrent(el) {
        if (el.classList.contains('prisma-v2-ready')) return;

        const getVal = (sel) => el.querySelector(sel)?.textContent || '';
        const title = getVal('.torrent-item__title').toUpperCase();
        
        // Очистка данных от текста
        const seeds = parseInt(getVal('.torrent-item__seeds').replace(/[^\d]/g, '')) || 0;
        const leechs = parseInt(getVal('.torrent-item__leechs').replace(/[^\d]/g, '')) || 0;
        const bitrate = parseFloat(getVal('.torrent-item__bitrate').replace(/[^\d.]/g, '')) || 0;

        const data = {
            title: title, seeds: seeds, leechs: leechs, bitrate: bitrate,
            is4K: title.includes('2160') || title.includes('4K'),
            isHEVC: title.includes('HEVC') || title.includes('X265'),
            isHDR: title.match(/HDR|DV|DOLBY VISION|HDR10/i)
        };

        const verdict = getPrismaVerdict(data);

        el.querySelectorAll('.prisma-box').forEach(b => b.remove());
        const card = document.createElement('div');
        card.className = `prisma-box p-${verdict.type}`;
        
        const techLine = `${data.is4K ? '2160p' : '1080p'} • ${data.isHEVC ? 'HEVC' : 'AVC'} • ${data.isHDR ? 'HDR/DV' : 'SDR'} • ${bitrate} Mbps`;

        card.innerHTML = `
            <span class="prisma-status-text">${verdict.status}</span>
            <div class="prisma-stats-line">${techLine} • WEB-DL</div>
            <div class="prisma-warning-text">${verdict.note}</div>
        `;

        el.appendChild(card);
        el.classList.add('prisma-v2-ready');
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
