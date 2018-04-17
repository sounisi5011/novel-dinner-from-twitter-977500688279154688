const path = require('path');

const pathStartsWith = (path, searchPath) => {
  const pathSepRegExp = /[/\\]/;
  /**
   * @see https://stackoverflow.com/a/6969486/4907315
   */
  const escapedSearchPath = searchPath.replace(/[-[\]/{}()*+?.\\^$|]/g, c => {
    return pathSepRegExp.test(c) ? pathSepRegExp.source : `\\${c}`;
  });
  const searchPathRegExp = new RegExp(
    `^${escapedSearchPath}(?:${pathSepRegExp.source}|$)`,
  );

  return searchPathRegExp.test(path);
};

module.exports = ctx => {
  const fixStylePath = path.join(ctx.cwd, 'src/css/browser-fix-style');

  /*
   * browser-fix-styleディレクトリ以下のCSSであればtrueになるフラグ。
   * browser-fix-styleディレクトリ以下のCSSには、単純な最適化を行う。
   */
  const isBrowserFixStyle = pathStartsWith(ctx.file.dirname, fixStylePath);

  return {
    map: false,
    plugins: {
      'postcss-import': {},
      autoprefixer: isBrowserFixStyle ? false : { remove: false },
      'postcss-clean': {
        level: isBrowserFixStyle
          ? {
              1: {
                all: false,
                removeEmpty: true,
                removeQuotes: true,
                removeWhitespace: true,
                selectorsSortingMethod: 'none',
                tidyAtRules: true,
                tidyBlockScopes: true,
              },
            }
          : 2,
      },
    },
  };
};
