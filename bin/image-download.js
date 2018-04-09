const fs = require('fs');
const path = require('path');
const rp = require('request-promise-native');
const mkdirp = require('mkdirp');

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

/**
 * 指定されたURLの画像ファイルを取得する
 *
 * @param {string} url 取得する画像ファイルのURL
 * @param {!Object} [options={}] オプションをプロパティとして渡すオブジェクト
 * @param {string} [options.ext] 画像ファイルの拡張子。省略した場合、URLから取得する
 * @param {string} [options.cacheDir=`${__dirname}/../cache/fetch-image`] 画像ファイルをキャッシュするディレクトリのパス
 * @param {number} [options.cacheSec=(7 * 24 * 60 * 60)] キャッシュした画像ファイルを使用する時間。省略した場合、七日に設定される。
 * @param {boolean} [options.showConsoleMessage=true] trueに設定した場合、標準エラー出力に進行状況を表示する
 * @return {Promise} 成功時に画像のファイルパスを示す文字列、失敗時にErrorオブジェクトを継承した独自オブジェクトを返すPromiseオブジェクト
 */
const fetchImage = (url, {ext, cacheDir = `${__dirname}/../cache/fetch-image`, cacheSec = (7 * 24 * 60 * 60), showConsoleMessage = true} = {}) => new Promise((resolve, reject) => {
  /**
   * 失敗時に返すエラーオブジェクト
   *
   * @property {string} name エラー名
   * @property {string} message エラーの説明文
   * @property {string} code エラーの種別を示す文字列。
   *     詳細は{@link https://nodejs.org/docs/latest-v8.x/api/errors.html#errors_error_code}を参照
   * @property {?Error} previous エラーの発生要因となったエラーオブジェクト、または、null
   * @extends Error
   * @see https://qiita.com/Mizunashi_Mana/items/c533fbb51bfee491b0e7#%E3%81%A9%E3%81%AE%E3%82%88%E3%81%86%E3%81%AA%E3%82%AA%E3%83%96%E3%82%B8%E3%82%A7%E3%82%AF%E3%83%88%E3%81%8Cnode%E3%81%AE%E3%82%A8%E3%83%A9%E3%83%BC%E3%81%A8%E8%A8%80%E3%81%88%E3%82%8B%E3%81%AE%E3%81%8B
   */
  class FetchImageErrorBase extends Error {
    /**
     * @param {string} message エラーの説明文
     * @param {!Object} [options={}] エラーのオプションをプロパティとして渡すオブジェクト
     * @param {string|undefined} [options.code] エラーの種別を示す文字列。
     *     詳細は{@link https://nodejs.org/docs/latest-v8.x/api/errors.html#errors_error_code}を参照。
     * @param {?Error} [options.previousError] 前のエラー。
     *     このエラーが発生する原因となったエラーを含める事ができる。
     */
    constructor(message, {code, previousError} = {}) {
      super();
      Error.captureStackTrace(this, this.constructor);
      Object.defineProperties(this, {
        name: { value: String(this.constructor.name) },
        message: { value: String(message) },
        previous: {
          value: ((previousError instanceof Error) ? previousError : null),
        },
      });
      if (code !== undefined) {
        Object.defineProperty(this, 'code', { value: String(code) });
      }
    }
  }
  class CacheDirExistsAsAFileError extends FetchImageErrorBase {}
  class CachePathIsExistsError extends FetchImageErrorBase {}
  class CachePathIsNotFileError extends FetchImageErrorBase {}
  class CacheDirectoryCreationError extends FetchImageErrorBase {}
  class CacheFileCreationError extends FetchImageErrorBase {}

  const cacheFilePath = (
    path.resolve(cacheDir, new Buffer(url).toString('hex')) +
    ((ext ? String(ext) : '') || path.extname(url)).replace(/^[^.]/, '.$&')
  );
  const cacheDirPath = path.dirname(cacheFilePath);
  const nowMs = Date.now();

  const currentPath = process.cwd();
  const cacheDirRelativePath = path.relative(currentPath, cacheDirPath);
  const cacheFileRelativePath = path.relative(currentPath, cacheFilePath);

  fs.stat(cacheFilePath, (statErr, stats) => {
    if (statErr) {
      /*
       * キャッシュファイルのパスが存在しない場合
       */

      const statErrCode = statErr.code;
      if (statErrCode === 'ENOTDIR') {
        /*
         * キャッシュディレクトリのパスがディレクトリではなかった場合
         */
        if (showConsoleMessage) {
          console.error(`The cache directory exists as a file: ${cacheDirRelativePath}`);
        }
        reject(new CacheDirExistsAsAFileError(
          `The cache directory exists as a file: ${cacheDirPath}`,
          { code: statErrCode, previousError: statErr }
        ));
        return;
      } else if (statErrCode !== 'ENOENT') {
        /*
         * その他の、キャッシュファイルのパスが存在しない場合を除くエラーが起きた場合
         */
        if (showConsoleMessage) {
          console.error(`Failed to check if cache path exists: ${cacheFileRelativePath}`);
        }
        reject(new CachePathIsExistsError(
          `Failed to check if cache path exists: ${cacheFilePath}`,
          { code: statErrCode, previousError: statErr }
        ));
        return;
      }

      if (showConsoleMessage) {
        console.error('Cached file not exists');
      }
    } else {
      /*
       * キャッシュファイルのパスが存在する場合
       */

      if (!stats.isFile()) {
        /*
         * キャッシュファイルのパスがファイルでは無い場合
         */
        if (showConsoleMessage) {
          console.error(`Cache path is not file: ${cacheFileRelativePath}`);
        }
        reject(new CachePathIsNotFileError(
          `Cache path is not file: ${cacheFilePath}`,
          { code: 'ENOTFILE' }
        ));
        return;
      }

      /*
       * ファイルの作成から、cacheSecで指定した時間より長く
       * 経過していなければ、キャッシュ済みのファイルパスを
       * 成功結果として返し、処理を中断する。
       *
       * Note: ファイルの作成時刻を示すstats.birthtimeは、
       *       環境によっては正しい値にならないため、
       *       ファイルの最終更新時刻を示すstats.mtimeを使用する。
       */
      if (nowMs <= (stats.mtimeMs + (cacheSec * 1000))) {
        if (showConsoleMessage) {
          console.error(`Cached file exists: ${cacheFileRelativePath}`);
        }
        resolve(cacheFilePath);
        return;
      }

      if (showConsoleMessage) {
        console.error('Updating cached file...');
      }
    }

    /*
     * ファイルをダウンロード
     */
    if (showConsoleMessage) {
      console.error('Fetching image...');
    }

    rp({ uri: url, encoding: null })
      .then(bodyData => {
        if (showConsoleMessage) {
          console.error(`Fetch complete: ${url}`);
          console.error(`Saving to: ${cacheFileRelativePath}`);
        }

        mkdirp(cacheDirPath, mkdirErr => {
          if (mkdirErr) {
            if (showConsoleMessage) {
              console.error(`Creation of cache directory failed: ${cacheDirRelativePath}`);
            }
            reject(new CacheDirectoryCreationError(
              `Creation of cache directory failed: ${cacheDirPath}`,
              { code: mkdirErr.code, previousError: mkdirErr }
            ));
          } else {
            fs.writeFile(cacheFilePath, bodyData, writeErr => {
              if (writeErr) {
                if (showConsoleMessage) {
                  console.error(`Creation of cache file failed: ${cacheFileRelativePath}`);
                }
                reject(new CacheFileCreationError(
                  `Creation of cache file failed: ${cacheFilePath}`,
                  { code: writeErr.code, previousError: writeErr }
                ));
              } else {
                if (showConsoleMessage) {
                  console.error(`Cached file saved: ${cacheFileRelativePath}`);
                }
                resolve(cacheFilePath);
              }
            });
          }
        });
      });
  });
});

const SOURCE_URI = 'https://twitter.com/wodnuyRnaiR/status/977500688279154688';
const TARGET_URI = 'https://pbs.twimg.com/media/DZDHrURU0AEnlK8.jpg:orig';

fetchImage(TARGET_URI, { ext: 'jpg' })
  .then(filepath => console.error(`Saved to ${path.basename(filepath)}`))
  .catch(error => console.error(error));
