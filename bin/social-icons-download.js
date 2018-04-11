/*
 * ソーシャルボタン用の画像ファイルを自動で取得する
 */

const fs = require('fs');
const path = require('path');
const urlFetch = require('../lib/urlFetch');

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

URL_LIST.forEach(url => {
  urlFetch(url)
    .then(filepath => {})
    .catch(err => console.error(err));
});
