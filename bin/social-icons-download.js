/*
 * ソーシャルボタン用の画像ファイルを自動で取得する
 */

const path = require('path');
const cpFile = require('cp-file');
const urlFetch = require('../lib/urlFetch');
const urlToFilename = require('../lib/urlToFilename');

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
  const outputFilename = urlToFilename(url) + path.extname(url);
  const outputFilePath = path.join(outputDirPath, outputFilename);
  const outputFileRelativePath = path.join(outputDirRelativePath, outputFilename);

  console.error(`    Icon image downloading: ${url}`);

  urlFetch(url)
    .then(filepath => {
      console.error(`    Download complete: ${url}`);
      console.error(`    Saving to ${outputFileRelativePath}`);
      return cpFile(filepath, outputFilePath);
    })
    .then(() => {
      console.error(`    Save complete: ${outputFileRelativePath}`);
    })
    .catch(err => {
      console.error('    Icon image download error:');
      console.error(`        URL: ${url}`);
      console.error(`        Save path: ${outputFileRelativePath}`);
      console.error();
      console.error(err);
      console.error();
    });
});
