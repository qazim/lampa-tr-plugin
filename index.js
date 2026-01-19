(function () {
    'use strict';

    Lampa.Listener.follow('app', function (e) {
        if (e.type !== 'ready') return;

        var BASE = 'https://sinemaizle.org';

        function searchFilm(object, callback) {
            var title = object.original_title || object.title;
            if (!title) return callback([]);

            // возвращаем просто страницу поиска / первого найденного фильма
            callback([{
                title: title,
                url: BASE + '/?s=' + encodeURIComponent(title),
                type: 'movie'
            }]);
        }

        function openWebView(item, callback) {
            callback([{
                title: item.title,
                url: item.url,
                quality: 'WEB',
                // WebView активируем через встроенный метод Lampa
                external: true
            }]);
        }

        Lampa.Source.Online.add({
            id: 'sinemaizle',
            name: 'Sinemaizle',
            type: 'movie',

            search: function (object, callback) {
                searchFilm(object, callback);
            },

            detail: function (item, callback) {
                openWebView(item, callback);
            }
        });

        Lampa.Plugin.add({
            name: 'Sinemaizle WebView',
            version: '1.0',
            author: 'qazim'
        });
    });
})();
