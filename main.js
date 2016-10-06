'use strict';

var fs = require('fs');
var electron = require('electron');

var app = electron.app;
var BrowserWindow = electron.BrowserWindow;
var crashReporter = electron.crashReporter;

var mainWindow = null;
var config = null;

crashReporter.start({
    productName: 'Blender Add-on Manager for GitHub',
    companyName: 'COLORFUL PICO',
    submitURL: '',
    autoSubmit: false
});

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

app.on('ready', function() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        nodeIntegration: false,
    });
    mainWindow.openDevTools();

    fs.readFile('config.json', 'utf8', function (err, text) {
        config = JSON.parse(text);
    });

    mainWindow.loadURL('file://' + __dirname + '/src/html/index.html');
    mainWindow.show();

    mainWindow.on('closed', function() {
        mainWindow = null;
    });
});
