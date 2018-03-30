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

  document.addEventListener('click', function(e) {
    var anchorElem = lookupNode(e.target, function(node) {
      return String(node.nodeName).toLowerCase() === 'a';
    });
    if (!anchorElem) return;

    var doc = anchorElem.ownerDocument || document;
    var win = doc.defaultView || doc.parentWindow || window;

    var hash = anchorElem.hash;
    if (typeof hash !== 'string') return;

    var targetId = hash.replace(/^#/, '');
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
