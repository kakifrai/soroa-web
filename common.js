
// firebaseConfig は必要に応じて設定してください
export const firebaseConfig = {
    apiKey: "AIzaSyDZaKe9K-L00I5ybXryuhHM6ptEp7LMkPw",
    authDomain: "kagesasi-7ab6b.firebaseapp.com",
    projectId: "kagesasi-7ab6b",
    storageBucket: "kagesasi-7ab6b.firebasestorage.app",
    messagingSenderId: "644941653027",
    appId: "1:644941653027:web:c5aa6b9cdbc97bf4c77d96"
  };


  /**
 * 投稿本文に個人情報（メールアドレス・電話番号・SNS ID・URL・名前など）が含まれていないかをチェックする
 * @param {string} text - 投稿本文のテキスト
 * @returns {boolean} - 個人情報が含まれていれば true
 */
export function containsPersonalInfo(text) {
  const normalized = toHalfWidth(text); // 全角→半角に正規化

  const patterns = [
    /\b\d{3}-\d{4}\b/,                                      // 郵便番号
    /\b〒?\d{3}-\d{4}\b/,
    /\+?81[-\s]?(\d{1,4})[-\s]?(\d{1,4})[-\s]?(\d{4})/,      // 電話（国番号）
    /\(?0\d{1,4}\)?[-\s]?\d{1,4}[-\s]?\d{3,4}/,              // 電話
    /\b\d{10,11}\b/,                                        // ハイフンなし携帯
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,20}/,         // メール
    /https?:\/\/[\w/:%#\$&\?\(\)~\.=\+\-]+/,                 // URL
    /@[a-zA-Z0-9_]{1,30}/,                                  // SNSハンドル
    /\b(ID|id|Id|ＩＤ)[:：]?[a-zA-Z0-9_\-]{4,30}\b/,         // ID系
    /\b[一-龥]{2,4}(さん|君|ちゃん|くん|様)\b/,              // 名前
    /\b[一-龥]{2,4}\s[一-龥]{2,4}\b/,                        // フルネーム
    /(丁目|番地|号|村)/,                                     // 住所キーワード
    /\b(?:\d[ -]*?){13,16}\b/,                              // カード番号
    /\b(?:\d{1,3}\.){3}\d{1,3}\b/                            // IP
  ];

  return patterns.some(pattern => pattern.test(normalized));
}


// ✅ 全角→半角変換関数
function toHalfWidth(str) {
  return str.replace(/[！-～]/g, ch =>
    String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)
  ).replace(/　/g, ' ') // 全角スペース→半角
    .replace(/＠/g, '@') // 一部記号を手動対応（必要に応じて追加）
    .replace(/：/g, ':')
    .replace(/－/g, '-')
    .replace(/[０-９]/g, ch =>
      String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)
    );
}


// 通知UIを表示する共通関数（フェードイン → 2秒でフェードアウト）
export function showNotification(message) {
  const el = document.getElementById("notification");
  if (!el) return;

  el.textContent = message;
  el.style.opacity = 1;

  setTimeout(() => {
    el.style.opacity = 0;
  }, 2000);
}

