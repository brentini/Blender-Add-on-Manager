'use strict';

var pydictParser = require('pydict_parser');

var blInfoParser = {
    parse: function (text) {
        var at = 0;
        var ch = ' ';
        var escapee = {
            '"': '"',
            '\\': '\\',
            '/': '/',
            b: 'b',
            f: '\f',
            n: '\n',
            r: '\r',
            t: '\t'
        };

        function error(m) {
            throw {
                name: 'SyntaxError',
                message: m,
                at: at,
                text: text
            };
        }

        function next() {
            ch = text.charAt(at);
            at += 1;
            return ch;
        }

        function nextIf(c) {
            if (c && c !== ch) {
                error("Expected '" + c + "' instead of '" + ch + "'");
            }
            return next();
        }

        function nextcls(c) {
            next();
            if (c && c !== ch) {
                return false;
            }
            return true;
        }

        function nextsIs(str) {
            for (var i = 0; i < str.length; ++i) {
                if (!nextcls(str[i])) {
                    return false;
                }
            }
            return true;
        }

        function skipSpace() {
            while (ch && ch <= ' ') {
               next();
            } 
        }

        function skip() {
            while (ch && (ch != '"' && ch != "'" && ch != '}')) {
                next();
            }
        }

        function findBlInfo() {
            var string = '';
            while (ch) {
                if (ch === 'b') {
                    if (nextsIs('l_info')) {
                        nextIf('o');
                        return;
                    }
                }
                next();
            }
            error("bl_info is not found.");
        }

        function parseString() {
            var string = '';
            var uffff;
            var quote;

            if (ch === '"' || ch === "'") {
                quote = ch;
                while (next()) {
                    // end of string
                    if (ch === quote) {
                        next();
                        return string;
                    }
                    // escape character
                    else if (ch === '\\') {
                        next();
                        // parse unicode
                        if (ch === 'u') {
                            uffff = 0;
                            for (var i = 0; i < 4; ++i) {
                                hex = parseInt(next(), 16);
                                if (!isFinite(hex)){
                                    break;
                                }
                                uffff = uffff * 16 + hex;
                            }
                            string += String.fromCharCode(uffff);
                        }
                        // parse escape character
                        else if (typeof escapee[ch] === 'string') {
                            string += escapee[ch];
                        }
                        else {
                            break;
                        }
                    }
                    else {
                        string += ch;
                    }
                }
            }
            error("Bad string");
        }

        function parse() {
            skipSpace();
            nextIf('{');
            while (true) {
                if (ch == "}") {
                    break;
                }
                if (ch == "'" | ch == '"') {
                    parseString();
                }
                skip();
            }
            var body = text.substr(0, at);
            var info = pydictParser.parse(body);
            
            return info;
        }

        return parse();
    }
};


module.exports = blInfoParser;

