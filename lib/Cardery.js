/* Cardery
 * Make cards with HTML, CSS, JS, and CSV.
 * v1.1.3 (20220922a)
 *
 * https://cardery.xom.io/
 *
 * by Xom <xom@xom.io>
 * https://twitter.com/xomnifex
 *
 * Cardery.js is released under the MIT license.
 * Cardery's accompanying documentation and examples
 * are released in the public domain. See details at
 * https://github.com/Xom/Cardery/blob/master/LICENSE
 */
$(()=>{
  console && console.log('Cardery v1.1.3');
  class Cardery {
    constructor (csvOrList, template) {try {
      this.Cardery = Cardery; // class reference provided for debugging purposes only
      this.CardZip = CardZip;
      this.unsafe = unsafe;
      this.basename = basename;
      this.showError = showError;
      this.waitImgLoad = waitImgLoad;
      this.sleep = sleep;

      this.parsed = {};
      this.tallest = 0;
      this.makeLock = true;
      this.makeI = 0;
      this.zip = new CardZip();
      this.zip.comment = new Date().toUTCString();

      this.csvList = typeof csvOrList === 'string' ? [csvOrList] : csvOrList;
      this.basenames = {'': basename(location.pathname, true, true)};
      for (let csv of this.csvList) {
        this.basenames[csv] = basename(csv, true, false);
      }

      this.Card = function (csv, i, dataObj) {
        this.csv = csv;
        this.i = i;
        Object.assign(this, dataObj);
      };
      this.Card.prototype = template;

      if (!template.options) {
        template.options = {};
      } else {
        if (template.options.ppi) {
          if (!template.options.scale) {
            template.options.scale = 1;
          }
          template.options.scale *= template.options.ppi / 96;
        }
        if (template.options.scale) {
          if (!template.options.style) {
            template.options.style = {};
          }
          if (template.options.style.transform) {
            template.options.style.transform += ` scale(${template.options.scale})`;
          } else {
            template.options.style.transformOrigin = 'top left';
            template.options.style.transform = `scale(${template.options.scale})`;
          }
        }
      }

      this.searchState = [0, '', 'init'];
      this.stored = this.run();
    } catch(err){showError(err);}}

    async run () {try {
      $('head').append('<style>body{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;}\
        #previewDiv img{height:70vh;width:auto;}</style>');
      $('body').append('<div style="overflow:hidden;padding:3px 6px;background-color:gray;">\
        <span style="float:left;">\
          <button id="allButton">Save all</button>\
          <button id="someButton">Save these 0</button>\
          <button id="zoomButton">Toggle zoom</button>\
        </span><span style="float:right;">\
          <button id="searchButton">Search</button>\
        </span><span style="display:block;overflow:hidden;padding:0 7px 0 10px;">\
          <input id="searchInput" type="text" style="width:100%;" autofocus placeholder="Enter string, or /regex/ with slashes, then press Enter"/>\
        </span></div>\
        <div id="previewDiv" style="overflow-x:scroll;overflow-y:hidden;white-space:nowrap;line-height:0;background-color:magenta;"/>\
        <div style="overflow:hidden;padding:3px 6px;background-color:gray;">\
        <span style="float:right;">\
          <button id="makeButton">Test PNG</button>\
        </span><span style="display:block;overflow:hidden;padding-right:7px;">\
          <input id="makeInput" type="text" style="width:100%;"/>\
        </span></div>\
        <div id="mainDiv"/>');
      this.allButton = $('#allButton').click(this.saveAll.bind(this));
      this.someButton = $('#someButton').click(this.save.bind(this, undefined));
      this.zoomButton = $('#zoomButton').click(this.toggleZoom.bind(this));
      this.searchInput = $('#searchInput').focus().keypress(event => { if (event.which == 13) { this.searchClicked(); } });
      this.searchButton = $('#searchButton').click(this.searchClicked.bind(this));
      this.makeInput = $('#makeInput').on('input', this.makeChanged.bind(this)).keypress(event => { if (event.which == 13) { this.makeClicked(); } });
      this.makeButton = $('#makeButton').click(this.makeClicked.bind(this));
      this.previewDiv = $('#previewDiv');
      this.mainDiv = $('#mainDiv');
      await this.parseAll();
      return this.generateLatest();
    } catch(err){showError(err);}}

    parseAll () {
      return Promise.all(this.csvList.map(this.parse, this));
    }

    parse (csv) {
      let Card = this.Card, parsed = this.parsed; //for reference in inner scope
      return new Promise((resolve, reject) => {
        Papa.parse(csv, {download: true, header: true, comments: true, skipEmptyLines: true,
          complete(results) {
            if (results.errors && results.errors.length > 0) {
              for (let err of results.errors) {
                console.log(`${csv}: ${JSON.stringify(err)}`);
              }
              showError({error: `${results.errors.length} error(s) in ${csv}`});
            }
            results.get = function (i) {
              if (this.data[i].csv === undefined) {
                this.data[i] = new Card(csv, i, this.data[i]);
              }
              return this.data[i];
            };
            parsed[csv] = results;
            resolve(results);
          }, error: reject
        });
      });
    }

    get (csv, i) {
      return i === undefined ? this.parsed[csv] : this.parsed[csv].get(i);
    }

    async render (card, isInput) {
      if (!card.dataUrl || isInput) {
        this.mainDiv.empty();
        this.mainDiv[0].style.minHeight = '';
        let cardRoot = await card.main(this.mainDiv);
        cardRoot = cardRoot.jquery ? cardRoot[0] : cardRoot;
        await waitImgLoad();
        if (card.options.scale) {
          card.options.width = Math.round(cardRoot.offsetWidth * card.options.scale);
          card.options.height = Math.round(cardRoot.offsetHeight * card.options.scale);
          if (card.options.height > this.tallest) {
            this.tallest = card.options.height;
          }
        } else {
          let height = cardRoot.offsetHeight;
          if (height > this.tallest) {
            this.tallest = height;
          }
        }
        card.dataUrl = await domtoimage.toPng(cardRoot, card.options);
        this.zip.file(`${isInput ? '' : this.basenames[card.csv] + '.'}${card.i}.png`, card.dataUrl.substr(card.dataUrl.indexOf(',') + 1), {base64: true});
        this.someButton.text(`Save these ${this.zip.count()}`);
        if (!isInput) {
          this.makeFields = this.parsed[card.csv].meta.fields;
          this.makeInput.val(Papa.unparse([this.makeFields.map(f => card[f])]));
        }
      }
      return card.dataUrl;
    }

    async save (filename = `${this.basenames['']}.${this.zip.count()}.zip`) {try {
      saveAs(await this.zip.generateAsync({type: 'blob'}), filename);
    } catch(err){showError(err);}}

    async saveAll () {try {
      if (this.doneAll === undefined) {
        this.doneAll = this.generateAll();
      }
      await this.doneAll;
      return this.save(`${this.basenames['']}.zip`);
    } catch(err){showError(err);}}

    async generateLatest () {try {
      let first = null;
      let oldStored = localStorage.getItem(this.basenames['']);
      oldStored = oldStored ? JSON.parse(oldStored) : {};
      let newStored = {}, repeatStored = {}, head = 0, previewed = 0;
      for (let k = this.csvList.length - 1; k >= 0; k--) {
        let csv = this.csvList[k], results = this.parsed[csv], data = results.data, fields = results.meta.fields;
        for (let i = data.length - 1; i >= 0; i--) {
          let c = data[i], raw = fields.map(f => c[f]).join(',');
          if (oldStored[raw]) {
            repeatStored[oldStored[raw][2]] = [csv, i, raw];
          } else {
            if (previewed < 6 && this.searchState[2] !== 'handoff') {
              let dataUrl = await this.render(results.get(i));
              let img = $(`<img src="${dataUrl}">`).appendTo(this.previewDiv)[0];
              if (previewed === 0) {
                first = results.get(i);
              } else if (this.previewDiv.find('img')[0].style.height) {
                await waitImgLoad(img);
                img.style.height = `${img.naturalHeight / window.devicePixelRatio}px`;
              }
              previewed++;
            }
            newStored[raw] = [csv, i, head];
            head++;
          }
        }
      }
      let n = Object.keys(oldStored).length;
      for (let j = 0; j < n; j++) {
        let rsj = repeatStored[j];
        if (rsj) {
          if (previewed < 6 && this.searchState[2] !== 'handoff') {
            let dataUrl = await this.render(this.get(rsj[0], rsj[1]));
            let img = $(`<img src="${dataUrl}">`).appendTo(this.previewDiv)[0];
            if (previewed === 0) {
              first = this.get(rsj[0], rsj[1]);
            } else if ( this.previewDiv.find('img')[0].style.height) {
              await waitImgLoad(img);
              img.style.height = `${img.naturalHeight / window.devicePixelRatio}px`;
            }
            previewed++;
          }
          newStored[rsj[2]] = [rsj[0], rsj[1], head];
          head++;
        }
      }
      localStorage.setItem(this.basenames[''], JSON.stringify(newStored));
      if (this.searchState[2] === 'handoff') {
        this.searchState[2] = 'search';
        let searchPromise = this.search(this.searchState[1], newStored);
        this.searchLock = searchPromise;
        await searchPromise;
        delete this.searchLock; // because I'm paranoid that search could finish before I set searchLock
        return searchPromise;
      }
      if (first) {
        this.makeFields = this.parsed[first.csv].meta.fields;
        this.makeInput.val(Papa.unparse([this.makeFields.map(f => first[f])]));
        this.mainDiv.empty();
        await first.main(this.mainDiv);
        this.makeLock = false;
      }
      this.searchState[2] = 'done';
      return newStored;
    } catch(err){showError(err);}}

    async generateAll () {try {
      await this.stored;
      await this.searchLock;
      this.searchState[2] = 'generateAll';
      for (let csv of this.csvList) {
        let results = this.parsed[csv];
        let n = results.data.length;
        for (let i = 0; i < n; i++) {
          await this.render(results.get(i));
          if (this.searchState[2] === 'handoff') {
            this.searchState[2] = 'search';
            let searchPromise = this.search(this.searchState[1]);
            this.searchLock = searchPromise;
            await searchPromise;
            delete this.searchLock; // because I'm paranoid that search could finish before I set searchLock
          }
        }
      }
      this.searchState[2] = 'done';
      return true;
    } catch(err){showError(err);}}

    async searchClicked () {try {
      let val = this.searchInput.val();
      if (!val) {
        return;
      }
      let pin = val.startsWith('\\pin ');
      if (pin) {
        val = val.substr(5);
      }
      if (!val) {
        return;
      }
      if (val.length > 1 && val.startsWith('/') && val.endsWith('/')) {
        val = new RegExp(val.substr(1, val.length - 2));
      }
      if (pin) {
        let stored = await this.stored;
        let keys = Object.keys(stored), n = keys.length, pins = {}, nonpins = {};
        let ignoreCase = typeof val === 'string' && val === val.toLowerCase();
        for (let key of keys) {
          let s = stored[key];
          if (ignoreCase ? key.toLowerCase().includes(val) : (typeof val === 'string' ? key.includes(val) : val.test(key))) {
            pins[s[2]] = [s[0], s[1], key];
          } else {
            nonpins[s[2]] = [s[0], s[1], key];
          }
        }
        let head = 0;
        for (let j = 0; j < n; j++) {
          let p = pins[j];
          if (p) {
            stored[p[2]][2] = head;
            head++;
          }
        }
        for (let j = 0; j < n; j++) {
          let p = nonpins[j];
          if (p) {
            stored[p[2]][2] = head;
            head++;
          }
        }
        localStorage.setItem(this.basenames[''], JSON.stringify(stored));
      }
      let oldState = this.searchState;
      let oldDone = oldState[2] === 'done';
      this.searchState = [oldState[0] + 1, val, oldDone ? 'search' : 'handoff'];
      if (oldDone) {
        let searchPromise = this.search(val);
        this.searchLock = searchPromise;
        await searchPromise;
        delete this.searchLock; // because I'm paranoid that search could finish before I set searchLock
      }
    } catch(err){showError(err);}}

    async search (val, stored) {try {
      if (stored === undefined) {
        stored = await this.stored;
      }
      let keys = Object.keys(stored);
      let ignoreCase = typeof val === 'string' && val === val.toLowerCase();
      let previewed = 0;
      let prevImg = this.previewDiv.find('img')[0];
      let hasHeight = prevImg && prevImg.style.height;
      let first = null;
      this.makeLock = true;
      this.previewDiv.empty();
      for (let key of keys) {
        if (ignoreCase ? key.toLowerCase().includes(val) : (typeof val === 'string' ? key.includes(val) : val.test(key))) {
          let dataUrl = await this.render(this.get(stored[key][0], stored[key][1]));
          let img = $(`<img src="${dataUrl}">`).appendTo(this.previewDiv)[0];
          if (previewed === 0) {
            first = this.get(stored[key][0], stored[key][1]);
          }
          if (previewed === 0 ? hasHeight : this.previewDiv.find('img')[0].style.height) {
            await waitImgLoad(img);
            img.style.height = `${img.naturalHeight / window.devicePixelRatio}px`;
          }
          if (this.searchState[2] === 'handoff') {
            this.searchState[2] = 'search';
            return this.search(this.searchState[1], stored);
          }
          previewed++;
          if (previewed === 20) {
            break;
          }
        }
      }
      if (previewed === 0) {
        this.previewDiv.append('<h1 style="padding:1in;">Phrase not found.</h1>');
      } else {
        this.makeFields = this.parsed[first.csv].meta.fields;
        this.makeInput.val(Papa.unparse([this.makeFields.map(f => first[f])]));
        this.mainDiv.empty();
        await first.main(this.mainDiv);
        this.makeLock = false;
      }
      this.searchState[2] = 'done';
      delete this.searchLock;
      return stored;
    } catch(err){showError(err);}}

    async makeClicked () {try {
      if (this.makeLock) {
        return;
      }
      this.makeLock = true;
      let results = Papa.parse(this.makeInput.val()), a = results.data[0], n = a.length, card = {};
      for (let j = 0; j < n; j++) {
        card[this.makeFields[j]] = a[j];
      }
      card = new this.Card(null, this.makeI, card);
      let dataUrl = await this.render(card, true);
      this.makeI++;
      this.makeLock = false;
      let first = this.previewDiv.find('img')[0];
      let img = $(`<img src="${dataUrl}">`).prependTo(this.previewDiv)[0];
      await waitImgLoad(img);
      if (first && first.style.height) {
        img.style.height = `${img.naturalHeight / window.devicePixelRatio}px`;
      }
      this.previewDiv.scrollLeft(0);
      $('html,body').scrollTop(0);
    } catch(err){showError(err, this.mainDiv);this.makeLock = false;}}

    async makeChanged () {
      let card = {};
      let results = null;
      try {
        results = Papa.parse(this.makeInput.val());
        let a = results.data[0], n = a.length;
        for (let j = 0; j < n; j++) {
          card[this.makeFields[j]] = a[j];
        }
        card = new this.Card(null, this.makeI, card);
      } catch(err){showError(err, this.mainDiv);}
      try {
        if (this.makeLock) {
          return;
        }
        this.makeLock = true;
        let mainElement = this.mainDiv[0];
        mainElement.style.minHeight = `${mainElement.scrollHeight}px`;
        this.mainDiv.empty();
        await card.main(this.mainDiv);
        mainElement.style.minHeight = '';
        $('html,body').scrollTop(this.makeButton.offset().top);
        if (results.errors && results.errors.length > 0) {
          for (let err of results.errors) {
            console.log(`Test input: ${JSON.stringify(err)}`);
          }
          showError({error: `${results.errors.length} error(s) in test input`}, this.mainDiv);
        }
        this.makeLock = false;
      } catch(err){showError(err, this.mainDiv);this.makeLock = false;}
    }

    async toggleZoom () {try {
      let imgs = this.previewDiv.find('img').get();
      if (imgs[0].style.height) {
        for (let img of imgs) {
          img.style.height = '';
        }
      } else {
        await waitImgLoad();
        for (let img of imgs) {
          img.style.height = `${img.naturalHeight / window.devicePixelRatio}px`;
        }
      }
    } catch(err){showError(err);}}
  }

  class CardZip extends JSZip {
    count () {
      return Object.keys(this.files).length;
    }
  }

  let unsafe = /[?<>%|:"\/\\]/g;

  function basename (filename, replaceUnsafe, removePath) {
    if (removePath) {
      filename = filename.substr(filename.lastIndexOf('/') + 1);
    }
    filename = filename.substr(0, filename.lastIndexOf('.'));
    return replaceUnsafe ? filename.replace(unsafe, '_') : filename;
  }

  function showError(err, container = $('body')) {
    var obj = {};
    for (let key of Object.getOwnPropertyNames(err)) {
      obj[key] = err[key];
    }
    container.prepend(`<p style="color:#c00;">Error (open console for more info):<br>${err}<br>${JSON.stringify(obj, null, ' ')}</p>`.replace(/\\n/g, '<br>'));
  }

  function waitImgLoad (img) {
    if (img === undefined) {
      let promises = [];
      for (img of document.querySelectorAll('img')) {
        if (!img.complete) {
          promises.push(waitImgLoad(img));
        }
      }
      return Promise.all(promises);
    }
    let p = new Promise(resolve => img.addEventListener('load', resolve));
    return img.complete ? Promise.resolve() : p;
  }

  function sleep (ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /* window.Cardery resembles a class in every way except that its "constructor"
   * doesn't use 'new'. The resemblance is coincidental. When I noticed the
   * resemblance, I rewrote the implementation to use a class because it gave me
   * more syntax sugar. But from the user perspective, it makes no sense to use
   * 'new', there's no reason to reckon Cardery a class you can instantiate. */
  window.Cardery = (...args) => { window.Cardery = new Cardery(...args); };
  // Provide static members even before window.Cardery replaces itself
  window.Cardery.Cardery = Cardery;
  window.Cardery.CardZip = CardZip;
  window.Cardery.unsafe = unsafe;
  window.Cardery.basename = basename;
  window.Cardery.waitImgLoad = waitImgLoad;
  window.Cardery.sleep = sleep;
  window.Cardery.showError = showError;
});
