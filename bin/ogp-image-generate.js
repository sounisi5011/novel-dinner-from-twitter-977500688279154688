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
    const bgcolor = 0x000000FF;

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

    /**
     * 1.91:1サイズの背景画像を生成
     * @see https://github.com/oliver-moran/jimp/issues/167#issuecomment-249063832
     * @see https://github.com/oliver-moran/jimp/tree/f7b5e5b543b012069c513ae8a2368c388e54e6ad#creating-new-images
     */
    const horizontalMargin = Math.round(((currentHeight * 1.91) - currentHeight) / 2);
    const verticalMargin = 0;
    const ogpSize = [
      currentHeight + (horizontalMargin * 2),
      currentHeight,
    ];
    const canvasImage = new Jimp(...ogpSize, bgcolor);

    /*
     * 背景画像に、対象の画像を合成
     */
    canvasImage.composite(image, horizontalMargin, verticalMargin);

    /*
     * 保存する
     */
    image.write(`${__dirname}/../cache/ogp-out-test.png`);
    canvasImage.write(`${__dirname}/../cache/ogp-canvas-test.png`);
  })
  .catch(error => console.error(error));
