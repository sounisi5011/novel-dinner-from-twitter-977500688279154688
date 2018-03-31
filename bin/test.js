const fs = require('fs');
const cheerio = require('cheerio');
const rp = require('request-promise');

const inputHtml = fs.readFileSync('/dev/stdin', 'utf8');

const $ = cheerio.load(inputHtml, {
  decodeEntities: false,
});

const requestList = [];

$('object[type="application/x.oembed"]').each((_, elemNode) => {
  const elem = $(elemNode);
  const url = elem.attr('data');
  const width = elem.attr('width');
  const height = elem.attr('height');

  /**
   * @see https://oembed.com/
   */

  const queryParameters = {url};
  let endpointUrl = '';
  let appendScriptHtml = '';
  if (/^https:\/\/twitter\.com\/[^/]*\/status\/[^/]*$/.test(url)) {
    endpointUrl = 'https://publish.twitter.com/oembed';
    appendScriptHtml = '<script async src="https://platform.twitter.com/widgets.js"></script>';
    queryParameters.omit_script = 'true';
  }

  if (endpointUrl !== '') {
    if (width) {
      queryParameters.maxwidth = width;
    }
    if (height) {
      queryParameters.maxheight = height;
    }

    elem.find('param').each((_, elemNode) => {
      const elem = $(elemNode);
      const name = elem.attr('name');
      const value = elem.attr('value');

      if (name && value) {
        queryParameters[name] = value;
      }
    });

    let replaceElem = $('<a>');
    replaceElem.attr('href', url);
    replaceElem.text(url);

    requestList.push(new Promise(resolve => {
      rp({
        uri: endpointUrl,
        qs: queryParameters,
        resolveWithFullResponse: true,
      })
        .then(response => {
          const {statusCode, headers, body} = response;

          if (200 <= statusCode && statusCode < 300) {
            const contentType = (
              Object.entries(headers)
                .filter(([key]) => /^content-type$/i.test(key))
                .map(([, value]) => value)
                .pop()
            );
            let data = {};

            if (/^text\/xml(?:;|$)/.test(contentType)) {
              /*
               * XML
               */
            } else if (/^application\/json(?:;|$)/.test(contentType)) {
              /*
               * JSON
               */
              data = JSON.parse(body);
            } else {
              /*
               * Unknown Content Type
               */
            }

            if (data.type === 'photo') {
              /*
               * The photo type
               */
              const {url, width, height} = data;
            } else if (data.type === 'video') {
              /*
               * The video type
               */
              const {html, width, height} = data;
            } else if (data.type === 'link') {
              /*
               * The link type
               */
            } else if (data.type === 'rich') {
              /*
               * The rich type
               */
              const {html, width, height} = data;
              replaceElem = $(html);
            } else {
              /*
               * Unknown type
               */
            }
          } else {
            /*
             * HTTP Status Code Error
             */
          }

          resolve({elem, replaceElem, appendScriptHtml});
        })
        .catch(error => {
          /*
           * API call failed
           */
          resolve({elem, replaceElem});
        });
    }));
  } else {
    /*
     * API endpoint is Unknown
     */
  }
});

Promise.all(requestList).then(values => {
  const appendScriptSet = new Set;

  for (const {elem, replaceElem, appendScriptHtml} of values) {
    elem.replaceWith(replaceElem);
    if (appendScriptHtml !== '') {
      appendScriptSet.add(appendScriptHtml);
    }
  }

  const bodyElem = $('body');
  for (const scriptHtml of appendScriptSet) {
    if (scriptHtml !== '') {
      bodyElem.append(scriptHtml);
    }
  }

  process.stdout.write($.html());
});
