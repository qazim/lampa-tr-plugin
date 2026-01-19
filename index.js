(function () {
    'use strict';

    if (!window.Lampa) return;

    var BASE_URL = 'https://sinemaizle.org';

    function request(url, success, error) {
        Lampa.Network.get(url, success, error);
    }

    function htmlToDom(html) {
        var parser = new DOMParser();
        return parser.parseFromString(html, 'text/html');
    }

    Lampa.Source.Online.add({
        id: 'sinemaizle',
        name: 'Sinemaizle',
        type: 'movie',

        search: function (query, callback) {
            request(BASE_URL + '/?s=' + encodeURIComponent(query), function (html) {
                var doc = htmlToDom(html);
                var items = [];

                doc.querySelectorAll('article a').forEach(function (a) {
                    var img = a.querySelector('img');
                    if (!img) return;

                    items.push({
                        title: img.alt || a.title,
                        poster: img.src,
                        url: a.href,
                        type: 'movie'
                    });
                });

                callback(items);
            }, function () {
                callback([]);
            });
        },

        detail: function (url, callback) {
            request(url, function (html) {
                var doc = htmlToDom(html);
                var iframe = doc.querySelector('iframe');

                if (!iframe) {
                    callback([]);
                    return;
                }

                callback([{
                    title: 'Sinemaizle',
                    url: iframe.src,
                    quality: 'HD'
                }]);
            }, function () {
                callback([]);
            });
        }
    });

    Lampa.Plugin.add({
        name: 'Sinemaizle',
        author: 'custom',
        version: '1.0'
    });

})();
