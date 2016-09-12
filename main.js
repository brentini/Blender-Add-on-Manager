'use strict';

var fs = require('fs');
var electron = require('electron');
var client = require('cheerio-httpcli');

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
    if (config.proxy == undifined) { return; }
    if (config.proxy.username == undifined || config['proxy']['password']) { return; }

    callback(config['proxy']['username'], config['proxy']['password']);
});

function onReady()
{
    var authURL = "https://github.com/login/oauth/authorize?client_id=" + config.github.clientID;

    mainWindow.loadURL(authURL);
    mainWindow.show();
}

app.on('ready', function() {
    mainWindow = new BrowserWindow({width: 800, height: 600});
    fs.readFile('config.json', 'utf8', function (err, text) {
        config = JSON.parse(text);
	onReady();
    });

    mainWindow.webContents.on('will-navigate', function(event, url) {
        console.log(url);
	client.fetch(
	    'https://github.com/search',
	    {
		q: ['bl_info', 'blender'],
		type: 'Code',
		ref: 'searchresults'
	    },
	    function(err, $, res) {
		console.log(res.headers);
		$('a').each(function(idx) {
		    console.log($(this).attr('href'));
		});
            }
	);
    });

    mainWindow.on('closed', function() {
        mainWindow = null;
    });
});
