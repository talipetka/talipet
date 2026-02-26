(function () {
    // 1. СТИЛИ ИНТЕРФЕЙСА (Точная копия стилей Prisma)
    var style = document.createElement('style');
    style.id = 'lampa-prisma-styles';
    style.textContent = `
        .prisma-box {
            margin: 10px 12px 12px 12px !important;
            padding: 12px 15px !important;
            border-radius: 4px !important;
            background: rgba(255, 255, 255, 0.03) !important;
            border-left: 4px solid #555;
            position: relative;
            overflow: hidden;
        }
        .prisma-box::after {
            content: "";
            position: absolute;
            top: 0; right: 0; bottom: 0; left: 0;
            background: linear-gradient(90deg, rgba(255,255,255,0.05) 0%, transparent 100%);
            pointer-events: none;
        }
        .prisma-status-text { 
            font-weight: bold; 
            font-size: 1.1em !important; 
            margin-bottom: 4px; 
            display: block;
        }
        .prisma-stats-line { 
            font-size: 0.9em !important; 
            color: rgba(255,255,255,0.7); 
            margin-bottom: 6px;
        }
        .prisma-warning-text { 
            font-size: 0.85em !important; 
            line-height: 1.3;
        }

        /* Цветовые схемы Prisma */
        .p-ideal { border-left-color: #2ecc71 !important; }
        .p-ideal .prisma-status-text { color: #2ecc71 !important; }
        
        .p-good { border-left-color: #3498db !important; }
        .p-good .prisma-status-text { color: #3498db !important; }
        .p-good .prisma-warning-text { color: #3498db; }

        .p-warn { border-left-color: #f1c40f !important; background: rgba(241, 196, 15, 0.05) !important; }
        .p-warn .prisma-status-text { color: #f1c40f !important; }
        .p-warn .prisma-warning-text { color: #f1c40f !important; }

        .p-bad { border-left-color: #e74c3c !important; background: rgba(231, 76, 60, 0.05) !important; }
        .p-bad .prisma-status-text { color: #e74c3c !important; }
        .p-bad .prisma-warning-text { color: #e74c3c !important; }
    `;
    document.head.appendChild(style);

    // 2. ФУНКЦИЯ АНАЛИЗА (Логика Prisma.ws)
    function getPrismaVerdict(data) {
        let res = { status: "Рекомендуется", type: "good", note: "Битрейт в норме" };
        let warns = [];

        // Проверка на TS (Камера)
        if (data.title.match(/ TS |TELESYNC| CAM /i)) {
            return { 
                status: "Не рекомендуется - низкое качество", 
                type: "bad", 
                note: "TS - запись с кинотеатра, может быть реклама и шумы" 
            };
        }

        // Определение эталона битрейта
        let idealMin = 7; // Дефолт для 1080p AVC
        if (data.is4K) {
            idealMin = data.isHDR ? 25 : 20;
        } else {
            idealMin = data.isHEVC ? 4 : 7;
        }

        // Сравнение битрейта
        if (data.bitrate >= idealMin) {
            res.status = "Идеально";
            res.type = "ideal";
            res.note = "Параметры соответствуют высшему качеству";
        } else if (data.bitrate < (idealMin * 0.75)) {
            res.status = "Низкий битрейт";
            res.type = "warn";
            res.note = `Низкий битрейт: Идеально ${idealMin}-${idealMin + 10}+ Mbps • Текущий ${data.bitrate} Mbps`;
        }

        // Специальные статусы для большого кол-ва сидов
        if (data.seeds > 500 && res.type !== "warn") {
            res.status = `Отличная раздача (${data.seeds})`;
        }

        // Проверка доступности (Сиды/Личи)
        if (data.seeds < 15) warns.push("Мало раздающих");
        if (data.leechs > data.seeds && data.seeds < 50) {
            warns.push("На данной раздаче качающих больше чем раздающих - может быть медленная загрузка");
        }

        if (warns.length > 0) res.note = warns.join(' • ');

        return res;
    }

    // 3. ОБРАБОТКА ЭЛЕМЕНТОВ
    function processTorrent(el) {
        if (el.classList.contains('prisma-processed')) return;

        const getVal = (sel) => el.querySelector(sel)?.textContent || '';
        
        const title = getVal('.torrent-item__title').toUpperCase();
        const seeds = parseInt(getVal('.torrent-item__seeds').replace(/[^\d]/g, '')) || 0;
        const leechs = parseInt(getVal('.torrent-item__leechs').replace(/[^\d]/g, '')) || 0;
        const bitrate = parseFloat(getVal('.torrent-item__bitrate').replace(/[^\d.]/g, '')) || 0;

        const data = {
            title: title,
            seeds: seeds,
            leechs: leechs,
            bitrate: bitrate,
            is4K: title.includes('2160') || title.includes('4K'),
            isHEVC: title.includes('HEVC') || title.includes('X265') || title.includes('H.265'),
            isHDR: title.match(/HDR|DV|DOLBY VISION|HDR10/i)
        };

        const verdict = getPrismaVerdict(data);

        // Удаление старых блоков если есть
        el.querySelectorAll('.prisma-box').forEach(b => b.remove());

        // Создание карточки
        const card = document.createElement('div');
        card.className = `prisma-box p-${verdict.type}`;
        
        const techLine = [
            data.is4K ? '2160p' : '1080p',
            data.isHEVC ? 'HEVC' : 'AVC',
            data.isHDR ? 'HDR/DV' : 'SDR',
            bitrate + ' Mbps',
            'WEB-DL'
        ].join(' • ');

        card.innerHTML = `
            <span class="prisma-status-text">${verdict.status}</span>
            <div class="prisma-stats-line">${techLine}</div>
            <div class="prisma-warning-text">${verdict.note}</div>
        `;

        el.appendChild(card);
        el.classList.add('prisma-processed');
    }

    // 4. СЛЕЖЕНИЕ ЗА ДОМ
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
