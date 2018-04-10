/*
 * OGP用の画像を生成する
 */

const path = require('path');
const Jimp = require('jimp');
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

const SOURCE_URI = 'https://twitter.com/wodnuyRnaiR/status/977500688279154688';
const TARGET_URI = 'https://pbs.twimg.com/media/DZDHrURU0AEnlK8.jpg:orig';

urlFetch(TARGET_URI, { ext: 'jpg' })
  .then(filepath => Promise.all([
    Jimp.read(filepath),
    Jimp.read(`${__dirname}/../src/img/ogp-annotation-text/text.png`),
  ]))
  .then(([image, textImage]) => {
    const {width: originalWidth, height: originalHeight} = image.bitmap;
    const cropY = 35;
    const bgcolor = 'black';

    /*
     * 必要な箇所をクロップする
     */
    image.crop(0, cropY, originalWidth, originalWidth);
    let {width: currentWidth, height: currentHeight} = image.bitmap;

    /*
     * 著作者情報のテキストを追加する
     */
    {
      const {width: textWidth, height: textHeight} = textImage.bitmap;
      const xDiff = (currentWidth - textWidth) / 2;
      image.composite(textImage, xDiff, currentHeight - textHeight - xDiff);
    }

    /*
     * 保存する
     */
    image.write(`${__dirname}/../cache/ogp-out-test.png`);
  })
  .catch(error => console.error(error));
