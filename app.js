/* ==================== GRUSZKA — logika aplikacji ==================== */
(function(){
  "use strict";

  const STORAGE_KEY = "gruszka_state_v1";
  const DATA_VERSION = 2;          // v2 = lekcje podzielone na porcje ~15 słówek + transkrypcje
  const MAX_HEARTS = 5;
  const HEART_REGEN_HOURS = 4;
  const QUIZ_LEN = 10;

  const LESSONS = CHAPTER1.lessons;
  const LESSON_BY_ID = {};
  LESSONS.forEach(l => LESSON_BY_ID[l.id] = l);

  // Cała pula słówek — używana jako zapasowe źródło dystraktorów dla krótkich lekcji
  const ALL_WORDS = LESSONS.flatMap(l => l.words);

  /* ---------- STAN / localStorage ---------- */
  function defaultState(){
    return {
      xp: 0,
      hearts: MAX_HEARTS,
      heartsUpdatedAt: Date.now(),
      streak: 0,
      lastActiveDate: null,
      lessons: {} // id -> { stars, bestCorrect, total }
    };
  }

  let state = loadState();

  function loadState(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw){
        const fresh = defaultState();
        fresh.dataVersion = DATA_VERSION;
        return fresh;
      }
      return migrate(Object.assign(defaultState(), JSON.parse(raw)));
    }catch(e){
      return defaultState();
    }
  }

  /* Podział lekcji zmienił ich numery (30 tematów -> 101 porcji).
     Stary postęp był zapisany pod numerem tematu — przepisujemy go na wszystkie
     porcje tego tematu, żeby użytkownik nie stracił gwiazdek. XP/serca/seria bez zmian. */
  function migrate(s){
    if(s.dataVersion === DATA_VERSION) return s;
    const old = s.lessons || {};
    if(Object.keys(old).length){
      const remapped = {};
      LESSONS.forEach(l => {
        const prev = old[l.theme];
        if(prev && prev.stars > 0){
          remapped[l.id] = { stars: prev.stars, bestCorrect: 0, total: 0 };
        }
      });
      s.lessons = remapped;
    }
    s.dataVersion = DATA_VERSION;
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }catch(e){}
    return s;
  }

  function saveState(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function regenHearts(){
    if(state.hearts >= MAX_HEARTS) { state.heartsUpdatedAt = Date.now(); return; }
    const elapsedHours = (Date.now() - state.heartsUpdatedAt) / 36e5;
    const regenerated = Math.floor(elapsedHours / HEART_REGEN_HOURS);
    if(regenerated > 0){
      state.hearts = Math.min(MAX_HEARTS, state.hearts + regenerated);
      state.heartsUpdatedAt = Date.now();
      saveState();
    }
  }

  function todayStr(d){
    const dt = d || new Date();
    return dt.getFullYear() + "-" + (dt.getMonth()+1) + "-" + dt.getDate();
  }

  function registerActivity(){
    const today = todayStr();
    if(state.lastActiveDate === today) return;
    if(state.lastActiveDate){
      const yesterday = todayStr(new Date(Date.now() - 864e5));
      state.streak = (state.lastActiveDate === yesterday) ? state.streak + 1 : 1;
    } else {
      state.streak = 1;
    }
    state.lastActiveDate = today;
  }

  function isUnlocked(lessonId){
    if(lessonId === 1) return true;
    const prev = state.lessons[lessonId - 1];
    return !!(prev && prev.stars >= 1);
  }

  function lessonProgress(lessonId){
    return state.lessons[lessonId] || { stars: 0, bestCorrect: 0, total: 0 };
  }

  /* ---------- NAWIGACJA ---------- */
  const screens = {};
  document.querySelectorAll(".screen").forEach(s => screens[s.id] = s);

  function showScreen(id){
    Object.values(screens).forEach(s => s.classList.remove("active"));
    screens[id].classList.add("active");
    window.scrollTo(0,0);
  }

  /* ---------- RENDER: TOPBAR + ŚCIEŻKA ---------- */
  function renderTopStats(){
    document.getElementById("stat-streak").textContent = state.streak;
    document.getElementById("stat-xp").textContent = state.xp;
    document.getElementById("stat-hearts").textContent = state.hearts;
  }

  function renderHome(){
    regenHearts();
    renderTopStats();

    document.getElementById("chapter-subtitle").textContent =
      `${ALL_WORDS.length} najważniejszych słówek · ${LESSONS.length} lekcji`;

    const completedCount = LESSONS.filter(l => lessonProgress(l.id).stars >= 1).length;
    document.getElementById("chapter-progress-text").textContent = `${completedCount} / ${LESSONS.length}`;
    document.getElementById("chapter-progress-fill").style.width = `${(completedCount / LESSONS.length) * 100}%`;

    const list = document.getElementById("path-list");
    list.innerHTML = "";

    LESSONS.forEach(lesson => {
      const prog = lessonProgress(lesson.id);
      const unlocked = isUnlocked(lesson.id);
      const state_ = prog.stars >= 1 ? "done" : (unlocked ? "available" : "locked");

      const li = document.createElement("li");
      li.className = "path-item";

      const btn = document.createElement("button");
      btn.className = `node node--${state_}`;
      btn.setAttribute("aria-label", `Lekcja ${lesson.id}: ${lesson.title}`);

      let inner = `<svg class="node__pear"><use href="#icon-pear"/></svg>`;
      if(state_ === "done"){
        inner += `<div class="node__stars">${[0,1,2].map(i => `<svg class="star ${i < prog.stars ? "" : "dim"}"><use href="#icon-star"/></svg>`).join("")}</div>`;
        inner += `<span class="node__label">${lesson.id}</span>`;
      } else if(state_ === "locked"){
        inner += `<svg class="node__ic"><use href="#icon-lock"/></svg>`;
      } else {
        inner += `<span class="node__label">${lesson.id}</span>`;
      }
      btn.innerHTML = inner;

      if(unlocked){
        btn.addEventListener("click", () => openLessonIntro(lesson.id));
      }
      li.appendChild(btn);
      list.appendChild(li);
    });
  }

  /* ---------- WPROWADZENIE DO LEKCJI ---------- */
  let currentLessonId = null;

  function openLessonIntro(lessonId){
    currentLessonId = lessonId;
    const lesson = LESSON_BY_ID[lessonId];
    document.getElementById("intro-eyebrow").textContent = `Lekcja ${lesson.id} z ${LESSONS.length}`;
    const theme = lesson.title.replace(/\s*\(.+?\)\s*$/, "");
    document.getElementById("intro-title").textContent =
      lesson.partCount > 1 ? `${theme} · ${lesson.part}/${lesson.partCount}` : theme;
    document.getElementById("intro-desc").textContent = `Poznasz ${lesson.words.length} słówek. Najpierw fiszki, potem krótki quiz.`;
    showScreen("screen-intro");
  }

  document.getElementById("btn-intro-back").addEventListener("click", () => { renderHome(); showScreen("screen-home"); });
  document.getElementById("btn-start-lesson").addEventListener("click", () => startFlashcards(currentLessonId));

  /* ---------- WYMOWA (Web Speech API) ---------- */
  const canSpeak = typeof window.speechSynthesis !== "undefined"
                && typeof window.SpeechSynthesisUtterance !== "undefined";
  let enVoice = null;

  function pickVoice(){
    if(!canSpeak) return;
    const en = (speechSynthesis.getVoices() || []).filter(v => /^en[-_]/i.test(v.lang || ""));
    // CMUdict to wymowa amerykańska — preferujemy głos en-US, ale bierzemy każdy angielski
    enVoice = en.find(v => /^en[-_]US/i.test(v.lang)) || en[0] || null;
  }

  if(canSpeak){
    pickVoice();
    // lista głosów ładuje się asynchronicznie — trzeba poczekać na zdarzenie
    if(typeof speechSynthesis.addEventListener === "function"){
      speechSynthesis.addEventListener("voiceschanged", pickVoice);
    } else {
      speechSynthesis.onvoiceschanged = pickVoice;
    }
  }

  function speak(text, btn){
    if(!canSpeak || !text) return;
    try{
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      if(enVoice) u.voice = enVoice;
      u.lang = (enVoice && enVoice.lang) || "en-US";
      u.rate = 0.85;                       // wolniej — łatwiej wyłapać głoski
      if(btn){
        const off = () => btn.classList.remove("is-speaking");
        btn.classList.add("is-speaking");
        u.onend = off;
        u.onerror = off;
        setTimeout(off, 5000);             // bezpiecznik, gdyby onend nie przyszło
      }
      speechSynthesis.speak(u);
    }catch(e){}
  }

  if(!canSpeak){
    document.querySelectorAll(".speakbtn").forEach(b => b.hidden = true);
  }

  /* ---------- FISZKI ---------- */
  let flashWords = [];
  let flashIndex = 0;

  function startFlashcards(lessonId){
    currentLessonId = lessonId;
    flashWords = shuffle(LESSON_BY_ID[lessonId].words.slice());
    flashIndex = 0;
    renderFlashcard();
    showScreen("screen-flash");
  }

  function renderFlashcard(){
    const card = document.getElementById("flashcard");
    card.classList.remove("is-flipped");
    const w = flashWords[flashIndex];
    document.getElementById("flash-en").textContent = w.en;
    document.getElementById("flash-pl").textContent = w.pl;
    document.getElementById("flash-fon").textContent = w.fon || "";
    document.getElementById("flash-ipa").textContent = w.ipa ? "/" + w.ipa + "/" : "";
    document.getElementById("flash-progress").style.width = `${((flashIndex) / flashWords.length) * 100}%`;
    document.getElementById("btn-flash-prev").style.visibility = flashIndex === 0 ? "hidden" : "visible";
    document.getElementById("btn-flash-next").textContent = (flashIndex === flashWords.length - 1) ? "Do quizu" : "Dalej";
  }

  document.getElementById("flashcard").addEventListener("click", () => {
    document.getElementById("flashcard").classList.toggle("is-flipped");
  });
  document.getElementById("btn-flash-speak").addEventListener("click", (e) => {
    e.stopPropagation();               // nie obracaj karty przy kliknięciu w głośnik
    const w = flashWords[flashIndex];
    if(w) speak(w.en, e.currentTarget);
  });
  document.getElementById("btn-flash-next").addEventListener("click", () => {
    if(flashIndex < flashWords.length - 1){
      flashIndex++;
      renderFlashcard();
    } else {
      goToQuizOrNoHeart();
    }
  });
  document.getElementById("btn-flash-prev").addEventListener("click", () => {
    if(flashIndex > 0){ flashIndex--; renderFlashcard(); }
  });
  document.getElementById("btn-flash-close").addEventListener("click", () => { renderHome(); showScreen("screen-home"); });

  function goToQuizOrNoHeart(){
    regenHearts();
    renderTopStats();
    if(state.hearts <= 0){
      document.getElementById("noheart-desc").textContent =
        "Serca odnawiają się z czasem (1 co " + HEART_REGEN_HOURS + " godziny). Wróć do nauki później albo poćwicz fiszki — nie kosztują serc.";
      showScreen("screen-noheart");
    } else {
      startQuiz(currentLessonId);
    }
  }

  document.getElementById("btn-noheart-back").addEventListener("click", () => { renderHome(); showScreen("screen-home"); });
  document.getElementById("btn-noheart-flash").addEventListener("click", () => startFlashcards(currentLessonId));

  /* ---------- QUIZ ---------- */
  let quizQuestions = [];
  let quizIndex = 0;
  let quizCorrectCount = 0;
  let quizSelectedBtn = null;
  let quizAnswered = false;

  function buildQuiz(lessonId){
    const lesson = LESSON_BY_ID[lessonId];
    const words = shuffle(lesson.words.slice()).slice(0, Math.min(QUIZ_LEN, lesson.words.length));
    return words.map(w => {
      const direction = Math.random() < 0.5 ? "en2pl" : "pl2en";
      const correctText = direction === "en2pl" ? w.pl : w.en;
      const pool = lesson.words.length >= 4 ? lesson.words : ALL_WORDS;
      const distractors = shuffle(
        pool.filter(x => (direction === "en2pl" ? x.pl : x.en) !== correctText)
      ).slice(0, 3).map(x => direction === "en2pl" ? x.pl : x.en);
      const options = shuffle([correctText, ...distractors]);
      return {
        prompt: direction === "en2pl" ? w.en : w.pl,
        direction,
        correctText,
        options,
        en: w.en,
        ipa: w.ipa,
        fon: w.fon
      };
    });
  }

  function startQuiz(lessonId){
    currentLessonId = lessonId;
    quizQuestions = buildQuiz(lessonId);
    quizIndex = 0;
    quizCorrectCount = 0;
    renderQuizQuestion();
    showScreen("screen-quiz");
  }

  function renderQuizQuestion(){
    quizAnswered = false;
    quizSelectedBtn = null;
    const q = quizQuestions[quizIndex];
    document.getElementById("quiz-direction").textContent =
      q.direction === "en2pl" ? "Przetłumacz na polski:" : "Przetłumacz na angielski:";
    document.getElementById("quiz-question").textContent = q.prompt;

    // wymowa tylko przy pytaniach po angielsku — przy polskich nie ma czego czytać
    const showPhon = q.direction === "en2pl";
    document.getElementById("quiz-fon").textContent = showPhon ? (q.fon || "") : "";
    document.getElementById("quiz-ipa").textContent = (showPhon && q.ipa) ? "/" + q.ipa + "/" : "";
    document.getElementById("quiz-phon").hidden = !showPhon;
    document.getElementById("btn-quiz-speak").hidden = !(showPhon && canSpeak);

    document.getElementById("quiz-progress").style.width = `${(quizIndex / quizQuestions.length) * 100}%`;
    document.getElementById("quiz-hearts-count").textContent = state.hearts;

    const optWrap = document.getElementById("quiz-options");
    optWrap.innerHTML = "";
    q.options.forEach(opt => {
      const b = document.createElement("button");
      b.className = "quiz-option";
      b.textContent = opt;
      b.addEventListener("click", () => selectOption(b, opt));
      optWrap.appendChild(b);
    });
    document.getElementById("btn-quiz-check").disabled = true;
    document.getElementById("quiz-feedback").classList.remove("is-show", "is-wrong");
  }

  function selectOption(btn, text){
    if(quizAnswered) return;
    document.querySelectorAll(".quiz-option").forEach(b => b.classList.remove("is-selected"));
    btn.classList.add("is-selected");
    quizSelectedBtn = { btn, text };
    document.getElementById("btn-quiz-check").disabled = false;
  }

  document.getElementById("btn-quiz-check").addEventListener("click", () => {
    if(!quizSelectedBtn || quizAnswered) return;
    quizAnswered = true;
    const q = quizQuestions[quizIndex];
    const isCorrect = quizSelectedBtn.text === q.correctText;
    const feedback = document.getElementById("quiz-feedback");

    document.querySelectorAll(".quiz-option").forEach(b => {
      b.disabled = true;
      if(b.textContent === q.correctText) b.classList.add("is-correct");
      else if(b === quizSelectedBtn.btn) b.classList.add("is-wrong");
    });

    if(isCorrect){
      quizCorrectCount++;
      document.getElementById("feedback-icon").innerHTML = '<use href="#icon-check"/>';
      document.getElementById("feedback-title").textContent = pickPraise();
      document.getElementById("feedback-sub").textContent = "";
      feedback.classList.remove("is-wrong");
    } else {
      state.hearts = Math.max(0, state.hearts - 1);
      state.heartsUpdatedAt = Date.now();
      saveState();
      document.getElementById("feedback-icon").innerHTML = '<use href="#icon-x"/>';
      document.getElementById("feedback-title").textContent = "Nie tym razem";
      document.getElementById("feedback-sub").textContent = `Poprawna odpowiedź: ${q.correctText}`;
      feedback.classList.add("is-wrong");
    }
    document.getElementById("quiz-hearts-count").textContent = state.hearts;
    feedback.classList.add("is-show");
  });

  function pickPraise(){
    const options = ["Świetnie!", "Doskonale!", "Tak jest!", "Brawo!", "Super!"];
    return options[Math.floor(Math.random() * options.length)];
  }

  document.getElementById("btn-feedback-continue").addEventListener("click", () => {
    document.getElementById("quiz-feedback").classList.remove("is-show");
    if(state.hearts <= 0){
      showScreen("screen-noheart");
      document.getElementById("noheart-desc").textContent =
        "Skończyły się serca w tym quizie. Odnowią się z czasem — spróbuj ponownie później.";
      return;
    }
    if(quizIndex < quizQuestions.length - 1){
      quizIndex++;
      renderQuizQuestion();
    } else {
      finishQuiz();
    }
  });

  document.getElementById("btn-quiz-speak").addEventListener("click", (e) => {
    const q = quizQuestions[quizIndex];
    if(q) speak(q.en, e.currentTarget);
  });

  document.getElementById("btn-quiz-close").addEventListener("click", () => { renderHome(); showScreen("screen-home"); });

  function finishQuiz(){
    document.getElementById("quiz-progress").style.width = "100%";
    const total = quizQuestions.length;
    const pct = quizCorrectCount / total;
    let stars = 0;
    if(pct >= 0.9) stars = 3;
    else if(pct >= 0.7) stars = 2;
    else if(pct >= 0.4) stars = 1;

    const prevBest = lessonProgress(currentLessonId);
    const xpGain = quizCorrectCount * 10 + (stars === 3 ? 20 : 0);

    state.xp += xpGain;
    state.lessons[currentLessonId] = {
      stars: Math.max(stars, prevBest.stars || 0),
      bestCorrect: Math.max(quizCorrectCount, prevBest.bestCorrect || 0),
      total
    };
    registerActivity();
    saveState();

    renderResults(stars, quizCorrectCount, total, xpGain);
    showScreen("screen-results");
  }

  function renderResults(stars, correct, total, xpGain){
    document.getElementById("results-title").textContent =
      stars >= 2 ? "Świetna robota!" : (stars === 1 ? "Lekcja ukończona!" : "Spróbuj jeszcze raz");
    const starEls = document.querySelectorAll("#results-stars .star");
    starEls.forEach((el, i) => el.classList.toggle("earned", i < stars));
    document.getElementById("results-correct").textContent = `${correct}/${total}`;
    document.getElementById("results-xp").textContent = `+${xpGain}`;
  }

  document.getElementById("btn-results-continue").addEventListener("click", () => {
    renderHome();
    showScreen("screen-home");
  });

  /* ---------- PROFIL / STATYSTYKI ---------- */
  function renderProfile(){
    regenHearts();
    document.getElementById("profile-streak").textContent = state.streak;
    document.getElementById("profile-xp").textContent = state.xp;

    let masteredWords = 0;
    let completedLessons = 0;
    LESSONS.forEach(l => {
      const p = lessonProgress(l.id);
      if(p.stars >= 1) completedLessons++;
      if(p.stars === 3) masteredWords += l.words.length;
    });
    document.getElementById("profile-words").textContent = masteredWords;
    document.getElementById("profile-lessons").textContent = `${completedLessons} / ${LESSONS.length}`;
  }

  document.getElementById("btn-reset").addEventListener("click", () => {
    if(confirm("Na pewno zresetować cały postęp w aplikacji? Tej operacji nie można cofnąć.")){
      localStorage.removeItem(STORAGE_KEY);
      state = defaultState();
      renderHome();
      renderProfile();
      showScreen("screen-home");
      setActiveTab("home");
    }
  });

  /* ---------- DOLNA NAWIGACJA ---------- */
  function setActiveTab(tab){
    document.querySelectorAll(".tabbar__btn").forEach(b => b.classList.toggle("is-active", b.dataset.tab === tab));
  }
  document.querySelectorAll(".tabbar__btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      setActiveTab(tab);
      if(tab === "home"){ renderHome(); showScreen("screen-home"); }
      else if(tab === "profile"){ renderProfile(); showScreen("screen-profile"); }
    });
  });

  /* ---------- POMOCNICZE ---------- */
  function shuffle(arr){
    for(let i = arr.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /* ---------- START ---------- */
  regenHearts();
  renderHome();
  renderTopStats();

  // Odśwież serca co minutę (na wypadek, gdyby aplikacja była otwarta długo)
  setInterval(() => { regenHearts(); renderTopStats(); }, 60000);

  // Rejestracja Service Workera (offline / instalacja jako appka)
  if("serviceWorker" in navigator){
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").catch(() => {});
    });
  }
})();
