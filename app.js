/* PSM I Reviewer — client-side practice app. No dependencies. */
(() => {
  'use strict';

  const EXAM_SIZE = 80;
  const EXAM_MINUTES = 60;
  const PASS_MARK = 85;
  const STORE_KEY = 'psm1.progress.v1';
  const EXAM_KEY = 'psm1.exam.v1';
  const THEME_KEY = 'psm1.theme';

  /** @type {Array<Object>} */
  let BANK = [];
  let state = null;   // active quiz session
  let cards = null;   // active flashcard session
  let timerId = null;

  /* ------------------------------------------------------------------ *
   * Persistence
   * ------------------------------------------------------------------ */
  const defaultProgress = () => ({ seen: {}, flags: {}, attempts: [] });

  function loadProgress() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      return raw && raw.seen ? { ...defaultProgress(), ...raw } : defaultProgress();
    } catch {
      return defaultProgress();
    }
  }
  let progress = loadProgress();
  const saveProgress = () => localStorage.setItem(STORE_KEY, JSON.stringify(progress));

  function recordAnswer(q, correct) {
    const s = progress.seen[q.id] || { right: 0, wrong: 0 };
    correct ? s.right++ : s.wrong++;
    s.last = correct ? 'right' : 'wrong';
    s.at = Date.now();
    progress.seen[q.id] = s;
    saveProgress();
  }

  /* ------------------------------------------------------------------ *
   * Helpers
   * ------------------------------------------------------------------ */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const LETTERS = 'ABCDEFGH';

  function esc(str) {
    return String(str).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const sameSet = (a, b) =>
    a.length === b.length && a.slice().sort().every((v, i) => v === b.slice().sort()[i]);

  function filterBank({ domain, difficulty, onlyWrong, unseenFirst, count }) {
    let pool = BANK.filter((q) =>
      (!domain || q.domain === domain) && (!difficulty || q.difficulty === difficulty));

    if (onlyWrong) {
      pool = pool.filter((q) => progress.flags[q.id] || (progress.seen[q.id] || {}).last === 'wrong');
    }
    pool = shuffle(pool);
    if (unseenFirst) {
      pool.sort((a, b) => (progress.seen[a.id] ? 1 : 0) - (progress.seen[b.id] ? 1 : 0));
    }
    if (count !== 'all') pool = pool.slice(0, Number(count));
    return pool;
  }

  /* ------------------------------------------------------------------ *
   * View routing
   * ------------------------------------------------------------------ */
  function show(view) {
    $$('.view').forEach((v) => (v.hidden = v.id !== `view-${view}`));
    $$('.navbtn[data-view]').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (view === 'home') renderHomeProgress();
    if (view === 'stats') renderStats();
    if (view === 'browse') renderBrowse();
  }

  function leaveQuiz() {
    if (state && state.mode === 'exam' && !state.finished) {
      if (!confirm('Exit the exam? Your progress is saved and can be resumed.')) return;
      persistExam();
    }
    stopTimer();
    state = null;
    show('home');
  }

  /* ------------------------------------------------------------------ *
   * Quiz engine
   * ------------------------------------------------------------------ */
  function startQuiz(questions, mode) {
    if (!questions.length) {
      alert('No questions match those filters. Try widening them.');
      return;
    }
    state = {
      mode,                        // 'practice' | 'exam' | 'review'
      questions: questions.map((q) => ({ ...q, _order: shuffle(q.options.map((_, i) => i)) })),
      index: 0,
      answers: {},                 // id -> array of ORIGINAL option indices
      checked: {},                 // id -> true once graded (practice)
      finished: false,
      startedAt: Date.now(),
      endsAt: mode === 'exam' ? Date.now() + EXAM_MINUTES * 60000 : null
    };
    if (mode === 'exam') { persistExam(); startTimer(); }
    show('quiz');
    renderQuestion();
  }

  function persistExam() {
    if (!state || state.mode !== 'exam') return;
    localStorage.setItem(EXAM_KEY, JSON.stringify({
      ids: state.questions.map((q) => q.id),
      orders: state.questions.map((q) => q._order),
      answers: state.answers,
      index: state.index,
      endsAt: state.endsAt
    }));
  }
  const clearExam = () => localStorage.removeItem(EXAM_KEY);

  function resumeExam() {
    const raw = JSON.parse(localStorage.getItem(EXAM_KEY) || 'null');
    if (!raw) return;
    const byId = Object.fromEntries(BANK.map((q) => [q.id, q]));
    const questions = raw.ids.map((id, i) => {
      const q = byId[id];
      return q ? { ...q, _order: raw.orders[i] } : null;
    }).filter(Boolean);
    if (!questions.length) { clearExam(); return; }
    state = {
      mode: 'exam', questions, index: Math.min(raw.index, questions.length - 1),
      answers: raw.answers || {}, checked: {}, finished: false,
      startedAt: Date.now(), endsAt: raw.endsAt
    };
    startTimer();
    show('quiz');
    renderQuestion();
  }

  function startTimer() {
    stopTimer();
    const el = $('#timer');
    el.hidden = false;
    const tick = () => {
      const left = Math.max(0, state.endsAt - Date.now());
      const m = Math.floor(left / 60000);
      const s = Math.floor((left % 60000) / 1000);
      el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      el.classList.toggle('low', left < 5 * 60000);
      if (left <= 0) { stopTimer(); alert('Time is up — submitting your exam.'); finishQuiz(); }
    };
    tick();
    timerId = setInterval(tick, 1000);
  }
  function stopTimer() {
    if (timerId) clearInterval(timerId);
    timerId = null;
    const el = $('#timer');
    if (el) el.hidden = true;
  }

  function currentQ() { return state.questions[state.index]; }

  function renderQuestion() {
    const q = currentQ();
    const answered = state.answers[q.id] || [];
    const graded = state.mode !== 'exam' && state.checked[q.id];

    $('#qProgressText').textContent = `${state.index + 1} / ${state.questions.length}`;
    $('#qDomain').textContent = q.domain;
    const d = $('#qDiff');
    d.textContent = q.difficulty;
    d.className = `pill ${q.difficulty}`;
    $('#qId').textContent = `${q.id} · ${q.type === 'multiple' ? 'Multiple answers' : 'Single answer'}`;
    $('#qText').textContent = q.question;
    $('#barFill').style.width = `${((state.index + 1) / state.questions.length) * 100}%`;
    $('#flagBtn').classList.toggle('flag-on', !!progress.flags[q.id]);

    const inputType = q.type === 'multiple' ? 'checkbox' : 'radio';
    const form = $('#qOptions');
    form.innerHTML = q._order.map((orig, pos) => {
      const checked = answered.includes(orig) ? 'checked' : '';
      let cls = 'opt';
      if (graded) {
        cls += ' locked';
        if (q.correct.includes(orig)) cls += ' correct';
        else if (answered.includes(orig)) cls += ' incorrect';
      }
      return `<label class="${cls}">
          <input type="${inputType}" name="opt" value="${orig}" ${checked} ${graded ? 'disabled' : ''}/>
          <span class="letter">${LETTERS[pos]}.</span>
          <span>${esc(q.options[orig])}</span>
        </label>`;
    }).join('');

    form.oninput = () => {
      const picked = $$('#qOptions input:checked').map((i) => Number(i.value));
      state.answers[q.id] = picked;
      if (state.mode === 'exam') { persistExam(); renderPalette(); }
      $('#submitBtn').disabled = picked.length === 0;
    };

    const fb = $('#feedback');
    if (graded) {
      const correct = sameSet(answered, q.correct);
      fb.hidden = false;
      fb.className = `feedback ${correct ? 'ok' : 'bad'}`;
      const letters = q.correct.map((c) => LETTERS[q._order.indexOf(c)]).sort().join(', ');
      fb.innerHTML = `<strong>${correct ? '✅ Correct' : '❌ Incorrect'} — answer: ${letters}</strong>
        <p>${esc(q.explanation)}</p>
        <span class="ref">Reference: ${esc(q.reference || 'Scrum Guide 2020')}</span>`;
    } else {
      fb.hidden = true;
    }

    // Buttons
    const isExam = state.mode === 'exam';
    const last = state.index === state.questions.length - 1;
    $('#prevBtn').disabled = state.index === 0;
    $('#submitBtn').hidden = isExam || graded;
    $('#submitBtn').disabled = answered.length === 0;
    $('#nextBtn').hidden = (!isExam && !graded) || last;
    $('#finishBtn').hidden = !(last && (isExam || graded));
    $('#finishBtn').textContent = isExam ? 'Finish exam' : 'See results';
    $('#palette').hidden = !isExam;
    if (isExam) renderPalette();
  }

  function renderPalette() {
    $('#palette').innerHTML = state.questions.map((q, i) => {
      const cls = [
        (state.answers[q.id] || []).length ? 'answered' : '',
        progress.flags[q.id] ? 'flagged' : '',
        i === state.index ? 'current' : ''
      ].join(' ');
      return `<button class="${cls}" data-goto="${i}" title="${esc(q.id)}">${i + 1}</button>`;
    }).join('');
  }

  function submitAnswer() {
    const q = currentQ();
    const picked = state.answers[q.id] || [];
    if (!picked.length) return;
    state.checked[q.id] = true;
    if (state.mode === 'practice') recordAnswer(q, sameSet(picked, q.correct));
    renderQuestion();
  }

  function go(delta) {
    const next = state.index + delta;
    if (next < 0 || next >= state.questions.length) return;
    state.index = next;
    if (state.mode === 'exam') persistExam();
    renderQuestion();
  }

  function finishQuiz() {
    stopTimer();
    state.finished = true;
    if (state.mode === 'exam') {
      state.questions.forEach((q) => {
        const a = state.answers[q.id];
        if (a && a.length) recordAnswer(q, sameSet(a, q.correct));
      });
      clearExam();
    }
    const total = state.questions.length;
    const correct = state.questions.filter((q) => sameSet(state.answers[q.id] || [], q.correct)).length;
    const pct = Math.round((correct / total) * 100);

    progress.attempts.push({
      at: Date.now(), mode: state.mode, total, correct, pct,
      minutes: Math.round((Date.now() - state.startedAt) / 60000)
    });
    saveProgress();

    const passed = pct >= PASS_MARK;
    $('#scorebox').innerHTML = `
      <p class="score">${pct}%</p>
      <p class="verdict ${passed ? 'pass' : 'fail'}">${passed ? '🎉 Pass' : 'Below pass mark'}</p>
      <p class="muted">${correct} of ${total} correct · pass mark ${PASS_MARK}% ·
        ${Math.round((Date.now() - state.startedAt) / 60000)} min</p>`;

    const byDomain = {};
    state.questions.forEach((q) => {
      const b = byDomain[q.domain] || (byDomain[q.domain] = { n: 0, ok: 0 });
      b.n++;
      if (sameSet(state.answers[q.id] || [], q.correct)) b.ok++;
    });
    $('#breakdown').innerHTML = Object.entries(byDomain).sort().map(([dom, b]) => {
      const p = Math.round((b.ok / b.n) * 100);
      return `<div class="dom-row"><strong>${esc(dom)}</strong> — ${b.ok}/${b.n} (${p}%)
        <div class="dbar"><i style="width:${p}%"></i></div></div>`;
    }).join('');

    $('#reviewList').innerHTML = '';
    show('results');
  }

  function renderReview(onlyWrong) {
    const list = state.questions.filter((q) => !onlyWrong || !sameSet(state.answers[q.id] || [], q.correct));
    if (!list.length) {
      $('#reviewList').innerHTML = '<p class="empty">Nothing to review — everything was correct. 🎯</p>';
      return;
    }
    $('#reviewList').innerHTML = list.map((q) => {
      const mine = state.answers[q.id] || [];
      const opts = q._order.map((orig, pos) => {
        let cls = 'opt locked';
        if (q.correct.includes(orig)) cls += ' correct';
        else if (mine.includes(orig)) cls += ' incorrect';
        return `<li class="${cls}"><span class="letter">${LETTERS[pos]}.</span><span>${esc(q.options[orig])}</span></li>`;
      }).join('');
      return `<div class="bq">
        <div class="meta">${esc(q.id)} · ${esc(q.domain)} · ${esc(q.difficulty)}</div>
        <strong>${esc(q.question)}</strong>
        <ul class="options static">${opts}</ul>
        <div class="feedback"><strong>Explanation</strong><p>${esc(q.explanation)}</p>
          <span class="ref">Reference: ${esc(q.reference || 'Scrum Guide 2020')}</span></div>
      </div>`;
    }).join('');
  }

  /* ------------------------------------------------------------------ *
   * Flashcards
   * ------------------------------------------------------------------ */
  function startCards(domain) {
    const pool = shuffle(BANK.filter((q) => !domain || q.domain === domain));
    if (!pool.length) return;
    cards = { list: pool, i: 0, revealed: false };
    show('cards');
    renderCard();
  }

  function renderCard() {
    const q = cards.list[cards.i];
    $('#cProgressText').textContent = `${cards.i + 1} / ${cards.list.length}`;
    $('#cDomain').textContent = q.domain;
    $('#cId').textContent = `${q.id} · ${q.difficulty}`;
    $('#cText').textContent = q.question;
    $('#cFlag').classList.toggle('flag-on', !!progress.flags[q.id]);
    $('#cOptions').innerHTML = q.options.map((o, i) =>
      `<li class="opt locked ${q.correct.includes(i) ? 'correct' : ''}">
        <span class="letter">${LETTERS[i]}.</span><span>${esc(o)}</span></li>`).join('');
    $('#cExp').textContent = q.explanation;
    $('#cBack').hidden = !cards.revealed;
    $('#tapHint').hidden = cards.revealed;
  }

  function flipCard() { cards.revealed = !cards.revealed; renderCard(); }

  function moveCard(d) {
    const n = cards.i + d;
    if (n < 0 || n >= cards.list.length) return;
    cards.i = n;
    cards.revealed = false;
    renderCard();
  }

  /* ------------------------------------------------------------------ *
   * Browse
   * ------------------------------------------------------------------ */
  function renderBrowse() {
    const terms = $('#search').value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const dom = $('#bDomain').value;
    const diff = $('#bDiff').value;
    const flagged = $('#bFlagged').checked;

    const list = BANK.filter((q) => {
      if (dom && q.domain !== dom) return false;
      if (diff && q.difficulty !== diff) return false;
      if (flagged && !progress.flags[q.id]) return false;
      if (!terms.length) return true;
      const hay = (q.id + ' ' + q.question + ' ' + q.options.join(' ') + ' ' + q.explanation).toLowerCase();
      return terms.every((t) => hay.includes(t));
    });

    $('#browseCount').textContent = `${list.length} question${list.length === 1 ? '' : 's'}`;
    const slice = list.slice(0, 150);
    $('#browseList').innerHTML = slice.length ? slice.map((q) => {
      const stat = progress.seen[q.id];
      const opts = q.options.map((o, i) =>
        `<li class="opt locked ${q.correct.includes(i) ? 'correct' : ''}">
          <span class="letter">${LETTERS[i]}.</span><span>${esc(o)}</span></li>`).join('');
      return `<details class="bq">
        <summary>${esc(q.question)}</summary>
        <div class="meta">
          <span class="pill">${esc(q.domain)}</span>
          <span class="pill ${q.difficulty}">${esc(q.difficulty)}</span>
          <span>${esc(q.id)}</span>
          ${stat ? `<span>✔ ${stat.right} / ✘ ${stat.wrong}</span>` : ''}
          <button class="flagtoggle" data-flag="${q.id}">${progress.flags[q.id] ? '🔖 Flagged' : '🔖 Flag'}</button>
        </div>
        <ul class="options static">${opts}</ul>
        <div class="feedback"><strong>Explanation</strong><p>${esc(q.explanation)}</p>
          <span class="ref">Reference: ${esc(q.reference || 'Scrum Guide 2020')}</span></div>
      </details>`;
    }).join('') + (list.length > slice.length
      ? `<p class="empty">Showing first ${slice.length} of ${list.length}. Narrow your search to see more.</p>` : '')
      : '<p class="empty">No questions match your filters.</p>';
  }

  /* ------------------------------------------------------------------ *
   * Stats
   * ------------------------------------------------------------------ */
  function renderHomeProgress() {
    const ids = Object.keys(progress.seen);
    const right = ids.reduce((s, id) => s + progress.seen[id].right, 0);
    const wrong = ids.reduce((s, id) => s + progress.seen[id].wrong, 0);
    const acc = right + wrong ? Math.round((right / (right + wrong)) * 100) : 0;
    $('#homeProgress').innerHTML = `
      <div class="stat"><b>${ids.length}</b><span>of ${BANK.length} questions attempted</span></div>
      <div class="stat"><b>${acc}%</b><span>lifetime accuracy</span></div>
      <div class="stat"><b>${Object.keys(progress.flags).length}</b><span>flagged for review</span></div>
      <div class="stat"><b>${progress.attempts.length}</b><span>sessions completed</span></div>`;
  }

  function renderStats() {
    const ids = Object.keys(progress.seen);
    const right = ids.reduce((s, id) => s + progress.seen[id].right, 0);
    const wrong = ids.reduce((s, id) => s + progress.seen[id].wrong, 0);
    const acc = right + wrong ? Math.round((right / (right + wrong)) * 100) : 0;

    const domains = [...new Set(BANK.map((q) => q.domain))].sort();
    const domRows = domains.map((d) => {
      const qs = BANK.filter((q) => q.domain === d);
      const seen = qs.filter((q) => progress.seen[q.id]);
      const r = seen.reduce((s, q) => s + progress.seen[q.id].right, 0);
      const w = seen.reduce((s, q) => s + progress.seen[q.id].wrong, 0);
      const a = r + w ? Math.round((r / (r + w)) * 100) : 0;
      return `<div class="dom-row"><strong>${esc(d)}</strong> — ${seen.length}/${qs.length} seen · ${a}% accuracy
        <div class="dbar"><i style="width:${a}%"></i></div></div>`;
    }).join('');

    const attempts = progress.attempts.slice(-12).reverse().map((a) =>
      `<div class="dom-row">${new Date(a.at).toLocaleString()} · <strong>${a.mode}</strong> ·
        ${a.correct}/${a.total} (${a.pct}%) · ${a.minutes} min</div>`).join('')
      || '<p class="muted">No completed sessions yet.</p>';

    $('#statsBody').innerHTML = `
      <div class="statgrid">
        <div class="stat"><b>${ids.length}</b><span>questions attempted</span></div>
        <div class="stat"><b>${acc}%</b><span>accuracy</span></div>
        <div class="stat"><b>${right}</b><span>correct answers</span></div>
        <div class="stat"><b>${wrong}</b><span>incorrect answers</span></div>
      </div>
      <h3>By domain</h3><div class="hist">${domRows}</div>
      <h3>Recent sessions</h3><div class="hist">${attempts}</div>`;
  }

  /* ------------------------------------------------------------------ *
   * Wiring
   * ------------------------------------------------------------------ */
  function toggleFlag(id) {
    if (progress.flags[id]) delete progress.flags[id];
    else progress.flags[id] = true;
    saveProgress();
  }

  function wire() {
    $$('.navbtn[data-view]').forEach((b) => (b.onclick = () => show(b.dataset.view)));
    $('#brandHome').onclick = () => show('home');

    $('#themeBtn').onclick = () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      localStorage.setItem(THEME_KEY, next);
      $('#themeBtn').textContent = next === 'dark' ? '☀️' : '🌙';
    };

    $('#startPractice').onclick = () => startQuiz(filterBank({
      domain: $('#pDomain').value,
      difficulty: $('#pDiff').value,
      onlyWrong: $('#pWrong').checked,
      unseenFirst: $('#pUnseen').checked,
      count: $('#pCount').value
    }), 'practice');

    $('#startExam').onclick = () => {
      if (localStorage.getItem(EXAM_KEY) && !confirm('Starting a new exam discards your saved one. Continue?')) return;
      clearExam();
      startQuiz(shuffle(BANK).slice(0, Math.min(EXAM_SIZE, BANK.length)), 'exam');
    };
    $('#resumeExam').onclick = resumeExam;
    $('#startCards').onclick = () => startCards($('#fDomain').value);

    $('#quitQuiz').onclick = leaveQuiz;
    $('#prevBtn').onclick = () => go(-1);
    $('#nextBtn').onclick = () => go(1);
    $('#submitBtn').onclick = submitAnswer;
    $('#finishBtn').onclick = finishQuiz;
    $('#flagBtn').onclick = () => {
      toggleFlag(currentQ().id);
      $('#flagBtn').classList.toggle('flag-on', !!progress.flags[currentQ().id]);
      if (state.mode === 'exam') renderPalette();
    };
    $('#palette').onclick = (e) => {
      const btn = e.target.closest('[data-goto]');
      if (!btn) return;
      state.index = Number(btn.dataset.goto);
      renderQuestion();
    };

    $('#quitCards').onclick = () => { cards = null; show('home'); };
    $('#flashcard').onclick = flipCard;
    $('#cNext').onclick = (e) => { e.stopPropagation(); moveCard(1); };
    $('#cPrev').onclick = (e) => { e.stopPropagation(); moveCard(-1); };
    $('#cFlag').onclick = (e) => {
      e.stopPropagation();
      const q = cards.list[cards.i];
      toggleFlag(q.id);
      $('#cFlag').classList.toggle('flag-on', !!progress.flags[q.id]);
    };

    $('#reviewWrong').onclick = () => renderReview(true);
    $('#retryWrong').onclick = () => {
      const wrong = state.questions.filter((q) => !sameSet(state.answers[q.id] || [], q.correct));
      if (!wrong.length) { alert('No incorrect answers to retry. 🎯'); return; }
      startQuiz(wrong.map(({ _order, ...q }) => q), 'practice');
    };
    $('#backHome').onclick = () => { state = null; show('home'); };

    ['#search', '#bDomain', '#bDiff', '#bFlagged'].forEach((s) => {
      $(s).addEventListener('input', renderBrowse);
    });
    $('#browseList').onclick = (e) => {
      const btn = e.target.closest('[data-flag]');
      if (!btn) return;
      e.preventDefault();
      toggleFlag(btn.dataset.flag);
      btn.textContent = progress.flags[btn.dataset.flag] ? '🔖 Flagged' : '🔖 Flag';
    };

    $('#resetStats').onclick = () => {
      if (!confirm('Delete all local progress, flags and session history?')) return;
      progress = defaultProgress();
      saveProgress();
      clearExam();
      renderStats();
      renderHomeProgress();
    };

    document.addEventListener('keydown', (e) => {
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
      if (!$('#view-quiz').hidden && state) {
        const q = currentQ();
        const idx = LETTERS.indexOf(e.key.toUpperCase());
        if (idx >= 0 && idx < q.options.length && !state.checked[q.id]) {
          const input = $$('#qOptions input')[idx];
          if (input) { input.checked = q.type === 'multiple' ? !input.checked : true; input.dispatchEvent(new Event('input', { bubbles: true })); }
        } else if (e.key === 'Enter') {
          if (!$('#submitBtn').hidden && !$('#submitBtn').disabled) submitAnswer();
          else if (!$('#nextBtn').hidden) go(1);
          else if (!$('#finishBtn').hidden) finishQuiz();
        } else if (e.key === 'ArrowRight') go(1);
        else if (e.key === 'ArrowLeft') go(-1);
        else if (e.key.toLowerCase() === 'f') $('#flagBtn').click();
      } else if (!$('#view-cards').hidden && cards) {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flipCard(); }
        else if (e.key === 'ArrowRight') moveCard(1);
        else if (e.key === 'ArrowLeft') moveCard(-1);
      }
    });

    window.addEventListener('beforeunload', () => { if (state && state.mode === 'exam' && !state.finished) persistExam(); });
  }

  function fillSelects() {
    const domains = [...new Set(BANK.map((q) => q.domain))].sort();
    ['#pDomain', '#fDomain', '#bDomain'].forEach((sel) => {
      const el = $(sel);
      domains.forEach((d) => {
        const counts = BANK.filter((q) => q.domain === d).length;
        el.insertAdjacentHTML('beforeend', `<option value="${esc(d)}">${esc(d)} (${counts})</option>`);
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * Boot
   * ------------------------------------------------------------------ */
  async function boot() {
    const theme = localStorage.getItem(THEME_KEY) || 'light';
    document.documentElement.dataset.theme = theme;

    try {
      const res = await fetch('questions.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      BANK = await res.json();
    } catch (err) {
      document.querySelector('main').innerHTML =
        `<p class="empty">Could not load <code>questions.json</code> (${esc(err.message)}).<br>
         Serve this folder over HTTP — e.g. <code>npm start</code> — instead of opening the file directly.</p>`;
      return;
    }

    $('#bankCount').textContent = BANK.length;
    $('#themeBtn').textContent = theme === 'dark' ? '☀️' : '🌙';
    fillSelects();
    wire();
    if (localStorage.getItem(EXAM_KEY)) $('#resumeExam').hidden = false;
    show('home');
  }

  boot();
})();
