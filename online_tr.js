(function() {
  'use strict';

  var BASE_URL = 'https://www.sinemafilmizle.com.tr';

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
      this.activity.loader(true);
      
      var search_query = encodeURIComponent(object.search || object.movie.title);
      var search_url = BASE_URL + '/?s=' + search_query;
      
      network.silent(search_url, this.parseResults.bind(this), this.onError.bind(this), false, {
        dataType: 'text'
      });
    };

    this.parseResults = function(html_text) {
      var _this = this;
      this.activity.loader(false);
      
      items = [];
      
      try {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html_text, 'text/html');
        
        // Используем правильный селектор из примера
        var results = doc.querySelectorAll('.gallery-item');
        
        if (results.length === 0) {
          // Пробуем альтернативные селекторы
          results = doc.querySelectorAll('article, .post, .movie-item, .film-item');
        }
        
        results.forEach(function(item) {
          try {
            var link = item.querySelector('a');
            var img = item.querySelector('img');
            
            if (link) {
              var url = link.href;
              if (!url.startsWith('http')) {
                url = BASE_URL + url;
              }
              
              // Название из атрибута title ссылки
              var title = link.getAttribute('title') || link.textContent.trim();
              
              var img_src = '';
              if (img) {
                img_src = img.src || img.getAttribute('data-src') || 
                         img.getAttribute('data-lazy-src') || '';
                if (img_src && !img_src.startsWith('http')) {
                  img_src = BASE_URL + img_src;
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
              }
            }
          } catch(e) {
            console.log('SinemaFilmIzle parse item error:', e);
          }
        });
        
        if (items.length > 0) {
          this.buildResults();
        } else {
          this.empty('Ничего не найдено');
        }
        
      } catch(e) {
        console.log('SinemaFilmIzle parse error:', e);
        this.empty('Ошибка парсинга');
      }
    };

    this.buildResults = function() {
      var _this = this;
      
      scroll.clear();
      
      items.forEach(function(element) {
        var data = {
          title: element.title,
          time: '',
          info: ''
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
      
      Lampa.Loading.start(function() {
        Lampa.Loading.stop();
        Lampa.Controller.toggle('content');
        network.clear();
      });
      
      network.silent(element.url, function(html_text) {
        Lampa.Loading.stop();
        _this.parsePlayer(html_text, element);
      }, function() {
        Lampa.Loading.stop();
        Lampa.Noty.show('Не удалось загрузить видео');
      }, false, {
        dataType: 'text'
      });
    };

    this.parsePlayer = function(html_text, element) {
      try {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html_text, 'text/html');
        
        // Ищем iframe с видео
        var iframe = doc.querySelector('iframe[src*="player"], iframe[src*="video"], iframe[src*="embed"], iframe[allowfullscreen]');
        
        if (!iframe) {
          // Пробуем найти любой iframe
          iframe = doc.querySelector('iframe');
        }
        
        if (iframe) {
          var video_url = iframe.src || iframe.getAttribute('data-src');
          
          if (video_url) {
            // Проверяем что это не реклама
            if (video_url.indexOf('ads') === -1 && video_url.indexOf('ad') === -1) {
              Lampa.Player.play({
                title: element.title,
                url: video_url
              });
              
              Lampa.Player.playlist([{
                title: element.title,
                url: video_url
              }]);
              return;
            }
          }
        }
        
        // Если iframe не найден, ищем video тег
        var video = doc.querySelector('video source, video');
        if (video) {
          var video_src = video.src || (video.querySelector('source') ? video.querySelector('source').src : '');
          if (video_src) {
            Lampa.Player.play({
              title: element.title,
              url: video_src
            });
            
            Lampa.Player.playlist([{
              title: element.title,
              url: video_src
            }]);
            return;
          }
        }
        
        Lampa.Noty.show('Плеер не найден на странице');
        
      } catch(e) {
        console.log('SinemaFilmIzle player error:', e);
        Lampa.Noty.show('Ошибка загрузки плеера');
      }
    };

    this.onError = function() {
      this.activity.loader(false);
      this.empty('Ошибка подключения к серверу');
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
    window.sinemafilmizle_plugin = true;
    
    var manifest = {
      type: 'video',
      version: '1.0.2',
      name: 'SinemaFilmIzle',
      description: 'Онлайн просмотр с sinemafilmizle.com.tr',
      component: 'sinemafilmizle'
    };

    Lampa.Manifest.plugins = manifest;

    // Добавляем стили
    Lampa.Template.add('sinemafilmizle_css', `
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
    $('body').append(Lampa.Template.get('sinemafilmizle_css', {}, true));

    // Добавляем шаблоны
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

    // Регистрируем компонент
    Lampa.Component.add('sinemafilmizle', component);

    // Добавляем кнопку в карточку фильма
    var button = `
      <div class="full-start__button selector view--sinemafilmizle" data-subtitle="SinemaFilmIzle v1.0.2">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
        <span>SinemaFilmIzle</span>
      </div>
    `;

    Lampa.Listener.follow('full', function(e) {
      if (e.type == 'complite') {
        var btn = $(Lampa.Lang.translate(button));
        btn.on('hover:enter', function() {
          Lampa.Activity.push({
            url: '',
            title: 'SinemaFilmIzle',
            component: 'sinemafilmizle',
            search: e.data.movie.title || e.data.movie.name,
            movie: e.data.movie,
            page: 1
          });
        });
        e.object.activity.render().find('.view--torrent').after(btn);
      }
    });

    console.log('SinemaFilmIzle plugin v' + manifest.version + ' loaded');
  }

  if (!window.sinemafilmizle_plugin) {
    if (window.appready) startPlugin();
    else {
      Lampa.Listener.follow('app', function(e) {
        if (e.type == 'ready') startPlugin();
      });
    }
  }

})();
