(function() {
  'use strict';

  var BASE_URL = 'https://sinemaizle.org';
  var PROXY_URL = 'https://api.allorigins.win/raw?url=';

  function component(object) {
    var network = new Lampa.Reguest();
    var scroll = new Lampa.Scroll({
      mask: true,
      over: true
    });
    var files = new Lampa.Explorer(object);
    var filter = new Lampa.Filter(object);
    
    var last;
    var items = [];
    var html = $('<div></div>');

    this.create = function() {
      var _this = this;
      
      this.activity.loader(true);
      
      filter.onSearch = function(value) {
        Lampa.Activity.replace({
          search: value,
          page: 1
        });
      };
      
      filter.onBack = function() {
        _this.start();
      };
      
      scroll.body().addClass('torrent-list');
      files.appendFiles(scroll.render());
      files.appendHead(filter.render());
      scroll.minus(files.render().find('.explorer__files-head'));
      
      Lampa.Controller.enable('content');
      
      this.search();
      
      return this.render();
    };

    this.search = function() {
      var _this = this;
      this.activity.loader(true);
      
      var search_query = encodeURIComponent(object.search || object.movie.title);
      var search_url = BASE_URL + '/arama?s=' + search_query;
      var proxy_url = PROXY_URL + encodeURIComponent(search_url);
      
      console.log('SinemaIzle: Searching for:', object.search || object.movie.title);
      console.log('SinemaIzle: URL:', proxy_url);
      
      network.clear();
      network.timeout(20000);
      
      network.native(proxy_url, function(html_text) {
        console.log('SinemaIzle: Response received, length:', html_text.length);
        _this.parseResults(html_text);
      }, function(error) {
        console.log('SinemaIzle: Network error:', error);
        _this.onError();
      }, false, {
        dataType: 'text'
      });
    };

    this.parseResults = function(html_text) {
      var _this = this;
      this.activity.loader(false);
      
      items = [];
      
      try {
        console.log('SinemaIzle: Parsing HTML...');
        
        var parser = new DOMParser();
        var doc = parser.parseFromString(html_text, 'text/html');
        
        // Используем правильный селектор
        var results = doc.querySelectorAll('.gallery-item');
        
        console.log('SinemaIzle: Found .gallery-item:', results.length);
        
        // Если не нашли, пробуем альтернативные селекторы
        if (results.length === 0) {
          var alternativeSelectors = [
            'article',
            '.post',
            '.movie-item',
            '.film-item',
            '[class*="move_k"]',
            '[class*="gallery"]',
            '[class*="item"]'
          ];
          
          for (var i = 0; i < alternativeSelectors.length; i++) {
            results = doc.querySelectorAll(alternativeSelectors[i]);
            if (results.length > 0) {
              console.log('SinemaIzle: Using alternative selector:', alternativeSelectors[i], 'found:', results.length);
              break;
            }
          }
        }
        
        results.forEach(function(item, index) {
          try {
            var link = item.querySelector('a');
            var img = item.querySelector('img');
            
            if (link) {
              var url = link.href;
              
              // Исправляем URL
              if (!url.startsWith('http')) {
                if (url.startsWith('//')) {
                  url = 'https:' + url;
                } else if (url.startsWith('/')) {
                  url = BASE_URL + url;
                } else {
                  url = BASE_URL + '/' + url;
                }
              }
              
              // Название из атрибута title ссылки
              var title = link.getAttribute('title') || 
                         link.textContent.trim() ||
                         (img ? img.getAttribute('alt') : '');
              
              var img_src = '';
              if (img) {
                img_src = img.src || 
                         img.getAttribute('data-src') || 
                         img.getAttribute('data-lazy-src') ||
                         img.getAttribute('data-original') || '';
                
                // Исправляем URL изображения
                if (img_src && !img_src.startsWith('http')) {
                  if (img_src.startsWith('//')) {
                    img_src = 'https:' + img_src;
                  } else if (img_src.startsWith('/')) {
                    img_src = BASE_URL + img_src;
                  } else {
                    img_src = BASE_URL + '/' + img_src;
                  }
                }
              }
              
              if (title && title.length > 1) {
                items.push({
                  title: title,
                  url: url,
                  img: img_src,
                  year: '',
                  quality: ''
                });
                
                if (index < 3) {
                  console.log('SinemaIzle: Item', index, ':', title);
                }
              }
            }
          } catch(e) {
            console.log('SinemaIzle: Error parsing item:', e);
          }
        });
        
        console.log('SinemaIzle: Total items found:', items.length);
        
        if (items.length > 0) {
          this.buildResults();
        } else {
          this.empty('Ничего не найдено. Попробуйте другой запрос.');
        }
        
      } catch(e) {
        console.log('SinemaIzle: Parse error:', e);
        this.empty('Ошибка парсинга: ' + e.message);
      }
    };

    this.buildResults = function() {
      var _this = this;
      
      scroll.clear();
      
      items.forEach(function(element) {
        var data = {
          title: element.title,
          time: '',
          info: 'SinemaIzle.org'
        };
        
        var item_html = Lampa.Template.get('online_prestige_folder', data);
        
        var image = item_html.find('.online-prestige__img');
        if (element.img) {
          var img = $('<img>');
          img.on('load', function() {
            image.addClass('online-prestige__img--loaded');
          });
          img.on('error', function() {
            img.attr('src', './img/img_broken.svg');
          });
          img.attr('src', element.img);
          image.append(img);
        } else {
          image.append($('<img src="./img/img_broken.svg">'));
        }
        
        item_html.on('hover:enter', function() {
          _this.openMovie(element);
        });
        
        item_html.on('hover:focus', function(e) {
          last = e.target;
          scroll.update($(e.target), true);
        });
        
        scroll.append(item_html);
      });
      
      Lampa.Controller.enable('content');
    };

    this.openMovie = function(element) {
      var _this = this;
      
      console.log('SinemaIzle: Opening movie:', element.title);
      
      Lampa.Loading.start(function() {
        Lampa.Loading.stop();
        Lampa.Controller.toggle('content');
        network.clear();
      });
      
      var proxy_url = PROXY_URL + encodeURIComponent(element.url);
      
      network.clear();
      network.timeout(20000);
      
      network.native(proxy_url, function(html_text) {
        Lampa.Loading.stop();
        console.log('SinemaIzle: Movie page loaded');
        _this.parsePlayer(html_text, element);
      }, function() {
        Lampa.Loading.stop();
        Lampa.Noty.show('Не удалось загрузить страницу фильма');
      }, false, {
        dataType: 'text'
      });
    };

    this.parsePlayer = function(html_text, element) {
      try {
        console.log('SinemaIzle: Parsing player...');
        
        var parser = new DOMParser();
        var doc = parser.parseFromString(html_text, 'text/html');
        
        // Ищем iframe с видео
        var iframes = doc.querySelectorAll('iframe');
        console.log('SinemaIzle: Found iframes:', iframes.length);
        
        var video_url = null;
        
        for (var i = 0; i < iframes.length; i++) {
          var iframe = iframes[i];
          var src = iframe.src || iframe.getAttribute('data-src');
          
          if (src) {
            console.log('SinemaIzle: Iframe src:', src);
            
            // Пропускаем рекламные iframe
            if (src.indexOf('ads') === -1 && 
                src.indexOf('ad.') === -1 && 
                src.indexOf('doubleclick') === -1 &&
                src.indexOf('google') === -1) {
              video_url = src;
              break;
            }
          }
        }
        
        // Если iframe не найден, ищем video тег
        if (!video_url) {
          var video = doc.querySelector('video source, video');
          if (video) {
            video_url = video.src || (video.querySelector('source') ? video.querySelector('source').src : '');
            console.log('SinemaIzle: Found video tag:', video_url);
          }
        }
        
        if (video_url) {
          console.log('SinemaIzle: Playing:', video_url);
          
          Lampa.Player.play({
            title: element.title,
            url: video_url
          });
          
          Lampa.Player.playlist([{
            title: element.title,
            url: video_url
          }]);
        } else {
          console.log('SinemaIzle: No video source found');
          Lampa.Noty.show('Плеер не найден на странице');
        }
        
      } catch(e) {
        console.log('SinemaIzle: Player parse error:', e);
        Lampa.Noty.show('Ошибка: ' + e.message);
      }
    };

    this.onError = function() {
      this.activity.loader(false);
      this.empty('Ошибка подключения. Проверьте интернет соединение.');
    };

    this.empty = function(msg) {
      var empty = Lampa.Template.get('list_empty');
      if (msg) empty.find('.empty__descr').text(msg);
      scroll.clear();
      scroll.append(empty);
      this.activity.loader(false);
    };

    this.start = function() {
      if (Lampa.Activity.active().activity !== this.activity) return;
      Lampa.Controller.add('content', {
        toggle: function() {
          Lampa.Controller.collectionSet(scroll.render(), files.render());
          Lampa.Controller.collectionFocus(last || false, scroll.render());
        },
        left: function() {
          if (Navigator.canmove('left')) Navigator.move('left');
          else Lampa.Controller.toggle('menu');
        },
        up: function() {
          if (Navigator.canmove('up')) Navigator.move('up');
          else Lampa.Controller.toggle('head');
        },
        down: function() {
          Navigator.move('down');
        },
        right: function() {
          if (Navigator.canmove('right')) Navigator.move('right');
          else filter.show(Lampa.Lang.translate('title_filter'), 'filter');
        },
        back: this.back.bind(this)
      });
      Lampa.Controller.toggle('content');
    };

    this.pause = function() {};
    this.stop = function() {};
    this.render = function() {
      return files.render();
    };
    this.back = function() {
      Lampa.Activity.backward();
    };
    
    this.destroy = function() {
      network.clear();
      files.destroy();
      scroll.destroy();
      html.remove();
    };
  }

  function startPlugin() {
    window.sinemaizle_plugin = true;
    
    var manifest = {
      type: 'video',
      version: '1.0.3',
      name: 'SinemaIzle',
      description: 'Онлайн просмотр с sinemafilmizle.com.tr',
      component: 'sinemaizle'
    };

    Lampa.Manifest.plugins = manifest;

    Lampa.Template.add('sinemaizle_css', `
      <style>
        .online-prestige{position:relative;border-radius:.3em;background-color:rgba(0,0,0,0.3);display:flex}
        .online-prestige__body{padding:1.2em;line-height:1.3;flex-grow:1;position:relative}
        .online-prestige__img{position:relative;width:13em;flex-shrink:0;min-height:8.2em}
        .online-prestige__img>img{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;border-radius:.3em;opacity:0;transition:opacity .3s}
        .online-prestige__img--loaded>img{opacity:1}
        .online-prestige__folder{padding:1em;flex-shrink:0}
        .online-prestige__folder>svg{width:4.4em !important;height:4.4em !important}
        .online-prestige__title{font-size:1.7em;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical}
        .online-prestige__info{display:flex;align-items:center;margin-top:0.5em;opacity:0.7}
        .online-prestige.focus::after{content:'';position:absolute;top:-0.6em;left:-0.6em;right:-0.6em;bottom:-0.6em;border-radius:.7em;border:solid .3em #fff;z-index:-1}
        .online-prestige+.online-prestige{margin-top:1.5em}
      </style>
    `);
    $('body').append(Lampa.Template.get('sinemaizle_css', {}, true));

    Lampa.Template.add('online_prestige_folder', `
      <div class="online-prestige online-prestige--folder selector">
        <div class="online-prestige__folder">
          <svg viewBox="0 0 128 112" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect y="20" width="128" height="92" rx="13" fill="white"></rect>
            <path d="M29.9963 8H98.0037C96.0446 3.3021 91.4079 0 86 0H42C36.5921 0 31.9555 3.3021 29.9963 8Z" fill="white" fill-opacity="0.23"></path>
            <rect x="11" y="8" width="106" height="76" rx="13" fill="white" fill-opacity="0.51"></rect>
          </svg>
        </div>
        <div class="online-prestige__body">
          <div class="online-prestige__title">{title}</div>
          <div class="online-prestige__info">{info}</div>
        </div>
      </div>
    `);

    Lampa.Component.add('sinemaizle', component);

    var button = `
      <div class="full-start__button selector view--sinemaizle" data-subtitle="SinemaIzle v1.0.3">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
        <span>SinemaIzle</span>
      </div>
    `;

    Lampa.Listener.follow('full', function(e) {
      if (e.type == 'complite') {
        var btn = $(Lampa.Lang.translate(button));
        btn.on('hover:enter', function() {
          Lampa.Activity.push({
            url: '',
            title: 'SinemaFilmIzle',
            component: 'sinemaizle',
            search: e.data.movie.title || e.data.movie.name,
            movie: e.data.movie,
            page: 1
          });
        });
        e.object.activity.render().find('.view--torrent').after(btn);
      }
    });

    console.log('SinemaIzle plugin v' + manifest.version + ' loaded');
  }

  if (!window.sinemaizle_plugin) {
    if (window.appready) startPlugin();
    else {
      Lampa.Listener.follow('app', function(e) {
        if (e.type == 'ready') startPlugin();
      });
    }
  }

})();
