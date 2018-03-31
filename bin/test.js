const fs = require('fs');
const cheerio = require('cheerio');
const request = require('sync-request');

const inputHtml = fs.readFileSync('/dev/stdin', 'utf8');

const $ = cheerio.load(inputHtml, {
  decodeEntities: false,
});

$('object[type="application/x.oembed"]').each((_, elemNode) => {
  const elem = $(elemNode);
  const url = elem.attr('data');

  /**
   * @see https://oembed.com/
   */

  let endpointUrl = '';
  if (/^https:\/\/twitter\.com\/[^/]*\/status\/[^/]*$/.test(url)) {
    endpointUrl = 'https://publish.twitter.com/oembed';
  }

  if (endpointUrl !== '') {
    const qs = {url};

    elem.find('param').each((_, elemNode) => {
      const elem = $(elemNode);
      const name = elem.attr('name');
      const value = elem.attr('value');

      qs[name] = value;
    });

    const res = request('GET', endpointUrl, {qs});
    const contentType = (() => {
      const data = (
        Object.entries(res.headers)
          .filter(([key]) => /^content-type$/i.test(key))
          .pop()
      );
      return data ? data[1] : '';
    })();

    let replaceElem = $('<a>');

    if (200 <= res.statusCode && res.statusCode < 300 && contentType) {
      let data = {};

      if (/^text\/xml(?:;|$)/.test(contentType)) {
        /*
         * XML
         */
      } else if (/^application\/json(?:;|$)/.test(contentType)) {
        /*
         * JSON
         */
        data = JSON.parse(res.body);
      }

      if (data.type === 'rich') {
        replaceElem = $(data.html);
      }
    } else {
      // got error!
      replaceElem.attr('href', url);
      replaceElem.text(url);
    }

    elem.replaceWith(replaceElem);
  }
});

process.stdout.write($.html());
