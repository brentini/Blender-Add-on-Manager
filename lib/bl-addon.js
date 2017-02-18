'use strict';

var utils = require('nutti_utils');

var BL_INFO_UNDEF = "626c5f696e666f5f@UNDEF";

var blAddon = {

    // if there is undefined entry, fake data is used
    validateBlInfo: function (info) {
        var out = info;
        var keys = [
            'author', 'blender', 'category', 'description', 'location', 'name', 'support',
            'tracker_url', 'version', 'warning', 'wiki_url'
        ]
        for (var i = 0; i < keys.length; ++i) {
            var k = keys[i];
            out[k] = out[k] || BL_INFO_UNDEF;
            if (utils.is('Array', out[k])) {
                out[k] = out[k].join(', ');
            }
        }

        return out;
    },


    compareAddonVersion: function (v1, v2) {
        if (v1 === BL_INFO_UNDEF) {
            if (v2 === BL_INFO_UNDEF) {
                return 0;   // ver1 == ver2
            }
            return -1;   // ver1 < ver2
        }
        if (v2 === BL_INFO_UNDEF) {
            return 1;   // ver1 > ver2
        }

        return this.compareVersion(v1.split('.'), v2.split('.'));
    },

    // ver1 > ver2 : 1
    // ver1 == ver2 : 0
    // ver1 < ver2 : -1
    compareVersion: function (v1, v2) {
        var len = v1.length;
        if (len < v2.length) {
            len = v2.length;
        }

        if (v1.length != v2.length) {
            console.log('[INFO] Argument is not same size. (ver1:' + v1 + ', ver2:' + v2 + ')');
        }

        
        function comp(v1, v2, idx, len) {
            if (v1[idx] === undefined) {
                if (v2[idx] === undefined) {
                    return 0;   // v1 == v2
                }
                return -1;  // v1 < v2
            }
            if (v2[idx] === undefined) {
                return 1;   // v1 > v2
            }

            if (len <= idx) {
                console.log('[WARN] Index over');
                return 0;
            } 

            if (v1[idx] > v2[idx]) {
                return 1;   // v1 > v2
            }
            else if (v1[idx] < v2[idx]) {
                return -1;  // v1 < v2
            }

            return comp(v1, v2, idx + 1, len);
        }


        return comp(v1, v2, 0, len);
    }

};

module.exports = blAddon;
