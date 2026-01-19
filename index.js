(function () {
    'use strict';

    Lampa.Listener.follow('app', function (e) {
        if (e.type !== 'ready') return;

        var BASE_URL = 'https://sinemaizle.org';

        /**
         * Поиск фильма и возврат первого найденного фильма
         */
        function searchFilm(object, callback) {
            var title = object.original_title || object.title;
            if (!title) return callback([]);

            Lampa.Network.get(BASE_URL + '/?s=' + encodeURIComponent(title), function (html) {
                var doc = Lampa.Utils.parseHtml(html);
                var firstMovie = doc.find('article a').get(0);

                if (!firstMovie) {
                    callback([]);
                    return;
                }

                var item = {
                    title: firstMovie.title || object.title,
                    url: firstMovie.href, // ссылка на страницу фильма
                    type: 'movie',
                    quality: 'WEB',
                    external: true
                };

                callback([item]);
            }, function () {
                callback([]);
            });
        }

        /**
         * Возврат детали фильма для WebView
         */
        function detail(item, callback) {
            callback([{
                title: item.title,
                url: item.url,
                type: 'movie',
                quality: 'WEB',
                external: true
            }]);
        }

        /**
         * Регистрация источника
         */
        Lampa.Source.Online.add({
            id: 'sinemaizle_webview',
            name: 'Sinemaizle (WebView)',
            type: 'movie',
            search: searchFilm,
            detail: detail
        });

        Lampa.Plugin.add({
            name: 'Sinemaizle WebView',
            version: '1.0',
            author: 'qazim'
        });
    });
})();
