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

/**
 * @see https://github.com/oliver-moran/jimp/blob/f207a81d34640fb56e2f76ae53a1a11b44455ea7/index.js#L2515-L2525
 */
function measureText(font, text) {
  var x = 0;
  for (var i = 0; i < text.length; i++) {
    if (font.chars[text[i]]) {
      x += 0
        //+ font.chars[text[i]].xoffset
        + (font.kernings[text[i]] && font.kernings[text[i]][text[i+1]] ? font.kernings[text[i]][text[i+1]] : 0)
        + (font.chars[text[i]].xadvance || 0);
    }
  }
  return x;
};

/**
 * @see https://github.com/oliver-moran/jimp/blob/2d93d5dcdf78ba09f9c203f508e3c3ca9a036abc/index.js#L2747-L2765
 */
function measureTextHeight(font, text, maxWidth = Infinity) {
  var words = text.split(' ');
  var line = '';
  var textTotalHeight = font.common.lineHeight;

  for (let n = 0; n < words.length; n++) {
    let testLine = line + words[n] + ' ';
    let testWidth = measureText(font, testLine);

    if (testWidth > maxWidth && n > 0) {
      textTotalHeight += font.common.lineHeight;
      line = words[n] + ' ';
    } else {
      line = testLine;
    }
  }

  return textTotalHeight;
}

urlFetch(TARGET_URI, { ext: 'jpg' })
  .then(filepath => Promise.all([
    Jimp.read(filepath),
    Jimp.loadFont(Jimp.FONT_SANS_16_WHITE),
    Jimp.loadFont(Jimp.FONT_SANS_32_WHITE),
  ]))
  .then(([image, font16, font32]) => {
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
    let bottomPos = 0;
    {
      const font = font16;
      const text = 'Source: https://twitter.com/wodnuyRnaiR/status/977500688279154688';
      const textWidth = measureText(font, text);
      const textHeight = measureTextHeight(font, text);
      const xPos = Math.floor((currentWidth - textWidth) / 2);
      const yPos = currentHeight - (bottomPos += textHeight);
      image.print(font, xPos, yPos, text);
    }
    {
      const font = font32;
      const text = 'Art by MisOdeN';
      const textWidth = measureText(font, text);
      const textHeight = measureTextHeight(font, text);
      const xPos = Math.floor((currentWidth - textWidth) / 2);
      const yPos = currentHeight - (bottomPos += textHeight);
      image.print(font, xPos, yPos, text);
    }

    /*
     * 保存する
     */
    image.write(`${__dirname}/../cache/ogp-out-test.png`);
  })
  .catch(error => console.error(error));
