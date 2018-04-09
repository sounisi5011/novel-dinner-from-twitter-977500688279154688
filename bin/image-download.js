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

const SOURCE_URI = 'https://twitter.com/wodnuyRnaiR/status/977500688279154688';
const TARGET_URI = 'https://pbs.twimg.com/media/DZDHrURU0AEnlK8.jpg:orig';
const SAVE_DIR = `${__dirname}/../cache`;
const FILE_NAME = urlToFilename(SOURCE_URI) + '.' + urlToFilename(TARGET_URI) + '.jpg';

const nowMs = Date.now();
const filePath = path.join(SAVE_DIR, FILE_NAME);

fs.stat(filePath, (error, stats) => {
  /*
   * ファイルが存在しないか、ファイルの作成から7日以上経過していた場合は、
   *
   * Note: stats.birthtimeは、環境によっては正しい値にならないため、stats.mtimeを使用する
   */
  if (error) {
    const code = error.code;
    if (code === 'ENOTDIR') {
      const dirPath = path.dirname(filePath);
      console.error(`The save directory exists as a file: ${dirPath}`);
      return;
    } else if (code !== 'ENOENT') {
      console.error('fs.stat(): unknown error');
      console.error(error);
      return;
    }

    console.error('Cached file not exists');
  } else {
    if (!stats.isFile()) {
      console.error(`Save path is not file: ${filePath}`);
      return;
    }

    /*
     * ファイルの作成から7日より長く経過していなければ、
     * 処理を中断する
     */
    if (nowMs <= (stats.mtimeMs + (7 * 24 * 60 * 60 * 1000))) {
      console.error(`Cached file exists: ${filePath}`);
      return;
    }

    console.error('Updating cached file...');
  }

  /*
   * ファイルをダウンロード
   */
  console.error('Fetching image...');

  rp({ uri: TARGET_URI, encoding: null })
    .then(body => {
      console.error(`Fetch complete: ${TARGET_URI}`);
      console.error(`Saving to ${FILE_NAME}`);

      mkdirp(SAVE_DIR, error => {
        if (error) {
          console.error('Directory create error');
          console.error(error);
        } else {
          fs.writeFile(filePath, body, error => {
            if (error) {
              console.error('Save error');
              console.error(error);
            } else {
              console.error(`Saved to ${FILE_NAME}`);
            }
          });
        }
      });
    });
});
