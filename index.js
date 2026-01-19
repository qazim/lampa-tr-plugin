(function() {
    'use strict';

    var plugin_name = 'SinemaIzle';
    var base_url = 'https://sinemaizle.org';

    function startPlugin() {
        var manifest = {
            type: 'video',
            version: '1.0.1',
            name: plugin_name,
            description: 'Онлайн просмотр с sinemaizle.org',
            component: 'sinemaizle'
        };

        Lampa.Manifest.plugins = manifest;

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

            this.create = function() {
                this.activity.loader(true);
                
                return this.render();
            };

            this.search = function(object, query) {
                var _this = this;
                
                this.activity.loader(true);
                
                // Используем прокси для обхода CORS
                var search_url = 'https://cors-anywhere.herokuapp.com/' + base_url + '/?s=' + encodeURIComponent(query);
                
                network.silent(search_url, this.parseSearchResults.bind(this), function(a, c) {
                    _this.empty(Lampa.Lang.translate('torrent_parser_request_error'));
                });
            };

            this.parseSearchResults = function(str) {
                var _this = this;
                
                this.activity.loader(false);
                
                items = [];
                
                try {
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(str, 'text/html');
                    
                    // Адаптируйте селекторы под структуру сайта
                    var results = doc.querySelectorAll('article, .movie-item, .post');
                    
                    results.forEach(function(item, index) {
                        try {
                            var link = item.querySelector('a');
                            var title_elem = item.querySelector('h2, h3, .title, .entry-title');
                            var img = item.querySelector('img');
                            
                            if (link && title_elem) {
                                var url = link.href;
                                if (url.indexOf('http') !== 0) {
                                    url = base_url + url;
                                }
                                
                                var img_src = '';
                                if (img) {
                                    img_src = img.src || img.getAttribute('data-src') || '';
                                    if (img_src && img_src.indexOf('http') !== 0) {
                                        img_src = base_url + img_src;
                                    }
                                }
                                
                                items.push({
                                    title: title_elem.textContent.trim(),
                                    url: url,
                                    img: img_src,
                                    quality: '',
                                    year: ''
                                });
                            }
                        } catch(e) {
                            console.log('SinemaIzle parse error:', e);
                        }
                    });
                    
                    this.build();
                    
                    if (items.length === 0) {
                        this.empty();
                    }
                } catch(e) {
                    console.log('SinemaIzle error:', e);
                    this.empty();
                }
            };

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
                    if (img) {
                        img.onload = function() {
                            item.addClass('card--loaded');
                        };
                        img.onerror = function(e) {
                            img.src = './img/img_broken.svg';
                        };
                        if (element.img) {
                            img.src = element.img;
                        }
                    }
                    
                    item.on('hover:focus', function() {
                        active = items.indexOf(element);
                        scroll.update(item, true);
                    });
                    
                    item.on('hover:enter', function() {
                        _this.openMovie(element);
                    });
                    
                    scroll.append(item);
                });
                
                scroll.append($('<div class="torrent-list__footer"></div>'));
            };

            this.openMovie = function(element) {
                var _this = this;
                
                Lampa.Activity.loading(true);
                
                var movie_url = 'https://cors-anywhere.herokuapp.com/' + element.url;
                
                network.silent(movie_url, function(str) {
                    Lampa.Activity.loading(false);
                    
                    try {
                        var parser = new DOMParser();
                        var doc = parser.parseFromString(str, 'text/html');
                        
                        var iframe = doc.querySelector('iframe[src*="player"], iframe[src*="video"], iframe[src*="embed"]');
                        var video = doc.querySelector('video source, video');
                        
                        var video_url = '';
                        
                        if (iframe) {
                            video_url = iframe.src || iframe.getAttribute('data-src');
                        } else if (video) {
                            video_url = video.src || video.querySelector('source')?.src;
                        }
                        
                        if (video_url) {
                            Lampa.Player.play({
                                title: element.title,
                                url: video_url
                            });
                            
                            Lampa.Player.playlist([{
                                title: element.title,
                                url: video_url
                            }]);
                        } else {
                            Lampa.Noty.show('Видео не найдено');
                        }
                    } catch(e) {
                        console.log('SinemaIzle player error:', e);
                        Lampa.Noty.show('Ошибка загрузки видео');
                    }
                }, function(a, c) {
                    Lampa.Activity.loading(false);
                    Lampa.Noty.show('Ошибка загрузки страницы');
                });
            };

            this.empty = function(msg) {
                var empty = Lampa.Template.get('list_empty');
                if (msg) empty.find('.empty__descr').text(msg);
                scroll.render().addClass('torrent-list');
                scroll.append(empty);
                this.loading(false);
            };

            this.start = function() {
                if (Lampa.Activity.active().activity !== this.activity) return;
                
                this.search(object, object.search);
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

        Lampa.Component.add('sinemaizle', Component);
        
        // Добавляем в список онлайн источников
        Lampa.Template.add('sinemaizle_style', '<style>.sinemaizle-plugin{padding:1em}</style>');
        $('body').append(Lampa.Template.get('sinemaizle_style', {}, true));
        
        console.log('SinemaIzle plugin loaded successfully');
        Lampa.Noty.show('Плагин SinemaIzle загружен');
    }

    if (window.appready) {
        startPlugin();
    } else {
        Lampa.Listener.follow('app', function(e) {
            if (e.type === 'ready') {
                startPlugin();
            }
        });
    }

})();
