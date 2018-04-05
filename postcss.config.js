const path = require('path');

module.exports = ctx => {
  const fixStylePath = path.join(ctx.cwd, 'src/css/browser-fix-style');

  /*
   * browser-fix-styleディレクトリ以下のCSSであればtrueになるフラグ。
   * browser-fix-styleディレクトリ以下のCSSには、単純な最適化を行う。
   */
  const isBrowserFixStyle = ctx.file.dirname.startsWith(fixStylePath);

  return {
    map: { inline: false },
    plugins: {
      'postcss-import': {},
      'autoprefixer': isBrowserFixStyle ? false : { remove: false },
      'postcss-clean': {
        level: (
          isBrowserFixStyle ?
          {
            1: {
              all: false,
              removeEmpty: true,
              removeQuotes: true,
              removeWhitespace: true,
              selectorsSortingMethod: 'none',
              tidyAtRules: true,
              tidyBlockScopes: true,
            },
          } :
          2
        ),
      },
    },
  };
};
