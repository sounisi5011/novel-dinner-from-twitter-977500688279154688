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

  /*
   * 履歴を追加する
   */
  function pushHistory() {
    var history = window.history;
    if (history && typeof history.pushState === 'function') {
      history.pushState(history.state, document.title, location.href);
    }
  }

  function clickListener(event) {
    /**
     * 特殊なクリックは無視する
     * @see https://teratail.com/questions/13147
     *
     * Note: getModifierStateメソッドが使用可能な場合、
     *       他の修飾キーが押下されているかどうかも判定に含めるべきかもしれない。
     *       ただし、仕様書にある修飾キーに対応するだけでも、これだけのキーの種類を網羅しなくてはならなくなる：
     *       https://gist.github.com/sounisi5011/6d0be09d2f2a2853974bfe9a20d229bc
     */
    if (event.button !== 0 || event.altKey || event.ctrlKey || event.shiftKey || event.metaKey) {
      return;
    }

    /*
     * クリックした要素の祖先要素から、最も近いa要素を取得する
     */
    var anchorElem = lookupNode(event.target, function(node) {
      return String(node.nodeName).toLowerCase() === 'a';
    });

    /*
     * a要素を取得できなかった場合は、何もしない
     */
    if (!anchorElem) return;

    /*
     * 要素の属するDocumentオブジェクトとWindowオブジェクトを取得する
     */
    var doc = anchorElem.ownerDocument || document;
    var win = doc.defaultView || doc.parentWindow || window;

    /*
     * 現在のページのURLと、移動先のURLを、
     * URL本体とハッシュフラグメントに分ける。
     */
    var pageUrl = splitUrlHash(win.location.href)[0];
    var targetUrlList = splitUrlHash(anchorElem.href);
    var targetUrl = targetUrlList[0];

    /*
     * リンク先のURLと現在のページのURLが異なる場合は、何もしない。
     */
    if (pageUrl !== targetUrl) return;

    /*
     * ハッシュフラグメントから、ID文字列を取得する
     */
    var targetId = targetUrlList[1].substr(1);
    var decodedTargetId = decodeURIComponent(targetId);

    /*
     * IDに対応する要素を取得する
     */
    var targetElem = (
      doc.getElementById(targetId) ||
      doc.getElementById(decodedTargetId) ||
      doc.getElementsByName(targetId)[0] ||
      doc.getElementsByName(decodedTargetId)[0]
    );

    if (targetElem) {
      /*
       * IDに対応する要素を取得できた場合は、その要素の位置までスクロールする
       */
      event.preventDefault();
      pushHistory();
      scrollIntoView(targetElem);
    } else if (targetId === 'top' || targetId === '') {
      /*
       * IDが"top"または空文字列の場合、ページの一番上まで移動する
       */
      event.preventDefault();
      pushHistory();
      win.scrollTo(0, 0);
    }
  }

  function initEvent() {
    document.addEventListener('click', clickListener, false);
  }

  /**
   * bfcache（Back Forward Cache）対策コード
   * ページバックした時、キャッシュから復元された時も動作するよう、イベントを再登録する。
   *
   * Note: 空のunloadイベントを追加してbfcacheを無効化する方法は、
   *       iOSのSafariで動作しない。また、bfcacheを無効化するとページの再読込が
   *       必要になり、表示が遅くなる。
   *
   * @see http://oogatta.hatenadiary.jp/entry/20121228/1356696182
   * @see https://qiita.com/edo_m18/items/f8f5952f0d45b4b81d4c
   * @see http://nmi.jp/archives/273
   * @see https://qiita.com/smitho/items/60b496785216b1aefe49
   * @see https://gist.github.com/kyaido/65d61f887abb8104791f
   */
  window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
      initEvent();
    }
  }, false);

  initEvent();
})(Function('return this')());
