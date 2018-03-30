/*
 * もしURLフラグメントがページのURLに含まれていた場合は、
 * URLフラグメントを削除してページの１番上にスクロールする。
 *
 * @see https://stackoverflow.com/questions/1397329/how-to-remove-the-hash-from-window-location-url-with-javascript-without-page-r
 */
(function(global) {
  var window = global.window;
  var document = window.document;
  var location = window.location;
  var history = window.history || {};

  var pageUrl = String(location.href);
  var hashPos = pageUrl.indexOf('#');

  if (0 <= hashPos) {
    /*
     * "#"を先頭に含む、URLフラグメントを取り出す。
     *
     * Note: location.hashプロパティは、URLフラグメントが"#"１文字の場合に空文字列を返す。
     *       この処理では"#"１文字のURLフラグメントも判定したいため、
     *       文字列操作でURLフラグメントを取得する。
     *
     * Note: substringメソッドの代わりにsubstrメソッドを使用しても、挙動は変化しない。
     *       ここでsubstringメソッドを使用したのは、hashPosが相対的な位置ではなく
     *       絶対的な文字の位置であるため。
     */
    var hashValue = pageUrl.substring(hashPos);

    if (typeof history.replaceState === 'function') {
      /*
       * history.replaceStateメソッドに対応している場合は、
       * フラグメントを削除したURLに変更する。
       */

      /*
       * フラグメントを削除したURLを生成する。
       *
       * Note: substringメソッドの代わりにsubstrメソッドを使用しても、挙動は変化しない。
       *       ここでsubstringメソッドを使用したのは、hashPosが相対的な位置ではなく
       *       絶対的な文字の位置であるため。
       *       仮に、第１引数の"0"を変更した場合は、挙動が変化する。
       */
      var pageUrlWithoutHash = pageUrl.substring(0, hashPos);

      /*
       * history.replaceStateメソッドで、ページのURLを、
       * フラグメントを削除したURLに置き換える。
       */
      history.replaceState(history.state, document.title, pageUrlWithoutHash);

      /*
       * ページの１番上にスクロールする。
       */
      window.scrollTo(0, 0);

    } else if (hashValue !== '#') {
      /*
       * history.replaceStateメソッドに対応していない場合は、
       * location.hashを上書きしてURLを変更する。
       *
       * Note: location.hashプロパティを上書きする方法では、
       *       どうしてもURLの末尾に"#"が残ってしまう。
       *       このため、"#"１文字がURLフラグメントの場合は上書きしない。
       */

      /*
       * ページの１番上にスクロールする。
       *
       * Note: location.hashプロパティを上書きする方法では、
       *       ブラウザの履歴からフラグメント付きのURLを削除できず、
       *       ページバックで再表示することができる。
       *       このため、URLフラグメントを上書きする前にスクロールし、
       *       ページバックした場合もページの先頭を表示させる。
       */
      window.scrollTo(0, 0);

      /*
       * location.hashを上書きしてURLフラグメントを消す。
       */
      location.hash = '';
    }
  }
})(Function('return this')());
