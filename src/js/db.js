'user strict';

var fs = require('fs');
var client = require('cheerio-httpcli');
var https = require('https');
var request = require('request');
var filbert = require('filbert');
var unzip = require('unzip');

var config = null;
var ADDON_DB_FILE = './db/add-on_list.db';
var GITHUB_URL = 'https://github.com/';

function genDownloadURL(repoInfo)
{
    repoInfo["download_url"] = repoInfo["url"] + "/archive/master.zip";
}

function downloadAddon(repoInfo)
{
    var r = request({
        tunnel: true,
        url: repoInfo["download_url"],
        proxy: 'http://' + config.proxy.username_enc + ":" + config.proxy.password + "@" + config.proxy.server + ":" + config.proxy.port
    });

    r.on('response', function (res) {
        var targetPath = "./download/" + repoInfo["bl_info"]["name"] + ".zip";
        res.pipe(fs.createWriteStream(targetPath));
        fs.createReadStream(targetPath).pipe(unzip.Extract({ path: "./download/" }));
    });
}

function getMainSrc(repoInfo)
{
    request(
        {
            tunnel: true,
            url: repoInfo["src_raw_url"],
            proxy: 'http://' + config.proxy.username_enc + ":" + config.proxy.password + "@" + config.proxy.server + ":" + config.proxy.port
        },
        function (err, res, body) {
            if (!err && res.statusCode == 200) {
                repoInfo["bl_info"] = parseMainSrc(body);
                genDownloadURL(repoInfo);
                fs.appendFile(ADDON_DB_FILE, JSON.stringify(repoInfo, null, '    '));
                //downloadAddon(repoInfo);
           }
        }
    );
}

function parseBlInfo(args)
{
    var info = {};

    for (var arg = 0; arg < args.length; ++arg) {
        var elms = args[arg].elements;
        var key = elms[0]["value"];
        var value = "";
        if (elms[1]["type"] == "Literal") {
            value = elms[1]["value"];
        }
        if (elms[1]["type"] == "NewExpression") {
            for (var i = 0; i < elms[1]["arguments"].length; ++i) {
                value += elms[1]["arguments"][i]["value"];
                value += ".";
            }
            value = value.slice(0, -1);
        }
        info[key] = value;
    }

    return info;
}

function parseMainSrc(body)
{
    var info = {};
    var parsed = null;

    var parsed = filbert.parse(body);
    if (parsed == null) {
        return null;
    }

    var decls = parsed.body[0].declarations;
    var i = 0;
    for (i = 0; i < decls.length; ++i) {
        if (decls[i]["id"]["name"] == "bl_info") {
            info = parseBlInfo(decls[i]["init"]["arguments"]);
            break;
        }
    }
    if (i == decls.length) {
        return null;
    }

    return info;
}

function gatherRepoInfo(repoURL)
{
    var info = {};

    info["url"] = GITHUB_URL + repoURL.slice(0, repoURL.indexOf('/blob/'));
    info["src_main"] = repoURL.slice(repoURL.lastIndexOf('/') + 1);
    info["src_url"] = GITHUB_URL + repoURL;
    info["src_raw_url"] = info["src_url"].replace("github.com/", "raw.githubusercontent.com").replace("blob/", "");

    getMainSrc(info);

    return info;
}

function buildAddonDB()
{
    var NUM_PAGES = 10;
    var repoURLs = [];

    for (var page = 1; page <= NUM_PAGES; ++page) {
        client.fetch(
            'https://github.com/search',
            {
                q: 'bl_info',
                type: 'Code',
                ref: 'searchresults',
                p: page
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
    }
}


function isExistFile(file)
{
    fs.readdir('.', function (err, files) {
        if (err) { throw err; }
        var fileList = [];
        files.filter(function(file) {
            return fs.statSync(file).isFile();
        }).forEach(function (file) {
            fileList.push(file);
        });
        console.log(fileList);
    });
    try {
        fs.statSync(file);
        return true;
    }
    catch (err) {
        if (err.code === 'ENOENT') {
            return false;
        }
        return false;
    }
}

function updateDBFile(file)
{
    if (isExistFile(file)) {
        fs.unlink(file, function (err) {
            console.log("Removed old add-on database file");
        });
    }
    console.log('Updating DB file ...');
    client.fetch('https://github.com/login')
    .then(function (result) {
        var loginInfo = {
            login: config.github.username,
            password: config.github.password
        };
        result.$('form').submit(loginInfo, function(err, $, res, body) {
            buildAddonDB();
        });
    });
}


function readDBFile(file)
{
    if (isExistFile(file)) {
        console.log('Not found DB file...');
        return false;
    }

    console.log('Reading DB file...');

    var json = require(file);
    console.log(json);

    return true;
}


$(function() {
    $('#update-db').click(function (e) {
        updateDBFile(ADDON_DB_FILE);
    });

    if (isExistFile(ADDON_DB_FILE)) {
        readDBFile(ADDON_DB_FILE);
    }
    fs.readFile('config.json', 'utf8', function (err, text) {
        console.log("Parsing configuration file ...");
        config = JSON.parse(text);
        console.log("Parsed configuration file ...");
        console.log(config);
    });
});
