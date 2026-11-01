// app.js - Lógica interactiva y Verificador Prolog (Examen Recuperatorio Integrador - UCSE DASS 2026)

(function () {
  'use strict';

  const STORAGE_KEY = 'ucse_lab1_examen_recuperatorio_2026';
  const TIMER_STORAGE_KEY = 'ucse_lab1_examen_recuperatorio_timer_2026';
  const START_TIME_KEY = 'ucse_lab1_examen_recuperatorio_start_time';
  const COLOR_SCHEME_KEY = 'ucse_color_scheme';
  const DEFAULT_TIMER_SECONDS = 90 * 60; // 90 minutos continuos (Examen Controlado)
  const EXPORT_FILENAME = 'respuestas_recuperatorio.json';
  const EXAM_ID = 'LAB1-2026-EXAMEN-RECUPERATORIO';
  const EXAM_TITLE = 'Examen Recuperatorio Integrador: Teoría (TP1–TP5) y Práctica en Prolog (TP7)';
  const ALLOWED_EXERCISES = new Set([
    'ej1_teoria_tp1',
    'ej2_teoria_tp2',
    'ej3_teoria_tp3',
    'ej4_teoria_tp4',
    'ej5_teoria_tp5',
    'ej6_practica_caso1'
  ]);

  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  const progressPercent = document.getElementById('progress-percent');
  const progressTeoria = document.getElementById('progress-teoria');
  const progressPractica = document.getElementById('progress-practica');
  const previewArea = document.getElementById('json-preview');
  const previewModal = document.getElementById('modal-preview');
  const timerDisplay = document.getElementById('timer-display');

  let timerSeconds = DEFAULT_TIMER_SECONDS;
  let timerInterval = null;

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    randomizeSelectOptions();
    initTimer();
    loadStoredData();
    bindEvents();
    runAllLinters();
    updateProgress();
    initPartTabs();
    initDomainFilters();
  });

  // ==========================================
  // ALEATORIZACIÓN DE OPCIONES CLIENT-SIDE
  // ==========================================
  function randomizeSelectOptions() {
    document.querySelectorAll('select[data-ex]').forEach(sel => {
      const disabledOption = sel.querySelector('option[disabled]');
      const opts = Array.from(sel.querySelectorAll('option:not([disabled])'));
      if (opts.length <= 1) return;
      for (let i = opts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = opts[i];
        opts[i] = opts[j];
        opts[j] = temp;
      }
      opts.forEach(opt => sel.appendChild(opt));
    });
  }

  // ==========================================
  // TEMA CLARO / OSCURO
  // ==========================================
  function getSystemScheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function getRenderedScheme() {
    try {
      const stored = localStorage.getItem(COLOR_SCHEME_KEY);
      if (stored === 'dark' || stored === 'light') return stored;
    } catch (e) {}
    return 'light';
  }

  function applyScheme(scheme, metaValue) {
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) meta.setAttribute('content', metaValue);
    if (scheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  function initTheme() {
    const current = getRenderedScheme();
    let stored = null;
    try {
      stored = localStorage.getItem(COLOR_SCHEME_KEY);
    } catch (e) {}
    applyScheme(current, stored || 'light dark');

    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        const rendered = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        const target = rendered === 'dark' ? 'light' : 'dark';
        const sys = getSystemScheme();

        try {
          if (target === sys) {
            localStorage.removeItem(COLOR_SCHEME_KEY);
            applyScheme(target, 'light dark');
          } else {
            localStorage.setItem(COLOR_SCHEME_KEY, target);
            applyScheme(target, target);
          }
        } catch (e) {
          applyScheme(target, target);
        }
      });
    }

    window.addEventListener('storage', (e) => {
      if (e.key === COLOR_SCHEME_KEY) {
        const val = e.newValue;
        const resolved = val === 'dark' || val === 'light' ? val : getSystemScheme();
        applyScheme(resolved, val || 'light dark');
      }
    });
  }

  // ==========================================
  // CRONÓMETRO CONTINUO (EXAMEN CONTROLADO: BASADO EN TIEMPO REAL SIN PAUSA)
  // ==========================================
  function initTimer() {
    if (timerInterval) clearInterval(timerInterval);
    let startTime = localStorage.getItem(START_TIME_KEY);
    if (!startTime) {
      startTime = new Date().toISOString();
      try { localStorage.setItem(START_TIME_KEY, startTime); } catch (e) {}
    }

    const updateFromWallClock = () => {
      const startMs = new Date(startTime).getTime();
      const nowMs = Date.now();
      const elapsedSeconds = Math.max(0, Math.floor((nowMs - startMs) / 1000));
      timerSeconds = Math.max(0, DEFAULT_TIMER_SECONDS - elapsedSeconds);
      try { localStorage.setItem(TIMER_STORAGE_KEY, timerSeconds.toString()); } catch (e) {}
      renderTimer();
      if (timerSeconds <= 0) {
        if (timerInterval) clearInterval(timerInterval);
        alert('⏰ ¡Tiempo cumplido! La instancia ha finalizado. Por favor genera y exporta el archivo ' + EXPORT_FILENAME);
      }
    };

    updateFromWallClock();
    timerInterval = setInterval(updateFromWallClock, 1000);
  }

  function renderTimer() {
    if (!timerDisplay) return;
    const m = Math.floor(timerSeconds / 60);
    const s = timerSeconds % 60;
    timerDisplay.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

    timerDisplay.classList.remove('timer-warning', 'timer-danger');
    if (timerSeconds <= 600 && timerSeconds > 120) {
      timerDisplay.classList.add('timer-warning');
    } else if (timerSeconds <= 120 && timerSeconds > 0) {
      timerDisplay.classList.add('timer-danger');
    }
  }

  // ==========================================
  // VERIFICADOR PRELIMINAR DE ESTRUCTURA Y SINTAXIS BÁSICA DE PROLOG
  // ==========================================
  function splitTopLevelCommas(str) {
    const res = [];
    let cur = '';
    let depth = 0;
    for (let i = 0; i < str.length; i++) {
      const c = str[i];
      if (c === '(') { depth++; cur += c; }
      else if (c === ')') { depth = Math.max(0, depth - 1); cur += c; }
      else if (c === ',' && depth === 0) { res.push(cur.trim()); cur = ''; }
      else cur += c;
    }
    if (cur.trim()) res.push(cur.trim());
    return res;
  }

  function parseSig(term) {
    const clean = term.replace(/\s+/g, '');
    const m = clean.match(/^([a-z_][a-zA-Z0-9_]*)\((.*)\)$/);
    if (!m) return null;
    const args = splitTopLevelCommas(m[2]);
    return { pred: m[1], arity: args.length, sig: `${m[1]}/${args.length}`, args: args };
  }

  function lintPrologCode(code, expectedSigs) {
    const warnings = [];
    const factsBySig = {};
    const rulesBySig = {};
    let totalFacts = 0;
    let totalRules = 0;

    if (!code || !code.trim()) {
      return {
        totalFacts: 0,
        totalRules: 0,
        factsBySig,
        rulesBySig,
        warnings: ['Escribe los 9 hechos y las 2 reglas del dominio.'],
        isExactStructure: false
      };
    }

    const lines = code.split(/\r?\n/);
    lines.forEach((rawLine, i) => {
      const line = rawLine.replace(/%.*$/, '').trim();
      if (!line || line.startsWith('/*') || line.startsWith('*') || line.endsWith('*/')) return;
      if (line.startsWith(':-')) {
        if (!line.endsWith('.')) warnings.push(`Línea ${i + 1}: La directiva '${line}' debe terminar en punto (.).`);
        return;
      }
      if (line.includes('=') && !line.includes(':-') && !line.includes('\\=')) {
        warnings.push(`Línea ${i + 1}: Usa ':-' en lugar de '=' para definir reglas en Prolog.`);
      }
      const openP = (line.match(/\(/g) || []).length;
      const closeP = (line.match(/\)/g) || []).length;
      if (openP !== closeP) {
        warnings.push(`Línea ${i + 1}: Paréntesis desbalanceados en '${line}'.`);
      } else if (openP > 0 && line.endsWith(')') && !line.endsWith('.')) {
        warnings.push(`Línea ${i + 1}: Falta el punto final '.' al cerrar '${line}'.`);
      }
    });

    const noComments = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/%[^\n]*/g, '');
    const clauses = noComments.split('.').map(c => c.trim()).filter(Boolean);

    clauses.forEach(clause => {
      if (clause.startsWith(':-')) return;

      if (clause.includes(':-')) {
        const parts = clause.split(':-');
        const head = parts[0].trim();
        const body = parts.slice(1).join(':-').trim();
        const parsed = parseSig(head);
        if (!parsed) {
          warnings.push(`Encabezado de regla inválido: '${head}'. El nombre del predicado debe iniciar con minúscula.`);
          return;
        }
        totalRules++;
        rulesBySig[parsed.sig] = (rulesBySig[parsed.sig] || 0) + 1;

        const varMatches = clause.match(/\b[A-Z][a-zA-Z0-9_]*\b/g) || [];
        const counts = {};
        varMatches.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
        Object.keys(counts).forEach(v => {
          if (counts[v] === 1) {
            warnings.push(`Regla ${parsed.sig}: La variable '${v}' aparece una sola vez (variable singleton no conectada).`);
          }
        });

        if (!body) {
          warnings.push(`Regla ${parsed.sig}: El cuerpo de la regla después de ':-' está vacío.`);
        }
      } else {
        const compact = clause.replace(/\s+/g, '');
        if (/^[A-Z]/.test(compact)) {
          warnings.push(`Hecho '${compact}': El predicado inicia con mayúscula (debe iniciar con minúscula).`);
          return;
        }
        const parsed = parseSig(compact);
        if (!parsed) {
          warnings.push(`Cláusula incompleta o con sintaxis no reconocida: '${clause}'.`);
          return;
        }
        const upperArgs = parsed.args.filter(a => /^[A-Z]/.test(a));
        if (upperArgs.length > 0) {
          warnings.push(`Hecho ${parsed.sig}: El argumento '${upperArgs[0]}' inicia con mayúscula (Prolog lo interpreta como variable en vez de átomo constante).`);
        }
        totalFacts++;
        factsBySig[parsed.sig] = (factsBySig[parsed.sig] || 0) + 1;
      }
    });

    // Validación de estructura esperada (9 hechos: 3 por predicado factual; 2 reglas: 1 por predicado deductivo)
    let isExactStructure = false;
    if (expectedSigs && expectedSigs.length >= 5) {
      const factSigs = expectedSigs.slice(0, 3);
      const ruleSigs = expectedSigs.slice(3);

      factSigs.forEach(sig => {
        const cnt = factsBySig[sig] || 0;
        if (cnt < 3) {
          warnings.push(`Predicado factual '${sig}': Se detectaron ${cnt}/3 hechos esperados.`);
        } else if (cnt > 3) {
          warnings.push(`Predicado factual '${sig}': Se detectaron ${cnt} hechos (se requieren exactamente 3).`);
        }
      });

      ruleSigs.forEach(sig => {
        const cnt = rulesBySig[sig] || 0;
        if (cnt < 1) {
          warnings.push(`Predicado deductivo '${sig}': Falta definir la regla correspondiente.`);
        } else if (cnt > 1) {
          warnings.push(`Predicado deductivo '${sig}': Se detectaron ${cnt} reglas (se requiere exactamente 1).`);
        }
      });

      const allFactsExact = factSigs.every(sig => (factsBySig[sig] || 0) === 3);
      const allRulesExact = ruleSigs.every(sig => (rulesBySig[sig] || 0) === 1);
      if (totalFacts === 9 && totalRules === 2 && allFactsExact && allRulesExact && warnings.length === 0) {
        isExactStructure = true;
      }
    } else if (totalFacts === 9 && totalRules === 2 && warnings.length === 0) {
      isExactStructure = true;
    }

    return { totalFacts, totalRules, factsBySig, rulesBySig, warnings, isExactStructure };
  }

  function updateLinterUI(caseNum, textareaId) {
    const ta = document.getElementById(textareaId);
    if (!ta) return false;
    let expectedSigs = [];
    try {
      expectedSigs = JSON.parse(ta.getAttribute('data-expected-preds') || '[]');
    } catch (e) {}

    const res = lintPrologCode(ta.value, expectedSigs);
    const factsBadge = document.getElementById(`linter-facts-${caseNum}`);
    const rulesBadge = document.getElementById(`linter-rules-${caseNum}`);
    const statusBadge = document.getElementById(`linter-status-${caseNum}`);
    const predsDiv = document.getElementById(`linter-preds-${caseNum}`);
    const warnList = document.getElementById(`linter-warnings-${caseNum}`);

    if (factsBadge) factsBadge.textContent = `Hechos válidos: ${res.totalFacts} / 9`;
    if (rulesBadge) rulesBadge.textContent = `Reglas deductivas: ${res.totalRules} / 2`;

    if (predsDiv && expectedSigs.length > 0) {
      const factSigs = expectedSigs.slice(0, 3);
      const pills = expectedSigs.map(sig => {
        const isFact = factSigs.includes(sig);
        const expectedCount = isFact ? 3 : 1;
        const actualCount = isFact ? (res.factsBySig[sig] || 0) : (res.rulesBySig[sig] || 0);
        const ok = actualCount === expectedCount;
        return `<span class="inline-block mr-2 mb-1 px-2 py-0.5 rounded ${ok ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400 border border-slate-700'}">${ok ? '✓' : '○'} ${sig} (${actualCount}/${expectedCount})</span>`;
      });
      predsDiv.innerHTML = pills.join('');
    }

    if (warnList) {
      warnList.innerHTML = '';
      res.warnings.slice(0, 6).forEach(w => {
        const li = document.createElement('li');
        li.textContent = w;
        warnList.appendChild(li);
      });
    }

    if (statusBadge) {
      if (res.isExactStructure) {
        statusBadge.className = 'px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-400/40';
        statusBadge.textContent = 'ℹ️ Estructura mínima detectada. Falta comprobar ejecución y semántica.';
      } else if (res.totalFacts > 0 || res.totalRules > 0) {
        statusBadge.className = 'px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-400/40';
        statusBadge.textContent = '🛠️ En construcción (revisa avisos)';
      } else {
        statusBadge.className = 'px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold border border-slate-600';
        statusBadge.textContent = '⏳ Pendiente de codificar';
      }
    }
    return res.isExactStructure;
  }

  function runAllLinters() {
    updateLinterUI(1, 'kb-code-1');
  }

  // ==========================================
  // VINCULACIÓN DE EVENTOS
  // ==========================================
  function bindEvents() {
    document.querySelectorAll('select[data-ex], input[type="radio"][data-ex]').forEach(elem => {
      elem.addEventListener('change', () => {
        saveData();
        updateProgress();
      });
    });

    document.querySelectorAll('textarea[data-kb-ex]').forEach(ta => {
      ta.addEventListener('input', () => {
        runAllLinters();
        saveData();
        updateProgress();
      });
    });

    document.querySelectorAll('input[id^="student-"]').forEach(input => {
      input.addEventListener('input', () => {
        saveData();
      });
    });

    const btnExport = document.getElementById('btn-export-json');
    const btnExportFooter = document.getElementById('btn-export-json-footer');
    if (btnExport) btnExport.addEventListener('click', exportJSON);
    if (btnExportFooter) btnExportFooter.addEventListener('click', exportJSON);

    const btnReset = document.getElementById('btn-reset-exam');
    const btnResetFooter = document.getElementById('btn-reset-exam-footer');
    if (btnReset) btnReset.addEventListener('click', resetExam);
    if (btnResetFooter) btnResetFooter.addEventListener('click', resetExam);

    const btnPreview = document.getElementById('btn-preview-json');
    if (btnPreview) btnPreview.addEventListener('click', showPreview);

    const btnClosePreview = document.getElementById('btn-close-preview');
    if (btnClosePreview && previewModal) {
      btnClosePreview.addEventListener('click', () => previewModal.classList.add('hidden'));
    }

    const btnCopyJson = document.getElementById('btn-copy-json');
    if (btnCopyJson) {
      btnCopyJson.addEventListener('click', () => {
        const payload = generatePayload();
        navigator.clipboard.writeText(JSON.stringify(payload, null, 2)).then(() => {
          btnCopyJson.textContent = '✅ ¡JSON Copiado!';
          setTimeout(() => { btnCopyJson.textContent = '📋 Copiar JSON'; }, 2000);
        });
      });
    }

    const inputImport = document.getElementById('input-import-json');
    const btnImport = document.getElementById('btn-import-json');
    if (btnImport && inputImport) {
      btnImport.addEventListener('click', () => inputImport.click());
      inputImport.addEventListener('change', importJSON);
    }

    setupKBToolbar(1, 'btn-copy-prolog-1', 'kb-code-1', 'btn-load-pl-1', 'input-load-pl-1', 'btn-download-pl-1');
    setupModal('btn-git-guide', 'modal-git', 'btn-close-git');
  }

  function setupKBToolbar(caseNum, copyBtnId, textareaId, loadBtnId, loadInputId, downloadBtnId) {
    const copyBtn = document.getElementById(copyBtnId);
    const ta = document.getElementById(textareaId);
    const loadBtn = document.getElementById(loadBtnId);
    const loadInput = document.getElementById(loadInputId);
    const dlBtn = document.getElementById(downloadBtnId);

    if (copyBtn && ta) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(ta.value.trim()).then(() => {
          const orig = copyBtn.innerHTML;
          copyBtn.innerHTML = '<span>✅</span> ¡KB Copiada!';
          setTimeout(() => { copyBtn.innerHTML = orig; }, 2000);
        });
      });
    }

    if (loadBtn && loadInput && ta) {
      loadBtn.addEventListener('click', () => loadInput.click());
      loadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          ta.value = ev.target.result;
          runAllLinters();
          saveData();
          updateProgress();
        };
        reader.readAsText(file);
        e.target.value = '';
      });
    }

    if (dlBtn && ta) {
      dlBtn.addEventListener('click', () => {
        const plName = dlBtn.getAttribute('data-pl-name') || `caso${caseNum}.pl`;
        const blob = new Blob([ta.value], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = plName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }
  }

  function setupModal(triggerId, modalId, closeId) {
    const trigger = document.getElementById(triggerId);
    const modal = document.getElementById(modalId);
    const closeBtn = document.getElementById(closeId);

    if (trigger && modal) trigger.addEventListener('click', () => modal.classList.remove('hidden'));
    if (closeBtn && modal) closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
      });
    }
  }

  // ==========================================
  // ESTADÍSTICAS DE COMPLETITUD DEL EXAMEN (20 TEORÍA + 1 KB + 6 CONSULTAS = 27 ÍTEMS)
  // ==========================================
  function getCompletionStats() {
    const interactiveElements = document.querySelectorAll('select[data-ex], input[type="radio"][data-ex]');
    const teoriaTotal = new Set();
    const teoriaAnswered = new Set();
    const queriesTotal = new Set();
    const queriesAnswered = new Set();

    interactiveElements.forEach(elem => {
      const ex = elem.getAttribute('data-ex') || '';
      const key = elem.getAttribute('data-key') || '';
      const fullKey = `${ex}__${key}`;

      const isTeoria = ex.includes('teoria');
      if (isTeoria) teoriaTotal.add(fullKey);
      else queriesTotal.add(fullKey);

      const isAnswered =
        (elem.tagName === 'SELECT' && elem.value && elem.value !== '') ||
        (elem.tagName === 'INPUT' && elem.type === 'radio' && elem.checked);

      if (isAnswered) {
        if (isTeoria) teoriaAnswered.add(fullKey);
        else queriesAnswered.add(fullKey);
      }
    });

    const ta = document.getElementById('kb-code-1');
    let hasKbText = false;
    let isKbComplete = false;
    if (ta) {
      const val = ta.value.trim();
      hasKbText = val.length > 0;
      let expectedSigs = [];
      try {
        expectedSigs = JSON.parse(ta.getAttribute('data-expected-preds') || '[]');
      } catch (e) {}
      const res = lintPrologCode(ta.value, expectedSigs);
      isKbComplete = res.isExactStructure;
    }

    const tTotal = teoriaTotal.size || 20;
    const tAns = teoriaAnswered.size;
    const qTotal = queriesTotal.size || 6;
    const qAns = queriesAnswered.size;
    const total = tTotal + qTotal + 1; // 27
    const answered = tAns + qAns + (isKbComplete ? 1 : 0);

    return {
      total,
      answered,
      teoriaTotal: tTotal,
      teoriaAnswered: tAns,
      queriesTotal: qTotal,
      queriesAnswered: qAns,
      hasKbText,
      isKbComplete
    };
  }

  // ==========================================
  // CÓMPUTO DE PROGRESO EN VIVO
  // ==========================================
  function updateProgress() {
    const stats = getCompletionStats();
    const percent = Math.round((stats.answered / stats.total) * 100);

    if (progressBar) progressBar.style.width = `${percent}%`;
    if (progressText) progressText.textContent = `${stats.answered} de ${stats.total} completados`;
    if (progressPercent) progressPercent.textContent = `${percent}%`;
    if (progressTeoria) progressTeoria.textContent = `Teoría: ${stats.teoriaAnswered}/${stats.teoriaTotal}`;
    if (progressPractica) progressPractica.textContent = `Práctica (KB+Consultas): ${stats.queriesAnswered + (stats.isKbComplete ? 1 : 0)}/${stats.queriesTotal + 1}`;
  }

  function initPartTabs() {
    const partBtns = document.querySelectorAll('.part-tab-btn');
    const secTeoria = document.getElementById('section-parte-teorica');
    const secPractica = document.getElementById('section-parte-practica');

    partBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const part = btn.getAttribute('data-part');
        partBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (part === 'teoria') {
          if (secTeoria) secTeoria.classList.remove('hidden');
          if (secPractica) secPractica.classList.add('hidden');
        } else if (part === 'practica') {
          if (secTeoria) secTeoria.classList.add('hidden');
          if (secPractica) secPractica.classList.remove('hidden');
        } else {
          if (secTeoria) secTeoria.classList.remove('hidden');
          if (secPractica) secPractica.classList.remove('hidden');
        }
      });
    });
  }

  function initDomainFilters() {
    setupFilterGroup('.filter-d1-btn', '.domain1-card');
  }

  function setupFilterGroup(btnSelector, cardSelector) {
    const btns = document.querySelectorAll(btnSelector);
    const cards = document.querySelectorAll(cardSelector);

    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.getAttribute('data-filter');
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        cards.forEach(card => {
          const cat = card.getAttribute('data-category');
          if (filter === 'all' || filter === cat) {
            card.classList.remove('opacity-30', 'scale-95');
            card.classList.add('opacity-100', 'scale-100');
          } else {
            card.classList.remove('opacity-100', 'scale-100');
            card.classList.add('opacity-30', 'scale-95');
          }
        });
      });
    });
  }

  function generatePayload() {
    const startTime = localStorage.getItem(START_TIME_KEY) || new Date().toISOString();
    const endTime = new Date().toISOString();
    const elapsedSec = Math.max(0, Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000));

    const payload = {
      metadata: {
        tp_id: EXAM_ID,
        title: EXAM_TITLE,
        institucion: 'Universidad Católica de Santiago del Estero (UCSE) - DASS',
        start_time: startTime,
        end_time: endTime,
        elapsed_seconds: elapsedSec,
        timestamp: endTime
      },
      student: {
        nombre: document.getElementById('student-name')?.value.trim() || '',
        matricula: document.getElementById('student-id')?.value.trim() || '',
        email: document.getElementById('student-email')?.value.trim() || '',
        comision: document.getElementById('student-comision')?.value.trim() || ''
      },
      prolog_kb: {},
      answers: {}
    };

    document.querySelectorAll('textarea[data-kb-ex]').forEach(ta => {
      const ex = ta.getAttribute('data-kb-ex');
      payload.prolog_kb[ex] = ta.value;
    });

    document.querySelectorAll('select[data-ex]').forEach(sel => {
      const ex = sel.getAttribute('data-ex');
      const key = sel.getAttribute('data-key');
      if (!payload.answers[ex]) payload.answers[ex] = {};
      if (sel.value) payload.answers[ex][key] = sel.value;
    });

    document.querySelectorAll('input[type="radio"][data-ex]:checked').forEach(radio => {
      const ex = radio.getAttribute('data-ex');
      const key = radio.getAttribute('data-key');
      if (!payload.answers[ex]) payload.answers[ex] = {};
      payload.answers[ex][key] = radio.value;
    });

    return payload;
  }

  function saveData() {
    const payload = generatePayload();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch (e) {}
  }

  function loadStoredData() {
    let raw = null;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) {}
    if (!raw) return;

    try {
      const data = JSON.parse(raw);
      if (!data) return;

      if (data.student) {
        const nameField = document.getElementById('student-name');
        const idField = document.getElementById('student-id');
        const emailField = document.getElementById('student-email');
        const comField = document.getElementById('student-comision');
        if (nameField && data.student.nombre) nameField.value = data.student.nombre;
        if (idField && data.student.matricula) idField.value = data.student.matricula;
        if (emailField && data.student.email) emailField.value = data.student.email;
        if (comField && data.student.comision) comField.value = data.student.comision;
      }

      if (data.prolog_kb) {
        Object.keys(data.prolog_kb).forEach(ex => {
          const ta = document.querySelector(`textarea[data-kb-ex="${ex}"]`);
          if (ta && data.prolog_kb[ex]) ta.value = data.prolog_kb[ex];
        });
      }

      if (data.answers) {
        Object.keys(data.answers).forEach(ex => {
          const exObj = data.answers[ex];
          Object.keys(exObj).forEach(key => {
            const val = exObj[key];
            const sel = document.querySelector(`select[data-ex="${ex}"][data-key="${key}"]`);
            if (sel) sel.value = val;
            else {
              const radio = document.querySelector(`input[type="radio"][data-ex="${ex}"][data-key="${key}"][value="${val}"]`);
              if (radio) radio.checked = true;
            }
          });
        });
      }
    } catch (e) {
      console.warn('Error cargando estado guardado:', e);
    }
  }

  function exportJSON() {
    const nameInput = document.getElementById('student-name');
    const idInput = document.getElementById('student-id');
    const emailInput = document.getElementById('student-email');

    const name = nameInput ? nameInput.value.trim() : '';
    const id = idInput ? idInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';

    if (!name) {
      alert('⚠️ Por favor completa tu Nombre y Apellido antes de exportar la entrega.');
      if (nameInput) nameInput.focus();
      return;
    }
    if (!id) {
      alert('⚠️ Por favor completa tu DNI / Legajo UCSE antes de exportar la entrega.');
      if (idInput) idInput.focus();
      return;
    }
    if (!email) {
      alert('⚠️ Por favor completa tu Correo Institucional antes de exportar la entrega.');
      if (emailInput) emailInput.focus();
      return;
    }
    if (emailInput && !emailInput.checkValidity()) {
      alert('⚠️ Ingresa un correo electrónico con formato válido.');
      emailInput.focus();
      return;
    }

    // Validar si la entrega está completa (20 teoría + 1 KB + 6 consultas = 27 consignas)
    const stats = getCompletionStats();
    const isComplete = stats.teoriaAnswered === stats.teoriaTotal &&
                       stats.queriesAnswered === stats.queriesTotal &&
                       stats.isKbComplete;

    if (!isComplete) {
      const missing = [];
      if (stats.teoriaAnswered < stats.teoriaTotal) {
        missing.push(`• Parte I (Teoría): ${stats.teoriaAnswered} de ${stats.teoriaTotal} respondidas (${stats.teoriaTotal - stats.teoriaAnswered} pendientes)`);
      }
      if (!stats.hasKbText) {
        missing.push('• Parte II (Base de Conocimientos Prolog): No se ha ingresado código en el editor');
      } else if (!stats.isKbComplete) {
        missing.push('• Parte II (Base de Conocimientos Prolog): Estructura incompleta (se requieren los 9 hechos y 2 reglas especificadas)');
      }
      if (stats.queriesAnswered < stats.queriesTotal) {
        missing.push(`• Parte II (Consultas Prácticas): ${stats.queriesAnswered} de ${stats.queriesTotal} respondidas (${stats.queriesTotal - stats.queriesAnswered} pendientes)`);
      }

      const proceed = confirm(
        '⚠️ ATENCIÓN: Entrega Incompleta (' + stats.answered + ' de ' + stats.total + ' completados)\n\n' +
        'Se detectaron consignas obligatorias sin responder:\n' +
        missing.join('\n') + '\n\n' +
        '¿Deseas confirmar la exportación y descargar el archivo JSON de todas formas?'
      );
      if (!proceed) return;
    }

    const payload = generatePayload();
    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = EXPORT_FILENAME;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function showPreview() {
    const payload = generatePayload();
    if (previewArea) previewArea.textContent = JSON.stringify(payload, null, 2);
    if (previewModal) previewModal.classList.remove('hidden');
  }

  function importJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);

        if (!data || typeof data !== 'object') {
          throw new Error('El archivo no contiene un objeto JSON válido.');
        }

        // 1. Validar metadata.tp_id
        if (!data.metadata || data.metadata.tp_id !== EXAM_ID) {
          throw new Error(`El archivo corresponde a otro examen o tiene metadata inválida (esperado: ${EXAM_ID}).`);
        }

        // 2. Validar que existan student, answers y prolog_kb
        if (!data.student || typeof data.student !== 'object') {
          throw new Error('Falta la sección "student" con los datos del alumno.');
        }
        if (!data.answers || typeof data.answers !== 'object') {
          throw new Error('Falta la sección "answers" con las respuestas del examen.');
        }
        if (!data.prolog_kb || typeof data.prolog_kb !== 'object') {
          throw new Error('Falta la sección "prolog_kb" con la base de conocimientos.');
        }

        // 3. Validar que las respuestas correspondan a ejercicios permitidos
        const answerKeys = Object.keys(data.answers);
        for (const exKey of answerKeys) {
          if (!ALLOWED_EXERCISES.has(exKey)) {
            throw new Error(`Se detectó un ejercicio no permitido en answers: "${exKey}".`);
          }
          if (typeof data.answers[exKey] !== 'object' || data.answers[exKey] === null) {
            throw new Error(`Formato inválido en las respuestas del ejercicio: "${exKey}".`);
          }
        }

        // 4. Validar prolog_kb (debe contener strings de código Prolog)
        for (const kbKey of Object.keys(data.prolog_kb)) {
          if (typeof data.prolog_kb[kbKey] !== 'string') {
            throw new Error(`El contenido de la base de conocimientos "${kbKey}" debe ser texto.`);
          }
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        loadStoredData();
        runAllLinters();
        updateProgress();
        alert('✅ Respuestas y Base de Conocimientos importadas con éxito desde ' + file.name);
      } catch (err) {
        alert('❌ Error al importar: ' + (err.message || 'El archivo no es un JSON válido.'));
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  function resetExam() {
    const confirmed = confirm(
      '⚠️ ¿Estás seguro de que deseas iniciar un nuevo examen?\n\n' +
      'Esta acción borrará todas las respuestas actuales, datos del alumno y ' +
      'reiniciará el temporizador a 90 minutos para este equipo/navegador.'
    );
    if (!confirmed) return;

    // 1. Limpiar almacenamiento local
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TIMER_STORAGE_KEY);
      localStorage.removeItem(START_TIME_KEY);
    } catch (e) {
      console.warn('Error al limpiar localStorage:', e);
    }

    // 2. Limpiar datos del alumno
    ['student-name', 'student-id', 'student-email', 'student-comision'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    // 3. Limpiar selecciones de teoría y consultas
    document.querySelectorAll('select[data-ex]').forEach(sel => {
      sel.selectedIndex = 0;
    });
    document.querySelectorAll('input[type="radio"][data-ex]').forEach(r => {
      r.checked = false;
    });

    // 4. Limpiar editores Prolog
    document.querySelectorAll('textarea[data-kb-ex]').forEach(ta => {
      ta.value = '';
    });

    // 5. Reiniciar cronómetro
    if (timerInterval) clearInterval(timerInterval);
    const newStart = new Date().toISOString();
    try {
      localStorage.setItem(START_TIME_KEY, newStart);
      localStorage.setItem(TIMER_STORAGE_KEY, DEFAULT_TIMER_SECONDS.toString());
    } catch (e) {}
    timerSeconds = DEFAULT_TIMER_SECONDS;
    initTimer();

    // 6. Actualizar verificadores y progreso
    runAllLinters();
    updateProgress();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    alert('🔄 Se ha iniciado un nuevo examen con éxito. El cronómetro y las respuestas han sido reiniciados a cero.');
  }
})();
