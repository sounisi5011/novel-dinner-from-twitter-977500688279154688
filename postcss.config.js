const path = require('path');

module.exports = ctx => {
  const fixStylePath = path.join(ctx.cwd, 'src/css/browser-fix-style');

  if (ctx.file.dirname.startsWith(fixStylePath)) {
    /*
     * browser-fix-styleディレクトリ以下のCSSは、シンプルな縮小のみを適用する
     */
    return {
      map: { inline: false },
      plugins: {
        'postcss-import': null,
        'postcss-clean': {
          level: {
            1: {
              all: false,
              removeEmpty: true,
              removeQuotes: true,
              removeWhitespace: true,
              selectorsSortingMethod: 'none',
              tidyAtRules: true,
              tidyBlockScopes: true,
            },
          },
        },
      },
    };
  } else {
    /*
     * そうでない場合は、強力な圧縮を実行
     */
    return {
      map: { inline: false },
      plugins: {
        'postcss-import': null,
        'autoprefixer': {
          remove: false,
        },
        'postcss-clean': {
          level: 2,
        },
      },
    };
  }
};
