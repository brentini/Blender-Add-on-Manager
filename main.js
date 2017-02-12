'use strict';

var fs = require('fs');
var electron = require('electron');

var utils = require('nutti_utils');

var app = electron.app;
var BrowserWindow = electron.BrowserWindow;
var crashReporter = electron.crashReporter;

var mainWindow = null;
var config = null;

var CONFIG_FILE_PATH = "config.json";

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
        width: 1024,
        height: 768,
        nodeIntegration: false
    });
    mainWindow.setMenu(null);
    mainWindow.openDevTools();

    // read configuration file
    if (!utils.isExistFile(CONFIG_FILE_PATH)) { throw new Error(CONFIG_FILE_PATH + "is not exist"); }
    var text = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
    config = JSON.parse(text);

    //mainWindow.loadURL('file://' + __dirname + '/src/html/index.html');
    mainWindow.loadURL('file://' + __dirname + '/html/index.html');
    mainWindow.show();

    mainWindow.on('closed', function() {
        mainWindow = null;
    });
});
