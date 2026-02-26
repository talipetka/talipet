(function () {
    'use strict';

    var plugin_id = 'prisma_quality_tv';
    var plugin_name = 'Prisma Quality TV';

    function init(){
        Lampa.Listener.follow('app', function(e){
            if(e.type !== 'torrent') return;

            var torrents = document.querySelectorAll('.torrent-item');

            torrents.forEach(function(item){
                var html = `
                    <div class="torrent-item prisma-box" style="padding:10px;margin-top:5px;background:#1a1a1a;border-radius:6px;">
                        <div style="color:#fff;font-size:14px;">Prisma Quality работает</div>
                    </div>
                `;
                item.insertAdjacentHTML('beforeend', html);
            });
        });
    }

    Lampa.Plugin.create({
        id: plugin_id,
        name: plugin_name,
        version: '1.0.0',
        description: 'Prisma Quality для TV версии',
        onStart: init
    });

})();
