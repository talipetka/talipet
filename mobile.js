(function () {
    var style = document.createElement('style');
    style.id = 'ifx-pro-torrents';
    style.textContent = `
        .ifx-res-block {
            margin: 5px 10px 10px 10px !important;
            padding: 8px 12px !important;
            border-radius: 4px !important;
            background: rgba(255,255,255,0.03) !important;
            font-size: 13px !important;
            line-height: 1.4 !important;
        }
        .ifx-res-title { font-weight: bold; font-size: 15px !important; margin-bottom: 3px; }
        .ifx-res-tech { opacity: 0.8; font-size: 12px !important; }
        .ifx-res-note { margin-top: 4px; font-size: 12px !important; }

        /* Цветовые схемы для блоков */
        .ifx-res-ideal { background: rgba(46, 204, 113, 0.15) !important; border-left: 4px solid #2ecc71 !important; }
        .ifx-res-ideal .ifx-res-title { color: #2ecc71 !important; }

        .ifx-res-good { background: rgba(52, 152, 219, 0.1) !important; border-left: 4px solid #3498db !important; }
        .ifx-res-good .ifx-res-title { color: #3498db !important; }

        .ifx-res-warn { background: rgba(241, 196, 15, 0.1) !important; border-left: 4px solid #f1c40f !important; }
        .ifx-res-warn .ifx-res-title { color: #f1c40f !important; }
        .ifx-res-warn .ifx-res-note { color: #f1c40f !important; }
    `;
    document.head.appendChild(style);

    function getAnalysis(data) {
        var score = 0;
        var title = "Обычная раздача";
        var note = "Битрейт в норме";
        var type = "good";

        // Анализ битрейта
        if (data.bitrate >= 25) {
            title = "Идеально";
            score += 3;
            type = "ideal";
        } else if (data.bitrate >= 14) {
            title = "Рекомендуется";
            score += 2;
            type = "good";
        } else {
            title = "Низкий битрейт";
            note = "Низкий битрейт: Идеально 25-35+ Mbps • Текущий " + data.bitrate + " Mbps";
            type = "warn";
        }

        // Анализ сидов и личей
        if (data.leechs > data.seeds && data.seeds < 100) {
            note = "На данной раздаче качающих больше чем раздающих - может быть медленная загрузка";
            if (type !== 'warn') type = "warn";
        }

        return { title: title, note: note, type: type };
    }

    function processItem(el) {
        if (el.classList.contains('ifx-analyzed')) return;

        // Собираем данные
        var seeds = parseInt(el.querySelector('.torrent-item__seeds')?.textContent.replace(/\s/g, '')) || 0;
        var leechs = parseInt(el.querySelector('.torrent-item__leechs')?.textContent.replace(/\s/g, '')) || 0;
        var bitrate = parseFloat(el.querySelector('.torrent-item__bitrate')?.textContent) || 0;
        var size = el.querySelector('.torrent-item__size')?.textContent || '';
        
        var titleText = el.querySelector('.torrent-item__title')?.textContent || '';
        var codec = titleText.includes('HEVC') || titleText.includes('x265') ? 'HEVC' : 'AVC';
        var res = titleText.includes('2160') || titleText.includes('4K') ? '2160p' : '1080p';

        var analysis = getAnalysis({ seeds: seeds, leechs: leechs, bitrate: bitrate });

        // Создаем блок как на скриншоте
        var infoBlock = document.createElement('div');
        infoBlock.className = 'ifx-res-block ifx-res-' + analysis.type;
        infoBlock.innerHTML = `
            <div class="ifx-res-title">${analysis.title} (${seeds})</div>
            <div class="ifx-res-tech">${res} • ${codec} • ${bitrate} Mbps • WEB-DL</div>
            <div class="ifx-res-note">${analysis.note}</div>
        `;

        el.appendChild(infoBlock);
        el.classList.add('ifx-analyzed');
    }

    // Наблюдатель
    var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
            m.addedNodes.forEach(function (node) {
                if (node.nodeType === 1) {
                    if (node.classList.contains('torrent-item')) processItem(node);
                    node.querySelectorAll('.torrent-item').forEach(processItem);
                }
            });
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();
