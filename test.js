(function() {
    'use strict';
    
    // Простое уведомление о загрузке
    function startPlugin() {
        console.log('Test plugin loaded!');
        
        if (Lampa.Noty) {
            Lampa.Noty.show('✅ Тестовый плагин успешно загружен!');
        }
        
        if (Lampa.Storage) {
            Lampa.Storage.set('test_plugin_loaded', 'yes');
            console.log('Test plugin: Storage works');
        }
    }
    
    if (window.appready) {
        startPlugin();
    } else if (window.Lampa && Lampa.Listener) {
        Lampa.Listener.follow('app', function(e) {
            if (e.type === 'ready') {
                startPlugin();
            }
        });
    } else {
        // Если Lampa ещё не загружена, ждём
        setTimeout(startPlugin, 1000);
    }
    
})();
