const fs = require('fs');
const http = require('http');
const cheerio = require('cheerio');
const rp = require('request-promise-native');
const mkdirp = require('mkdirp');

const cachedRp = (() => {
  const cacheSec = 30 * 60;
  const cacheMSec = cacheSec * 1000;

  const cacheDir = `${__dirname}/../cache`;
  const cacheFilepath = `${cacheDir}/http-cache.json`;
  /**
   * @see https://nodejs.org/api/http.html#http_class_http_incomingmessage
   * @see https://github.com/nodejs/node/blob/29be1e5f8426b8f58a390847aa94c1f9a6d103f4/lib/_http_incoming.js#L38-L69
   */
  const copyPropSet = new Set([
    'headers',
    'httpVersion',
    'method',
    'rawHeaders',
    'rawTrailers',
    'statusCode',
    'statusMessage',
    'trailers',
    'url',
    'METHODS',
    'STATUS_CODES',
    'request',
    'upgrade',
    'complete',
    'httpVersionMajor',
    'httpVersionMinor',
    'readable',
    'body',
  ]);

  const httpCache = {};
  try {
    const stat = fs.statSync(cacheFilepath);
    if (stat.isFile()) {
      const fileData = fs.readFileSync(cacheFilepath, 'utf8');
      const cacheData = JSON.parse(fileData);
      if (cacheData && typeof cacheData === 'object') {
        const nowMSec = Date.now();
        for (const [cacheKey, value] of Object.entries(cacheData)) {
          if (value && nowMSec <= value.expires) {
            httpCache[cacheKey] = value;
          }
        }
      }
    }
  } catch (e) {}

  return function cachedRp(options) {
    const cacheKey = JSON.stringify(options);

    return new Promise((resolve, reject) => {
      const nowMSec = Date.now();
      const cacheData = httpCache[cacheKey];

      if (cacheData && nowMSec <= cacheData.expires) {
        resolve(cacheData.value);
      } else {
        delete httpCache[cacheKey];

        rp(options)
          .then(value => {
            if (value instanceof http.IncomingMessage) {
              const newValue = {};
              for (const propName in value) {
                if (copyPropSet.has(propName)) {
                  newValue[propName] = value[propName];
                }
              }
              value = newValue;
            }

            resolve(value);

            /*
             * Set cache data
             */
            httpCache[cacheKey] = {
              cached: nowMSec,
              expires: nowMSec + cacheMSec,
              value: value,
            };

            /*
             * Save cache data
             */
            mkdirp(cacheDir, error => {
              if (!error) {
                try {
                  const fileData = JSON.stringify(httpCache);
                  fs.writeFile(cacheFilepath, fileData, () => {});
                } catch (e) {}
              }
            });
          })
          .catch(value => {
            reject(value);
          });
      }
    });
  };
})();

const inputHtml = fs.readFileSync('/dev/stdin', 'utf8');

const $ = cheerio.load(inputHtml, {
  decodeEntities: true,
});

const requestList = [];

