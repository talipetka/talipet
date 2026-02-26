// Шаг 1 — базовая проверка
Lampa.Noty.show('Шаг 1: Lampa работает');

// Шаг 2 — что есть в Lampa объекте
setTimeout(function() {
    var keys = Object.keys(Lampa).join(', ');
    console.log('LAMPA KEYS:', keys);
    Lampa.Noty.show('Keys: ' + Object.keys(Lampa).length + ' шт');
}, 2000);

// Шаг 3 — проверяем конкретные методы
setTimeout(function() {
    var has = {
        Menu:      typeof Lampa.Menu      !== 'undefined',
        Component: typeof Lampa.Component !== 'undefined',
        Activity:  typeof Lampa.Activity  !== 'undefined',
        Template:  typeof Lampa.Template  !== 'undefined',
        Layer:     typeof Lampa.Layer     !== 'undefined',
    };
    console.log('LAMPA API CHECK:', JSON.stringify(has));
    Lampa.Noty.show('Menu:' + has.Menu + ' Comp:' + has.Component + ' Act:' + has.Activity + ' Tmpl:' + has.Template);
}, 4000);

// Шаг 4 — структура меню в DOM
setTimeout(function() {
    var menu = document.querySelector('.menu__list');
    var items = menu ? menu.querySelectorAll('li').length : 0;
    console.log('MENU ELEMENT:', menu ? menu.className : 'NOT FOUND');
    console.log('MENU ITEMS COUNT:', items);
    Lampa.Noty.show('Menu DOM: ' + (menu ? 'найдено, ' + items + ' пунктов' : 'НЕ НАЙДЕНО'));
}, 6000);
