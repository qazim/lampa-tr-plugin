(function() {
    'use strict';

    // Название плагина
    var plugin_name = 'SinemaIzle';
    
    // Конфигурация
    var manifest = {
        type: 'video',
        version: '1.0.0',
        name: plugin_name,
        description: 'Поиск контента на sinemaizle.org',
        component: 'sinemaizle'
    };

    // Основной класс плагина
    function Component(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({
            mask: true,
            over: true
        });
        var items = [];
        var html = $('<div></div>');
        var active = 0;
        var base_url = 'https://sinemaizle.org';

        // Парсинг поисковых результатов
        this.parseSearch = function(str) {
            items = [];
            var parser = new DOMParser();
            var doc = parser.parseFromString(str, 'text/html');
            
            // Здесь нужно адаптировать селекторы под структуру сайта
            var results = doc.querySelectorAll('.movie-item, .film-item, article'); 
            
            results.forEach(function(item) {
                try {
                    var link = item.querySelector('a');
                    var img = item.querySelector('img');
                    var title = item.querySelector('.title, h2, h3');
                    
                    if (link && title) {
                        items.push({
                            title: title.textContent.trim(),
                            url: link.href.indexOf('http') === 0 ? link.href : base_url + link.getAttribute('href'),
                            img: img ? (img.src.indexOf('http') === 0 ? img.src : base_url + img.src) : '',
                            quality: item.querySelector('.quality') ? item.querySelector('.quality').textContent : '',
                            year: item.querySelector('.year') ? item.querySelector('.year').textContent : ''
                        });
                    }
                } catch(e) {
                    console.log('Ошибка парсинга элемента:', e);
                }
            });
        };

        // Поиск
        this.search = function(query) {
            var _this = this;
            
            network.silent(base_url + '/search/' + encodeURIComponent(query), function(str) {
                _this.parseSearch(str);
                _this.build();
            }, function(error) {
                Lampa.Noty.show('Ошибка поиска: ' + error);
            });
        };

        // Построение интерфейса
        this.build = function() {
            var _this = this;
            
            scroll.render().addClass('torrent-list');
            
            items.forEach(function(element) {
                var item = Lampa.Template.get('card', {
                    title: element.title,
                    release_year: element.year
                });
                
                item.addClass('card--collection');
                
                var img = item.find('.card__img')[0];
                img.onload = function() {
                    item.addClass('card--loaded');
                };
                img.onerror = function() {
                    img.src = './img/img_broken.svg';
                };
                img.src = element.img;
                
                item.on('hover:focus', function() {
                    active = items.indexOf(element);
                    scroll.update(item, true);
                });
                
                item.on('hover:enter', function() {
                    _this.openMovie(element);
                });
                
                scroll.append(item);
            });
            
            if (items.length === 0) {
                scroll.append(Lampa.Template.get('list_empty'));
            }
            
            scroll.append($('<div class="torrent-list__footer"><div>'));
            html.append(scroll.render());
        };

        // Открытие фильма
        this.openMovie = function(element) {
            network.silent(element.url, function(str) {
                var parser = new DOMParser();
                var doc = parser.parseFromString(str, 'text/html');
                
                // Поиск видео плеера (нужно адаптировать под конкретный сайт)
                var iframe = doc.querySelector('iframe[src*="player"], iframe[src*="video"]');
                var video = doc.querySelector('video source');
                
                var video_url = '';
                if (iframe) {
                    video_url = iframe.src;
                } else if (video) {
                    video_url = video.src;
                }
                
                if (video_url) {
                    Lampa.Player.play({
                        title: element.title,
                        url: video_url
                    });
                } else {
                    Lampa.Noty.show('Не удалось найти видео');
                }
            }, function(error) {
                Lampa.Noty.show('Ошибка загрузки: ' + error);
            });
        };

        // Инициализация
        this.start = function() {
            if (Lampa.Activity.active().activity !== this.activity) return;
            this.search(object.search);
        };

        this.pause = function() {};
        this.stop = function() {};
        this.render = function() {
            return html;
        };
        this.destroy = function() {
            network.clear();
            scroll.destroy();
            html.remove();
        };
    }

    // Регистрация компонента
    Lampa.Component.add('sinemaizle', Component);

    // Добавление в меню поиска
    Lampa.Manifest.plugins = manifest;
    
    // Регистрация источника онлайн контента
    function startPlugin() {
        window.plugin_sinemaizle_ready = true;
        
        Lampa.Template.add('sinemaizle_style', '<style>.sinemaizle-plugin{padding:1em}</style>');
        $('body').append(Lampa.Template.get('sinemaizle_style', {}, true));
        
        // Добавление в список онлайн источников
        if (Lampa.Arrays && Lampa.Arrays.onlines) {
            Lampa.Arrays.onlines.push({
                title: 'SinemaIzle',
                component: 'sinemaizle'
            });
        }
    }

    if (window.appready) startPlugin();
    else {
        Lampa.Listener.follow('app', function(e) {
            if (e.type === 'ready') startPlugin();
        });
    }

})();
