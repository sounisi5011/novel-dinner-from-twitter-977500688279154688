module.exports = {
  map: { inline: false },
  plugins: [
    require('postcss-import'),
    require('postcss-clean')({
      level: {
        1: {
          optimizeFontWeight: false,
        },
      },
    }),
  ],
};
