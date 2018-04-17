const replaceMap = {
  ' ': 'space',
  '!': 'exclamation-mark',
  '"': 'quotemarks',
  '#': 'number-sign',
  $: 'dollar-sign',
  '%': 'percent-sign',
  '&': 'ampersand',
  "'": 'apostrophe',
  '(': 'left-parenthesis',
  ')': 'right-parenthesis',
  '*': 'asterisk',
  '+': 'plus',
  ',': 'comma',
  '-': 'hyphen',
  '.': 'dot',
  '/': 'slash',
  ':': 'colon',
  ';': 'semicolon',
  '<': 'less-than-sign',
  '=': 'equals',
  '>': 'greater-than-sign',
  '?': 'question',
  '@': 'at-sign',
  '[': 'left-square-bracket',
  '\\': 'backslash',
  ']': 'right-square-bracket',
  '^': 'circumflex',
  _: 'underline',
  '`': 'grave-accent',
  '{': 'left-curly-bracket',
  '|': 'pipe',
  '}': 'right-curly-bracket',
  '~': 'tilde',
};

function urlToFilename(urlStr) {
  return urlStr.replace(
    /^https?:\/\/|([\\/:;.,*?"<>| ~&$`^+])/g,
    (_, char) =>
      !char ? '' : replaceMap[char] ? `{${replaceMap[char]}}` : char
  );
}

module.exports = urlToFilename;
