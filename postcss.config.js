module.exports = {
  map: { inline: false },
  plugins: [
    require('postcss-import'),
    require('autoprefixer')({
      remove: false,
    }),
    require('postcss-clean')({
      level: {
        1: {
          optimizeFontWeight: false,
        },
        2: {
          all: false,
        },
      },
    }),
  ],
};
