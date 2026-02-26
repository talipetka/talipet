(function () {
    'use strict';

    // ====== НАСТРОЙКИ ======
    var PLUGIN_NAME  = 'TorrServer';
    var PLUGIN_SLUG  = 'torrserver_monitor';
    var PORT         = 8090;
    var SUBNET       = '192.168.31';
    var SCAN_TIMEOUT = 600;
    var BATCH_SIZE   = 40;
    var REFRESH_MS   = 10000;

    // ====== HELPERS ======
    function apiUrl(host, path) {
        return 'http://' + host + ':' + PORT + path;
    }

    function ajax(url, method, body, timeout) {
        return new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open(method || 'GET', url, true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.timeout = timeout || 5000;
            xhr.onload = function () {
                try { resolve(JSON.parse(xhr.responseText)); }
                catch (e) { resolve({}); }
            };
            xhr.onerror = xhr.ontimeout = function () { reject(new Error('err')); };
            xhr.send(body ? JSON.stringify(body) : null);
        });
    }

    function formatSize(bytes) {
        if (!bytes || bytes <= 0) return '—';
        var u = ['B', 'KB', 'MB', 'GB', 'TB'];
        var i = Math.min(Math.floor(Math.log(bytes + 1) / Math.log(1024)), 4);
        return (bytes / Math.pow(1024, i)).toFixed(1) + '\u00a0' + u[i];
    }

    function formatSpeed(bps) {
        if (!bps || bps <= 0) return '0\u00a0KB/s';
        return formatSize(bps) + '/s';
    }

    // ====== API ======
    function getEcho(host)       { return ajax(apiUrl(host, '/echo')); }
    function getTorrents(host)   { return ajax(apiUrl(host, '/torrents'), 'POST', { action: 'list' }); }
    function getStat(host, hash) { return ajax(apiUrl(host, '/torrent/stat'), 'POST', { action: 'stat', hash: hash }); }
    function dropAll(host)       { return ajax(apiUrl(host, '/torrents'), 'POST', { action: 'drop' }); }

    // ====== СКАНИРОВАНИЕ ======
    function probeHost(ip) {
        return new Promise(function (resolve) {
            ajax('http://' + ip + ':' + PORT + '/echo', 'GET', null, SCAN_TIMEOUT)
                .then(function (d) { resolve({ ip: ip, info: d }); })
                .catch(function () { resolve(null); });
        });
    }

    function scanSubnet(onProgress, onDone) {
        var ips = [];
        for (var i = 1; i <= 254; i++) ips.push(SUBNET + '.' + i);
        var found = [], done = 0, total = ips.length;

        function runBatch(offset) {
            if (offset >= total) return;
            var chunk = ips.slice(offset, offset + BATCH_SIZE);
            Promise.all(chunk.map(probeHost)).then(function (results) {
                results.forEach(function (r) { if (r) found.push(r); });
                done += chunk.length;
                onProgress(Math.round(done / total * 100), found.slice());
                if (done < total) runBatch(offset + BATCH_SIZE);
                else onDone(found);
            });
        }
        runBatch(0);
    }

    // ====== CSS ======
    var CSS = '\
<style>\
.tsm-wrap{padding:1.2em;color:#fff;font-size:.95em}\
.tsm-row{display:flex;justify-content:space-between;align-items:center;padding:.4em 0;border-bottom:1px solid rgba(255,255,255,.08)}\
.tsm-lbl{color:rgba(255,255,255,.5);font-size:.88em}\
.tsm-val{font-weight:600}\
.tsm-ok{color:#4caf50}\
.tsm-err{color:#f44336;padding:.5em 0}\
.tsm-spd{color:#29b6f6}\
.tsm-section{margin:1em 0 .5em;font-size:.75em;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.35)}\
.tsm-list{max-height:35vh;overflow-y:auto;margin-bottom:.5em}\
.tsm-item{padding:.5em 0;border-bottom:1px solid rgba(255,255,255,.06)}\
.tsm-name{font-size:.9em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\
.tsm-sub{font-size:.78em;color:rgba(255,255,255,.4);margin-top:.2em}\
.tsm-sub span{margin-right:.6em}\
.tsm-green{color:#4caf50}.tsm-grey{color:#888}.tsm-blue{color:#29b6f6}\
.tsm-btns{display:flex;gap:.6em;flex-wrap:wrap;margin-top:1em}\
.tsm-btn{padding:.5em 1.2em;border:1px solid rgba(255,255,255,.22);border-radius:4px;cursor:pointer;font-size:.88em;background:rgba(255,255,255,.06);outline:none}\
.tsm-btn:focus,.tsm-btn.focus,.tsm-btn:hover{background:rgba(255,255,255,.2);border-color:#fff}\
.tsm-hint{color:rgba(255,255,255,.28);font-size:.78em;margin-top:.6em}\
.tsm-progress{color:#aaa;padding:.5em 0}\
</style>';

    // ====== РЕНДЕР СТАТУСА ======
    function renderStatus(host, container, onScan) {
        container.innerHTML = '<div class="tsm-wrap">' + CSS + '<div class="tsm-progress">Получение данных...</div></div>';

        Promise.all([getEcho(host), getTorrents(host)]).then(function (res) {
            var echo     = res[0] || {};
            var torrents = Array.isArray(res[1]) ? res[1] : [];

            var statPromises = torrents.map(function (t) {
                return t.hash ? getStat(host, t.hash).catch(function () { return {}; }) : Promise.resolve({});
            });

            Promise.all(statPromises).then(function (stats) {
                var totalDown = 0, totalUp = 0, totalSize = 0;
                torrents.forEach(function (t, i) {
                    var s = stats[i] || {};
                    totalDown += s.download_speed || 0;
                    totalUp   += s.upload_speed   || 0;
                    totalSize += t.torrent_size   || 0;
                    t._s = s;
                });

                var h = '<div class="tsm-wrap">' + CSS;
                h += '<div class="tsm-section">Сервер</div>';
                h += '<div class="tsm-row"><span class="tsm-lbl">Адрес</span><span class="tsm-val tsm-ok">● ' + host + ':' + PORT + '</span></div>';
                h += '<div class="tsm-row"><span class="tsm-lbl">Версия</span><span class="tsm-val">' + (echo.version || '—') + '</span></div>';
                h += '<div class="tsm-row"><span class="tsm-lbl">Торрентов</span><span class="tsm-val">' + torrents.length + '</span></div>';
                h += '<div class="tsm-row"><span class="tsm-lbl">Суммарный объём</span><span class="tsm-val">' + formatSize(totalSize) + '</span></div>';

                h += '<div class="tsm-section">Скорость</div>';
                h += '<div class="tsm-row"><span class="tsm-lbl">⬇ Загрузка</span><span class="tsm-val tsm-spd">' + formatSpeed(totalDown) + '</span></div>';
                h += '<div class="tsm-row"><span class="tsm-lbl">⬆ Раздача</span><span class="tsm-val tsm-spd">'  + formatSpeed(totalUp)   + '</span></div>';

                if (torrents.length > 0) {
                    h += '<div class="tsm-section">Торренты</div><div class="tsm-list">';
                    torrents.forEach(function (t) {
                        var s = t._s || {};
                        var active = (s.download_speed || 0) > 0 || (s.upload_speed || 0) > 0;
                        var cls    = active ? 'tsm-green' : 'tsm-grey';
                        var status = t.stat_string || (active ? 'Загружается' : 'Ожидание');
                        h += '<div class="tsm-item"><div class="tsm-name">' + (t.title || t.name || 'Без названия') + '</div>';
                        h += '<div class="tsm-sub"><span class="' + cls + '">' + status + '</span>';
                        if (active) {
                            h += '<span class="tsm-blue">⬇ ' + formatSpeed(s.download_speed) + '</span>';
                            h += '<span class="tsm-blue">⬆ ' + formatSpeed(s.upload_speed)   + '</span>';
                        }
                        h += '<span>' + formatSize(t.torrent_size) + '</span></div></div>';
                    });
                    h += '</div>';
                }

                h += '<div class="tsm-btns">';
                h += '<button class="tsm-btn" id="tsm-refresh">↻ Обновить</button>';
                h += '<button class="tsm-btn" id="tsm-scan">🔍 Найти сервер</button>';
                h += '<button class="tsm-btn" id="tsm-drop">🗑 Очистить кэш</button>';
                h += '</div>';
                h += '<div class="tsm-hint">Автообновление каждые ' + (REFRESH_MS / 1000) + '\u00a0сек</div>';
                h += '</div>';

                container.innerHTML = h;

                container.querySelector('#tsm-refresh').onclick = function () { renderStatus(host, container, onScan); };
                container.querySelector('#tsm-scan').onclick    = function () { onScan(container); };
                container.querySelector('#tsm-drop').onclick    = function () {
                    dropAll(host).then(function () {
                        Lampa.Noty.show('Кэш очищен');
                        setTimeout(function () { renderStatus(host, container, onScan); }, 500);
                    }).catch(function () { Lampa.Noty.show('Ошибка очистки'); });
                };
            });
        }).catch(function () {
            container.innerHTML = '<div class="tsm-wrap">' + CSS
                + '<div class="tsm-err">⚠ Сервер ' + host + ' недоступен</div>'
                + '<div class="tsm-btns"><button class="tsm-btn" id="tsm-scan">🔍 Найти сервер</button></div></div>';
            container.querySelector('#tsm-scan').onclick = function () { onScan(container); };
        });
    }

    // ====== СКАНИРОВАНИЕ UI ======
    function renderScan(container, onFound) {
        container.innerHTML = '<div class="tsm-wrap">' + CSS
            + '<div class="tsm-section">Автообнаружение</div>'
            + '<div class="tsm-progress" id="tsm-prog">Сканирование ' + SUBNET + '.1–254… 0%</div>'
            + '<div id="tsm-found"></div></div>';

        var prog  = container.querySelector('#tsm-prog');
        var found = container.querySelector('#tsm-found');

        scanSubnet(
            function (pct, list) {
                if (prog) prog.textContent = 'Сканирование… ' + pct + '%  · Найдено: ' + list.length;
            },
            function (list) {
                if (prog) prog.textContent = 'Готово. Найдено: ' + list.length;
                if (!list.length) {
                    if (found) found.innerHTML = '<div class="tsm-err">TorrServer не найден в сети ' + SUBNET + '.x</div>';
                    return;
                }
                var h = '<div class="tsm-section">Выберите сервер</div>';
                list.forEach(function (f) {
                    h += '<button class="tsm-btn tsm-pick" style="display:block;margin:.3em 0;width:100%;text-align:left" data-ip="' + f.ip + '">'
                        + f.ip + ' <span style="opacity:.45;font-size:.83em">v' + (f.info.version || '?') + '</span></button>';
                });
                if (found) found.innerHTML = h;

                container.querySelectorAll('.tsm-pick').forEach(function (btn) {
                    btn.onclick = function () {
                        var ip = this.getAttribute('data-ip');
                        Lampa.Storage.set('ts_host', ip);
                        Lampa.Storage.set('torrserver', 'http://' + ip + ':' + PORT);
                        Lampa.Noty.show('TorrServer сохранён: ' + ip);
                        onFound(ip, container);
                    };
                });
            }
        );
    }

    // ====== КОМПОНЕНТ LAMPA ======
    function TorrServerComponent() {
        var _host      = Lampa.Storage.get('ts_host', '');
        var _timer     = null;
        var _container = null;
        var _self      = this;

        // Создаём HTML обёртку компонента
        this.create = function () {
            _container = document.createElement('div');
            _container.className = 'ts-component';
            _container.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;overflow-y:auto;padding:1em';

            _self.start();
            return _container;
        };

        this.start = function () {
            clearInterval(_timer);

            var doScan = function (container) {
                renderScan(container, function (ip, container) {
                    _host = ip;
                    renderStatus(_host, container, doScan);
                    _timer = setInterval(function () {
                        renderStatus(_host, _container, doScan);
                    }, REFRESH_MS);
                });
            };

            if (_host) {
                renderStatus(_host, _container, doScan);
                _timer = setInterval(function () {
                    renderStatus(_host, _container, doScan);
                }, REFRESH_MS);
            } else {
                doScan(_container);
            }
        };

        this.pause   = function () { clearInterval(_timer); };
        this.stop    = function () { clearInterval(_timer); };
        this.destroy = function () {
            clearInterval(_timer);
            if (_container) _container.innerHTML = '';
        };
    }

    // ====== РЕГИСТРАЦИЯ ======
    function startPlugin() {
        // Регистрируем компонент
        Lampa.Component.add(PLUGIN_SLUG, TorrServerComponent);

        // Добавляем пункт в меню
        Lampa.Menu.add({
            title: PLUGIN_NAME,
            subtitle: 'Статус и управление',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
            component: PLUGIN_SLUG
        });
    }

    // ====== ИНИЦИАЛИЗАЦИЯ ======
    if (window.appready) {
        startPlugin();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') startPlugin();
        });
    }

})();
