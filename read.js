import { firebaseConfig,showNotification } from './common.js';





firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const FieldValue = firebase.firestore.FieldValue;

let allPosts = [];
let filteredPosts = [];
let lastVisible = null;
const POSTS_PER_PAGE = 20;
let isLoading = false;
let isEndReached = false;
let currentTag = "all";

// 上部で保持用セットを定義
const selectedPostIds = new Set();


// ハンバーガーメニュー開閉
function toggleMenu() {
  document.getElementById("sidebarMenu").classList.toggle("open");
}

const sortSelect = document.getElementById("sortSelect");
if (sortSelect) {
  sortSelect.addEventListener("change", () => {
    allPosts = [];
    lastVisible = null;
    isEndReached = false;
    document.getElementById("postContainer").innerHTML = "";
    fetchPosts(true);
  });
}



function showCustomConfirm(message) {
  return new Promise((resolve) => {
    const overlay = document.getElementById("customConfirmOverlay");
    const msg = document.getElementById("customConfirmMessage");
    const yesBtn = document.getElementById("customConfirmYes");
    const noBtn = document.getElementById("customConfirmNo");

    // メッセージ設定と表示
    msg.textContent = message;
    overlay.style.display = "flex";

    // ハンドラを定義
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

    // イベント登録
    yesBtn.addEventListener("click", onYes);
    noBtn.addEventListener("click", onNo);
  });
}






async function saveSinglePost(text, postId) {
  if (!text) return;
  let saved = JSON.parse(localStorage.getItem("privatePosts") || "[]");

  // すでに同じ text を含む投稿が保存されているか確認
  const alreadySaved = saved.some(p => p.text === text);
  if (!alreadySaved) {
    saved.push({ text, id: postId || "" });
    localStorage.setItem("privatePosts", JSON.stringify(saved));
    showNotification("投稿を眠り箱にしまいました。");

    // Firestore の savedCount を +1
    if (postId) {
      try {
        await db.collection("posts").doc(postId).update({
          savedCount: FieldValue.increment(1)
        });
        console.log(`✅ savedCount +1 成功：${postId}`);
      } catch (err) {
        console.warn("❌ savedCountの更新失敗:", err);
      }
    }
  } else {
    showNotification("すでに眠り箱にあります。");
  }
}




async function saveSelectedToPrivate() {
  const checkboxes = Array.from(document.querySelectorAll("#postContainer input[type=checkbox]:checked"))
  .filter(cb => !cb.classList.contains("hide-checkbox"));

  if (checkboxes.length === 0) {
    showNotification("まずは投稿を選択してください。");
    return;
  }

  let saved = JSON.parse(localStorage.getItem("privatePosts") || "[]");
  let addedCount = 0;

  for (const chk of checkboxes) {
    const text = chk.dataset.text;
    const postId = chk.dataset.postId;

    const alreadySaved = saved.some(p => p.text === text);
    if (text && !alreadySaved) {
      saved.push({ text, id: postId || "" });
      addedCount++;

      if (postId) {
        try {
          await db.collection("posts").doc(postId).update({
            savedCount: FieldValue.increment(1)
          });
        } catch (err) {
          console.warn("savedCountの更新失敗:", err);
        }
      }
    }
  }

  localStorage.setItem("privatePosts", JSON.stringify(saved));
  showNotification(`${addedCount} 件の投稿を眠り箱にしまいました。`);
}



// 投稿非表示
function hidePost(post) {
  const hidden = JSON.parse(localStorage.getItem("hiddenPosts") || "[]");

  if (!hidden.some(h => h.text === post.text)) {
    hidden.push({ id: post.id || "", text: post.text });
    localStorage.setItem("hiddenPosts", JSON.stringify(hidden));
    showNotification("投稿を非表示にしました。");
    applyFilters();
  }
}

// タグフィルター切替
function filterByTag(tag) { 
  currentTag = tag;

  const filterButtons = document.querySelectorAll(".filter-buttons button");
  filterButtons.forEach(btn => btn.classList.remove("active"));

  if (tag !== "all") {
    const btn = document.getElementById("btn-" + tag);
    if (btn) btn.classList.add("active");
  } else {
    const allBtn = document.getElementById("btn-all");
    if (allBtn) allBtn.classList.add("active"); 
  }

  applyFilters();
}




