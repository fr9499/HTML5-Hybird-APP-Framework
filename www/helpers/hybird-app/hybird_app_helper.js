hybird_app_helper = {
    platform: 'web',
    detect_mode: function () {
        if (this.is_electron() === true) {
            this.platform = 'electron';
        }
        else if (this.isPhoneGap()) {
            this.platform = 'mobile';
        }
        else {
            this.platform = "web";
        }
        $(function () {
            $("body").addClass("platform-" + this.platform);
        });
    },
    /**
     * @author https://stackoverflow.com/a/13252184
     * @returns {Boolean}
     */
    isPhoneGap: function () {
        return (window.cordova || window.PhoneGap || window.phonegap) 
        && /^file:\/{3}[^\/]/i.test(window.location.href) 
        && /ios|iphone|ipod|ipad|android/i.test(navigator.userAgent);
    },

    is_electron: function () {
        try {
            window.nodeRequire = require;
            //delete window.require;
            delete window.exports;
            delete window.module;
            electron = require('electron');
            ipcRenderer = electron.ipcRenderer;
            return true;
        } catch (_e) {
            return false;
        }
    },
    
    // ----------------------
    
    open_window: function (_link, _target) {
        if (this.platform === "electron") {
            ipcRenderer.send('open_window', _link);
        }
        else if (this.platform === "mobile") {
            window.open(_link, "_system");
        }
        else {
            if (_target === undefined) {
                _target = "_blank";
            }
            window.open(_link, _target);
        }
    },
    
    uuid: 0,
    create_uuid: function () {
        var _uuid = this.uuid;
        this.uuid++;
        return _uuid;
    },
    
    console_log: function (_msg) {
        console.log(_msg);
    },
    /**
     * 
     * @param {type} _filename
     * @param {type} _content Base64 format
     * @param {type} _mime
     * @param {type} _filters for Electron
     * @returns {undefined}
     */
    save_as: function (_filename, _content, _mime, _filters) {
        //this.console_log([_filename, _content]);
        switch (this.platform) {
            case 'electron':
                ipcRenderer.send('save_file', _filename, JSON.stringify(_filters), _content, true);
                break;
            case 'mobile':
                //cordova.file.cacheDirectory
                var _filepath = cordova.file.cacheDirectory + "/" + _filename;
                window.resolveLocalFileSystemURL(cordova.file.cacheDirectory, function (dir) {
                    //console.log("got main dir",dir);
                    dir.getFile(_filename, {create: true}, function (file) {
                        //console.log("got the file", file);
                        file.createWriter(function (fileWriter) {
                            var blob = this.b64toFile(_content, _filename, _mime);
                            fileWriter.write(blob);
                            window.plugins.socialsharing.share(_filename, null, _filepath);
                        });
                    });
                });
                break;
            default:    // 'web'
                var blob = this.b64toFile(_content, _filename, _mime);
                saveAs(blob, _filename);
                break;
        }
    },

    /**
     * @author https://stackoverflow.com/a/46405969
     * @param {type} dataURI
     * @returns {Blob}
     */
    b64toFile: function (b64Data, filename, contentType) {
        var sliceSize = 512;
        var byteCharacters = atob(b64Data);
        var byteArrays = [];

        for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            var slice = byteCharacters.slice(offset, offset + sliceSize);
            var byteNumbers = new Array(slice.length);

            for (var i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            var byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }
        var file = new File(byteArrays, filename, {type: contentType});
        return file;
    },
    
    // -----------
    retrieve_web: function (_url, _method, _send_data, _referer, _callback) {
        if (typeof (_callback) !== "function") {
            return false;
        }

        var _send_data_string = [];
        for (var _key in _send_data) {
            _send_data_string.push(_key + "=" + _send_data[_key]);
        }
        _send_data_string = _send_data_string.join("&");

        var _callback_id = "retrieve_web_callback_" + this.create_uuid();

        ipcRenderer.on(_callback_id, function (event, _response, _status) {
            _callback(_response, _status);
        });

        ipcRenderer.send('retrieve_web', _url, _method, _send_data, _referer, _callback_id);
    },
    set_item: function (_key, _value) {
        if (typeof (_value) !== 'string' && typeof (_value) !== 'number') {
            _value = JSON.stringify(_value);
        }
        ipcRenderer.send('set_item', _key, _value);
    },
    get_item: function (_key, _callback) {
        var _callback_id = "get_item_callback_" + this.create_uuid();
        ipcRenderer.on(_callback_id, function (event, _value) {
            //console.log("有回來嗎");
            _callback(_value);
        });
        //console.log([_callback_id, _key]);
        ipcRenderer.send('get_item', _key, _callback_id);
    },
};

setTimeout(function () {
    hybird_app_helper.detect_mode();
}, 0);