'use strict';

function filterAddons(addons, category, regex) {
    return addons.filter((elm, idx, arr) => {
        // filtered by category
        var categoryMatched = (category.indexOf('All') != -1) || (category.indexOf(elm['bl_info']['category']) != -1);

        // filtered by search string
        var regexp = new RegExp(regex);
        var nameMatched = (elm['bl_info']['name'] != undefined && elm['bl_info']['name'].match(regexp) != null);
        var authorMatched = (elm['bl_info']['author'] != undefined && elm['bl_info']['author'].match(regexp) != null);
        var descMatched = (elm['bl_info']['description'] != undefined && elm['bl_info']['description'].match(regexp) != null);
        var found = nameMatched || authorMatched || descMatched;

        return categoryMatched && found;
    });
}

// ver1 > ver2 : 1
// ver1 == ver2 : 0
// ver1 < ver2 : -1
function compareAddonVersion(v1, v2)
{
    if (v1.length != 3 || v2.length != 3) {
        console.log('[WARN] Argument is not same size. (ver1:' + v1 + ', ver2:' + v2 + ')');
    }

    if (v1[0] > v2[0]) {
        return 1;
    }
    else if (v1[0] === v2[0]) {
        if (v1[1] > v2[1]) {
            return 1;
        }
        else if (v1[1] === v2[1]) {
            if (v1[2] > v2[2]) {
                return 1;
            }
            else if (v1[2] === v2[2]) {
                return 0;
            }
        }
    }

    return -1;
}

function updateAddonStatus(github, installed, blVer)
{
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
                if (compareAddonVersion(ver1.split('.'), ver2.split('.')) == -1) {    // ver1 < ver2
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
                    if (compareAddonVersion(ver1, ver2) == -1) {    // ver1 < ver2
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
                    var ver1 = addon['github']['bl_info']['version'].split('.');
                    var ver2 = addon['installed'][blVer]['bl_info']['version'].split('.');
                    if (compareAddonVersion(ver1, ver2) == 1) {
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
