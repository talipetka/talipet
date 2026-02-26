(function () {
    const oldStyle = document.getElementById('lampa-prisma-v15');
    if (oldStyle) oldStyle.remove();

    var style = document.createElement('style');
    style.id = 'lampa-prisma-v15';
    style.textContent = `
        .prisma-box {
            display: flex !important;
            align-items: flex-start !important;
            gap: 10px !important;
            padding: 10px 14px 11px !important;
            position: relative !important;
            overflow: hidden !important;
            border-top: 1px solid rgba(255,255,255,0.05) !important;
            margin: 0 !important;
        }
        .prisma-box::before {
            content: '' !important;
            position: absolute !important;
            left: 0 !important; top: 0 !important; bottom: 0 !important;
            width: 3px !important;
        }
        .prisma-box::after {
            content: '' !important;
            position: absolute !important;
            inset: 0 !important;
            pointer-events: none !important;
            opacity: 0.07 !important;
        }
        .prisma-icon {
            font-size: 1.2em !important;
            line-height: 1 !important;
            flex-shrink: 0 !important;
            margin-top: 2px !important;
            width: 18px !important;
            text-align: center !important;
        }
        .prisma-content { flex: 1 !important; min-width: 0 !important; }
        .prisma-status {
            font-size: 0.82em !important;
            font-weight: 700 !important;
            letter-spacing: 0.02em !important;
            line-height: 1 !important;
            margin-bottom: 3px !important;
            display: block !important;
        }
        .prisma-params {
            font-size: 0.72em !important;
            color: rgba(255,255,255,0.38) !important;
            margin-bottom: 4px !important;
            display: block !important;
        }
        .prisma-note {
            font-size: 0.76em !important;
            line-height: 1.4 !important;
            font-weight: 500 !important;
            display: block !important;
        }
        .prisma-ratio {
            flex-shrink: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 4px 8px !important;
            border-radius: 6px !important;
            background: rgba(255,255,255,0.05) !important;
            font-size: 0.68em !important;
            text-align: center !important;
            min-width: 42px !important;
        }
        .prisma-ratio-val { font-weight: 700 !important; font-size: 1.2em !important; line-height: 1 !important; display: block !important; }
        .prisma-ratio-lbl { color: rgba(255,255,255,0.3) !important; margin-top: 1px !important; display: block !important; }

        /* Цветовые темы */
        .p-ideal::before { background: #2ecc71 !important; }
        .p-ideal::after  { background: radial-gradient(ellipse at left, #2ecc71, transparent) !important; }
        .p-ideal .prisma-status { color: #2ecc71 !important; }
        .p-ideal .prisma-note   { color: rgba(46,204,113,0.75) !important; }
        .p-ideal .prisma-ratio  { color: rgba(255,255,255,0.6) !important; }

        .p-good::before { background: #27ae60 !important; }
        .p-good::after  { background: radial-gradient(ellipse at left, #27ae60, transparent) !important; }
        .p-good .prisma-status { color: #27ae60 !important; }
        .p-good .prisma-note   { color: rgba(39,174,96,0.75) !important; }
        .p-good .prisma-ratio  { color: rgba(255,255,255,0.6) !important; }

        .p-warn::before { background: #f1c40f !important; }
        .p-warn::after  { background: radial-gradient(ellipse at left, #f1c40f, transparent) !important; }
        .p-warn .prisma-status { color: #f1c40f !important; }
        .p-warn .prisma-note   { color: rgba(241,196,15,0.75) !important; }
        .p-warn .prisma-ratio  { color: #f1c40f !important; }

        .p-bad::before { background: #e74c3c !important; }
        .p-bad::after  { background: radial-gradient(ellipse at left, #e74c3c, transparent) !important; }
        .p-bad .prisma-status { color: #e74c3c !important; }
        .p-bad .prisma-note   { color: rgba(231,76,60,0.75) !important; }
        .p-bad .prisma-ratio  { color: #e74c3c !important; }
    `;
    document.head.appendChild(style);

    const MIN_SEED_RATIO = 0.5;

    // ─── Парсинг числа рядом с меткой в тексте ───
    function parseByLabel(text, ...labels) {
        for (const label of labels) {
            const m = text.match(new RegExp(label + '[:\\s]+([\\d]+)', 'i'));
            if (m) return parseInt(m[1]);
        }
        return 0;
    }

    // ─── Иконка по типу ───
    function getIcon(type) {
        return { ideal: '✦', good: '◎', warn: '⚠', bad: '✕' }[type] || '?';
    }

    // ─── Формат разрешения ───
    function getRes(is4K, title) {
        if (is4K) return '2160p';
        if (title.includes('720')) return '720p';
        if (title.includes('480')) return '480p';
        return '1080p';
    }

    // ─── Кодек ───
    function getCodec(title) {
        if (title.includes('HEVC') || title.includes('X265')) return 'HEVC';
        if (title.includes('AV1')) return 'AV1';
        if (title.includes('H.264') || title.includes('X264') || title.includes('AVC')) return 'H.264';
        return 'AVC';
    }

    // ─── Тип источника ───
    function getSource(title) {
        if (title.includes('WEBDLRIP') || title.includes('WEB-DLRIP')) return 'WEB-DLRip';
        if (title.includes('WEBRIP') || title.includes('WEB-RIP')) return 'WEBRip';
        if (title.match(/BDRIP|BLURAY|BLU-RAY/i)) return 'BDRip';
        return 'WEB-DL';
    }

    // ─── Сетевая проверка ───
    function getNetworkStatus(s, l) {
        if (s === 0 && l === 0) return null;
        if (s < 5) return { status: 'Раздача мертва', type: 'bad', note: 'Почти нет раздающих — загрузка будет крайне медленной' };

        const ratio = l === 0 ? Infinity : s / l;
        if (ratio < MIN_SEED_RATIO) {
            return {
                status: 'Дефицит сидов', type: 'bad',
                note: `Критическая нагрузка: ${l} качают, раздают ${s}. Скорость будет низкой`
            };
        }
        if (l >= s) {
            return {
                status: 'Сеть загружена', type: 'warn',
                note: `${l} качают, раздают ${s} — скорость может быть нестабильной`
            };
        }
        return null;
    }

    // ─── Итоговый вердикт ───
    function getPrismaVerdict(d) {
        const idealB = d.is4K ? (d.isHDR ? 25 : 20) : (d.isHEVC ? 4 : 7);

        if (d.title.match(/ TS |TELESYNC| CAM |TELECINE/i)) {
            return { status: 'Не рекомендуется', type: 'bad', note: 'TS/CAM — запись с экрана кинотеатра, возможны шумы и реклама' };
        }

        const netStatus = getNetworkStatus(d.s, d.l);
        if (netStatus) return netStatus;

        if (d.b >= idealB && d.is4K && d.isHDR) {
            return { status: 'Идеально', type: 'ideal', note: 'Высокий битрейт, HDR, огромный профицит сидов' };
        }
        if (d.b >= idealB * 0.7) {
            return { status: 'Рекомендуется', type: 'good', note: 'Хорошее качество и стабильная раздача' };
        }
        return { status: 'Низкий битрейт', type: 'warn', note: `Битрейт ${d.b} Mbps ниже нормы (рекомендуется ${idealB}+)` };
    }

    // ─── Рендер карточки ───
    function processTorrent(el) {
        el.querySelectorAll('.prisma-box').forEach(b => b.remove());

        const getVal = (sel) => el.querySelector(sel)?.textContent?.trim() || '';
        const fullText = el.textContent || '';
        const title = getVal('.torrent-item__title').toUpperCase() || fullText.toUpperCase();

        // Парсим сиды/личи: сначала CSS-классы, потом текстовый fallback
        let seeds  = parseInt(getVal('.torrent-item__seeds').replace(/\D/g, ''))  || 0;
        let leechs = parseInt(getVal('.torrent-item__leechs').replace(/\D/g, '')) || 0;
        if (!seeds)  seeds  = parseByLabel(fullText, 'Раздают', 'Сиды', 'Seeds', 'Se');
        if (!leechs) leechs = parseByLabel(fullText, 'Качают', 'Личи', 'Leechs', 'Leechers', 'Le');

        // Битрейт
        let bitrate = parseFloat(getVal('.torrent-item__bitrate').replace(/[^\d.]/g, '')) || 0;
        if (!bitrate) bitrate = parseFloat((fullText.match(/Битрейт[:\s]*([\d.]+)/i) || [])[1]) || 0;

        const is4K  = title.includes('2160') || title.includes('4K');
        const isHDR = !!title.match(/\bHDR\b|DV\b|DOLBY.VISION|HDR10/i);
        const isHEVC = title.includes('HEVC') || title.includes('X265');

        const data = { title, s: seeds, l: leechs, b: bitrate, is4K, isHDR, isHEVC };
        const v = getPrismaVerdict(data);

        // Бейдж соотношения
        let ratioVal, ratioLbl;
        if (title.match(/ TS |TELESYNC| CAM |TELECINE/i)) {
            ratioVal = 'TS'; ratioLbl = 'треш';
        } else if (seeds === 0 && leechs === 0) {
            ratioVal = '—'; ratioLbl = 'нет данных';
        } else {
            const r = leechs === 0 ? '∞' : (seeds / leechs).toFixed(1) + '×';
            ratioVal = r; ratioLbl = 'сид/лич';
        }

        const res    = getRes(is4K, title);
        const codec  = getCodec(title);
        const source = getSource(title);
        const hdrTag = isHDR ? ' • ' + (title.includes('DOLBY') || title.includes('DV') ? 'Dolby Vision' : title.includes('HDR10') ? 'HDR10+' : 'HDR') : '';
        const params = `${res} • ${codec}${hdrTag} • ${bitrate} Mbps • ${source}`;

        const card = document.createElement('div');
        card.className = `prisma-box p-${v.type}`;
        card.innerHTML = `
            <span class="prisma-icon">${getIcon(v.type)}</span>
            <div class="prisma-content">
                <span class="prisma-status">${v.status}</span>
                <span class="prisma-params">${params}</span>
                <span class="prisma-note">${v.note}</span>
            </div>
            <div class="prisma-ratio">
                <span class="prisma-ratio-val">${ratioVal}</span>
                <span class="prisma-ratio-lbl">${ratioLbl}</span>
            </div>
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
