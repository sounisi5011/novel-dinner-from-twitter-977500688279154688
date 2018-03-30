/*
 * ページ内リンクをクリックされたら、URLフラグメントを追加せずにスクロールする
 */
(function(global) {
  var window = global.window;
  var document = global.document;

  if (typeof document.addEventListener !== 'function') {
    return;
  }

  function lookupNode(targetNode, callback) {
    var node = targetNode;
    while (node) {
      if (callback(node)) {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  }

  function scrollIntoView(targetElem) {
    if (typeof targetElem.scrollIntoView === 'function') {
      targetElem.scrollIntoView();

    } else if (typeof targetElem.getBoundingClientRect === 'function') {
      var global = Function('return this')();
      var doc = targetElem.ownerDocument || global.document;
      var win = doc.defaultView || doc.parentWindow || global.window;

      /*
       * https://dev.opera.com/articles/fixing-the-scrolltop-bug/
       */
      var scrollingElement = doc.scrollingElement || (
        win.navigator.userAgent.indexOf('WebKit') !== -1 ?
        doc.body :
        doc.documentElement
      );

      var rect = targetElem.getBoundingClientRect();
      var overflowNegativeLeft = rect.left;
      var overflowRight = rect.right - scrollingElement.clientWidth;
      win.scrollBy(
        (
          overflowNegativeLeft < 0 ? overflowNegativeLeft :
          0 < overflowRight ? overflowRight :
          0
        ),
        rect.top
      );
    }
  }

  /**
   * URLからハッシュフラグメントを取り出す
   * @param {string} url 対象のURLの文字列。文字列ではない値の場合、文字列に変換される。
   * @return {Array<string>} 文字列を要素に持つ配列。
   *     0番目にハッシュを除いたURL、1番目に"#"から始まるハッシュフラグメントの値を含む。
   *     ハッシュフラグメントが存在しない場合、1番目の値は空文字列になる。
   */
  function splitUrlHash(url) {
    url = String(url)
    var hashPos = url.indexOf('#');
    if (0 <= hashPos) {
      return [
        url.substr(0, hashPos),
        url.substr(hashPos)
      ];
    } else {
      return [url, ''];
    }
  }

  document.addEventListener('click', function(e) {
    var anchorElem = lookupNode(e.target, function(node) {
      return String(node.nodeName).toLowerCase() === 'a';
    });
    if (!anchorElem) return;

    var doc = anchorElem.ownerDocument || document;
    var win = doc.defaultView || doc.parentWindow || window;

    var pageUrl = splitUrlHash(win.location.href)[0];
    var targetUrlList = splitUrlHash(anchorElem.href);
    var targetUrl = targetUrlList[0];

    /*
     * リンク先のURLと現在のページのURLが異なる場合は、何もしない。
     */
    if (pageUrl !== targetUrl) return;

    var targetId = targetUrlList[1].substr(1);
    var decodedTargetId = decodeURIComponent(targetId);

    var targetElem = (
      doc.getElementById(targetId) ||
      doc.getElementById(decodedTargetId) ||
      doc.getElementsByName(targetId)[0] ||
      doc.getElementsByName(decodedTargetId)[0]
    );

    if (targetElem) {
      e.preventDefault();
      scrollIntoView(targetElem)
    } else if (targetId === 'top' || targetId === '') {
      e.preventDefault();
      win.scrollTo(0, 0);
    }
  }, false);
})(Function('return this')());
