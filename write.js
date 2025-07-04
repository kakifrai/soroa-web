import { firebaseConfig, containsPersonalInfo,showNotification } from './common.js';


  
  // 初期化
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();


  

async function handlePost() {
  const text = document.getElementById("postText").value.trim();

  if (!text) {
    showNotification("⚠️ 空の投稿はできません。");
    return;
  }

  // 個人情報チェック
  if (containsPersonalInfo(text)) {
    showNotification("⚠️ 個人情報が含まれている可能性があります。投稿できません。");
    return;
  }

  // 投稿検証（長さ、禁止語など）
  if (!validatePostContent(text)) return;

  // 投稿頻度制限
  if (!canPostNow()) return;

  const emotion = analyzeEmotion(text);
  const tag = emotion.tag;

  const post = {
    text,
    tag,
    timestamp: new Date().toISOString(),
    isPrivate: false,
    moodColor: emotion.moodColor,
    intensity: emotion.intensity,
    waveformType: emotion.waveformType,
    savedCount: 0
  };

  try {
    await db.collection("posts").add(post);
    document.getElementById("postText").value = "";
    showNotification("そっと置かれました");
  } catch (e) {
    console.error("保存エラー", e);
    showNotification("⚠️ 保存に失敗しました。ネットワーク接続を確認してください。");
  }
}


  function simulateClassification(text) {
  const lower = text.toLowerCase();
  const tagScores = {};

  const keywordTagPairs = [
    { tag: "tired", keywords: ["疲れ", "しんどい", "くたびれ", "体が重い", "もう無理"] },
    { tag: "lonely", keywords: ["寂し", "孤独", "ひとり", "さみしい", "誰もいない", "会いたい"] },
    { tag: "numb", keywords: ["虚無", "空っぽ", "ぼんやり", "何も感じない", "無気力"] },
    { tag: "angry", keywords: ["怒り", "腹立つ", "ムカつく", "イライラ", "キレる"] },
    { tag: "anxious", keywords: ["不安", "怖い", "心配", "どうしよう", "落ち着かない"] },
    { tag: "hopeful", keywords: ["希望", "頑張る", "信じたい", "光", "救い", "大丈夫"] }
  ];

  for (const { tag, keywords } of keywordTagPairs) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score++;
    }
    if (score > 0) tagScores[tag] = score;
  }

  const bestTag = Object.entries(tagScores).sort((a, b) => b[1] - a[1])[0];
  return bestTag ? bestTag[0] : "numb";
}


  

    function analyzeEmotion(text) {
      const lower = text.toLowerCase();

      const emotionPatterns = [
        {
          keywords: ["疲", "しんどい", "だるい"],
          tag: "tired",
          moodColor: "#666699",
          intensity: 60,
          waveformType: "gentle"
        },
        {
          keywords: ["寂", "孤独", "ひとり", "会いたい"],
          tag: "lonely",
          moodColor: "#446688",
          intensity: 70,
          waveformType: "gentle"
        },
        {
          keywords: ["虚無", "空っぽ", "ぼんやり", "無気力"],
          tag: "numb",
          moodColor: "#888888",
          intensity: 30,
          waveformType: "flat"
        },
        {
          keywords: ["怒", "腹立", "ムカ", "イライラ", "キレ"],
          tag: "angry",
          moodColor: "#cc3333",
          intensity: 90,
          waveformType: "burst"
        },
        {
          keywords: ["希望", "光", "信じたい", "大丈夫"],
          tag: "hope",
          moodColor: "#ffaa33",
          intensity: 60,
          waveformType: "gentle"
        }
      ];

      for (const pattern of emotionPatterns) {
        for (const kw of pattern.keywords) {
          if (lower.includes(kw)) {
            return {
              moodColor: pattern.moodColor,
              intensity: pattern.intensity,
              waveformType: pattern.waveformType,
              tag: pattern.tag
            };
          }
        }
      }

      return {
        moodColor: "#888888",
        intensity: 50,
        waveformType: "flat",
        tag: "numb"
      };
    }


      const bannedWords = ["死ね", "殺す", "殴る", "自殺"];

      function renderBannedWords() {
        const listContainer = document.getElementById("bannedWordsList");
        listContainer.innerHTML = ""; // いったん空にする

        bannedWords.forEach(word => {
          const li = document.createElement("li");
          li.textContent = word;
          listContainer.appendChild(li);
        });
      }

      // ページ読み込み時に呼ぶ
      window.addEventListener("DOMContentLoaded", () => {
        renderBannedWords();
      });

      // 投稿許可チェック
      function validatePostContent(text) {
        const trimmed = text.trim();

        // 最小文字数チェック
        if (trimmed.length < 3) {
          showNotification("もう少しだけ、あなたの気持ちを言葉にしてみませんか？(3文字以上)");
          return false;
        }

        // 最大文字数チェック
        if (trimmed.length > 300) {
          showNotification("投稿は300文字以内にしてください。");
          return false;
        }

        // 禁止語句チェック
        const containsBanned = bannedWords.some(word => trimmed.includes(word));
        if (containsBanned) {
          showNotification("投稿に不適切な言葉が含まれています。ご確認ください。");
          return false;
        }

        return true;
      }

      document.addEventListener('DOMContentLoaded', () => {
        const btn = document.querySelector('button'); // そっと置くボタン
        btn.addEventListener('click', handlePost);
        });


      document.querySelectorAll("details").forEach(detail => {
        const content = detail.querySelector(".content-wrapper");
        if (!content) return;

        // 初期状態は閉じているので max-height 0

        detail.addEventListener("toggle", () => {
          if (detail.open) {
            // 開いたときに内容の高さを取得してmax-heightにセット
            const scrollHeight = content.scrollHeight;
            content.style.maxHeight = scrollHeight + "px";
          } else {
            // 閉じたときは max-height 0 に戻す
            content.style.maxHeight = "0";
          }
        });
      });

      // 投稿頻度チェック
      const cooldownMinutes = 1;
      function canPostNow() {
        const lastPostTime = localStorage.getItem("lastPostTime");
        const now = Date.now();
        if (lastPostTime && now - parseInt(lastPostTime, 10) < cooldownMinutes * 60 * 1000) {
          showNotification("連続の投稿は1分後に可能です。");
          return false;
        }
        localStorage.setItem("lastPostTime", now);
        return true;
      }