// 投稿を描画
function renderPosts(posts) {
  const container = document.getElementById("postContainer");
  container.innerHTML = "";

  if (posts.length === 0) {
    container.innerHTML = "<p style='text-align:center;'>今はまだ、その影は見えないようです。</p>";
    return;
  }

  posts.forEach((p, i) => {
    const div = document.createElement("div");
    div.className = "post";

    // 色帯バー
    const emotionBar = document.createElement("div");
    emotionBar.style.height = "10px";
    emotionBar.style.backgroundColor = p.moodColor || "#888";
    emotionBar.style.borderRadius = "6px";
    emotionBar.style.marginBottom = "0.5rem";
    div.appendChild(emotionBar);

    const textDiv = document.createElement("div");
    textDiv.className = "post-content";
    textDiv.textContent = p.text || "(内容なし)";
    div.appendChild(textDiv);

    const actions = document.createElement("div");
    actions.className = "post-actions";
        // 既存の眠り箱用チェックボックス
   

    // 新たに非表示一括用チェックボックス
    const hideCheckbox = document.createElement("input");
    hideCheckbox.type = "checkbox";
    hideCheckbox.className = "hide-checkbox";
    hideCheckbox.title = "非表示にする投稿を選択";
    hideCheckbox.dataset.text = p.text || "";
    hideCheckbox.dataset.postId = p.id || "";
    hideCheckbox.checked = selectedPostIds.has(p.id); // ✅ 保持していた選択状態を復元

    hideCheckbox.addEventListener("change", () => {
      if (hideCheckbox.checked) {
        selectedPostIds.add(p.id); // ✅ 選択保存
      } else {
        selectedPostIds.delete(p.id); // ✅ 選択解除
      }
    });
    // 非表示一括選択モード時のみ表示
    hideCheckbox.style.display = "inline-block"; // 常に表示
    actions.appendChild(hideCheckbox);

    // 非表示ボタン
    const hideBtn = document.createElement("button");
    hideBtn.textContent = "🚫 非表示";
    hideBtn.onclick = async () => {
  const ok = await showCustomConfirm("この投稿を非表示にしますか？");
  if (ok) {
    hidePost(p);
  }
};



    actions.appendChild(hideBtn);

        // 修正例：checkboxにpostIdセット
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.index = i;
    checkbox.dataset.text = p.text || "";
    checkbox.dataset.postId = p.id || "";
    checkbox.checked = selectedPostIds.has(p.id); // ✅ 保持していた選択状態を復元

    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        selectedPostIds.add(p.id); // ✅ 選択保存
      } else {
        selectedPostIds.delete(p.id); // ✅ 選択解除
      }
    });
    actions.appendChild(checkbox);


    // 修正例：clearEmotionFiltersのintensity削除
    function clearEmotionFilters() {
      document.getElementById("colorPicker").value = "#6699ff";
      document.getElementById("waveformType").value = "";
      applyFilters();
    }
    

    
    // 眠り箱へ保存ボタン
    const saveBtn = document.createElement("button");
    saveBtn.textContent = "眠り箱へ";
        
    saveBtn.onclick = () => saveSinglePost(p.text || "", p.id);

    actions.appendChild(saveBtn);

    div.appendChild(actions);
    container.appendChild(div);


    const saved = JSON.parse(localStorage.getItem("privatePosts") || "[]");
    const isAlreadySaved = saved.some(s => s.text === p.text);

    if (isAlreadySaved) {
      checkbox.disabled = true;
      checkbox.title = "🟡 すでに眠り箱にあります";
    }

  });
}

document.addEventListener("DOMContentLoaded", () => {
 
  const bulkHideBtn = document.getElementById("bulkHideBtn");



  bulkHideBtn.addEventListener("click", () => {
    const checkedBoxes = Array.from(document.querySelectorAll(".hide-checkbox:checked"));
    if (checkedBoxes.length === 0) {
      showNotification("まずは非表示にする投稿を選択してください。");
      return;
    }

    const hidden = JSON.parse(localStorage.getItem("hiddenPosts") || "[]");
    let addedCount = 0;

    checkedBoxes.forEach(cb => {
      const text = cb.dataset.text;
      const id = cb.dataset.postId;
      if (!hidden.some(h => h.text === text)) {
        hidden.push({ id: id || "", text });
        addedCount++;
      }
    });

    localStorage.setItem("hiddenPosts", JSON.stringify(hidden));
    showNotification(`${addedCount} 件の投稿を非表示にしました。`);
    applyFilters();

    
  });
});




document.getElementById("clearSelectionsBtn").addEventListener("click", async () => {
  const ok = await showCustomConfirm("すべての選択をクリアしますか？");
  if (ok) {
    document.querySelectorAll("#postContainer input[type=checkbox]").forEach(cb => {
      cb.checked = false;
    });
    selectedPostIds.clear(); // 🧠 忘れる
    showNotification("選択をすべてクリアしました。");
  }
});




