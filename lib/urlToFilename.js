function urlToFilename(urlStr) {
  return urlStr
    .replace(
      /^https?:\/\/|[.\/:]/g,
      char => (
        char === '.' ? '{dot}' :
        char === '/' ? '{slash}' :
        char === ':' ? '{colon}' :
        ''
      )
    );
}

module.exports = urlToFilename;
