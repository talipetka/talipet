(function () {
    var style = document.createElement('style');
    style.id = 'lampa-prisma-v5';
    style.textContent = `
        .prisma-box {
            margin: 10px 12px 12px 12px !important;
            padding: 12px 15px !important;
            border-radius: 4px !important;
            background: rgba(255, 255, 255, 0.04) !important;
            border-left: 5px solid #555;
        }
        .prisma-status-text { font-weight: bold; font-size: 1.1em !important; margin-bottom: 4px; display: block; }
        .prisma-stats-line { font-size: 0.9em !important; color: rgba(255,255,255,0.7); margin-bottom: 6px; }
        .prisma-warning-text { font-size: 0.85em !important; line-height: 1.3; }

        /* Идеально - Ярко-зеленый */
        .p-ideal { border-left-color: #2ecc71 !important; } 
        .p-ideal .prisma-status-text { color: #2ecc71 !important; }
        
        /* Рекомендуется - Спокойный зеленый (Вместо синего) */
        .p-good { border-left-color: #27ae60 !important; } 
        .p-good .prisma-status-text { color: #27ae60 !important; }

        /* Предупреждение (Перегрузка сети) - Желтый */
        .p-warn { border-left-color: #f1c40f !important; background: rgba(241, 196, 15, 0.08) !important; } 
        .p-warn .prisma-status-text { color: #f1c40f !important; }

        /* Плохо - Красный */
        .p-bad { border-left-color: #e74c3c !important; background: rgba(231, 76, 60, 0.08) !important; } 
        .p-bad .prisma-status-text { color: #e74c3c !important; }
    `;
    document.head.appendChild(style);

    function getPrismaVerdict(d) {
        const idealB = d.is4K ? (d.isHDR ? 25 : 20) : (d.isHEVC ? 4 : 7);
        const ratio = d.l / (d.s || 1); 

        // 1. ПРОВЕРКИ НА КАЧЕСТВО ИСТОЧНИКА
        if (d.title.match(/ TS |CAM|TELESYNC/i)) return { status: "Не рекомендуется", type: "bad", note: "TS - экранка, смотреть невозможно" };
        if (d.s < 5) return { status: "Раздача мертва", type: "bad", note: "Сидов почти нет, не качайте" };

        // 2. АНАЛИЗ СЕТИ (Твой запрос про 32/114)
        // Если личей в 3 раза больше чем сидов - это желтая зона "Риск зависания"
        const isOverloaded = ratio > 3.0;

        // 3. ПРИСВОЕНИЕ ВЕРДИКТА
        
        // ТЕХНИЧЕСКИЙ ТОП (4K + HDR + Хороший битрейт)
        if (d.b >= idealB && d.is4K && d.isHDR) {
            if (isOverloaded) {
                return { status: "Топ-качество (Очередь)", type: "warn", note: `Картинка идеал, но качающих слишком много (${d.l} чел). Скорость будет падать.` };
            }
            if (d.s < 30) {
                return { status: "Топ-качество (Мало сидов)", type: "warn", note: "Риск медленной загрузки из-за малого числа раздающих." };
            }
            return { status: "Идеально", type: "ideal", note: "Лучшее качество и отличная скорость загрузки" };
        }

        // ХОРОШИЙ ВАРИАНТ (Рекомендуется)
        if (d.b >= (idealB * 0.75)) {
            if (isOverloaded) {
                return { status: "Медленная загрузка", type: "warn", note: `Огромный перекос в сети: Личей в ${ratio.toFixed(1)} раза больше чем сидов.` };
            }
            return { status: "Рекомендуется", type: "good", note: "Хороший баланс качества изображения и доступности" };
        }

        // ВСЁ ОСТАЛЬНОЕ
        return { status: "Низкий битрейт", type: "warn", note: `Битрейт ${d.b} Mbps (Идеально от ${idealB}+)` };
    }

    // Обработка торрента (остается без изменений, просто использует новую функцию)
    function processTorrent(el) {
        if (el.classList.contains('prisma-final-v5')) return;
        // ... (код парсинга данных из предыдущих версий)
    }
    // ... (код MutationObserver)
})();
