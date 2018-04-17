const fs = require('fs');
const Jimp = require('jimp');

/**
 * Jimpで、最も小さく圧縮されたPNG画像を書き出す関数
 *
 * @param {Jimp} image 画像のJimpオブジェクト
 * @param {string} filepath 保存するファイルパス
 * @param {!Object} [options={}] オプションをプロパティとして渡すオブジェクト。
 * @param {?boolean} [options.rgba=null] PNGをRGBAで保存する場合はtrue、RGBで保存する場合はfalse。
 *     nullを指定した場合、自動判定を行う。初期値はnull。
 * @return {Promise}
 */
function writeOptimizedPng(image, filepath, { rgba = null } = {}) {
  return new Promise((resolve, reject) => {
    if (!(image instanceof Jimp)) {
      reject(new TypeError('image parameter must be a Jimp object'));
      return;
    }

    /*
     * 副作用を防ぐため、Jimpオブジェクトをコピーする
     * TODO: 関数実行時にコピーするかどうかを選択できるようにするオプションの追加。
     */
    const targetImage = image.clone();

    /*
     * rgbaオプションがnullの場合、透過色が含まれるかを自動判定する
     */
    if (rgba === null) {
      rgba = false;

      const targetBitmap = targetImage.bitmap;
      const targetData = targetBitmap.data;
      targetImage.scan(
        0,
        0,
        targetBitmap.width,
        targetBitmap.height,
        (x, y, idx) => {
          const alpha = targetData[idx + 3];
          if (alpha !== 255) {
            rgba = true;
          }
        },
      );
    }

    /*
     * 最低限必要なパラメータを定義
     */
    targetImage.rgba(Boolean(rgba));
    targetImage.deflateLevel(9);

    /*
     * 様々なパラメータ設定でPNG画像データを生成する
     */
    const waitPromiseList = [];
    let imageBuffer = null;
    for (const filterType of [
      'AUTO',
      'NONE',
      'SUB',
      'UP',
      'AVERAGE',
      'PAETH',
    ]) {
      const filterValue = Jimp[`PNG_FILTER_${filterType}`];
      if (typeof filterValue === 'number') {
        targetImage.filterType(filterValue);

        for (const deflateStrategy of [0, 1, 2, 3]) {
          targetImage.deflateStrategy(deflateStrategy);

          waitPromiseList.push(
            new Promise(resolve => {
              targetImage.getBuffer(Jimp.MIME_PNG, (err, buffer) => {
                if (!err) {
                  const prevBuf = imageBuffer;
                  if (!prevBuf || buffer.length < prevBuf.length) {
                    imageBuffer = buffer;
                  }
                }
                // TODO: エラーだけでなく、この時のパラメータ設定も返す
                resolve(err);
              });
            }),
          );
        }
      }
    }

    /*
     * PNG画像データが生成されるまで待機する
     */
    Promise.all(waitPromiseList).then(() => {
      if (!imageBuffer) {
        reject(new Error('PNG image data could not be generated'));
        return;
      }
      fs.writeFile(filepath, imageBuffer, err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
}

module.exports = writeOptimizedPng;
