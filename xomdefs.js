/* Copyright (C) 2016 "Xom" aka "Michael de Cardery" <michael@cardery.org>
 * xomdefs.js is free software. It comes without any warranty, to the extent
 * permitted by applicable law. You can redistribute it and/or modify it under
 * the terms of the Do What The Fuck You Want To Public License, Version 2,
 * as published by Sam Hocevar. See http://www.wtfpl.net/ for more details.

 *            DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE
 *                    Version 2, December 2004
 *
 * Copyright (C) 2004 Sam Hocevar <sam@hocevar.net>
 *
 * Everyone is permitted to copy and distribute verbatim or modified
 * copies of this license document, and changing it is allowed as long
 * as the name is changed.
 *
 *            DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE
 *   TERMS AND CONDITIONS FOR COPYING, DISTRIBUTION AND MODIFICATION
 *
 *  0. You just DO WHAT THE FUCK YOU WANT TO.
 */

if (typeof Object.create !== 'function') {
  Object.create = function (o) {
    var F = function () {};
    F.prototype = o;
    return new F();
  };
}

var XD = (function() {
  var that = {};
  var tokenMatcher = /\s+|\S+/g;
  var whiteSpace = /\s/;
  var startsWithWhiteSpace = function(str) { return whiteSpace.test(str.charAt(0)); };
  var parseString = eval; // JSON.parse is too strict

  that.beget = function(myDefs) {
    var thon = this;
    var thee = Object.create(thon);
    thee.get = function(name) { return this.defs.hasOwnProperty(name) ? this.defs[name] : thon.get(name); };
    thee.defs = myDefs || {};
    return thee;
  };

  // Remember always to decode the string ultimately produced by resolve
  that.decode = function(str) {
    return str.replace(this.exec('lBrace'), '{').replace(this.exec('rBrace'), '}');
  };

  that.resolve = function(str) {
    var i = str.indexOf('{');
    return i === -1 ? str : str.slice(0, i) + this.esolve(str.slice(i));
  };

  that.esolve = function(str) {
    // str known to start with '{'

    var j = str.indexOf('}');
    if (j === -1) {
      return str;
    }

    var s = str.slice(0, j); // 'foo{bar}baz' -> 'foo{bar'
    var i = s.lastIndexOf('{');
    var result = this.solve(s.slice(i + 1)) + str.slice(j + 1); // solve('bar') + 'baz'
    return i === 0 ? this.resolve(result) : this.esolve(s.slice(0, i) + result);
  };

  that.solve = function(str) {
    if (str === '') {
      return this.exec('');
    }
    var tokens = str.match(tokenMatcher); // evens should be nonwhitespace, odds whitespace
    if (tokens.length !== 1 && startsWithWhiteSpace(tokens[0])) {
      tokens.shift();
    }
    return this.exec(tokens[0], tokens.length <= 2 ? [] : this.solveArgs(tokens));
  };

  that.solveArgs = function(tokens) {
    var args = [];
    var currentToken;
    var testChar;
    var contextType = null;
    var contextStart;
    var str;
    var n = tokens.length;
    for (var i = 2; i < n; i += 2) {
      currentToken = tokens[i];
      if (contextType === null) {
        testChar = currentToken[0];
        switch (testChar) {
          case "'":
          case '"':
          case '(':
            contextType = testChar;
            contextStart = i;
            break;

          case '-':
          case '.':
          case '0':
          case '1':
          case '2':
          case '3':
          case '4':
          case '5':
          case '6':
          case '7':
          case '8':
          case '9':
            args.push(parseFloat(currentToken));
            break;

          default:
            args.push(this.exec(currentToken));
        }
      }
      if (contextType !== null) {
        testChar = currentToken[currentToken.length - 1];
        if (contextType === '(' ?
            testChar === ')' :
            (testChar === contextType && (currentToken.length === 1 || currentToken[currentToken.length - 2] !== "\\"))
        ) {
          str = tokens.slice(contextStart, i + 1).join('');
          args.push(contextType === '(' ? this.solve(str.slice(1, str.length - 1)) : this.resolve(parseString(str)));
          contextType = null;
        }
      }
    }
    return args;
  };

  that.exec = function(name, args) {
    var foo = this.get(name);
    return this.resolve((typeof foo === 'function' ? foo.apply(this, args) : foo).toString());
  };

  that.get = function(name) {
    return this.defs.hasOwnProperty(name) ? this.defs[name] : '{notDefined ' + JSON.stringify(name) + '}';
  };

  that.defs = {
    lBrace: '\x1B\xAB',
    rBrace: '\x1B\xBB',
    notDefined: function(name) { return '{lBrace}' + name + ' not defined{rBrace}'; }
  };

  return that;
}());

