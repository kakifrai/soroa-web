// hidden.js
import { showNotification } from './common.js';


document.addEventListener("DOMContentLoaded", () => {
 
  loadHiddenPosts();
});

function loadHiddenPosts() {
  const container = document.getElementById("hiddenContainer");
  const hidden = JSON.parse(localStorage.getItem("hiddenPosts") || "[]");

  container.innerHTML = "";

  if (hidden.length === 0) {
    container.innerHTML = "<p style='text-align:center;'>非表示の投稿はありません。</p>";
    return;
  }

  for (let i = hidden.length - 1; i >= 0; i--) {
    const p = hidden[i];
    const div = document.createElement("div");
    div.className = "post";

    

    // 投稿内容
    const content = document.createElement("div");
    content.className = "post-content";
    content.textContent = p.text || "(内容なし)";
    div.appendChild(content);

    // アクションボタン
    const actions = document.createElement("div");
    actions.className = "post-actions";

    const restoreBtn = document.createElement("button");
    restoreBtn.textContent = "👁️ 再表示";
    restoreBtn.addEventListener("click", async () => {
      const ok = await showCustomConfirm("この投稿を再表示しますか？");
      if (ok) {
        hidden.splice(i, 1);
        localStorage.setItem("hiddenPosts", JSON.stringify(hidden));
        showNotification("投稿を再表示しました。");
        loadHiddenPosts();
      }
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑️ 完全削除";
    deleteBtn.addEventListener("click", async () => {
      const ok = await showCustomConfirm("この投稿を完全に削除しますか？");
      if (ok) {
        const deletedList = JSON.parse(localStorage.getItem("deletedPosts") || "[]");
        if (!deletedList.some(post => post.text === p.text)) {
          deletedList.push(p);
          localStorage.setItem("deletedPosts", JSON.stringify(deletedList));
        }
        hidden.splice(i, 1);
        localStorage.setItem("hiddenPosts", JSON.stringify(hidden));
        showNotification("投稿を完全に削除しました。");
        loadHiddenPosts();
      }
    });

    actions.appendChild(restoreBtn);
    actions.appendChild(deleteBtn);
    div.appendChild(actions);
    container.appendChild(div);
  }
}



// ✅ カスタム確認ダイアログ
function showCustomConfirm(message) {
  return new Promise((resolve) => {
    const overlay = document.getElementById("customConfirmOverlay");
    const msg = document.getElementById("customConfirmMessage");
    const yesBtn = document.getElementById("customConfirmYes");
    const noBtn = document.getElementById("customConfirmNo");

    msg.textContent = message;
    overlay.style.display = "flex";

    const cleanup = () => {
      overlay.style.display = "none";
      yesBtn.removeEventListener("click", onYes);
      noBtn.removeEventListener("click", onNo);
    };

    const onYes = () => {
      cleanup();
      resolve(true);
    };

    const onNo = () => {
      cleanup();
      resolve(false);
    };

    yesBtn.addEventListener("click", onYes);
    noBtn.addEventListener("click", onNo);
  });
}

