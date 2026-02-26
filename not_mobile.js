(function () {
    'use strict';

    var plugin_id = 'prisma_quality';
    var plugin_name = 'Prisma Quality';

    // Эталонные диапазоны битрейта
    var BITRATE = {
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

    function getIdeal(res, codec, hdr){
        var hdrType = hdr ? 'HDR' : 'SDR';
        if(!BITRATE[res]) return null;
        if(!BITRATE[res][codec]) return null;
        return BITRATE[res][codec][hdrType] || BITRATE[res][codec]['SDR'];
    }

    function rateBitrate(bitrate, res, codec, hdr){
        var ideal = getIdeal(res, codec, hdr);
        if(!ideal) return 'Неизвестно';

        var min = ideal[0];
        var max = ideal[1];

        if(bitrate > max) return 'Идеально';
        if(bitrate >= min) return 'Рекомендуется';
        return 'Низкий битрейт';
    }

    function rateSource(type){
        type = (type || '').toUpperCase();
        if(type.includes('TS')) return 'Не рекомендуется';
        if(type.includes('WEB-DLRIP')) return 'Пониженное качество';
        if(type.includes('WEB-DL')) return 'Хорошее качество';
        return 'Неизвестно';
    }

    function rateSeeds(seeds, leech){
        if(seeds > 500) return 'Отличная раздача';
        if(seeds < 20) return 'Мало раздающих';
        if(leech > seeds) return 'Медленная загрузка';
        return 'Нормально';
    }

    function analyze(data){
        var info = {
            resolution: data.resolution,
            codec: data.codec,
            hdr: data.hdr,
            bitrate: data.bitrate,
            source: data.source,
            seeds: data.seeds,
            leechers: data.leechers
        };

        var quality = rateBitrate(info.bitrate, info.resolution, info.codec, info.hdr);
        var source  = rateSource(info.source);
        var speed   = rateSeeds(info.seeds, info.leechers);

        return {
            summary: `${info.resolution} • ${info.codec} • ${info.hdr ? 'HDR' : 'SDR'} • ${info.bitrate} Mbps`,
            quality: quality,
            source: source,
            speed: speed
        };
    }

    function render(info){
        return `
            <div class="torrent-item prisma-box">
                <div class="torrent-item__title">${info.summary}</div>
                <div class="torrent-item__quality">${info.quality}</div>
                <div class="torrent-item__source">${info.source}</div>
                <div class="torrent-item__speed">${info.speed}</div>
            </div>
        `;
    }

    function init(){
        Lampa.Listener.follow('full', function(e){
            if(!e || !e.card) return;

            var torrents = e.card.querySelectorAll('.torrent-item');

            torrents.forEach(function(item){
                var data = {
                    resolution: item.getAttribute('data-resolution') || '2160p',
                    codec: item.getAttribute('data-codec') || 'HEVC',
                    hdr: item.getAttribute('data-hdr') === 'true',
                    bitrate: parseFloat(item.getAttribute('data-bitrate') || 0),
                    source: item.getAttribute('data-source') || 'WEB-DL',
                    seeds: parseInt(item.getAttribute('data-seeds') || 0),
                    leechers: parseInt(item.getAttribute('data-leechers') || 0)
                };

                var info = analyze(data);
                var html = render(info);

                item.insertAdjacentHTML('beforeend', html);
            });
        });
    }

    Lampa.Plugin.create({
        id: plugin_id,
        name: plugin_name,
        version: '1.0.0',
        description: 'Оценка качества раздач как на Prisma.ws',
        onStart: init
    });

})();
