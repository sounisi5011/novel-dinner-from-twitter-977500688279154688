/*
 * OGP用の画像を生成する
 */

const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');
const urlFetch = require('../lib/urlFetch');
const writeOptimizedPng = require('../lib/Jimp/writeOptimizedPng');

const config = require('../config.json');

const SOURCE_URI = 'https://twitter.com/wodnuyRnaiR/status/977500688279154688';
const TARGET_URI = 'https://pbs.twimg.com/media/DZDHrURU0AEnlK8.jpg:orig';

if (process.argv.length < 3) {
  return;
}

const rootPath = path.join(__dirname, '..');
const dirPath = path.join(rootPath, process.argv[2]);

urlFetch(TARGET_URI, { ext: 'jpg' })
  .then(filepath => Promise.all([
    Jimp.read(filepath),
    Jimp.read(`${rootPath}/src/img/ogp-annotation-text/text.png`),
  ]))
  .then(([originalImage, textImage]) => {
    const {width: originalImageWidth, height: originalImageHeight} = originalImage.bitmap;

    /*
     * 必要な箇所をクロップする
     */
    const cropPos = [0, 35];
    const cropSize = [originalImageWidth, originalImageWidth];
    const squareImage = originalImage.clone().crop(...cropPos, ...cropSize);
    const {width: squareImageWidth, height: squareImageHeight} = squareImage.bitmap;

    /*
     * 著作者情報のテキストを追加する
     */
    const {width: textImageWidth, height: textImageHeight} = textImage.bitmap;
    const xDiff = (squareImageWidth - textImageWidth) / 2;
    const twitterCardImage = squareImage.clone().composite(textImage, xDiff, squareImageHeight - textImageHeight - xDiff);
    const {width: twitterCardImageWidth, height: twitterCardImageHeight} = squareImage.bitmap;

    if (config.twitterCardsImagePath) {
      /*
       * 保存する
       */
      writeOptimizedPng(twitterCardImage, path.join(dirPath, config.twitterCardsImagePath))
        .then(() => console.error(`${config.twitterCardsImagePath} generated!`))
        .catch(err => {
          console.error(`${config.twitterCardsImagePath} generate error:`);
          console.error(err);
        });
    }

    if (config.ogpImagePath) {
      /**
       * 1.91:1サイズの背景画像を生成
       * @see https://github.com/oliver-moran/jimp/issues/167#issuecomment-249063832
       * @see https://github.com/oliver-moran/jimp/tree/f7b5e5b543b012069c513ae8a2368c388e54e6ad#creating-new-images
       */
      const bgColor = 0x000000FF;
      const horizontalMargin = Math.round(((twitterCardImageHeight * 1.91) - twitterCardImageWidth) / 2);
      const verticalMargin = 0;
      const ogpSize = [
        twitterCardImageWidth + (horizontalMargin * 2),
        twitterCardImageHeight + (verticalMargin * 2),
      ];
      const backgroundImage = new Jimp(...ogpSize, bgColor);

      /*
       * 背景画像に、対象の画像を合成
       */
      const ogpImage = backgroundImage.clone().composite(twitterCardImage, horizontalMargin, verticalMargin);

      /*
       * 保存する
       */
      writeOptimizedPng(ogpImage, path.join(dirPath, config.ogpImagePath))
        .then(() => console.error(`${config.ogpImagePath} generated!`))
        .catch(err => {
          console.error(`${config.ogpImagePath} generate error:`);
          console.error(err);
        });
    }
  })
  .catch(err => console.error(err));