$('object[type="application/x.oembed"]').each((_, objectElemNode) => {
  const objectElem = $(objectElemNode);
  const embeddedTargetUrl = objectElem.attr('data');
  const embeddedResourceWidth = objectElem.attr('width');
  const embeddedResourceHeight = objectElem.attr('height');

  /**
   * @see https://oembed.com/
   */

  const queryParameters = { url: embeddedTargetUrl };
  let endpointUrl = '';
  const appendScriptList = [];
  if (
    /^https:\/\/twitter\.com\/[^/]*\/status\/[^/]*$/.test(embeddedTargetUrl)
  ) {
    endpointUrl = 'https://publish.twitter.com/oembed';
    appendScriptList.push({
      src: 'https://platform.twitter.com/widgets.js',
      async: null,
    });
    queryParameters.omit_script = 'true';
  }

  if (endpointUrl) {
    if (embeddedResourceWidth) {
      queryParameters.maxwidth = embeddedResourceWidth;
    }
    if (embeddedResourceHeight) {
      queryParameters.maxheight = embeddedResourceHeight;
    }

    objectElem.children('param').each((_, paramElemNode) => {
      const paramElem = $(paramElemNode);
      const name = paramElem.attr('name');
      const value = paramElem.attr('value');

      if (name && value) {
        queryParameters[name] = value;
      }
    });

    let replaceElem = $('<a>');
    replaceElem.attr('href', embeddedTargetUrl);
    replaceElem.text(embeddedTargetUrl);

    requestList.push(
      new Promise(resolve => {
        cachedRp({
          uri: endpointUrl,
          qs: queryParameters,
          resolveWithFullResponse: true,
        })
          .then(response => {
            const { statusCode, headers, body } = response;

            if (200 <= statusCode && statusCode < 300) {
              const contentType = Object.entries(headers)
                .filter(([key]) => /^content-type$/i.test(key))
                .map(([, value]) => value)
                .pop();
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
              } else if (data.type === 'video') {
                /*
                 * The video type
                 */
              } else if (data.type === 'link') {
                /*
                 * The link type
                 */
              } else if (data.type === 'rich') {
                /*
                 * The rich type
                 */
                const { html } = data;
                replaceElem = $(html.trim());
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

            resolve({ objectElem, replaceElem, appendScriptList });
          })
          .catch(error => {
            /*
             * API call failed
             */
            console.error('oEmbed API call failed');
            console.error(error);
            console.error();
            resolve({ objectElem, replaceElem });
          });
      }),
    );
  } else {
    /*
     * API endpoint is Unknown
     */
  }
});

Promise.all(requestList).then(values => {
  const appendScriptMap = new Map();

  for (const { objectElem, replaceElem, appendScriptList } of values) {
    objectElem.replaceWith(replaceElem);
    if (Array.isArray(appendScriptList)) {
      appendScriptList.forEach(appendScript => {
        const key = appendScript.src
          ? `S${appendScript.src}`
          : appendScript.text
            ? `T${appendScript.text}`
            : '';
        if (key) appendScriptMap.set(key, appendScript);
      });
    }
  }

  const scriptElems = $('script');
  const bodyElem = $('body');
  for (const [, appendScript] of appendScriptMap) {
    const src = appendScript.src;

    if (src && scriptElems.is(`[src="${src.replace(/[\\"]/g, '\\$&')}"]`)) {
      continue;
    }

    let scriptHtml = '<script';

    for (const [prop, value] of Object.entries(appendScript)) {
      /*
       * @see https://html.spec.whatwg.org/multipage/syntax.html#attributes-2
       *
       * Note: 正規表現を書くのがめんどくさいので、noncharacterのパターンは含めていない
       */
      if (
        // eslint-disable-next-line no-control-regex
        !/[\u0000-\u001F\u007F-\u009F\u0020"'>/=]/.test(prop) &&
        prop !== 'text'
      ) {
        scriptHtml += ` ${prop.replace(/&/g, '&amp;')}`;
        if (value !== null) {
          scriptHtml += `="${value
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')}"`;
        }
      }
    }

    scriptHtml += '>';

    if (!src) {
      const scriptText = appendScript.text;
      if (scriptText) scriptHtml += String(scriptText);
    }

    scriptHtml += '</script>';

    bodyElem.append(scriptHtml);
  }

  const minifyNumericCharacterReferences = (match, decimal, hex) => {
    const newEntitie = hex
      ? `&#${parseInt(hex, 16)};`
      : decimal
        ? `&#x${Number(decimal)
            .toString(16)
            .toUpperCase()};`
        : '';

    return newEntitie && newEntitie.length < match.length ? newEntitie : match;
  };

  const outputHTML = $.html()
    /*
     * 数値文字参照をより短い形式に変換
     *
     * ex: &#x2026; -> &#8230;
     */
    .replace(
      /&#(?:([0-9]+)|[xX]([0-9a-fA-F]+));/g,
      minifyNumericCharacterReferences,
    );

  process.stdout.write(outputHTML);
});
