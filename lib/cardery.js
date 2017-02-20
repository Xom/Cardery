$(function() {
  Swag.registerHelpers();

  var newlines = /\n/g;
  String.prototype.lineCount = function() {
    return (this.match(newlines) || []).length + 1;
  };

  var jsText = $('#jsText');
  var jsLines = $('#jsLines');
  var jsLinesLength = jsLines[0].innerHTML.lineCount();
  jsText.on('input', function() {
    var n = jsText[0].value.lineCount();
    if (jsLinesLength !== n) {
      jsLinesLength = n;
      jsLines[0].innerHTML = _.range(1, n + 1).join("\n");
    }
  });
  jsText.scroll(function() {
    jsLines.css({'margin-top': (-1 * jsText[0].scrollTop) + 'px'});
  });

  var cssText = $('#cssText');
  var cssLines = $('#cssLines');
  var cssLinesLength = cssLines[0].innerHTML.lineCount();
  cssText.on('input', function() {
    var n = cssText[0].value.lineCount();
    if (cssLinesLength !== n) {
      cssLinesLength = n;
      cssLines[0].innerHTML = _.range(1, n + 1).join("\n");
    }
  });
  cssText.scroll(function() {
    cssLines.css({'margin-top': (-1 * cssText[0].scrollTop) + 'px'});
  });

  var csvText = $('#csvText');
  var csvLines = $('#csvLines');
  var csvLinesLength = csvLines[0].innerHTML.lineCount();
  csvText.on('input', function() {
    var n = csvText[0].value.lineCount();
    if (csvLinesLength !== n) {
      csvLinesLength = n;
      csvLines[0].innerHTML = _.range(1, n + 1).join("\n");
    }
  });
  csvText.scroll(function() {
    csvLines.css({'margin-top': (-1 * csvText[0].scrollTop) + 'px'});
  });

  $('#tabsForm input').change(function() {
    if ($('#codeTab').prop('checked')) {
      $('#dataDiv').hide();
      $('#codeDiv').show();
    } else {
      $('#codeDiv').hide();
      $('#dataDiv').show();
    }
  });

  var CCC = {};

  CCC.viewDiv = $('#viewDiv');

  CCC.setMain = function(m) {
    CCC.main = m;
  };

  CCC.setRenderOptions = function(ro) {
    CCC.renderOptions = ro;
  };

  var parseOptions = {header: true, comments: true, skipEmptyLines: true};
  CCC.parse = function() {
    CCC.viewDiv.empty();
    if (CCC.style) {
      CCC.style.remove();
    }
    CCC.style = $('<style/>').text(cssText[0].value).appendTo('head');
    CCC.parsed = Papa.parse(csvText[0].value, parseOptions);
    eval(jsText[0].value);
  };

  CCC.render = function(i, callback) {
    CCC.viewDiv.empty();
    var card = CCC.main(i, CCC.parsed.data[i]).addClass('card').attr('id', 'card' + i);
    CCC.viewDiv.append(card);
    domtoimage.toPng(card[0], CCC.renderOptions).then(callback);
  };

  CCC.generate = function(i, n, dataUrl) {
    if (dataUrl) {
      var img = new Image();
      img.src = dataUrl;
      document.body.appendChild(img);
    }
    if (n > 0) {
      CCC.render(i, CCC.generate.bind(this, i + 1, n - 1));
    }
  };

  CCC.generateAll = function() {
    CCC.parse();
    CCC.generate(0, CCC.parsed.data.length);
  };

  CCC.generateOne = function(i) {
    CCC.parse();
    CCC.generate(i, 1);
  };

  CCC.defaultMain = function(i, cdata) {
    var card = $('<div/>');
    _.forOwn(cdata, function(value, key) {
      card.append($('<p/>', {text: key + ': ' + value}));
    });
    return card;
  };

  CCC.setMain(CCC.defaultMain);
  CCC.setRenderOptions({});
  window.CCC = CCC;
});
