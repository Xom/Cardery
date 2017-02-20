$(function() {
  Swag.registerHelpers();

  var newlines = /\n/g;
  String.prototype.lineCount = function() {
    return (this.match(newlines) || []).length + 1;
  };

  var jsText = $('#jsText');
  var jsLines = $('#jsLines');
  var jsLinesLength = jsLines[0].innerHTML.lineCount();
  var updateJsLines = function() {
    var n = jsText[0].value.lineCount();
    if (jsLinesLength !== n) {
      jsLinesLength = n;
      jsLines[0].innerHTML = _.range(1, n + 1).join("\n");
    }
  };
  jsText.on('input', updateJsLines);
  jsText.scroll(function() {
    jsLines.css({'margin-top': (-1 * jsText[0].scrollTop) + 'px'});
  });

  var cssText = $('#cssText');
  var cssLines = $('#cssLines');
  var cssLinesLength = cssLines[0].innerHTML.lineCount();
  var updateCssLines = function() {
    var n = cssText[0].value.lineCount();
    if (cssLinesLength !== n) {
      cssLinesLength = n;
      cssLines[0].innerHTML = _.range(1, n + 1).join("\n");
    }
  };
  cssText.on('input', updateCssLines);
  cssText.scroll(function() {
    cssLines.css({'margin-top': (-1 * cssText[0].scrollTop) + 'px'});
  });

  var csvText = $('#csvText');
  var csvLines = $('#csvLines');
  var csvLinesLength = csvLines[0].innerHTML.lineCount();
  var updateCsvLines = function() {
    var n = csvText[0].value.lineCount();
    if (csvLinesLength !== n) {
      csvLinesLength = n;
      csvLines[0].innerHTML = _.range(1, n + 1).join("\n");
    }
  };
  csvText.on('input', updateCsvLines);
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
    CCC.setMain(CCC.defaultMain);
    CCC.setRenderOptions({});
    CCC.dataUrls = {};
    CCC.zipContent = false;
    CCC.viewDiv.empty();
    if (CCC.style) {
      CCC.style.remove();
    }
    CCC.style = $('<style/>').text(cssText[0].value).appendTo('head');
    CCC.parsed = Papa.parse(csvText[0].value, parseOptions);
    eval(jsText[0].value);
  };

  CCC.render = function(x, callback) {
    //element must be in DOM (and visible) in order to be rendered by domtoimage
    var card = CCC.main(x, CCC.parsed.data[x]);
    CCC.preview(x, card);
    domtoimage.toPng(card[0], CCC.renderOptions).then(callback);
  };

  CCC.preview = function(x, card) {
    CCC.viewDiv.empty().append(card.addClass('card').attr('id', 'card' + x));
  };

  CCC.zip = function(a) {
    if (CCC.zipContent) {
      saveAs(CCC.zipContent, 'cards.zip');
      return;
    }
    var z = new JSZip();
    var n = a.length;
    var x;
    var dataUrl;
    for (var i = 0; i < n; i++) {
      x = a[i];
      dataUrl = CCC.dataUrls[x];
      z.file('card' + x + '.png', dataUrl.substr(dataUrl.indexOf(',') + 1), {base64: true});
    }
    z.generateAsync({type: 'blob'}).then(function(content) {
      CCC.zipContent = content;
      saveAs(CCC.zipContent, 'cards.zip');
    });
  };

  CCC.generate = function(i, a, dataUrl) {
    if (dataUrl) {
      CCC.dataUrls[a[i - 1]] = dataUrl;
    }
    if (i < a.length) {
      CCC.render(a[i], CCC.generate.bind(this, i + 1, a));
    } else {
      var zipButton = $('<button/>', {text: 'Create ZIP', click: CCC.zip.bind(this, a)});
      var cards = $('<p/>');
      CCC.viewDiv.prepend(cards).prepend(zipButton);
      var n = a.length > 5 ? 5 : a.length;
      var img;
      for (var j = 0; j < n; j++) {
        img = new Image();
        img.src = CCC.dataUrls[a[j]];
        cards.append(img);
      }
    }
  };

  CCC.generateAll = function() {
    CCC.parse();
    CCC.generate(0, _.range(CCC.parsed.data.length));
  };

  CCC.generateOne = function(x) {
    CCC.parse();
    CCC.generate(0, [x]);
  };

  CCC.generateTest = function() {
    CCC.parse();
    var a = _.range(CCC.parsed.data.length);
    var n = a.length;
    if (n > 3) {
      var j;
      var x;
      for (var i = 0; i < 3; i++) {
        j = i + Math.floor(Math.random() * (n - i));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
      }
      a.length = 3;
    }
    CCC.generate(0, a);
  };

  CCC.clearImages = function() {
    CCC.images = {};
  };

  var image = /^image/;
  CCC.loadImages = function(evt) {
    var files = evt.target.files;
    var n = files.length;
    if (n === 0) {
      CCC.viewDiv.prepend('<p>No image files loaded.</p>');
      return;
    }
    var message = $('<p/>', {text: '0 image file(s) loaded.'});
    CCC.viewDiv.prepend(message);
    var loaded = 0;
    var f;
    var r;
    for (var i = 0; i < n; i++) {
      f = files[i];
      if (!f.type.match(image)) {
        continue;
      }
      r = new FileReader();
      r.onload = (function(filename) {
        return function(e) {
          CCC.images[filename] = e.target.result;
          loaded += 1;
          message.text('' + loaded + ' image file(s) loaded.');
        };
      }(f.name));
      r.readAsDataURL(f);
    }
  };

  CCC.defaultMain = function(x, cdata) {
    var card = $('<div/>');
    _.forOwn(cdata, function(value, key) {
      card.append($('<p/>', {text: key + ': ' + value}));
    });
    return card;
  };

  CCC.clearImages();
  window.CCC = CCC;
  $('#generateAllButton').click(CCC.generateAll);
  $('#generateTestButton').click(CCC.generateTest);
  $('#imgLoader').change(CCC.loadImages);
  $('#clearImagesButton').click(CCC.clearImages);
  updateJsLines();
  updateCssLines();
  updateCsvLines();
});

