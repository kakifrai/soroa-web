// sleep.js（ESモジュール形式）
import { firebaseConfig ,showNotification} from './common.js';

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const FieldValue = firebase.firestore.FieldValue;



document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.getElementById("menuToggle");
  const sidebar = document.getElementById("sidebarMenu");

  menuToggle.addEventListener("click", () => {
    sidebar.classList.toggle("open");
  });

  renderSleepPosts();  // 初期描画
});

function renderSleepPosts() {
  const container = document.getElementById("sleepBoxContainer");
  container.innerHTML = "";

  const saved = JSON.parse(localStorage.getItem("privatePosts") || "[]").reverse();

  if (saved.length === 0) {
    container.innerHTML = "<p style='text-align:center;'>まだ眠り箱は空っぽのようです。</p>";
    return;
  }

  for (const p of saved) {
    const card = document.createElement("div");
    card.className = "post-card";

    const content = document.createElement("div");
    content.textContent = p.text || p;  // 古い形式にも対応
    content.style.whiteSpace = "pre-wrap";

    const actions = document.createElement("div");
    actions.className = "post-actions";

    const delBtn = document.createElement("button");
    delBtn.textContent = "削除";
    delBtn.addEventListener("click", () => {
      showCustomConfirm("この投稿を眠り箱から削除しますか？", () => {
        removeFromPrivate(p.text || p, p.id || null);
      }, () => {
        // キャンセル時は何もしない
      });
    });


    actions.appendChild(delBtn);
    card.appendChild(content);
    card.appendChild(actions);
    container.appendChild(card);
  }
}

async function removeFromPrivate(text, postId) {
  let saved = JSON.parse(localStorage.getItem("privatePosts") || "[]");

  // テキスト一致で削除（オブジェクト形式にも対応）
  saved = saved.filter(item =>
    typeof item === "string" ? item !== text : item.text !== text
  );
  localStorage.setItem("privatePosts", JSON.stringify(saved));
  showNotification("眠り箱から投稿を削除しました。");

  // Firestore savedCount を -1
  if (postId) {
    try {
      await db.collection("posts").doc(postId).update({
        savedCount: FieldValue.increment(-1)
      });
      console.log(`✅ savedCount -1 成功：${postId}`);
    } catch (err) {
      console.warn("❌ savedCountの減少失敗:", err);
    }
  }

  renderSleepPosts(); // 再描画
}

function showCustomConfirm(message, onYes, onNo) {
  const overlay = document.getElementById('customConfirmOverlay');
  const messageEl = document.getElementById('customConfirmMessage');
  const yesBtn = document.getElementById('customConfirmYes');
  const noBtn = document.getElementById('customConfirmNo');

  messageEl.textContent = message;
  overlay.style.display = 'flex';

  function cleanUp() {
    overlay.style.display = 'none';
    yesBtn.removeEventListener('click', yesHandler);
    noBtn.removeEventListener('click', noHandler);
  }

  function yesHandler() {
    cleanUp();
    if (onYes) onYes();
  }

  function noHandler() {
    cleanUp();
    if (onNo) onNo();
  }

  yesBtn.addEventListener('click', yesHandler);
  noBtn.addEventListener('click', noHandler);
}