// 色距離計算
function colorDistance(c1, c2) {
  const [r1, g1, b1] = [1, 3, 5].map(i => parseInt(c1.slice(i, i + 2), 16));
  const [r2, g2, b2] = [1, 3, 5].map(i => parseInt(c2.slice(i, i + 2), 16));
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}


// 非言語ラベルによる絞り込みなどのフィルター適用
function applyFilters() {
  let filtered = currentTag === "all"
    ? allPosts
    : allPosts.filter(p => p.tag === currentTag);

  const hidden = JSON.parse(localStorage.getItem("hiddenPosts") || "[]");
  const deleted = JSON.parse(localStorage.getItem("deletedPosts") || "[]");

  const hiddenTexts = hidden.map(h => h.text);
  const deletedTexts = deleted.map(d => d.text);

  filtered = filtered.filter(p =>
    !hiddenTexts.includes(p.text) &&
    !deletedTexts.includes(p.text)
  );

  // ▼ 非言語フィルタ部分（省略せず維持）
  const moodColor = document.getElementById("colorPicker").value.toLowerCase();
  const waveformType = document.getElementById("waveformType").value;
 

  const waveformSimilarity = {
    gentle: ["gentle", "soft", "gentle-pulse"],
    burst: ["burst", "explosion", "sharp-blast"],
    turbulent: ["turbulent", "jitter", "unstable"],
    flat: ["flat", "neutral", "still"]
  };

  const emotionSearchSection = document.getElementById("emotionSearchSection");
  if (emotionSearchSection && emotionSearchSection.style.display === "block") {
    filtered = filtered.filter(p => {
      if (!p.moodColor) return false;

      const pColor = p.moodColor.startsWith("#") ? p.moodColor.toLowerCase() : `#${p.moodColor.toLowerCase()}`;
      const cDist = colorDistance(moodColor, pColor);
      if (cDist > 100) return false;

      if (waveformType) {
        const simGroup = waveformSimilarity[waveformType] || [waveformType];
        if (!simGroup.includes(p.waveformType)) return false;
      }

      
      return true;
    });
  }

  // ✅ ここで savedCount を各投稿に付与する
  const saved = JSON.parse(localStorage.getItem("privatePosts") || "[]");
  filtered.forEach(p => {
    p.savedCount = saved.filter(s => s === p.text).length;
  });

  // 並び順適用
  const sortOrder = document.getElementById("sortSelect").value;
  filtered.sort((a, b) => {
    switch (sortOrder) {
      case "newest":
        return (b.timestamp || 0) - (a.timestamp || 0);
      case "oldest":
        return (a.timestamp || 0) - (b.timestamp || 0);
      case "popular":
        return (b.savedCount || 0) - (a.savedCount || 0);
      case "longest":
        return (b.text?.length || 0) - (a.text?.length || 0);
      case "shortest":
        return (a.text?.length || 0) - (b.text?.length || 0);
      case "random":
        return Math.random() - 0.5;
      default:
        return 0;
    }
  });

  filteredPosts = filtered;
  renderPosts(filteredPosts);
}

// 投稿取得
async function fetchPosts(initial = false) {
  if (isLoading || isEndReached) return;
  isLoading = true;

  const sortOrderValue = document.getElementById("sortSelect").value;

  let orderField = "timestamp";
  let orderDirection = "desc";

  switch (sortOrderValue) {
    case "oldest":
      orderField = "timestamp";
      orderDirection = "asc";
      break;
    case "newest":
      orderField = "timestamp";
      orderDirection = "desc";
      break;
    case "popular":
      orderField = "savedCount";
      orderDirection = "desc";
      break;
    // 他の並び順（lengthやrandom）は後でapplyFiltersで処理
  }

  try {
    let query = db.collection("posts")
      .where("isPrivate", "==", false)
      .orderBy(orderField, orderDirection)
      .limit(POSTS_PER_PAGE);

    if (!initial && lastVisible) {
      query = query.startAfter(lastVisible);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      isEndReached = true;
      return;
    }

    lastVisible = snapshot.docs[snapshot.docs.length - 1];

    const newPosts = snapshot.docs.map(doc => {
      const data = doc.data();
      if (typeof data.savedCount !== "number") {
        db.collection("posts").doc(doc.id).update({ savedCount: 0 }).catch(() => {});
        data.savedCount = 0;
      }
      return {
        id: doc.id,
        ...data
      };
    });

    const uniqueNewPosts = newPosts.filter(newPost =>
      !allPosts.some(existing => existing.id === newPost.id)
    );

    allPosts = allPosts.concat(uniqueNewPosts);
    applyFilters();
  } catch (e) {
    console.error("取得エラー:", e);
    showNotification("投稿の取得に失敗しました。");
  } finally {
    isLoading = false;
  }
}


