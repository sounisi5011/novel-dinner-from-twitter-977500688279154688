const fs = require('fs');
const path = require('path');
const rp = require('request-promise-native');
const mkdirp = require('mkdirp');

/**
 * 指定されたURLのファイルを取得する
 *
 * @param {string} url 取得するファイルのURL。
 * @param {!Object} [options={}] オプションをプロパティとして渡すオブジェクト。
 * @param {string} [options.ext] ファイルの拡張子。省略した場合、URLから取得する。
 * @param {string} [options.cacheDir=`${__dirname}/../cache/fetch-files`] ファイルをキャッシュするディレクトリのパス。
 * @param {number} [options.cacheSec=(7 * 24 * 60 * 60)] キャッシュしたファイルを保持し、再利用する秒数。
 *     省略した場合、七日に設定される。
 * @param {boolean} [options.showConsoleMessage=true] trueに設定した場合、標準エラー出力に進行状況を表示する。
 * @param {string} [options.showConsolePathCwd=process.cwd()] カレントディレクトリを示す文字列。
 *     標準エラー出力に表示する進行状況で、ファイルパスを簡略表示するために使用する。
 * @return {Promise} Promiseオブジェクト。成功時にキャッシュしたファイルパスを示す文字列、
 *     失敗時にUrlFetchErrorBaseクラスを継承したエラーオブジェクトを返す
 */
function urlFetch(url, {ext, cacheDir = `${__dirname}/../cache/urlFetch-files`, cacheSec = (7 * 24 * 60 * 60), showConsoleMessage = true, showConsolePathCwd=process.cwd()} = {}) {
  return new Promise((resolve, reject) => {
    const cacheFilePath = (
      path.resolve(cacheDir, new Buffer(url).toString('hex')) +
      ((ext ? String(ext) : '') || path.extname(url)).replace(/^[^.]/, '.$&')
    );
    const cacheDirPath = path.dirname(cacheFilePath);
    const nowMs = Date.now();

    const currentPath = showConsolePathCwd;
    const cacheDirRelativePath = (
      currentPath ?
      path.relative(currentPath, cacheDirPath) :
      cacheDirPath
    );
    const cacheFileRelativePath = (
      currentPath ?
      path.relative(currentPath, cacheFilePath) :
      cacheFilePath
    );

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
        console.error('Fetching file...');
      }

      rp({ uri: url, encoding: null })
        .then(bodyData => {
          if (showConsoleMessage) {
            console.error(`Fetch complete: ${url}`);
            console.error(`Saving: ${cacheFileRelativePath}`);
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
        })
        .catch(requestErr => {
          reject(new HttpRequestError(
            `HTTP error: ${url}`,
            { previousError: requestErr }
          ));
        });
    });
  });
}

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
 *
 * Note: 元のエラーのスタックトレースを継承（？）できていない。このエラーのスタックトレースを見るだけだと、エラーの元凶を把握できない。
 * TODO: スタックトレースを継承するエラークラスにする
 */
class UrlFetchErrorBase extends Error {
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

class CacheDirExistsAsAFileError extends UrlFetchErrorBase {}
class CachePathIsExistsError extends UrlFetchErrorBase {}
class CachePathIsNotFileError extends UrlFetchErrorBase {}
class CacheDirectoryCreationError extends UrlFetchErrorBase {}
class CacheFileCreationError extends UrlFetchErrorBase {}
class HttpRequestError extends UrlFetchErrorBase {}

Object.assign(urlFetch, {
  urlFetch,
  UrlFetchErrorBase,
  CacheDirExistsAsAFileError,
  CachePathIsExistsError,
  CachePathIsNotFileError,
  CacheDirectoryCreationError,
  CacheFileCreationError,
});

module.exports = urlFetch;
