(function () {
    const oldStyle = document.getElementById('lampa-prisma-v16');
    if (oldStyle) oldStyle.remove();

    var style = document.createElement('style');
    style.id = 'lampa-prisma-v16';
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
            margin-bottom: 5px !important;
        }

        /* Полоска тегов-факторов */
        .prisma-tags {
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 4px !important;
            margin-top: 2px !important;
        }
        .prisma-tag {
            font-size: 0.65em !important;
            font-weight: 600 !important;
            padding: 1px 5px !important;
            border-radius: 3px !important;
            line-height: 1.5 !important;
            opacity: 0.85 !important;
        }
        .tag-plus  { background: rgba(46,204,113,0.15) !important; color: #2ecc71 !important; }
        .tag-minus { background: rgba(231,76,60,0.15)  !important; color: #e74c3c !important; }
        .tag-neutral { background: rgba(255,255,255,0.07) !important; color: rgba(255,255,255,0.5) !important; }

        /* Бейдж со счётом */
        .prisma-score {
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
        .prisma-score-val { font-weight: 700 !important; font-size: 1.3em !important; line-height: 1 !important; display: block !important; }
        .prisma-score-lbl { color: rgba(255,255,255,0.3) !important; margin-top: 1px !important; display: block !important; font-size: 0.9em !important; }

        /* Цветовые темы */
        .p-ideal::before { background: #2ecc71 !important; }
        .p-ideal::after  { background: radial-gradient(ellipse at left, #2ecc71, transparent) !important; }
        .p-ideal .prisma-status { color: #2ecc71 !important; }
        .p-ideal .prisma-note   { color: rgba(46,204,113,0.8) !important; }
        .p-ideal .prisma-score  { color: #2ecc71 !important; }

        .p-good::before { background: #27ae60 !important; }
        .p-good::after  { background: radial-gradient(ellipse at left, #27ae60, transparent) !important; }
        .p-good .prisma-status { color: #27ae60 !important; }
        .p-good .prisma-note   { color: rgba(39,174,96,0.8) !important; }
        .p-good .prisma-score  { color: #27ae60 !important; }

        .p-ok::before { background: #e67e22 !important; }
        .p-ok::after  { background: radial-gradient(ellipse at left, #e67e22, transparent) !important; }
        .p-ok .prisma-status { color: #e67e22 !important; }
        .p-ok .prisma-note   { color: rgba(230,126,34,0.8) !important; }
        .p-ok .prisma-score  { color: #e67e22 !important; }

        .p-warn::before { background: #f1c40f !important; }
        .p-warn::after  { background: radial-gradient(ellipse at left, #f1c40f, transparent) !important; }
        .p-warn .prisma-status { color: #f1c40f !important; }
        .p-warn .prisma-note   { color: rgba(241,196,15,0.8) !important; }
        .p-warn .prisma-score  { color: #f1c40f !important; }

        .p-bad::before { background: #e74c3c !important; }
        .p-bad::after  { background: radial-gradient(ellipse at left, #e74c3c, transparent) !important; }
        .p-bad .prisma-status { color: #e74c3c !important; }
        .p-bad .prisma-note   { color: rgba(231,76,60,0.8) !important; }
        .p-bad .prisma-score  { color: #e74c3c !important; }
    `;
    document.head.appendChild(style);

    // ═══════════════════════════════════════════
    //  ПАРСИНГ
    // ═══════════════════════════════════════════

    function parseByLabel(text, ...labels) {
        for (const label of labels) {
            const m = text.match(new RegExp(label + '[:\\s]+([\\d]+)', 'i'));
            if (m) return parseInt(m[1]);
        }
        return 0;
    }

    function extractData(el) {
        const getVal = (sel) => el.querySelector(sel)?.textContent?.trim() || '';
        const fullText = el.textContent || '';
        const rawTitle = getVal('.torrent-item__title') || '';
        const title = rawTitle.toUpperCase();

        // Сиды / личи
        let seeds  = parseInt(getVal('.torrent-item__seeds').replace(/\D/g, ''))  || 0;
        let leechs = parseInt(getVal('.torrent-item__leechs').replace(/\D/g, '')) || 0;
        if (!seeds)  seeds  = parseByLabel(fullText, 'Раздают', 'Сиды', 'Seeds');
        if (!leechs) leechs = parseByLabel(fullText, 'Качают',  'Личи',  'Leechs', 'Leechers');

        // Битрейт
        let bitrate = parseFloat(getVal('.torrent-item__bitrate').replace(/[^\d.]/g, '')) || 0;
        if (!bitrate) bitrate = parseFloat((fullText.match(/Битрейт[:\s]*([\d.]+)/i) || [])[1]) || 0;

        // Размер файла (ГБ)
        let sizeGb = 0;
        const sizeM = fullText.match(/([\d.]+)\s*ГБ/i) || fullText.match(/([\d.]+)\s*GB/i);
        if (sizeM) sizeGb = parseFloat(sizeM[1]);

        // Дата добавления — ищем дату в тексте карточки
        let daysAgo = 999;
        const dateM = fullText.match(/(\d{1,2})\s+(Января|Февраля|Марта|Апреля|Мая|Июня|Июля|Августа|Сентября|Октября|Ноября|Декабря)/i);
        if (dateM) {
            const months = { января:0,февраля:1,марта:2,апреля:3,мая:4,июня:5,июля:6,августа:7,сентября:8,октября:9,ноября:10,декабря:11 };
            const now = new Date();
            const d = new Date(now.getFullYear(), months[dateM[2].toLowerCase()], parseInt(dateM[1]));
            if (d > now) d.setFullYear(now.getFullYear() - 1);
            daysAgo = Math.floor((now - d) / 86400000);
        }

        // Флаги качества
        const isTS       = !!title.match(/\bTS\b|TELESYNC|\bCAM\b|TELECINE|\bSCR\b|SCREENER/);
        const isRemux    = title.includes('REMUX');
        const is4K       = title.includes('2160') || title.includes('4K');
        const is1080     = title.includes('1080');
        const is720      = title.includes('720');
        const isHDR      = !!title.match(/\bHDR\b|\bHDR10\b|\bHDR10\+/);
        const isDV       = !!title.match(/\bDV\b|DOLBY.VISION/);
        const isHEVC     = title.includes('HEVC') || title.includes('X265');
        const isAV1      = title.includes('AV1');
        const isAVC      = !isHEVC && !isAV1;
        const isWebDL    = title.includes('WEB-DL') && !title.includes('WEB-DLRIP');
        const isWebDLRip = title.includes('WEB-DLRIP') || title.includes('WEBDLRIP');
        const isWebRip   = title.includes('WEBRIP') || title.includes('WEB-RIP');
        const isBDRip    = !!title.match(/BDRIP|BLURAY|BLU-RAY/);
        const isDVDRip   = !!title.match(/DVDRIP|DVD-RIP/);
        const isAtmos    = title.includes('ATMOS');
        const is51       = title.includes('5.1');
        const is71       = title.includes('7.1');
        const isProper   = title.includes('PROPER') || title.includes('REPACK');
        const isDub      = !!title.match(/ДУБЛЯЖ|ДУБ\b/i);
        const isMVO      = !!title.match(/\bMVO\b|\bМВО\b/i);

        // Качественные студии
        const studioMatch = rawTitle.match(/LE-Production|HDRezka|Кубик в Кубе|AlexFilm|LostFilm|WestFilm/i);
        const hasQualityStudio = !!studioMatch;

        return {
            title, rawTitle, fullText,
            seeds, leechs, bitrate, sizeGb, daysAgo,
            isTS, isRemux, is4K, is1080, is720,
            isHDR, isDV, isHEVC, isAV1, isAVC, isWebDL, isWebDLRip, isWebRip, isBDRip, isDVDRip,
            isAtmos, is51, is71, isProper, isDub, isMVO, hasQualityStudio
        };
    }

    // ═══════════════════════════════════════════
    //  БАЛЛЬНАЯ СИСТЕМА
    // ═══════════════════════════════════════════

    function calcScore(d) {
        let score = 0;
        const factors = []; // { text, type: 'plus'|'minus'|'neutral' }

        // ── СТОП-СИГНАЛЫ (выходим сразу) ──
        if (d.isTS) {
            return { score: 0, verdict: 'stop-ts', factors: [{ text: 'TS/CAM — запись с экрана', type: 'minus' }] };
        }
        if (d.seeds < 3 && d.seeds !== 0) {
            return { score: 2, verdict: 'stop-dead', factors: [{ text: `Раздача мертва (${d.seeds} сид)`, type: 'minus' }] };
        }

        // ── 1. ИСТОЧНИК (макс. 30 очков) ──
        if (d.isRemux)    { score += 35; factors.push({ text: 'Remux (без потерь)', type: 'plus' }); }
        else if (d.isWebDL)    { score += 30; factors.push({ text: 'WEB-DL', type: 'plus' }); }
        else if (d.isWebDLRip) { score += 22; factors.push({ text: 'WEB-DLRip', type: 'neutral' }); }
        else if (d.isWebRip)   { score += 18; factors.push({ text: 'WEBRip', type: 'neutral' }); }
        else if (d.isBDRip)    { score += 20; factors.push({ text: 'BDRip', type: 'neutral' }); }
        else if (d.isDVDRip)   { score += 8;  factors.push({ text: 'DVDRip', type: 'minus' }); }

        // ── 2. РАЗРЕШЕНИЕ (макс. 20 очков) ──
        if (d.is4K)       { score += 20; factors.push({ text: '4K (2160p)', type: 'plus' }); }
        else if (d.is1080) { score += 14; factors.push({ text: '1080p', type: 'neutral' }); }
        else if (d.is720)  { score += 8;  factors.push({ text: '720p', type: 'minus' }); }
        else               { score += 2;  factors.push({ text: 'SD', type: 'minus' }); }

        // ── 3. HDR / ЦВЕТ (макс. 15 очков) ──
        if (d.isDV)       { score += 15; factors.push({ text: 'Dolby Vision', type: 'plus' }); }
        else if (d.isHDR) { score += 10; factors.push({ text: 'HDR', type: 'plus' }); }

        // ── 4. КОДЕК (макс. 10 очков) ──
        if (d.isAV1)      { score += 10; factors.push({ text: 'AV1 (эффективный)', type: 'plus' }); }
        else if (d.isHEVC){ score += 8;  factors.push({ text: 'HEVC (эффективный)', type: 'plus' }); }
        else if (d.isAVC) { score += 4;  factors.push({ text: 'H.264', type: 'neutral' }); }

        // ── 5. БИТРЕЙТ (макс. 20 очков) ──
        // Нормы: 4K HDR=25, 4K=20, 1080 HEVC=4, 1080=8, 720 HEVC=2.5, 720=4
        let normB = 8;
        if (d.is4K && d.isHDR) normB = 25;
        else if (d.is4K)        normB = 20;
        else if (d.is1080 && d.isHEVC) normB = 4;
        else if (d.is1080)      normB = 8;
        else if (d.is720 && d.isHEVC)  normB = 2.5;
        else if (d.is720)       normB = 4;

        if (d.bitrate > 0) {
            const bRatio = d.bitrate / normB;
            if (bRatio >= 1.1)     { score += 20; factors.push({ text: `Битрейт отличный (${d.bitrate} Мбит/с)`, type: 'plus' }); }
            else if (bRatio >= 0.85){ score += 14; factors.push({ text: `Битрейт хороший (${d.bitrate} Мбит/с)`, type: 'plus' }); }
            else if (bRatio >= 0.65){ score += 7;  factors.push({ text: `Битрейт средний (${d.bitrate} Мбит/с)`, type: 'neutral' }); }
            else                    { score += 0;  factors.push({ text: `Низкий битрейт (${d.bitrate} Мбит/с, норма ${normB})`, type: 'minus' }); }
        }

        // ── 6. СЕТЬ (макс. 20 очков, может уходить в минус) ──
        const ratio = d.leechs === 0 ? Infinity : d.seeds / d.leechs;
        if (d.seeds === 0) {
            score -= 25; factors.push({ text: 'Нет раздающих', type: 'minus' });
        } else if (ratio >= 5)  { score += 20; factors.push({ text: `Отличная сеть (${d.seeds}↑ ${d.leechs}↓)`, type: 'plus' }); }
        else if (ratio >= 2)    { score += 14; factors.push({ text: `Хорошая сеть (${d.seeds}↑ ${d.leechs}↓)`, type: 'plus' }); }
        else if (ratio >= 1)    { score += 8;  factors.push({ text: `Сеть норм (${d.seeds}↑ ${d.leechs}↓)`, type: 'neutral' }); }
        else if (ratio >= 0.5)  { score += 2;  factors.push({ text: `Сеть загружена (${d.seeds}↑ ${d.leechs}↓)`, type: 'neutral' }); }
        else if (ratio >= 0.25) { score -= 10; factors.push({ text: `Дефицит сидов (${d.seeds}↑ ${d.leechs}↓)`, type: 'minus' }); }
        else                    { score -= 20; factors.push({ text: `Критический дефицит (${d.seeds}↑ ${d.leechs}↓)`, type: 'minus' }); }

        // Смягчение для свежих раздач (< 3 дней — мало сидов это норма)
        if (d.daysAgo <= 3 && d.seeds < 20) {
            score += 5; factors.push({ text: 'Свежая раздача', type: 'neutral' });
        }

        // ── 7. АУДИО (бонус до 10 очков) ──
        if (d.isAtmos)    { score += 10; factors.push({ text: 'Dolby Atmos', type: 'plus' }); }
        else if (d.is71)  { score += 5;  factors.push({ text: 'Аудио 7.1', type: 'plus' }); }
        else if (d.is51)  { score += 3;  factors.push({ text: 'Аудио 5.1', type: 'neutral' }); }

        // ── 8. ОЗВУЧКА (бонус до 5 очков) ──
        if (d.isDub)               { score += 5; factors.push({ text: 'Дубляж', type: 'plus' }); }
        else if (d.hasQualityStudio){ score += 4; factors.push({ text: 'Проверенная студия', type: 'plus' }); }
        else if (d.isMVO)          { score += 2; factors.push({ text: 'MVO', type: 'neutral' }); }

        // ── 9. ПРОЧИЕ БОНУСЫ ──
        if (d.isProper) { score += 5; factors.push({ text: 'PROPER/REPACK (исправленная)', type: 'plus' }); }

        return { score: Math.max(0, Math.min(100, Math.round(score))), verdict: null, factors };
    }

    // ═══════════════════════════════════════════
    //  ВЕРДИКТ ПО ОЧКАМ
    // ═══════════════════════════════════════════

    function getVerdict(score, verdict, d) {
        // Стоп-сигналы
        if (verdict === 'stop-ts') {
            return { type: 'bad', icon: '✕', status: 'Не рекомендуется', note: 'TS/CAM — запись с экрана кинотеатра. Плохое качество изображения и звука.' };
        }
        if (verdict === 'stop-dead') {
            return { type: 'bad', icon: '✕', status: 'Раздача мертва', note: 'Почти нет раздающих — загрузка будет крайне медленной или невозможной.' };
        }

        // Балльные пороги
        if (score >= 85) return { type: 'ideal', icon: '✦', status: 'Идеально',       note: buildNote(score, d) };
        if (score >= 68) return { type: 'good',  icon: '◎', status: 'Рекомендуется',  note: buildNote(score, d) };
        if (score >= 50) return { type: 'ok',    icon: '◑', status: 'Приемлемо',      note: buildNote(score, d) };
        if (score >= 32) return { type: 'warn',  icon: '⚠', status: 'Низкое качество',note: buildNote(score, d) };
        return               { type: 'bad',  icon: '✕', status: 'Не рекомендуется', note: buildNote(score, d) };
    }

    function buildNote(score, d) {
        const parts = [];
        // Главная проблема
        const ratio = d.leechs === 0 ? Infinity : d.seeds / d.leechs;
        if (ratio < 0.5 && d.seeds > 0) parts.push(`Скорость может быть низкой (${d.seeds} сид, ${d.leechs} лич)`);
        // Основные плюсы
        if (d.isRemux) parts.push('Без потерь качества');
        if (d.isWebDL && !d.isRemux) parts.push('Оригинальный стрим');
        if (d.isDV) parts.push('Dolby Vision');
        else if (d.isHDR) parts.push('HDR');
        if (d.is4K) parts.push('4K');
        if (d.isAtmos) parts.push('Dolby Atmos');
        return parts.length ? parts.join(' · ') : (score >= 68 ? 'Хорошее соотношение всех параметров' : 'Среднее соотношение параметров');
    }

    // ═══════════════════════════════════════════
    //  РЕНДЕР
    // ═══════════════════════════════════════════

    function getParams(d) {
        const res    = d.is4K ? '2160p' : d.is1080 ? '1080p' : d.is720 ? '720p' : 'SD';
        const codec  = d.isAV1 ? 'AV1' : d.isHEVC ? 'HEVC' : 'H.264';
        const hdr    = d.isDV ? 'Dolby Vision' : d.isHDR ? 'HDR' : '';
        const source = d.isRemux ? 'Remux' : d.isWebDL ? 'WEB-DL' : d.isWebDLRip ? 'WEB-DLRip' : d.isWebRip ? 'WEBRip' : d.isBDRip ? 'BDRip' : d.isDVDRip ? 'DVDRip' : '–';
        return [res, codec, hdr, d.bitrate ? d.bitrate + ' Мбит/с' : '', source].filter(Boolean).join(' · ');
    }

    function processTorrent(el) {
        el.querySelectorAll('.prisma-box').forEach(b => b.remove());

        const d = extractData(el);
        const { score, verdict, factors } = calcScore(d);
        const v = getVerdict(score, verdict, d);

        // Топ-3 наиболее важных тега (плюсы и минусы)
        const minuses = factors.filter(f => f.type === 'minus').slice(0, 2);
        const pluses  = factors.filter(f => f.type === 'plus').slice(0, 2);
        const tags    = [...minuses, ...pluses].slice(0, 3);

        const tagsHtml = tags.map(t =>
            `<span class="prisma-tag tag-${t.type}">${t.type === 'plus' ? '+' : t.type === 'minus' ? '−' : ''} ${t.text}</span>`
        ).join('');

        const card = document.createElement('div');
        card.className = `prisma-box p-${v.type}`;
        card.innerHTML = `
            <span class="prisma-icon">${v.icon}</span>
            <div class="prisma-content">
                <span class="prisma-status">${v.status}</span>
                <span class="prisma-params">${getParams(d)}</span>
                <span class="prisma-note">${v.note}</span>
                ${tagsHtml ? `<div class="prisma-tags">${tagsHtml}</div>` : ''}
            </div>
            <div class="prisma-score">
                <span class="prisma-score-val">${verdict ? '—' : score}</span>
                <span class="prisma-score-lbl">${verdict ? 'стоп' : '/ 100'}</span>
            </div>
        `;

        el.appendChild(card);
    }

    // ═══════════════════════════════════════════
    //  OBSERVER
    // ═══════════════════════════════════════════

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
