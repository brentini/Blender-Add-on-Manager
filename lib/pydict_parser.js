'use strict';


var pydictParser = {
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

        function skipSpace() {
           while (ch && ch <= ' ') {
              next();
           } 
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

        function parseValue() {
            skipSpace();
            
            switch (ch) {
                case '{':
                    return parseObject();
                case '(':
                    return parseList();
                case '"':
                case '\'':
                    return parseString();
                case '-':
                    return parseNumber();
                default:
                    return ch >= '0' && ch <= '9' ? parseNumber() : parseWord();
            }
        }

        function parseNumber()
        {
            var number;
            var string = '';

            // '-'
            if (ch === '-') {
                string = '-';
                next('-');
            }
            // '0' - '9'
            while (ch >= '0' && ch <= '9') {
                string += ch;
                next();
            }
            // '.XXXX'
            if (ch === '.') {
                string += '.';
                while (skipSpace() && ch >= '0' && ch <= '9') {
                    string += ch;
                }
            }
            // 'e' or 'E'
            if (ch === 'e' || ch === 'E') {
                string += ch;
                next();
                if (ch === '-' || ch === '+') {
                    string += ch;
                    next();
                }
                while (ch >= '0' && ch <= '9') {
                    string += ch;
                    next();
                }
            }

            number = +string;
            if (isNaN(number)) {
                error("Bad number");
            }
            else {
                return number;
            }
        }

        function parseWord() {
            switch (ch) {
                case 't':
                    next('t');
                    next('r');
                    next('u');
                    next('e');
                    return true;
                case 'f':
                    next('f');
                    next('a');
                    next('l');
                    next('s');
                    next('e');
                    return false;
                case 'n':
                    next('n');
                    next('u');
                    next('l');
                    next('l');
                    return null;
            }
            error("Unexpected '" + ch + "'");
        }

        function parseList() {
            var list = [];

            if (ch === '(') {
                nextIf('(');
                skipSpace();
                if (ch === ')') {
                    nextIf(')');
                    return list;
                }
                while (ch) {
                    list.push(parseValue());
                    skipSpace();
                    if (ch === ')') {
                        nextIf(')');
                        return list;
                    }
                    nextIf(',');
                    skipSpace();
                }
            }
            error("Bad list");
        }

        function parseObject() {
            var key;
            var obj = {};

            if (ch === '{') {
                nextIf('{');
                skipSpace();
                if (ch === '}') {
                    nextIf('}');
                    return obj;
                }
                while (ch) {
                    key = parseString();
                    skipSpace();
                    nextIf(':');
                    obj[key] = parseValue();
                    skipSpace();
                    if (ch === '}') {
                        nextIf('}');
                        return obj;
                    }
                    next(',');
                    skipSpace();
                    if (ch === '}') {
                        nextIf('}');
                        return obj;
                    }
                }
            }
            error("Bad object");

            return {};
        }

        function parse() {
            skipSpace();
            
            switch (ch) {
                case '{':
                    return parseObject();
                case '(':
                    return parseList();
                case '"':
                    return parseString();
                case '-':
                    return parseNumber();
                default:
                    return ch >= '0' && ch <= '9' ? parseNumber() : parseWord();
            }
        }

        return parse();
    }
};

module.exports = pydictParser;

