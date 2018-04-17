/*
 * ページ内リンクをクリックされたら、URLフラグメントを追加せずにスクロールする
 */
(function(global) {
  var window = global.window;
  var document = global.document;

  /*
   * addEventListenerメソッドに対応していない場合は、何もしない
   */
  if (typeof document.addEventListener !== 'function') {
    return;
  }

  /**
   * 条件に合致する直近の祖先ノードを取得する。
   *
   * @param {?Node} targetNode 取得をはじめるDOMノード。このノードと、祖先ノードが判定の対象になる。
   * @param {function(?Node): boolean} callback ノードを引数にとり、条件に合致するかを返す関数
   * @return {?Node} 取得したDOMノード。または、取得できなかった場合はnull
   */
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

  /**
   * URLのフラグメント識別子に対応する要素を取得する
   * @param {string} fragid フラグメント識別子の値。"#"で始まらない文字列
   * @param {?Document} [doc=document] 取得したい要素が存在するドキュメントのDocumentオブジェクト
   * @return {?Element} 取得した要素。または、取得できなかった場合にnull
   */
  function lookupFragidElem(fragid, doc) {
    if (!doc) doc = document;

    var decodedFragid = decodeURIComponent(fragid);

    return (
      doc.getElementById(fragid) ||
      doc.getElementById(decodedFragid) ||
      doc.getElementsByName(fragid)[0] ||
      doc.getElementsByName(decodedFragid)[0]
    );
  }

  /**
   * 指定した要素の位置までスクロールする
   *
   * @param {Element} targetElem 対象の要素。この要素の位置までスクロールする。
   */
  function scrollIntoView(targetElem) {
    if (typeof targetElem.scrollIntoView === 'function') {
      /*
       * scrollIntoViewメソッドが使える場合は、これを使用する
       */
      targetElem.scrollIntoView();
    } else if (typeof targetElem.getBoundingClientRect === 'function') {
      var global = Function('return this')();
      var doc = targetElem.ownerDocument || global.document;
      var win = doc.defaultView || doc.parentWindow || global.window;

      /*
       * https://dev.opera.com/articles/fixing-the-scrolltop-bug/
       */
      var scrollingElement =
        doc.scrollingElement ||
        (win.navigator.userAgent.indexOf('WebKit') !== -1
          ? doc.body
          : doc.documentElement);

      var rect = targetElem.getBoundingClientRect();
      var overflowNegativeLeft = rect.left;
      var overflowRight = rect.right - scrollingElement.clientWidth;
      win.scrollBy(
        overflowNegativeLeft < 0
          ? overflowNegativeLeft
          : 0 < overflowRight
            ? overflowRight
            : 0,
        rect.top
      );
    }
  }

  /**
   * URLからハッシュフラグメントを取り出す
   * @param {string} url 対象のURLの文字列。文字列ではない値の場合、文字列に変換される。
   * @return {{url: string, hash: (string|null)}} ハッシュを除いたURLと、ハッシュフラグメントの値を含むオブジェクト。
   *     ハッシュフラグメントが存在しない場合、ハッシュフラグメントの値はnullになる。
   */
  function splitUrlHash(url) {
    url = String(url);
    var hashPos = url.indexOf('#');
    var retval = {
      url: url,
      hash: null
    };

    if (0 <= hashPos) {
      retval.url = url.substr(0, hashPos);
      retval.hash = url.substr(hashPos + 1);
    }

    return retval;
  }

  /**
   * 履歴を追加する
   * @param {string} pageId ページを識別する文字列。この値が重複する場合は、履歴の追加を行わない
   * @param {Window} [win=window] 対象のウィンドウに対応するWindowオブジェクト
   */
  function pushHistory(pageId, win) {
    var history = (win || window).history;
    if (history && typeof history.pushState === 'function') {
      var state = history.state;
      if (state && state.pageId === pageId) {
        /*
         * pageIdが同じ場合は、何もしない
         */
        return;
      }
      history.pushState({ pageId: pageId }, document.title, location.href);
    }
  }

  /**
   * クリックイベントのイベントリスナ
   *
   * @param {Event} event イベントオブジェクト
   */
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
    if (
      event.button !== 0 ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.metaKey
    ) {
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
    var pageUrl = splitUrlHash(win.location.href).url;
    var targetUrlDict = splitUrlHash(anchorElem.href);
    var targetUrl = targetUrlDict.url;

    /*
     * リンク先のURLと現在のページのURLが異なる場合は、何もしない。
     */
    if (pageUrl !== targetUrl) return;

    /*
     * ハッシュフラグメントから、ID文字列を取得する
     */
    var targetId = targetUrlDict.hash || '';

    /*
     * IDに対応する要素を取得する
     */
    var targetElem = lookupFragidElem(targetId, doc);

    if (targetElem) {
      /*
       * IDに対応する要素を取得できた場合は、その要素の位置までスクロールする
       */
      event.preventDefault();
      pushHistory(targetId, win);
      scrollIntoView(targetElem);
    } else if (targetId === 'top' || targetId === '') {
      /*
       * IDが"top"または空文字列の場合、ページの一番上まで移動する
       */
      event.preventDefault();
      pushHistory(targetId, win);
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
  window.addEventListener(
    'pageshow',
    function(event) {
      if (event.persisted) {
        initEvent();
      }
    },
    false
  );

  initEvent();
})(Function('return this')());
