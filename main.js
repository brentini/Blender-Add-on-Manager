'use strict';

var fs = require('fs');
var electron = require('electron');
var client = require('cheerio-httpcli');
var filbert = require('filbert');

var app = electron.app;
var BrowserWindow = electron.BrowserWindow;

var mainWindow = null;

var config = null;



app.on('window-all-closed', function() {
    if (process.platform != 'darwin') {
        app.quit();
    }
});

app.on('login', function(event, webContents, request, authInfo, callback) {
    event.preventDefault();

    if (config == undefined) { return; }
    if (config.proxy == undefined) { return; }
    if (config.proxy.username == undefined || config.proxy.password == undefined) { return; }

    callback(config.proxy.username, config.proxy.password);
});

function onReady()
{
    var authURL = "https://github.com/";

    mainWindow.loadURL(authURL);
    mainWindow.show();
}

var repoURLs = [];
var githubURL = "https://github.com"

function parseBlInfo(repoInfo)
{
    var info = {};

    var parsed = filbert.parse("bl_info = {}");
    console.log(parsed.body[0].declarations);

    return info;
}

function gatherRepoInfo(repoURL)
{
    var info = {};

    info["url"] = githubURL + repoURL.slice(0, repoURL.indexOf('/blob/'));
    info["src_main"] = repoURL.slice(repoURL.lastIndexOf('/') + 1);
    info["src_url"] = githubURL + repoURL;

    parseBlInfo(info);

    console.log(info);
    return info;
}

app.on('ready', function() {
    mainWindow = new BrowserWindow({width: 800, height: 600});
    fs.readFile('config.json', 'utf8', function (err, text) {
        config = JSON.parse(text);
        onReady();
    });

    mainWindow.webContents.on('will-navigate', function(event, url) {
        client.fetch('https://github.com/login')
        .then(function (result) {
            var loginInfo = {
                login: config.github.username,
                password: config.github.password
            };
            result.$('form').submit(loginInfo, function(err, $, res, body) {
                client.fetch(
                    'https://github.com/search',
                    {
                        q: 'bl_info',
                        type: 'Code',
                        ref: 'searchresults'
                    },
                    function(err, $, res) {
                        $('a').each(function(idx) {
                            var link = $(this).attr('href');
                            // only .py is allowed
                            if (link.slice(-3) == ".py") {
                                repoURLs.push(link);
                            }
                        });
                        for (var i = 0; i < repoURLs.length; ++i) {
                            gatherRepoInfo(repoURLs[i]);
                        }
                    }
                );
            });
        });
    });

    mainWindow.on('closed', function() {
        mainWindow = null;
    });
});
