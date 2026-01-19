(function () {
    'use strict';

    Lampa.Listener.follow('app', function (e) {
        if (e.type !== 'ready') return;

        var BASE_URL = 'https://sinemaizle.org';

        function parse(html) {
            return Lampa.Utils.parseHtml(html);
        }

        Lampa.Source.Online.add({
            id: 'sinemaizle',
            name: 'Sinemaizle',
            type: 'movie',

            search: function (query, callback) {
                Lampa.Network.get(BASE_URL + '/?s=' + encodeURIComponent(query), function (html) {
                    var doc = parse(html);
                    var items = [];

                    doc.find('article').each(function () {
                        var a = this.querySelector('a');
                        var img = this.querySelector('img');
                        if (!a || !img) return;

                        items.push({
                            title: img.alt,
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
                Lampa.Network.get(url, function (html) {
                    var doc = parse(html);
                    var iframe = doc.find('iframe').get(0);

                    if (!iframe) {
                        callback([]);
                        return;
                    }

                    callback([{
                        title: 'Sinemaizle',
                        url: iframe.src,
                        quality: 'HD'
                    }]);
                });
            }
        });
    });
})();
