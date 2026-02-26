(function () {
    const style = document.createElement('style');
    style.textContent = `
        .expert-box {
            margin: 10px 12px !important;
            padding: 12px !important;
            border-radius: 8px !important;
            background: rgba(20, 20, 20, 0.9) !important;
            border: 1px solid rgba(255,255,255,0.1);
            border-left: 6px solid #444;
        }
        .expert-header { display: flex; justify-content: space-between; font-weight: bold; font-size: 14px !important; margin-bottom: 4px; }
        .expert-meta { font-size: 12px !important; opacity: 0.8; color: #aaa; margin-bottom: 6px; }
        .expert-verdict { font-size: 12px !important; line-height: 1.4; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.1); }

        /* Статусы на основе твоих данных */
        .ex-top   { border-left-color: #00d2ff !important; } .ex-top .expert-header { color: #00d2ff !important; }
        .ex-ideal { border-left-color: #2ecc71 !important; } .ex-ideal .expert-header { color: #2ecc71 !important; }
        .ex-warn  { border-left-color: #f1c40f !important; } .ex-warn .expert-header { color: #f1c40f !important; }
        .ex-bad   { border-left-color: #e74c3c !important; } .ex-bad .expert-header { color: #e74c3c !important; }
    `;
    document.head.appendChild(style);

    function getExpertOpinion(d) {
        let res = { title: "Нормальный WEB-DL", note: "Параметры в норме", type: "good" };
        let alerts = [];

        // 1. Проверка сидов
        if (d.s >= 200) { res.title = "Отличная раздача"; res.type = "ideal"; }
        if (d.s < 20) { alerts.push("Мало сидов — будет качаться медленно"); res.type = "warn"; }
        if (d.l > d.s) alerts.push("Личей больше чем сидов (низкая скорость)");

        // 2. Битрейт и HDR
        if (d.is4K) {
            if (d.b >= 25) { 
                res.title = "Лучшее качество (HDR/DV)"; 
                res.type = "top"; 
                alerts.push("Высокий битрейт (" + d.b + " Мбит/с) — детализация супер");
            } else if (d.b < 16) {
                res.type = "warn";
                alerts.push("Битрейт средний для 4K, качество не эталонное");
            }
        }

        // 3. Кодеки и репутация
        if (d.title.includes('REMUX')) { res.title = "Эталон (Blu-ray Remux)"; res.type = "top"; }
        if (d.title.includes('HEVC')) alerts.push("Современный кодек HEVC");

        res.note = alerts.length ? alerts.join(' • ') : "Стандартное качество, быстрый старт";
        return res;
    }

    function render(el) {
        if (el.classList.contains('ex-ready')) return;

        const rawS = el.querySelector('.torrent-item__seeds')?.textContent || '0';
        const rawL = el.querySelector('.torrent-item__leechs')?.textContent || '0';
        const rawB = el.querySelector('.torrent-item__bitrate')?.textContent || '0';
        const title = el.querySelector('.torrent-item__title')?.textContent.toUpperCase() || '';

        const d = {
            s: parseInt(rawS.replace(/[^\d]/g, '')),
            l: parseInt(rawL.replace(/[^\d]/g, '')),
            b: parseFloat(rawB.replace(/[^\d.]/g, '')),
            is4K: title.includes('2160') || title.includes('4K'),
            title: title
        };

        const opinion = getExpertOpinion(d);
        
        el.querySelectorAll('.expert-box').forEach(b => b.remove());
        const box = document.createElement('div');
        box.className = `expert-box ex-${opinion.type}`;
        box.innerHTML = `
            <div class="expert-header">
                <span>${opinion.title}</span>
                <span>${d.s} сидов</span>
            </div>
            <div class="expert-meta">
                ${d.is4K ? '4K (2160p)' : '1080p'} • ${d.b} Мбит/с • WEB-DL
            </div>
            <div class="expert-verdict">${opinion.note}</div>
        `;
        el.appendChild(box);
        el.classList.add('ex-ready');
    }

    const obs = new MutationObserver(m => m.forEach(r => r.addedNodes.forEach(n => {
        if (n.nodeType === 1) {
            if (n.classList.contains('torrent-item')) render(n);
            n.querySelectorAll('.torrent-item').forEach(render);
        }
    })));
    obs.observe(document.body, { childList: true, subtree: true });
})();
