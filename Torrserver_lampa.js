(function () {

    var PORT       = 8090;
    var SUBNET     = '192.168.31';
    var SCAN_MS    = 600;
    var BATCH      = 40;
    var REFRESH_MS = 10000;

    var savedHost = Lampa.Storage.get('ts_host', '');
    var timer     = null;

    // ── CSS ──────────────────────────────────────
    var oldStyle = document.getElementById('ts-style');
    if (oldStyle) oldStyle.remove();
    var style = document.createElement('style');
    style.id = 'ts-style';
    style.textContent = [
        '.ts-overlay{position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background:rgba(0,0,0,.9);display:flex;align-items:center;justify-content:center}',
        '.ts-box{background:#16213e;border-radius:10px;width:520px;max-width:94vw;max-height:90vh;overflow:hidden;display:flex;flex-direction:column}',
        '.ts-head{display:flex;justify-content:space-between;align-items:center;padding:.85em 1.3em;border-bottom:1px solid rgba(255,255,255,.08)}',
        '.ts-head-t{color:#fff;font-weight:700;font-size:1em}',
        '.ts-head-x{color:rgba(255,255,255,.4);cursor:pointer;font-size:1.5em;line-height:1;padding:0 .2em}',
        '.ts-body{padding:1.1em 1.3em;overflow-y:auto;flex:1}',
        '.ts-sec{font-size:.68em;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.28);margin:1em 0 .45em;font-weight:600}',
        '.ts-sec:first-child{margin-top:0}',
        '.ts-row{display:flex;justify-content:space-between;align-items:center;padding:.38em 0;border-bottom:1px solid rgba(255,255,255,.06)}',
        '.ts-row:last-child{border-bottom:none}',
        '.ts-lbl{color:rgba(255,255,255,.45);font-size:.85em}',
        '.ts-val{font-weight:600;color:#fff;font-size:.88em}',
        '.c-g{color:#4caf50}.c-b{color:#29b6f6}.c-r{color:#f44336}.c-m{color:#888}',
        '.ts-spd{display:grid;grid-template-columns:1fr 1fr;gap:.6em;margin:.3em 0}',
        '.ts-spd-card{background:#1e2642;border:1px solid rgba(255,255,255,.07);border-radius:7px;padding:.7em .9em}',
        '.ts-spd-lbl{font-size:.68em;color:rgba(255,255,255,.4);margin-bottom:.25em}',
        '.ts-spd-val{font-size:1.05em;font-weight:700}',
        '.ts-list{max-height:30vh;overflow-y:auto;margin:.2em 0 .4em}',
        '.ts-item{padding:.5em 0;border-bottom:1px solid rgba(255,255,255,.05)}',
        '.ts-item:last-child{border-bottom:none}',
        '.ts-item-name{font-size:.84em;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
        '.ts-item-sub{font-size:.72em;color:rgba(255,255,255,.38);margin-top:.15em;display:flex;gap:.6em;flex-wrap:wrap}',
        '.ts-btns{display:flex;gap:.5em;flex-wrap:wrap;margin-top:.9em}',
        '.ts-btn{padding:.5em 1.1em;border:1px solid rgba(255,255,255,.18);border-radius:5px;cursor:pointer;font-size:.84em;background:rgba(255,255,255,.05);color:#fff;outline:none;font-family:inherit}',
        '.ts-btn:hover,.ts-btn:focus{background:rgba(255,255,255,.15);border-color:rgba(255,255,255,.4)}',
        '.ts-hint{color:rgba(255,255,255,.2);font-size:.7em;margin-top:.55em}',
        '.ts-msg{color:#aaa;padding:.4em 0;font-size:.9em}',
        '.ts-prog{color:#aaa;padding:.4em 0;font-size:.9em}'
    ].join('');
    document.head.appendChild(style);

    // ── HELPERS ──────────────────────────────────
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
        var i = Math.min(Math.floor(Math.log(b+1)/Math.log(1024)), 4);
        return (b/Math.pow(1024,i)).toFixed(1)+'\u00a0'+u[i];
    }
    function spd(b) { return (!b||b<=0) ? '0\u00a0KB/s' : fmt(b)+'/s'; }

    // ── TORRSERVER API ────────────────────────────
    function tsEcho(h)     { return ajax('http://'+h+':'+PORT+'/echo'); }
    function tsList(h)     { return ajax('http://'+h+':'+PORT+'/torrents','POST',{action:'list'}); }
    function tsStat(h,hsh) { return ajax('http://'+h+':'+PORT+'/torrent/stat','POST',{action:'stat',hash:hsh}); }
    function tsDrop(h)     { return ajax('http://'+h+':'+PORT+'/torrents','POST',{action:'drop'}); }

    // ── SCAN ─────────────────────────────────────
    function probe(ip) {
        return new Promise(function(res) {
            ajax('http://'+ip+':'+PORT+'/echo','GET',null,SCAN_MS)
                .then(function(d){ res({ip:ip,info:d}); })
                .catch(function(){ res(null); });
        });
    }

    function scan(onProg, onDone) {
        var ips=[]; for(var i=1;i<=254;i++) ips.push(SUBNET+'.'+i);
        var found=[], done=0, total=ips.length;
        function batch(off) {
            if(off>=total) return;
            Promise.all(ips.slice(off,off+BATCH).map(probe)).then(function(r){
                r.forEach(function(x){ if(x) found.push(x); });
                done+=Math.min(BATCH,total-off);
                onProg(Math.round(done/total*100), found.slice());
                if(done<total) batch(off+BATCH); else onDone(found);
            });
        }
        batch(0);
    }

    // ── RENDER STATUS ─────────────────────────────
    function renderStatus(host, body) {
        body.innerHTML = '<div class="ts-msg">Загрузка...</div>';

        Promise.all([tsEcho(host), tsList(host)]).then(function(r) {
            var info     = r[0]||{};
            var torrents = Array.isArray(r[1]) ? r[1] : [];
            var statPs   = torrents.map(function(t){
                return t.hash ? tsStat(host,t.hash).catch(function(){return{};}) : Promise.resolve({});
            });

            Promise.all(statPs).then(function(stats) {
                var dl=0, ul=0, sz=0;
                torrents.forEach(function(t,i){
                    var s=stats[i]||{};
                    dl+=s.download_speed||0;
                    ul+=s.upload_speed||0;
                    sz+=t.torrent_size||0;
                    t._s=s;
                });

                var h='';
                h+='<div class="ts-sec">Сервер</div>';
                h+='<div class="ts-row"><span class="ts-lbl">Адрес</span><span class="ts-val c-g">● '+host+':'+PORT+'</span></div>';
                h+='<div class="ts-row"><span class="ts-lbl">Версия</span><span class="ts-val">'+(info.version||'—')+'</span></div>';
                h+='<div class="ts-row"><span class="ts-lbl">Торрентов</span><span class="ts-val">'+torrents.length+'</span></div>';
                h+='<div class="ts-row"><span class="ts-lbl">Объём</span><span class="ts-val">'+fmt(sz)+'</span></div>';

                h+='<div class="ts-sec">Скорость</div>';
                h+='<div class="ts-spd">';
                h+='<div class="ts-spd-card"><div class="ts-spd-lbl">⬇ Загрузка</div><div class="ts-spd-val c-b">'+spd(dl)+'</div></div>';
                h+='<div class="ts-spd-card"><div class="ts-spd-lbl">⬆ Раздача</div><div class="ts-spd-val c-g">'+spd(ul)+'</div></div>';
                h+='</div>';

                if(torrents.length) {
                    h+='<div class="ts-sec">Торренты</div><div class="ts-list">';
                    torrents.forEach(function(t){
                        var s=t._s||{};
                        var active=(s.download_speed||0)>0||(s.upload_speed||0)>0;
                        var dot='<span style="color:'+(active?'#4caf50':'#555')+'">'+(active?'●':'○')+'</span>';
                        h+='<div class="ts-item">';
                        h+='<div class="ts-item-name">'+dot+' '+(t.title||t.name||'Без названия')+'</div>';
                        h+='<div class="ts-item-sub">';
                        if(active){
                            h+='<span class="c-b">⬇ '+spd(s.download_speed)+'</span>';
                            h+='<span class="c-g">⬆ '+spd(s.upload_speed)+'</span>';
                        } else {
                            h+='<span class="c-m">Ожидание</span>';
                        }
                        h+='<span>'+fmt(t.torrent_size)+'</span>';
                        h+='</div></div>';
                    });
                    h+='</div>';
                }

                h+='<div class="ts-btns">';
                h+='<button class="ts-btn" id="ts-ref">↻ Обновить</button>';
                h+='<button class="ts-btn" id="ts-scn">🔍 Найти сервер</button>';
                h+='<button class="ts-btn" id="ts-drp">🗑 Очистить кэш</button>';
                h+='</div>';
                h+='<div class="ts-hint">Автообновление каждые '+(REFRESH_MS/1000)+' сек</div>';

                body.innerHTML = h;
                body.querySelector('#ts-ref').onclick = function(){ renderStatus(host,body); };
                body.querySelector('#ts-scn').onclick = function(){ clearInterval(timer); renderScan(body); };
                body.querySelector('#ts-drp').onclick = function(){
                    tsDrop(host).then(function(){
                        Lampa.Noty.show('Кэш очищен');
                        setTimeout(function(){ renderStatus(host,body); },600);
                    }).catch(function(){ Lampa.Noty.show('Ошибка'); });
                };
            });

        }).catch(function(){
            body.innerHTML='<div class="ts-msg c-r">⚠ '+host+' недоступен</div>'
                +'<div class="ts-btns"><button class="ts-btn" id="ts-scn">🔍 Найти сервер</button></div>';
            body.querySelector('#ts-scn').onclick = function(){ renderScan(body); };
        });
    }

    // ── RENDER SCAN ───────────────────────────────
    function renderScan(body) {
        body.innerHTML = '<div class="ts-sec">Автообнаружение</div>'
            +'<div class="ts-prog" id="ts-p">Сканирование '+SUBNET+'.1–254… 0%</div>'
            +'<div id="ts-f"></div>';

        scan(
            function(pct, list){
                var p=body.querySelector('#ts-p');
                if(p) p.textContent='Сканирование… '+pct+'%  · Найдено: '+list.length;
            },
            function(list){
                var p=body.querySelector('#ts-p');
                if(p) p.textContent='Готово. Найдено: '+list.length;
                var f=body.querySelector('#ts-f');
                if(!f) return;

                if(!list.length){
                    f.innerHTML='<div class="ts-msg c-r">TorrServer не найден в сети '+SUBNET+'.x<br>'
                        +'<span style="font-size:.88em;color:#888">Убедитесь что приложение запущено</span></div>';
                    return;
                }

                var h='<div class="ts-sec" style="margin-top:.8em">Выберите сервер</div>';
                list.forEach(function(item){
                    h+='<button class="ts-btn ts-pick" style="display:block;width:100%;text-align:left;margin:.25em 0" data-ip="'+item.ip+'">'
                        +item.ip+' <span style="opacity:.4;font-size:.82em">v'+(item.info.version||'?')+'</span></button>';
                });
                f.innerHTML=h;

                f.querySelectorAll('.ts-pick').forEach(function(btn){
                    btn.onclick=function(){
                        var ip=this.getAttribute('data-ip');
                        savedHost=ip;
                        Lampa.Storage.set('ts_host',ip);
                        Lampa.Storage.set('torrserver','http://'+ip+':'+PORT);
                        Lampa.Noty.show('Сохранено: '+ip);
                        clearInterval(timer);
                        renderStatus(ip,body);
                        timer=setInterval(function(){ renderStatus(ip,body); },REFRESH_MS);
                    };
                });
            }
        );
    }

    // ── OPEN PANEL ────────────────────────────────
    function openPanel() {
        clearInterval(timer);
        if(document.querySelector('.ts-overlay')) return;

        var overlay=document.createElement('div');
        overlay.className='ts-overlay';
        overlay.innerHTML='<div class="ts-box">'
            +'<div class="ts-head">'
            +'<span class="ts-head-t">TorrServer Monitor</span>'
            +'<span class="ts-head-x" id="ts-close">✕</span>'
            +'</div>'
            +'<div class="ts-body" id="ts-body"></div>'
            +'</div>';
        document.body.appendChild(overlay);

        var body=overlay.querySelector('#ts-body');

        function close(){
            clearInterval(timer);
            document.removeEventListener('keydown',onKey);
            overlay.remove();
        }
        function onKey(e){
            if(e.keyCode===27||e.keyCode===8||e.keyCode===10009) close();
        }

        overlay.querySelector('#ts-close').onclick=close;
        overlay.onclick=function(e){ if(e.target===overlay) close(); };
        document.addEventListener('keydown',onKey);

        if(savedHost){
            renderStatus(savedHost,body);
            timer=setInterval(function(){ renderStatus(savedHost,body); },REFRESH_MS);
        } else {
            renderScan(body);
        }
    }

    // ── INJECT MENU ───────────────────────────────
    function injectMenu() {
        if(document.getElementById('ts-menu-btn')) return;

        var menu=document.querySelector('.menu__list');
        if(!menu) return;

        // Копируем классы с существующего пункта
        var sample=menu.querySelector('li');
        var li=document.createElement('li');
        li.id='ts-menu-btn';
        li.className=sample ? sample.className : 'menu__item selector';

        li.innerHTML=''
            +'<div class="menu__ico">'
            +'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">'
            +'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'
            +'</svg>'
            +'</div>'
            +'<div class="menu__text">TorrServer</div>';

        li.addEventListener('click', openPanel);
        menu.appendChild(li);
        Lampa.Noty.show('TorrServer: пункт меню добавлен!');
    }

    // ── OBSERVER + INIT ───────────────────────────
    // Наблюдаем за DOM — как только меню появится, добавляем пункт
    var observer=new MutationObserver(function(){
        if(!document.getElementById('ts-menu-btn')){
            var menu=document.querySelector('.menu__list');
            if(menu) injectMenu();
        }
    });
    observer.observe(document.body,{childList:true,subtree:true});

    // Пробуем сразу
    injectMenu();

    // И ещё раз через секунду на случай медленной загрузки
    setTimeout(injectMenu, 1000);
    setTimeout(injectMenu, 3000);

})();
