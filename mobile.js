(function () {
    'use strict';

    Lampa.Listener.follow('full', function (e) {
        if (e.type == 'complite') {
            setTimeout(function () {
                $('.torrent-item').each(function () {
                    var item = $(this);
                    if (item.find('.quality-indicator').length) return;

                    var sizeText = item.find('.torrent-item__size').text();
                    var fileSize = parseFloat(sizeText);
                    var movieRuntime = e.data.movie.runtime || 120; // minutes
                    
                    if (fileSize > 0 && !isNaN(fileSize)) {
                        // Bitrate calculation: (GB * 8192) / (seconds) = Mbps
                        var currentBitrate = ((fileSize * 8192) / (movieRuntime * 60)).toFixed(2);
                        var statusText = '';
                        var statusColor = '#ffffff';

                        if (currentBitrate < 10) {
                            statusText = 'Low Bitrate: Recommended 25-35+ Mbps';
                            statusColor = '#ff9500'; // Orange
                        } else if (currentBitrate >= 20) {
                            statusText = 'Excellent Quality';
                            statusColor = '#4cd964'; // Green
                        } else {
                            statusText = 'Bitrate is Normal';
                            statusColor = '#00d1ff'; // Blue
                        }

                        var displayHtml = `<div class="quality-indicator" style="color: ${statusColor}; font-size: 0.8em; margin-top: 5px; font-weight: bold;">
                            ${statusText}<br>
                            Current: ${currentBitrate} Mbps
                        </div>`;
                        
                        item.append(displayHtml);
                    }
                });
            }, 1000);
        }
    });
})();
