(function () {
    'use strict';

    var BASE_URL = 'https://sinemaizle.org';

    var plugin = {
        name: 'Sinemaizle',
        version: '1.0.0',
        type: 'online',
        author: 'custom',
        description: 'Sinemaizle.org online source'
    };

    function request(url) {
        return new Promise(function (resolve, reject) {
            Lampa.Network.get(url, function (html) {
                resolve(html);
            }, function () {
                reject();
            });
        });
    }

    function parseList(html) {
        var items = [];
        var div = document.createElement('div');
        div.innerHTML = html;

        div.querySelectorAll('.movie-item, .film, article').forEach(function (el) {
            var a = el.querySelector('a');
            var img = el.querySelector('img');

            if (!a) return;

            items.push({
                title: a.getAttribute('title') || a.textContent.trim(),
                url: a.href,
                poster: img ? img.src : '',
                type: 'movie'
            });
        });

        return items;
    }

    function parsePlayer(html) {
        var div = document.createElement('div');
        div.innerHTML = html;

        var iframe = div.querySelector('iframe');
        if (!iframe) return [];

        return [{
            title: 'Sinemaizle',
            url: iframe.src,
            quality: 'HD'
        }];
    }

    Lampa.Source.Online.add({
        id: 'sinemaizle',
        name: 'Sinemaizle',
        type: 'movie',

        search: function (query, callback) {
            request(BASE_URL + '/?s=' + encodeURIComponent(query))
                .then(function (html) {
                    callback(parseList(html));
                })
                .catch(function () {
                    callback([]);
                });
        },

        category: function (category, page, callback) {
            request(BASE_URL)
                .then(function (html) {
                    callback(parseList(html));
                })
                .catch(function () {
                    callback([]);
                });
        },

        detail: function (url, callback) {
            request(url)
                .then(function (html) {
                    callback(parsePlayer(html));
                })
                .catch(function () {
                    callback([]);
                });
        }
    });

    Lampa.Plugin.add(plugin);
})();
