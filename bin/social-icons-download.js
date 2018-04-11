/*
 * ソーシャルボタン用の画像ファイルを自動で取得する
 */

const path = require('path');
const cpy = require('cpy');
const urlFetch = require('../lib/urlFetch');

const urlToFilename = urlStr => (
  urlStr.replace(
    /^https?:\/\/|[.\/:]/g,
    char => (
      char === '.' ? '{dot}' :
      char === '/' ? '{slash}' :
      char === ':' ? '{colon}' :
      ''
    )
  )
);

const URL_LIST = [
  /*
   * https://developers.google.com/+/web/share/?hl=ja#sharelink-sizes
   */
  'https://www.gstatic.com/images/icons/gplus-64.png',
  'https://www.gstatic.com/images/icons/gplus-32.png',
  'https://www.gstatic.com/images/icons/gplus-16.png',

  /*
   * http://b.hatena.ne.jp/guide/bbutton
   */
  'https://b.st-hatena.com/images/entry-button/button-only@2x.png',
];

if (process.argv.length < 3) {
  return;
}

const outputDirPath = path.join(process.cwd(), process.argv[2]);
const outputDirRelativePath = path.relative(process.cwd(), outputDirPath);

URL_LIST.forEach(url => {
  console.error(path.join(outputDirPath, urlToFilename(url) + path.extname(url)));
  return;

  urlFetch(url)
    .then(filepath => {})
    .catch(err => console.error(err));
});
