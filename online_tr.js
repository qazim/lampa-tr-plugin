(function() {
  'use strict';

  var BASE_URL = 'https://sinemaizle.org';

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
    var loading_attempts = 0;

    this.initialize = function() {
      var _this = this;
      
      filter.onSearch = function(value) {
        Lampa.Activity.replace({
          search: value,
          page: 1
        });
      };
      
      filter.onBack = function() {
        _this.start();
      };
      
      filter.render().find('.selector').on('hover:enter', function() {
        // Остановка таймеров если нужно
      });
      
      scroll.body().addClass('torrent-list');
      files.appendFiles(scroll.render());
      files.appendHead(filter.render());
      scroll.minus(files.render().find('.explorer__files-head'));
      
      Lampa.Controller.enable('content');
      
      this.search();
    };

    this.search = function() {
      this.activity.loader(true);
      
      var search_url = BASE_URL + '/?s=' + encodeURIComponent(object.search || object.movie.title);
      
      network.silent(search_url, this.parseResults.bind(this), this.onError.bind(this), false, {
        dataType: 'text'
      });
    };

    this.parseResults = function(html) {
      var _this = this;
      this.activity.loader(false);
      
      items = [];
      
      try {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');
        
        // Адаптируйте селекторы под структуру sinemaizle.org
        var results = doc.querySelectorAll('article, .movie-item, .film-item, .post');
        
        results.forEach(function(item) {
          try {
            var link = item.querySelector('a');
            var title_elem = item.querySelector('h2, h3, .title, .entry-title');
            var img = item.querySelector('img');
            var year_elem = item.querySelector('.year, .date');
            
            if (link && title_elem) {
              var url = link.href;
              if (!url.startsWith('http')) {
                url = BASE_URL + url;
              }
              
              var img_src = '';
              if (img) {
                img_src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || '';
                if (img_src && !img_src.startsWith('http')) {
                  img_src = BASE_URL + img_src;
                }
              }
              
              items.push({
                title: title_elem.textContent.trim(),
                url: url,
                img: img_src,
                year: year_elem ? year_elem.textContent.trim() : '',
                quality: ''
              });
            }
          } catch(e) {
            console.log('SinemaIzle parse item error:', e);
          }
        });
        
        if (items.length > 0) {
          this.buildResults();
        } else {
          this.empty();
        }
        
      } catch(e) {
        console.log('SinemaIzle parse error:', e);
        this.empty();
      }
    };

    this.buildResults = function() {
      var _this = this;
      
      scroll.clear();
      
      items.forEach(function(element) {
        var info = [];
        if (element.year) info.push(element.year);
        
        var data = {
          title: element.title,
          time: '',
          info: info.join(' • ')
        };
        
        var html = Lampa.Template.get('online_prestige_folder', data);
        
        var image = html.find('.online-prestige__img');
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
        
        html.on('hover:enter', function() {
          _this.openMovie(element);
        });
        
        html.on('hover:focus', function(e) {
          last = e.target;
          scroll.update($(e.target), true);
        });
        
        scroll.append(html);
      });
      
      Lampa.Controller.enable('content');
    };

    this.openMovie = function(element) {
      var _this = this;
      
      Lampa.Activity.push({
        url: element.url,
        title: element.title,
        component: 'sinemaizle_player',
        page: 1,
        movie: {
          title: element.title,
          url: element.url
        }
      });
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
      this.initialize();
    };

    this.pause = function() {};
    this.stop = function() {};
    this.render = function() {
      return files.render();
    };
    
    this.destroy = function() {
      network.clear();
      files.destroy();
      scroll.destroy();
    };
  }

  // Компонент для проигрывателя
  function playerComponent(object) {
    var network = new Lampa.Reguest();
    var scroll = new Lampa.Scroll({
      mask: true,
      over: true
    });
    
    this.create = function() {
      this.activity.loader(true);
      return this.render();
    };

    this.search = function() {
      var _this = this;
      
      network.silent(object.movie.url, function(html) {
        _this.activity.loader(false);
        _this.parsePlayer(html);
      }, function() {
        _this.activity.loader(false);
        Lampa.Noty.show('Не удалось загрузить видео');
      }, false, {
        dataType: 'text'
      });
    };

    this.parsePlayer = function(html) {
      try {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');
        
        // Поиск iframe с видео
        var iframe = doc.querySelector('iframe[src*="player"], iframe[src*="video"], iframe[src*="embed"]');
        
        if (iframe) {
          var video_url = iframe.src || iframe.getAttribute('data-src');
          
          if (video_url) {
            Lampa.Player.play({
              title: object.movie.title,
              url: video_url
            });
            
            Lampa.Player.playlist([{
              title: object.movie.title,
              url: video_url
            }]);
          } else {
            Lampa.Noty.show('Видео не найдено');
          }
        } else {
          Lampa.Noty.show('Плеер не найден');
        }
      } catch(e) {
        console.log('SinemaIzle player error:', e);
        Lampa.Noty.show('Ошибка загрузки плеера');
      }
    };

    this.start = function() {
      this.search();
    };

    this.pause = function() {};
    this.stop = function() {};
    this.render = function() {
      return scroll.render();
    };
    
    this.destroy = function() {
      network.clear();
      scroll.destroy();
    };
  }

  function startPlugin() {
    window.sinemaizle_plugin = true;
    
    var manifest = {
      type: 'video',
      version: '1.0.0',
      name: 'SinemaIzle',
      description: 'Онлайн просмотр с sinemaizle.org',
      component: 'sinemaizle'
    };

    Lampa.Manifest.plugins = manifest;

    // Добавляем стили
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
        .online-prestige__info{display:flex;align-items:center;margin-top:0.5em}
        .online-prestige.focus::after{content:'';position:absolute;top:-0.6em;left:-0.6em;right:-0.6em;bottom:-0.6em;border-radius:.7em;border:solid .3em #fff;z-index:-1}
        .online-prestige+.online-prestige{margin-top:1.5em}
      </style>
    `);
    $('body').append(Lampa.Template.get('sinemaizle_css', {}, true));

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

    // Регистрируем компоненты
    Lampa.Component.add('sinemaizle', component);
    Lampa.Component.add('sinemaizle_player', playerComponent);

    // Добавляем кнопку в карточку фильма
    var button = `
      <div class="full-start__button selector view--sinemaizle" data-subtitle="SinemaIzle v1.0.0">
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
            title: 'SinemaIzle',
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
