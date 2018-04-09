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

const filePath = path.join(SAVE_DIR, FILE_NAME);

console.error(`Fetching image: ${TARGET_URI}`);
rp({ uri: TARGET_URI, encoding: null })
  .then(body => {
    console.error(`Fetch complete: ${TARGET_URI}`);
    console.error(`Saving to ${FILE_NAME}`);

    mkdirp(SAVE_DIR, error => {
      if (!error) {
        fs.writeFile(filePath, body, error => {
          if (!error) {
            console.error(`Saved to ${FILE_NAME}`);
          }
        });
      }
    });
  });
