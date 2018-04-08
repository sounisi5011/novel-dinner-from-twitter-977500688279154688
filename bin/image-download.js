const fs = require('fs');
const path = require('path');
const rp = require('request-promise-native');
const mkdirp = require('mkdirp');

const TARGET_URI = 'https://pbs.twimg.com/media/DZDHrURU0AEnlK8.jpg:orig';
const SAVE_DIR = `${__dirname}/../cache`;
const FILE_NAME = 'twitter{dot}com{slash}wodnuyRnaiR{slash}status{slash}977500688279154688.jpg';

rp({ uri: TARGET_URI, encoding: null })
  .then(body => {
    mkdirp(SAVE_DIR, error => {
      if (!error) {
        const FILE_PATH = path.join(SAVE_DIR, FILE_NAME);
        fs.writeFile(FILE_PATH, body, error => {});
      }
    });
  });
