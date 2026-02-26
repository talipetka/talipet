(function () {

    var PORT       = 8090;
    var SUBNET     = '192.168.31';
    var TIMEOUT    = 600;
    var BATCH      = 40;
    var REFRESH_MS = 10000;

    var savedHost = Lampa.Storage.get('ts_host', '');
    var timer     = null;

    // ====== СТИЛИ ======
    var oldStyle = document.getElementById('torrserver-monitor-style');
    if (oldStyle) oldStyle.remove();

    var style = document.createElement('style');
    style.id = 'torrserver-monitor-style';
    style.textContent = [
        '.tsm-overlay{position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;background:rgba(0,0,0,.88);display:flex;align-items:center;justify-content:center}',
        '.tsm-box{background:#16213e;border-radius:10px;width:500px;max-width:92vw;max-height:88vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 10px 50px rgba(0,0,0,.8)}',
        '.tsm-head{display:flex;justify-content:space-between;align-items:center;padding:.8em 1.3em;border-bottom:1px solid rgba(255,255,255,.08);flex-shrink:0}',
        '.tsm-head-title{color:#fff;font-weight:700;font-size:1em;letter-spacing:.03em}',
        '.tsm-head-close{color:rgba(255,255,255,.4);cursor:pointer;font-size:1.4em;line-height:1;padding:.1em .3em}',
        '.tsm-head-close:hover{color:#fff}',
        '.tsm-body{padding:1.1em 1.3em;overflow-y:auto;flex:1}',
        '.tsm-section{font-size:.72em;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.3);margin:1em 0 .45em;font-weight:600}',
        '.tsm-section:first-child{margin-top:0}',
        '.tsm-row{display:flex;justify-content:space-between;align-items:center;padding:.38em 0;border-bottom:1px solid rgba(255,255,255,.06)}',
        '.tsm-lbl{color:rgba(255,255,255,.45);font-size:.88em}',
        '.tsm-val{font-weight:600;color:#fff}',
        '.tsm-green{color:#4caf50}.tsm-blue{color:#29b6f6}.tsm-red{color:#f44336}.tsm-grey{color:#888}',
        '.tsm-list{max-height:32vh;overflow-y:auto;margin:.1em 0 .5em}',
        '.tsm-item{padding:.48em 0;border-bottom:1px solid rgba(255,255,255,.05)}',
        '.tsm-item-name{font-size:.89em;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
        '.tsm-item-sub{font-size:.76em;color:rgba(255,255,255,.38);margin-top:.15em}',
        '.tsm-item-sub span{margin-right:.55em}',
        '.tsm-btns{display:flex;gap:.55em;flex-wrap:wrap;margin-top:1em}',
        '.tsm-btn{padding:.5em 1.15em;border:1px solid rgba(255,255,255,.18);border-radius:5px;cursor:pointer;font-size:.87em;background:rgba(255,255,255,.05);color:#fff;outline:none}',
        '.tsm-btn:hover{background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.45)}',
        '.tsm-hint{color:rgba(255,255,255,.22);font-size:.75em;margin-top:.55em}',
        '.tsm-msg{color:#aaa;padding:.4em 0}',
        '.tsm-menu-item{display:flex;align-items:center;gap:.6em;padding:.6em .9em;cursor:pointer;border-top:1px solid rgba(255,255,255,.06)}',
        '.tsm-menu-item:hover{background:rgba(255,255,255,.05)}',
        '.tsm-menu-item svg{opacity:.7;flex-shrink:0}',
        '.tsm-menu-item span{color:rgba(255,255,255,.8);font-size:.9em}'
    ].join('\n');
    document.head.appendChild(style);

    // ====== HELPERS ======
    function ajax(url, method, body, ms) {
        return new Promise(function (res, rej) {
            var x = new XMLHttpRequest();
            x.open(method || 'GET', url, true);
            x.setRequestHeader('Content-Type', 'application/json');
            x.timeout = ms || 5000;
            x.onload = function () { try { res(JSON.parse(x.responseText)); } catch(e) { res({}); } };
            x.onerror = x.ontimeout = function () { rej(new Error('fail')); };
            x.send(body ? JSON.stringify(body) : null);
        });
    }

    function fmt(b) {
        if (!b || b <= 0) return '—';
        var u = ['B','KB','MB','GB','TB'];
        var i = Math.min(Math.floor(Math.log(b + 1) / Math.log(1024)), 4);
        return (b / Math.pow(1024, i)).toFixed(1) + '\u00a0' + u[i];
    }
    function spd(b) { return (!b || b <= 0) ? '0\u00a0KB/s' : fmt(b) + '/s'; }

    // ====== API ======
    function tsEcho(h)       { return ajax('http://' + h + ':' + PORT + '/echo'); }
    function tsList(h)       { return ajax('http://' + h + ':' + PORT + '/torrents', 'POST', { action: 'list' }); }
    function tsStat(h, hash) { return ajax('http://' + h + ':' + PORT + '/torrent/stat', 'POST', { action: 'stat', hash: hash }); }
    function tsDrop(h)       { return ajax('http://' + h + ':' + PORT + '/torrents', 'POST', { action: 'drop' }); }

    // ====== SCAN ======
    function probe(ip) {
        return new Promise(function (res) {
            ajax('http://' + ip + ':' + PORT + '/echo', 'GET', null, TIMEOUT)
                .then(function (d) { res({ ip: ip, info: d }); })
                .catch(function () { res(null); });
        });
    }

    function scan(onProg, onDone) {
        var ips = [], found = [], done = 0;
        for (var i = 1; i <= 254; i++) ips.push(SUBNET + '.' + i);
        var total = ips.length;

        function batch(off) {
            if (off >= total) return;
            Promise.all(ips.slice(off, off + BATCH).map(probe)).then(function (r) {
                r.forEach(function (x) { if (x) found.push(x); });
                done += Math.min(BATCH, total - off);
                onProg(Math.round(done / total * 100), found.slice());
                if (done < total) batch(off + BATCH);
                else onDone(found);
            });
        }
        batch(0);
    }

    // ====== RENDER STATUS ======
    function renderStatus(host, body) {
        body.innerHTML = '<div class="tsm-msg">Загрузка данных...</div>';

        Promise.all([tsEcho(host), tsList(host)]).then(function (r) {
            var info     = r[0] || {};
            var torrents = Array.isArray(r[1]) ? r[1] : [];

            var statPs = torrents.map(function (t) {
                return t.hash ? tsStat(host, t.hash).catch(function () { return {}; }) : Promise.resolve({});
            });

            Promise.all(statPs).then(function (stats) {
                var dTotal = 0, uTotal = 0, sTotal = 0;
                torrents.forEach(function (t, i) {
                    var s = stats[i] || {};
                    dTotal += s.download_speed || 0;
                    uTotal += s.upload_speed   || 0;
                    sTotal += t.torrent_size   || 0;
                    t._s = s;
                });

                var h = '';
                h += '<div class="tsm-section">Сервер</div>';
                h += '<div class="tsm-row"><span class="tsm-lbl">Адрес</span><span class="tsm-val tsm-green">● ' + host + ':' + PORT + '</span></div>';
                h += '<div class="tsm-row"><span class="tsm-lbl">Версия</span><span class="tsm-val">' + (info.version || '—') + '</span></div>';
                h += '<div class="tsm-row"><span class="tsm-lbl">Торрентов</span><span class="tsm-val">' + torrents.length + '</span></div>';
                h += '<div class="tsm-row"><span class="tsm-lbl">Суммарный объём</span><span class="tsm-val">' + fmt(sTotal) + '</span></div>';

                h += '<div class="tsm-section">Скорость</div>';
                h += '<div class="tsm-row"><span class="tsm-lbl">⬇ Загрузка</span><span class="tsm-val tsm-blue">' + spd(dTotal) + '</span></div>';
                h += '<div class="tsm-row"><span class="tsm-lbl">⬆ Раздача</span><span class="tsm-val tsm-blue">'  + spd(uTotal) + '</span></div>';

                if (torrents.length) {
                    h += '<div class="tsm-section">Торренты</div><div class="tsm-list">';
                    torrents.forEach(function (t) {
                        var s = t._s || {};
                        var active = (s.download_speed || 0) > 0 || (s.upload_speed || 0) > 0;
                        var cls    = active ? 'tsm-green' : 'tsm-grey';
                        var status = t.stat_string || (active ? 'Загружается' : 'Ожидание');
                        h += '<div class="tsm-item">';
                        h += '<div class="tsm-item-name">' + (t.title || t.name || 'Без названия') + '</div>';
                        h += '<div class="tsm-item-sub">';
                        h += '<span class="' + cls + '">' + status + '</span>';
                        if (active) {
                            h += '<span class="tsm-blue">⬇ ' + spd(s.download_speed) + '</span>';
                            h += '<span class="tsm-blue">⬆ ' + spd(s.upload_speed)   + '</span>';
                        }
                        h += '<span>' + fmt(t.torrent_size) + '</span>';
                        h += '</div></div>';
                    });
                    h += '</div>';
                }

                h += '<div class="tsm-btns">';
                h += '<button class="tsm-btn" id="ts-refresh">↻ Обновить</button>';
                h += '<button class="tsm-btn" id="ts-scan">🔍 Найти сервер</button>';
                h += '<button class="tsm-btn" id="ts-drop">🗑 Очистить кэш</button>';
                h += '</div>';
                h += '<div class="tsm-hint">Автообновление каждые ' + (REFRESH_MS / 1000) + ' сек</div>';

                body.innerHTML = h;

                body.querySelector('#ts-refresh').onclick = function () { renderStatus(host, body); };
                body.querySelector('#ts-scan').onclick    = function () { clearInterval(timer); renderScan(body); };
                body.querySelector('#ts-drop').onclick    = function () {
                    tsDrop(host).then(function () {
                        Lampa.Noty.show('Кэш TorrServer очищен');
                        setTimeout(function () { renderStatus(host, body); }, 600);
                    }).catch(function () { Lampa.Noty.show('Ошибка очистки'); });
                };
            });

        }).catch(function () {
            body.innerHTML = '<div class="tsm-msg tsm-red">⚠ Сервер ' + host + ' недоступен</div>'
                + '<div class="tsm-btns"><button class="tsm-btn" id="ts-scan">🔍 Найти сервер</button></div>';
            body.querySelector('#ts-scan').onclick = function () { renderScan(body); };
        });
    }

    // ====== RENDER SCAN ======
    function renderScan(body) {
        body.innerHTML = '<div class="tsm-section">Автообнаружение</div>'
            + '<div class="tsm-msg" id="ts-prog">Сканирование ' + SUBNET + '.1–254… 0%</div>'
            + '<div id="ts-found"></div>';

        scan(
            function (pct, list) {
                var p = body.querySelector('#ts-prog');
                if (p) p.textContent = 'Сканирование… ' + pct + '%  · Найдено: ' + list.length;
            },
            function (list) {
                var p = body.querySelector('#ts-prog');
                if (p) p.textContent = 'Готово. Найдено: ' + list.length;

                var f = body.querySelector('#ts-found');
                if (!f) return;

                if (!list.length) {
                    f.innerHTML = '<div class="tsm-msg tsm-red">TorrServer не найден.<br>'
                        + '<span style="font-size:.88em;color:#aaa">Убедитесь что приложение запущено.</span></div>';
                    return;
                }

                var h = '<div class="tsm-section" style="margin-top:.8em">Выберите сервер</div>';
                list.forEach(function (item) {
                    h += '<button class="tsm-btn tsm-pick" style="display:block;width:100%;text-align:left;margin:.25em 0" data-ip="' + item.ip + '">'
                        + item.ip + ' <span style="opacity:.4;font-size:.83em">v' + (item.info.version || '?') + '</span></button>';
                });
                f.innerHTML = h;

                f.querySelectorAll('.tsm-pick').forEach(function (btn) {
                    btn.onclick = function () {
                        var ip = this.getAttribute('data-ip');
                        savedHost = ip;
                        Lampa.Storage.set('ts_host', ip);
                        Lampa.Storage.set('torrserver', 'http://' + ip + ':' + PORT);
                        Lampa.Noty.show('TorrServer сохранён: ' + ip);
                        clearInterval(timer);
                        renderStatus(ip, body);
                        timer = setInterval(function () { renderStatus(ip, body); }, REFRESH_MS);
                    };
                });
            }
        );
    }

    // ====== ОТКРЫТИЕ ПАНЕЛИ ======
    function openPanel() {
        clearInterval(timer);

        var overlay = document.createElement('div');
        overlay.className = 'tsm-overlay';

        overlay.innerHTML = '<div class="tsm-box">'
            + '<div class="tsm-head">'
            + '<span class="tsm-head-title">TorrServer Monitor</span>'
            + '<span class="tsm-head-close">✕</span>'
            + '</div>'
            + '<div class="tsm-body"></div>'
            + '</div>';

        document.body.appendChild(overlay);

        var body = overlay.querySelector('.tsm-body');

        // Закрытие
        overlay.querySelector('.tsm-head-close').onclick = close;
        overlay.onclick = function (e) { if (e.target === overlay) close(); };
        document.addEventListener('keydown', onKey);

        function close() {
            clearInterval(timer);
            document.removeEventListener('keydown', onKey);
            overlay.remove();
        }
        function onKey(e) {
            if (e.key === 'Escape' || e.key === 'Backspace') close();
        }

        // Контент
        if (savedHost) {
            renderStatus(savedHost, body);
            timer = setInterval(function () { renderStatus(savedHost, body); }, REFRESH_MS);
        } else {
            renderScan(body);
        }
    }

    // ====== INJECT MENU ITEM ======
    // Такой же подход как в примере — MutationObserver
    function tryInject() {
        if (document.getElementById('tsm-menu-btn')) return;

        // Ищем боковое меню Lampa
        var menu = document.querySelector('.menu .menu__list')
            || document.querySelector('.menu__list');

        if (!menu) return;

        var sample = menu.querySelector('li.menu__item');
        var li = document.createElement('li');
        li.id = 'tsm-menu-btn';
        li.className = sample ? sample.className : 'menu__item selector';
        li.style.cursor = 'pointer';

        li.innerHTML = '<div class="menu__ico">'
            + '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">'
            + '<circle cx="12" cy="12" r="10"/>'
            + '<line x1="12" y1="8" x2="12" y2="16"/>'
            + '<line x1="8" y1="12" x2="16" y2="12"/>'
            + '</svg>'
            + '</div>'
            + '<div class="menu__text">TorrServer</div>';

        li.addEventListener('click', openPanel);
        menu.appendChild(li);
    }

    // MutationObserver — точно такой же паттерн как в рабочем плагине
    var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
            m.addedNodes.forEach(function (node) {
                if (node.nodeType === 1) {
                    tryInject();
                }
            });
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Первая попытка сразу
    tryInject();

})();