// スクロール無限取得
function onScroll() {
  if (isLoading || isEndReached) return;

  const scrollY = window.scrollY || window.pageYOffset;
  const viewportHeight = window.innerHeight;
  const fullHeight = document.documentElement.scrollHeight;

  if (scrollY + viewportHeight > fullHeight - 100) {
    fetchPosts(false);
  }
}

// 検索ボタン押下でフィルター適用
function applyFilterButton() {
  applyFilters();
}

// 検索フィルタークリア
function clearEmotionFilters() {
  document.getElementById("colorPicker").value = "#6699ff";
  document.getElementById("waveformType").value = "";
  document.getElementById("intensity").value = 50;
  
  applyFilters();
}

// プレビュー更新（感情色反映）
function updatePreview() {
  const color = document.getElementById("colorPicker").value;
  const preview = document.getElementById("preview");
  preview.style.backgroundColor = color;
}


document.addEventListener("DOMContentLoaded", () => {
  const tagColors = {
    tired: "#666699",
    lonely: "#336699",
    numb: "#888888",
    angry: "#cc3333",
    anxious: "#cc9966",
    hopeful: "#ffaa33"
  };

  // ボタンに色を当てる
  Object.entries(tagColors).forEach(([tag, color]) => {
    const btn = document.querySelector(`#btn-${tag}`);
    if (btn) {
      btn.style.border = `1px solid ${color}`;
      btn.style.background = `linear-gradient(to bottom, #1e1e1e, ${color}20)`; // 薄い色
      btn.dataset.color = color; // active切替にも使う
    }
  });

  
});


window.addEventListener("DOMContentLoaded", () => {
  // 初回投稿取得
  fetchPosts(true);
  updatePreview();

  // ハンバーガーメニュークリック
  const menuToggle = document.querySelector(".menu-toggle");
  if (menuToggle) {
    menuToggle.addEventListener("click", toggleMenu);
  }

  // タグフィルターのクリック（ボタン群）
  const filterButtons = document.querySelectorAll(".filter-buttons button");
  filterButtons.forEach(btn => {
    btn.addEventListener("click", () => filterByTag(btn.dataset.tag));
  });

  // 並び順変更
  const sortOrder = document.getElementById("sortOrder");
  if (sortOrder) {
    sortOrder.addEventListener("change", applyFilters);
  }

  // 保存ボタン
  const saveBtn = document.getElementById("saveSelectedBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", saveSelectedToPrivate);
    
  }

  // 「声にならない気持ち」表示切替ボタン
  const toggleSearchBtn = document.getElementById("toggleSearchBtn");
  const emotionSection = document.getElementById("emotionSearchSection");
  if (toggleSearchBtn && emotionSection) {
    toggleSearchBtn.addEventListener("click", () => {
      if (emotionSection.style.display === "none" || !emotionSection.style.display) {
        emotionSection.style.display = "block";
        toggleSearchBtn.textContent = "❌ 探索を閉じる";
      } else {
        emotionSection.style.display = "none";
        toggleSearchBtn.textContent = "🔎 声にならない気持ちを探す";
        clearEmotionFilters();
      }
      applyFilters();
    });
  }

  
  
  // 検索フィルター適用ボタン
  const searchBtn = document.getElementById("searchBtn");
  if (searchBtn) {
    searchBtn.addEventListener("click", applyFilters);
  }

  // 色ピッカー変更時プレビュー更新
  const colorPicker = document.getElementById("colorPicker");
  if (colorPicker) {
    colorPicker.addEventListener("input", updatePreview);
  }

  // スクロールで追加読み込み
  window.addEventListener("scroll", onScroll);

    // ▶︎▶︎ 開閉式コントロールパネルの開閉処理

 const toggleBtn = document.getElementById("toggleBtn");
  const floatingControl = document.getElementById("floatingControl");

  if (toggleBtn && floatingControl) {
    toggleBtn.addEventListener("click", () => {
      floatingControl.classList.toggle("open");
      toggleBtn.textContent = floatingControl.classList.contains("open") ? "◀" : "▶";
    });
  }

});

