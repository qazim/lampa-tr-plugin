(function () {
    'use strict';

    var BASE_URL = 'https://sinemaizle.org';
    
    // Манифест плагина
    var manifest = {
        type: 'video',
        version: '1.0.2',
        name: 'SinemaIzle',
        description: 'Онлайн просмотр с sinemaizle.org',
        component: 'sinemaizle_online'
    };

    // Класс компонента
    function Component(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({ 
            mask: true, 
            over: true 
        });
        
        var items = [];
        var html = $('<div></div>');
        var active = 0;
        var _this = this;

        this.create = function () {
            return this.render();
        };

        this.search = function (object, data) {
            this.activity.loader(true);
            
            var query = object.search || data;
            var search_url = BASE_URL + '/?s=' + encodeURIComponent(query);
            
            network.clear();
            network.timeout(10000);
            
            network.silent(search_url, this.parseSearch.bind(this), this.onError.bind(this), false, {
                dataType: 'text'
            });
        };

        this.parseSearch = function (str) {
            this.activity.loader(false);
            
            items = [];
            
            try {
                var html_doc = str;
                var matches;
                
                // Простой регулярный парсинг для поиска фильмов
                var pattern = /<article[^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>[\s\S]*?<img[^>]*src=["']([^"']+)["'][^>]*>[\s\S]*?<h[23][^>]*>([^<]+)<\/h[23]>[\s\S]*?<\/article>/gi;
                
                while ((matches = pattern.exec(html_doc)) !== null) {
                    items.push({
                        title: matches[3].trim(),
                        url: matches[1],
                        img: matches[2],
                        quality: '',
                        year: ''
                    });
                }
                
                this.build();
                
                if (items.length === 0) {
                    this.empty();
                }
            } catch (e) {
                console.log('SinemaIzle parse error:', e);
                this.empty();
            }
        };

        this.onError = function () {
            this.activity.loader(false);
            this.empty(Lampa.Lang.translate('torrent_parser_request_error'));
        };

        this.build = function () {
            scroll.clear();
            scroll.render().addClass('torrent-list');
            
            items.forEach(function (element) {
                var item = Lampa.Template.get('card', {
                    title: element.title,
                    release_year: element.year
                });
                
                item.addClass('card--collection');
                
                var img_elem = item.find('.card__img')[0];
                if (img_elem && element.img) {
                    img_elem.onload = function () {
                        item.addClass('card--loaded');
                    };
                    img_elem.onerror = function () {
                        img_elem.src = './img/img_broken.svg';
                    };
                    img_elem.src = element.img;
                }
                
                item.on('hover:focus', function () {
                    active = items.indexOf(element);
                    scroll.update(item, true);
                });
                
                item.on('hover:enter', function () {
                    _this.openMovie(element);
                });
                
                scroll.append(item);
            });
            
            scroll.append($('<div class="torrent-list__footer"></div>'));
            html.append(scroll.render());
        };

        this.openMovie = function (element) {
            Lampa.Activity.push({
                url: '',
                title: element.title,
                component: 'full',
                page: 1,
                movie: {
                    title: element.title,
                    original_title: element.title
                },
                source: 'sinemaizle'
            });
        };

        this.empty = function (msg) {
            var empty = Lampa.Template.get('list_empty');
            if (msg) empty.find('.empty__descr').text(msg);
            scroll.clear();
            scroll.render().addClass('torrent-list');
            scroll.append(empty);
            html.append(scroll.render());
        };

        this.start = function () {
            if (Lampa.Activity.active().activity !== this.activity) return;
            this.search(object, object.search);
        };

        this.pause = function () {};

        this.stop = function () {};

        this.render = function () {
            return html;
        };

        this.destroy = function () {
            network.clear();
            scroll.destroy();
            html.remove();
        };
    }

    // Функция запуска плагина
    function startPlugin() {
        window.plugin_sinemaizle_ready = true;
        
        Lampa.Component.add('sinemaizle_online', Component);
        
        // Добавление стилей
        var style = '<style>.sinemaizle-online{padding:1em}</style>';
        Lampa.Template.add('sinemaizle_style', style);
        $('body').append(Lampa.Template.get('sinemaizle_style', {}, true));
        
        // Регистрация манифеста
        Lampa.Manifest.plugins = manifest;
        
        console.log('SinemaIzle plugin v' + manifest.version + ' loaded');
    }

    // Инициализация
    if (window.appready) {
        startPlugin();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') {
                startPlugin();
            }
        });
    }

})();
