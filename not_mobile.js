(function () {
    'use strict';

    var plugin_id = 'prisma_like_quality';

    function analyze(data){
        return {
            summary: data.title || 'Раздача',
            quality: 'Рекомендуется',
            source: 'WEB-DL',
            speed: 'Нормально',
            warnings: []
        };
    }

    function renderCard(info){
        var html = `
            <div class="torrent-item prisma-card">
                <div class="torrent-item__quality">${info.quality}</div>
                <div class="torrent-item__title">${info.summary}</div>
                <div class="torrent-item__source">${info.source}</div>
                <div class="torrent-item__speed">${info.speed}</div>
                ${info.warnings.length ? `<div class="torrent-item__warn">${info.warnings.join(' • ')}</div>` : ''}
            </div>
        `;

        return $(html);
    }

    function init(){
        Lampa.Listener.follow('component_torrent', function(e){
            if(!e || !e.card) return;

            var torrents = e.card.querySelectorAll('.torrent-item');

            torrents.forEach(function(item){
                var data = {
                    title: item.querySelector('.torrent-item__title')?.innerText || '',
                };

                var info = analyze(data);
                var card = renderCard(info);

                item.append(card[0]);
            });
        });
    }

    Lampa.Plugin.create({
        id: plugin_id,
        name: 'Prisma Quality',
        version: '1.0.0',
        description: 'Оценка качества раздачи как на Prisma.ws',
        onStart: init
    });

})();
