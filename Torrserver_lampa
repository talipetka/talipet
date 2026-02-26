(function () {
    'use strict';

    // ====== НАСТРОЙКИ ======
    var PLUGIN_NAME  = 'TorrServer';
    var PORT         = 8090;
    var SUBNET       = '192.168.31';   // ваша домашняя сеть
    var SCAN_TIMEOUT = 600;            // мс на каждый хост
    var BATCH_SIZE   = 40;             // параллельных запросов за раз
    var REFRESH_MS   = 10000;          // обновление статуса каждые 10 сек

    // ====== СОСТОЯНИЕ ======
    var savedHost    = Lampa.Storage.get('ts_monitor_host', '');
    var refreshTimer = null;

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
            if (body) xhr.send(JSON.stringify(body));
            else xhr.send();
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

    // ====== API TorrServer ======
    function getEcho(host)       { return ajax(apiUrl(host, '/echo')); }
    function getTorrents(host)   { return ajax(apiUrl(host, '/torrents'), 'POST', { action: 'list' }); }
    function getStat(host, hash) { return ajax(apiUrl(host, '/torrent/stat'), 'POST', { action: 'stat', hash: hash }); }
    function dropAll(host)       { return ajax(apiUrl(host, '/torrents'), 'POST', { action: 'drop' }); }

    // ====== СКАНИРОВАНИЕ СЕТИ ======
    function probeHost(ip) {
        return new Promise(function (resolve) {
            ajax('http://' + ip + ':' + PORT + '/echo', 'GET', null, SCAN_TIMEOUT)
                .then(function (d) { resolve({ ip: ip, info: d }); })
                .catch(function ()  { resolve(null); });
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
.tsm{padding:1em 1.2em;color:#fff;font-size:.95em;min-width:300px}\
.tsm-row{display:flex;justify-content:space-between;align-items:center;padding:.35em 0;border-bottom:1px solid rgba(255,255,255,.08)}\
.tsm-lbl{color:rgba(255,255,255,.5);font-size:.88em}\
.tsm-val{font-weight:600}\
.tsm-ok{color:#4caf50}\
.tsm-err{color:#f44336;padding:.5em 0}\
.tsm-spd{color:#29b6f6}\
.tsm-section{margin:1em 0 .4em;font-size:.75em;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.35)}\
.tsm-list{max-height:38vh;overflow-y:auto;margin-bottom:.5em}\
.tsm-item{padding:.5em 0;border-bottom:1px solid rgba(255,255,255,.06)}\
.tsm-item-name{font-size:.9em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}\
.tsm-item-sub{font-size:.78em;color:rgba(255,255,255,.4);margin-top:.2em}\
.tsm-item-sub span{margin-right:.7em}\
.tsm-green{color:#4caf50}.tsm-grey{color:#888}.tsm-blue{color:#29b6f6}\
.tsm-btns{display:flex;gap:.6em;flex-wrap:wrap;margin-top:.9em}\
.tsm-btn{padding:.45em 1.1em;border:1px solid rgba(255,255,255,.22);border-radius:4px;cursor:pointer;font-size:.88em;background:rgba(255,255,255,.06)}\
.tsm-btn:hover,.tsm-btn.focus{background:rgba(255,255,255,.18);border-color:rgba(255,255,255,.55)}\
.tsm-hint{color:rgba(255,255,255,.28);font-size:.78em;margin-top:.6em}\
.tsm-progress{color:#aaa;padding:.5em 0}\
';

    // ====== РЕНДЕР СТАТУСА ======
    function renderStatus(host, wrap) {
        wrap.innerHTML = '<style>' + CSS + '</style><div class="tsm"><div class="tsm-progress">Обновление данных...</div></div>';

        Promise.all([getEcho(host), getTorrents(host)])
            .then(function (res) {
                var echo     = res[0] || {};
                var torrents = Array.isArray(res[1]) ? res[1] : [];

                // Получаем статистику скоростей по каждому торренту
                var statPromises = torrents.map(function (t) {
                    return t.hash
                        ? getStat(host, t.hash).catch(function () { return {}; })
                        : Promise.resolve({});
                });

                Promise.all(statPromises).then(function (stats) {
                    var totalDown = 0, totalUp = 0, totalSize = 0;

                    torrents.forEach(function (t, idx) {
                        var s = stats[idx] || {};
                        totalDown += s.download_speed || 0;
                        totalUp   += s.upload_speed   || 0;
                        totalSize += t.torrent_size   || 0;
                        t._stat = s;
                    });

                    var html = '<style>' + CSS + '</style><div class="tsm">';

                    // Сервер
                    html += '<div class="tsm-section">Сервер</div>';
                    html += '<div class="tsm-row"><span class="tsm-lbl">Адрес</span><span class="tsm-val tsm-ok">● ' + host + ':' + PORT + '</span></div>';
                    html += '<div class="tsm-row"><span class="tsm-lbl">Версия</span><span class="tsm-val">' + (echo.version || '—') + '</span></div>';
                    html += '<div class="tsm-row"><span class="tsm-lbl">Торрентов</span><span class="tsm-val">' + torrents.length + '</span></div>';
                    html += '<div class="tsm-row"><span class="tsm-lbl">Суммарный объём</span><span class="tsm-val">' + formatSize(totalSize) + '</span></div>';

                    // Скорости
                    html += '<div class="tsm-section">Скорость сейчас</div>';
                    html += '<div class="tsm-row"><span class="tsm-lbl">⬇ Загрузка</span><span class="tsm-val tsm-spd">' + formatSpeed(totalDown) + '</span></div>';
                    html += '<div class="tsm-row"><span class="tsm-lbl">⬆ Раздача</span><span class="tsm-val tsm-spd">'  + formatSpeed(totalUp)   + '</span></div>';

                    // Список торрентов
                    if (torrents.length > 0) {
                        html += '<div class="tsm-section">Торренты</div><div class="tsm-list">';
                        torrents.forEach(function (t) {
                            var s         = t._stat || {};
                            var active    = (s.download_speed || 0) > 0 || (s.upload_speed || 0) > 0;
                            var stClass   = active ? 'tsm-green' : 'tsm-grey';
                            var stText    = t.stat_string || (active ? 'Загружается' : 'Ожидание');
                            var name      = t.title || t.name || 'Без названия';

                            html += '<div class="tsm-item">';
                            html += '<div class="tsm-item-name">' + name + '</div>';
                            html += '<div class="tsm-item-sub">';
                            html += '<span class="' + stClass + '">' + stText + '</span>';
                            if (active) {
                                html += '<span class="tsm-blue">⬇ ' + formatSpeed(s.download_speed) + '</span>';
                                html += '<span class="tsm-blue">⬆ ' + formatSpeed(s.upload_speed) + '</span>';
                            }
                            html += '<span>' + formatSize(t.torrent_size) + '</span>';
                            html += '</div></div>';
                        });
                        html += '</div>';
                    }

                    // Кнопки
                    html += '<div class="tsm-btns">';
                    html += '<div class="tsm-btn" data-action="refresh">↻ Обновить</div>';
                    html += '<div class="tsm-btn" data-action="scan">🔍 Найти сервер</div>';
                    html += '<div class="tsm-btn" data-action="drop">🗑 Очистить кэш</div>';
                    html += '</div>';
                    html += '<div class="tsm-hint">Автообновление каждые ' + (REFRESH_MS / 1000) + '\u00a0сек</div>';
                    html += '</div>';

                    wrap.innerHTML = html;
                    bindButtons(wrap, host);
                });
            })
            .catch(function () {
                wrap.innerHTML = '<style>' + CSS + '</style><div class="tsm">'
                    + '<div class="tsm-err">⚠ Сервер ' + host + ' недоступен</div>'
                    + '<div class="tsm-btns">'
                    + '<div class="tsm-btn" data-action="scan">🔍 Найти сервер</div>'
                    + '</div></div>';
                bindButtons(wrap, host);
            });
    }

    function bindButtons(wrap, host) {
        wrap.querySelectorAll('[data-action]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var a = this.getAttribute('data-action');
                if (a === 'refresh') {
                    renderStatus(host, wrap);
                }
                if (a === 'scan') {
                    clearInterval(refreshTimer);
                    openScan(wrap);
                }
                if (a === 'drop') {
                    dropAll(host)
                        .then(function () {
                            Lampa.Noty.show('Кэш TorrServer очищен');
                            setTimeout(function () { renderStatus(host, wrap); }, 600);
                        })
                        .catch(function () {
                            Lampa.Noty.show('Ошибка при очистке кэша');
                        });
                }
            });
        });
    }

    // ====== СКАНИРОВАНИЕ UI ======
    function openScan(wrap) {
        wrap.innerHTML = '<style>' + CSS + '</style><div class="tsm">'
            + '<div class="tsm-section">Автообнаружение</div>'
            + '<div class="tsm-progress" id="ts-prog">Сканирование ' + SUBNET + '.1–254… 0%</div>'
            + '<div id="ts-found"></div>'
            + '</div>';

        var progEl  = wrap.querySelector('#ts-prog');
        var foundEl = wrap.querySelector('#ts-found');

        scanSubnet(
            function (pct, found) {
                if (progEl) progEl.textContent = 'Сканирование ' + SUBNET + '.x… ' + pct + '%  ·  Найдено: ' + found.length;
            },
            function (found) {
                if (progEl) progEl.textContent = 'Готово. Найдено: ' + found.length;

                if (found.length === 0) {
                    if (foundEl) foundEl.innerHTML = '<div class="tsm-err">TorrServer не найден в сети ' + SUBNET + '.x<br>Убедитесь, что приложение запущено.</div>';
                    return;
                }

                var html = '<div class="tsm-section">Выберите сервер</div>';
                found.forEach(function (f) {
                    html += '<div class="tsm-btn tsm-pick" data-ip="' + f.ip + '" style="display:block;margin:.3em 0">'
                        + f.ip
                        + ' <span style="opacity:.45;font-size:.83em">v' + (f.info.version || '?') + '</span>'
                        + '</div>';
                });
                if (foundEl) foundEl.innerHTML = html;

                wrap.querySelectorAll('.tsm-pick').forEach(function (el) {
                    el.addEventListener('click', function () {
                        var ip = this.getAttribute('data-ip');
                        savedHost = ip;
                        Lampa.Storage.set('ts_monitor_host', ip);
                        Lampa.Storage.set('torrserver', 'http://' + ip + ':' + PORT);
                        Lampa.Noty.show('TorrServer сохранён: ' + ip);
                        renderStatus(ip, wrap);
                        startAutoRefresh(ip, wrap);
                    });
                });
            }
        );
    }

    // ====== АВТО-ОБНОВЛЕНИЕ ======
    function startAutoRefresh(host, wrap) {
        clearInterval(refreshTimer);
        refreshTimer = setInterval(function () { renderStatus(host, wrap); }, REFRESH_MS);
    }

    // ====== ОТКРЫТИЕ ПАНЕЛИ ======
    function openPanel() {
        var wrap = document.createElement('div');

        Lampa.Select.show({
            title: PLUGIN_NAME,
            items: [{ title: ' ' }],
            onSelect: function () {},
            onBack: function () {
                clearInterval(refreshTimer);
                Lampa.Controller.toggle('content');
            }
        });

        setTimeout(function () {
            var box = document.querySelector('.select--box .select--scroll');
            if (!box) return;
            box.innerHTML = '';
            box.appendChild(wrap);

            if (savedHost) {
                renderStatus(savedHost, wrap);
                startAutoRefresh(savedHost, wrap);
            } else {
                openScan(wrap);
            }
        }, 60);
    }

    // ====== ИНИЦИАЛИЗАЦИЯ ======
    function init() {
        var li = document.createElement('li');
        li.className = 'menu__item selector';
        li.innerHTML = ''
            + '<div class="menu__ico">'
            + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:1.3em;height:1.3em">'
            + '<path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 4v4m0 0v4m0-4h4m-4 0H8"/>'
            + '</svg>'
            + '</div>'
            + '<div class="menu__text">' + PLUGIN_NAME + '</div>';

        li.addEventListener('click', openPanel);

        var menu = document.querySelector('ul.menu__list') || document.querySelector('nav.menu .menu__list');
        if (menu) menu.appendChild(li);
    }

    if (window.appready) {
        init();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') init();
        });
    }

})();
