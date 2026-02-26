(function () {
    'use strict';

    var plugin_id   = 'prisma_like_quality';
    var plugin_name = 'Prisma Quality';
    var plugin_icon = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 3h18v18H3z"/></svg>';

    // Эталонные диапазоны битрейта
    var BITRATE_STANDARDS = {
        '1080p': {
            'AVC': { 'SDR': [7, 10] },
            'HEVC': { 'SDR': [4, 7] }
        },
        '2160p': {
            'HEVC': {
                'SDR': [20, 30],
                'HDR': [25, 35]
            }
        }
    };

    function getIdealRange(resolution, codec, hdr) {
        var hdrType = hdr ? 'HDR' : 'SDR';
        var res = BITRATE_STANDARDS[resolution];
        if (!res) return null;

        var codecData = res[codec];
        if (!codecData) return null;

        return codecData[hdrType] || codecData['SDR'];
    }

    function rateBitrate(bitrate, resolution, codec, hdr) {
        var ideal = getIdealRange(resolution, codec, hdr);
        if (!ideal) return 'Неизвестно';

        var min = ideal[0];
        var max = ideal[1];

        if (bitrate > max) return 'Идеально';
        if (bitrate >= min) return 'Рекомендуется';
        return 'Низкий битрейт';
    }

    function rateSource(sourceType) {
        sourceType = (sourceType || '').toUpperCase();

        if (sourceType.indexOf('TS') !== -1) return 'Не рекомендуется — низкое качество';
        if (sourceType.indexOf('WEB-DLRIP') !== -1) return 'Пониженное качество';
        if (sourceType.indexOf('WEB-DL') !== -1) return 'Хорошее качество';

        return 'Неизвестно';
    }

    function rateSeeds(seeds, leechers) {
        seeds    = seeds    || 0;
        leechers = leechers || 0;

        if (seeds > 500) return 'Отличная раздача';
        if (seeds < 20)  return 'Мало раздающих';
        if (leechers > seeds) return 'Может быть медленная загрузка';

        return 'Нормально';
    }

    function analyzeTorrent(data) {
        var resolution = data.resolution || '';
        var codec      = data.codec || '';
        var hdr        = !!data.hdr;
        var bitrate    = parseFloat(data.bitrate || 0);
        var sourceType = data.sourceType || '';
        var seeds      = parseInt(data.seeds || 0);
        var leechers   = parseInt(data.leechers || 0);

        var bitrateStatus = rateBitrate(bitrate, resolution, codec, hdr);
        var sourceStatus  = rateSource(sourceType);
        var seedStatus    = rateSeeds(seeds, leechers);

        var summary = [
            resolution,
            codec,
            hdr ? 'HDR' : 'SDR',
            bitrate ? (bitrate.toFixed(2) + ' Mbps') : '',
            sourceType
        ].filter(Boolean).join(' • ');

        var warnings = [];

        if (bitrateStatus === 'Низкий битрейт') warnings.push('Битрейт ниже нормы');
        if (seedStatus === 'Мало раздающих') warnings.push('Может качаться медленно');
        if (seedStatus === 'Может быть медленная загрузка') warnings.push('Личей больше чем сидов');
        if (sourceStatus.indexOf('TS') !== -1) warnings.push('TS — запись с кинотеатра');

        return {
            quality:  bitrateStatus,
            source:   sourceStatus,
            speed:    seedStatus,
            summary:  summary,
            warnings: warnings
        };
    }

    // UI-виджет в стиле Lampa
    function createCard(info) {
        var card = document.createElement('div');
        card.className = 'prisma-quality-card';

        var title = document.createElement('div');
        title.className = 'prisma-quality-title';
        title.textContent = info.summary;

        var quality = document.createElement('div');
        quality.className = 'prisma-quality-line';
        quality.textContent = 'Качество: ' + info.quality;

        var source = document.createElement('div');
        source.className = 'prisma-quality-line';
        source.textContent = 'Источник: ' + info.source;

        var speed = document.createElement('div');
        speed.className = 'prisma-quality-line';
        speed.textContent = 'Скорость: ' + info.speed;

        card.appendChild(title);
        card.appendChild(quality);
        card.appendChild(source);
        card.appendChild(speed);

        if (info.warnings && info.warnings.length) {
            var warn = document.createElement('div');
            warn.className = 'prisma-quality-warn';
            warn.textContent = info.warnings.join(' • ');
            card.appendChild(warn);
        }

        return card;
    }

    // Хук для Lampa: пример интеграции в карточку торрента
    function attachToTorrent(torrentElement, torrentData) {
        var info = analyzeTorrent(torrentData);
        var card = createCard(info);

        torrentElement.appendChild(card);
    }

    // Регистрация плагина в Lampa
    function init() {
        if (!window.Lampa || !Lampa.Plugin) return;

        Lampa.Plugin.create({
            id: plugin_id,
            name: plugin_name,
            icon: plugin_icon,
            description: 'Оценка качества раздачи как на Prisma.ws',
            version: '1.0.0',
            onStart: function () {
                // здесь можно повеситься на события Lampa и подмешивать карточки
                // пример (псевдо):
                // Lampa.Listener.follow('torrent_card', function(e){
                //     attachToTorrent(e.card, e.data);
                // });
            }
        });
    }

    if (window.appready) init();
    else document.addEventListener('appready', init);

})();
