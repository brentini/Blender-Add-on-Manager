'use strict';

var blAddon = require('bl-addon');

function filterAddons(addons, source, status, blVer, category, regex) {
    var list = Object.keys(addons).filter( (key) => {
        // filtered by source
        if (addons[key][source] === undefined) { return false; }

        // filtered by status
        var statusMatched = false;
        for (var i = 0; i < status.length; ++i) {
            if (addons[key]['status'][blVer] && addons[key]['status'][blVer] === status[i]) {
                statusMatched = true;
            }
        }

        // filtered by blender version (only installed)
        if (source === 'installed' && addons[key][source][blVer] === undefined) { return false; }


        var elm;
        if (source === 'installed') {
            elm = addons[key][source][blVer];
        }
        else {
            elm = addons[key][source];
        }

        // filtered by category
        var categoryMatched = (category.indexOf('All') != -1) || (category.indexOf(elm['bl_info']['category']) != -1);

        // filtered by search string
        var regexp = new RegExp(regex);
        var nameMatched = (elm['bl_info']['name'] != undefined && elm['bl_info']['name'].match(regexp) != null);
        var authorMatched = (elm['bl_info']['author'] != undefined && elm['bl_info']['author'].match(regexp) != null);
        var descMatched = (elm['bl_info']['description'] != undefined && elm['bl_info']['description'].match(regexp) != null);
        var found = nameMatched || authorMatched || descMatched;

        return statusMatched && categoryMatched && found;
    });

    return list;
}


function updateAddonStatus(github, installed)
{
    // key--
    //      |- github--
    //      |          |- bl_info
    //      |- installed
    //      |          |- blVer
    //      |                  |- bl_info
    //      |- status
    var addonStatus = {};

    // setup add-on list on GitHub
    if (github) {
        for (var g = 0, len = github.length; g < len; ++g) {
            var githubKey = github[g]['bl_info']['name'] + "@" + github[g]['bl_info']['author'];
            if (addonStatus[githubKey] == undefined) {
                addonStatus[githubKey] = {};
            }
            if (addonStatus[githubKey]['github'] == undefined) {
                addonStatus[githubKey]['github'] = github[g];
            }
            // newest version is registered
            else {
                var ver1 = addonStatus[githubKey]['github']['bl_info']['version'];
                var ver2 = github[g]['bl_info']['version'];
                if (blAddon.compareAddonVersion(ver1, ver2) == -1) {    // ver1 < ver2
                    addonStatus[githubKey]['github'] = github[g];
                }
            }
        }
    }

    // setup add-on list installed on machine
    if (installed) {
        for (var blVer in installed) {
            for (var i = 0, len = installed[blVer].length; i < len; ++i) {
                var installedKey = installed[blVer][i]['bl_info']['name'] + "@" + installed[blVer][i]['bl_info']['author'];
                if (addonStatus[installedKey] == undefined) {
                    addonStatus[installedKey] = {};
                }
                if (addonStatus[installedKey]['installed'] == undefined) {
                    addonStatus[installedKey]['installed'] = {}
                }
                if (addonStatus[installedKey]['installed'][blVer] == undefined) {
                    addonStatus[installedKey]['installed'][blVer] = installed[blVer][i];
                }
                // newest version is registered
                else {
                    var ver1 = addonStatus[installedKey]['installed'][blVer]['bl_info']['version'].split('.');
                    var ver2 = installed[blVer][i]['bl_info']['version'].split('.');
                    if (blAddon.compareAddonVersion(ver1, ver2) == -1) {    // ver1 < ver2
                        addonStatus[installedKey]['installed'][blVer] = installed[blVer][i];
                    }
                }
            }
        }
    }

    // update current status
    for (var k in addonStatus) {
        var addon = addonStatus[k];
        for (var blVer in installed) {
            var status = '';

            if (addon['github'] == undefined) {
                if (addon['installed'] != undefined && addon['installed'][blVer] != undefined) {
                    status = 'INSTALLED';
                }
            }
            else {
                if (addon['installed'] == undefined || addon['installed'][blVer] == undefined) {
                    status = 'NOT_INSTALLED';
                }
                else {
                    var ver1 = addon['github']['bl_info']['version'];
                    var ver2 = addon['installed'][blVer]['bl_info']['version'];
                    if (blAddon.compareAddonVersion(ver1, ver2) == 1) {
                        status = 'UPDATABLE';   // ver1 > ver2
                    }
                    else {
                        status = 'INSTALLED';
                    }
                }
            }
            if (addonStatus[k]['status'] == undefined) {
                addonStatus[k]['status'] = {};
            }
            addonStatus[k]['status'][blVer] = status;
        }
    }

    return addonStatus;
}
