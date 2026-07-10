/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  isOperator, 
  evaluateExpression, 
  formatResult, 
  formatExpression,
  toggleLastNumberSign
} from './utils/calculator.js';

// State
let expression = '';
let result = '';
let error = null;
let history = [];

// Load History from localStorage
try {
  const saved = localStorage.getItem('calculator_history');
  history = saved ? JSON.parse(saved) : [];
} catch {
  history = [];
}

// DOM Elements
const displayExpression = document.getElementById('calc-display-expression');
const displayOutput = document.getElementById('calc-display-output');
const displayScrollAnchor = document.getElementById('display-scroll-anchor');

const historyDrawer = document.getElementById('history-drawer');
const historyBadge = document.getElementById('history-badge');
const historyItemsContainer = document.getElementById('history-items-container');

const shortcutsLegendCard = document.getElementById('shortcuts-legend-card');

// Buttons
const btnHistoryToggle = document.getElementById('btn-history-toggle');
const btnCloseHistory = document.getElementById('btn-close-history');
const btnClearHistory = document.getElementById('btn-clear-history');
const btnKeyboardLegend = document.getElementById('btn-keyboard-legend');

// Key definitions mapping IDs to actions
const keysMap = {
  'key-clear': handleClear,
  'key-toggle-sign': handleToggleSign,
  'key-percent': handlePercentage,
  'key-backspace': handleBackspace,
  'key-7': () => handleDigit('7'),
  'key-8': () => handleDigit('8'),
  'key-9': () => handleDigit('9'),
  'key-divide': () => handleOperator('÷'),
  'key-4': () => handleDigit('4'),
  'key-5': () => handleDigit('5'),
  'key-6': () => handleDigit('6'),
  'key-multiply': () => handleOperator('×'),
  'key-1': () => handleDigit('1'),
  'key-2': () => handleDigit('2'),
  'key-3': () => handleDigit('3'),
  'key-subtract': () => handleOperator('−'),
  'key-0': () => handleDigit('0'),
  'key-decimal': () => handleDigit('.'),
  'key-equals': handleCalculate,
  'key-add': () => handleOperator('+'),
};

// Bind button clicks
Object.entries(keysMap).forEach(([id, action]) => {
  const btn = document.getElementById(id);
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      action();
    });
  }
});

// Real-time Calculator Operations
function handleDigit(digit) {
  error = null;
  
  if (expression === '0' && digit === '0') return;

  if (expression === '0' && digit !== '.') {
    expression = digit;
    updateUI();
    return;
  }

  if (digit === '.') {
    const lastOperatorIdx = Math.max(
      expression.lastIndexOf('+'),
      expression.lastIndexOf('−'),
      expression.lastIndexOf('×'),
      expression.lastIndexOf('÷')
    );
    const activeNumber = lastOperatorIdx === -1 
      ? expression 
      : expression.substring(lastOperatorIdx + 1);

    if (activeNumber.includes('.')) return;

    if (!expression || isOperator(expression[expression.length - 1])) {
      expression += '0.';
      updateUI();
      return;
    }
  }

  expression += digit;
  updateUI();
}

function handleOperator(op) {
  error = null;
  
  if (!expression) {
    if (op === '−') {
      expression = '−';
      updateUI();
    }
    return;
  }

  const lastChar = expression[expression.length - 1];

  if (isOperator(lastChar)) {
    expression = expression.slice(0, -1) + op;
    updateUI();
    return;
  }

  if (lastChar === '.') {
    expression = expression.slice(0, -1) + op;
    updateUI();
    return;
  }

  expression += op;
  updateUI();
}

function handleClear() {
  expression = '';
  result = '';
  error = null;
  updateUI();
}

function handleBackspace() {
  error = null;
  if (!expression) return;
  expression = expression.slice(0, -1);
  updateUI();
}

function handleToggleSign() {
  error = null;
  expression = toggleLastNumberSign(expression);
  updateUI();
}

function handlePercentage() {
  error = null;
  if (!expression) return;

  const tokens = expression.split(/([+−×÷])/);
  if (tokens.length === 0) return;

  const lastToken = tokens[tokens.length - 1];
  if (!lastToken || isOperator(lastToken)) return;

  const normalizedToken = lastToken.replace(/−/g, '-');
  const num = parseFloat(normalizedToken);
  if (!isNaN(num)) {
    const percentageValue = num / 100;
    const roundedStr = formatResult(percentageValue);
    
    const lastIndex = expression.lastIndexOf(lastToken);
    if (lastIndex !== -1) {
      expression = expression.substring(0, lastIndex) + roundedStr;
    }
  }
  updateUI();
}

function handleCalculate() {
  if (!expression) return;

  try {
    const val = evaluateExpression(expression);
    const finalRes = formatResult(val);

    if (finalRes === 'Error') {
      error = 'Invalid operation';
      updateUI();
      return;
    }

    // Append to history
    const now = new Date();
    const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newHistoryItem = {
      id: Date.now().toString(),
      equation: expression,
      result: finalRes,
      timestamp,
    };

    history = [newHistoryItem, ...history].slice(0, 30);
    localStorage.setItem('calculator_history', JSON.stringify(history));

    expression = finalRes;
    result = '';
    error = null;
    
    updateUI();
    updateHistoryBadge();
  } catch (err) {
    error = err.message || 'Calculation error';
    updateUI();
  }
}

// Live Update Preview and Screen Rendering
function updateUI() {
  // Update expression text
  displayExpression.textContent = expression ? formatExpression(expression) : '0';
  
  // Real-time evaluation for display
  if (!expression || expression === '−' || expression === '-') {
    result = '';
  } else {
    try {
      const val = evaluateExpression(expression);
      result = formatResult(val);
    } catch (e) {
      // Don't show error preview during active typing
      result = '';
    }
  }

  // Update output display
  if (error) {
    displayOutput.textContent = error;
    displayOutput.className = "text-red-500 font-sans text-sm font-semibold tracking-wide transition-all duration-100";
  } else if (result) {
    displayOutput.textContent = `= ${result}`;
    displayOutput.className = "text-emerald-600 font-display text-2xl md:text-3xl font-semibold tracking-tight transition-all duration-100";
  } else {
    displayOutput.innerHTML = '&nbsp;';
    displayOutput.className = "text-zinc-300 font-display text-2xl font-light";
  }

  // Auto-scroll expression viewport
  if (displayScrollAnchor) {
    displayScrollAnchor.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'end' });
  }
}

// Toggle legend drawer
btnKeyboardLegend.addEventListener('click', (e) => {
  e.preventDefault();
  const isHidden = shortcutsLegendCard.classList.contains('hidden');
  if (isHidden) {
    shortcutsLegendCard.classList.remove('hidden');
    setTimeout(() => {
      shortcutsLegendCard.classList.remove('scale-95', 'opacity-0');
      shortcutsLegendCard.classList.add('scale-100', 'opacity-100');
    }, 10);
    btnKeyboardLegend.classList.add('bg-zinc-200', 'border-zinc-300', 'text-zinc-900');
  } else {
    shortcutsLegendCard.classList.remove('scale-100', 'opacity-100');
    shortcutsLegendCard.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
      shortcutsLegendCard.classList.add('hidden');
    }, 150);
    btnKeyboardLegend.classList.remove('bg-zinc-200', 'border-zinc-300', 'text-zinc-900');
  }
});

// Toggle history drawer
btnHistoryToggle.addEventListener('click', (e) => {
  e.preventDefault();
  toggleHistoryDrawer();
});

btnCloseHistory.addEventListener('click', (e) => {
  e.preventDefault();
  toggleHistoryDrawer(false);
});

function toggleHistoryDrawer(forceState) {
  const isCurrentlyHidden = historyDrawer.classList.contains('hidden');
  const shouldShow = forceState !== undefined ? forceState : isCurrentlyHidden;

  if (shouldShow) {
    renderHistoryItems();
    historyDrawer.classList.remove('hidden');
    setTimeout(() => {
      historyDrawer.classList.remove('-translate-y-2', 'opacity-0');
      historyDrawer.classList.add('translate-y-0', 'opacity-100');
    }, 10);
    btnHistoryToggle.classList.add('bg-zinc-200', 'border-zinc-300', 'text-zinc-900');
  } else {
    historyDrawer.classList.remove('translate-y-0', 'opacity-100');
    historyDrawer.classList.add('-translate-y-2', 'opacity-0');
    setTimeout(() => {
      historyDrawer.classList.add('hidden');
    }, 150);
    btnHistoryToggle.classList.remove('bg-zinc-200', 'border-zinc-300', 'text-zinc-900');
  }
}

// Clear History
btnClearHistory.addEventListener('click', (e) => {
  e.preventDefault();
  history = [];
  localStorage.removeItem('calculator_history');
  renderHistoryItems();
  updateHistoryBadge();
});

function updateHistoryBadge() {
  if (history.length > 0) {
    historyBadge.classList.remove('hidden');
  } else {
    historyBadge.classList.add('hidden');
  }
}

function renderHistoryItems() {
  historyItemsContainer.innerHTML = '';
  
  if (history.length === 0) {
    historyItemsContainer.innerHTML = `
      <div class="h-full flex flex-col items-center justify-center text-zinc-400 text-xs py-8">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mb-2 text-zinc-300"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <p>No recent calculations</p>
      </div>
    `;
    return;
  }

  history.forEach((item) => {
    const card = document.createElement('div');
    card.className = "p-2.5 rounded-xl bg-white border border-zinc-200/60 hover:border-zinc-300 transition-all shadow-2xs group";
    
    card.innerHTML = `
      <div class="text-right text-xs text-zinc-400 font-mono mb-1 truncate">
        ${formatExpression(item.equation)}
      </div>
      <div class="flex items-center justify-between">
        <span class="text-[10px] text-zinc-400 flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clock"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          ${item.timestamp}
        </span>
        <span class="text-right font-display font-semibold text-zinc-800 break-all">
          = ${item.result}
        </span>
      </div>
      <div class="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-100 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          data-action="restore" 
          class="flex-1 text-[10px] font-medium text-zinc-600 hover:text-zinc-900 bg-zinc-50 hover:bg-zinc-100 py-1 rounded-md text-center transition-colors border border-zinc-200/50 cursor-pointer"
        >
          Restore Equation
        </button>
        <button 
          data-action="insert" 
          class="flex-1 text-[10px] font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50/50 hover:bg-emerald-50 py-1 rounded-md text-center transition-colors border border-emerald-100 cursor-pointer"
        >
          Insert Result (${item.result})
        </button>
      </div>
    `;

    // Restores/Inserts equation and result
    const restoreBtn = card.querySelector('[data-action="restore"]');
    restoreBtn.addEventListener('click', (e) => {
      e.preventDefault();
      expression = item.equation;
      error = null;
      updateUI();
      toggleHistoryDrawer(false);
    });

    const insertBtn = card.querySelector('[data-action="insert"]');
    insertBtn.addEventListener('click', (e) => {
      e.preventDefault();
      error = null;
      if (!expression || expression === '0') {
        expression = item.result;
      } else if (isOperator(expression[expression.length - 1])) {
        expression += item.result;
      } else {
        expression = item.result;
      }
      updateUI();
      toggleHistoryDrawer(false);
    });

    historyItemsContainer.appendChild(card);
  });
}

// Map key event keys to visual DOM element button active states
const allButtons = Array.from(document.querySelectorAll('[data-key-labels]'));

function highlightButton(key, isPressed) {
  const normalizedPressed = key.toLowerCase();
  
  allButtons.forEach(btn => {
    const rawLabels = btn.getAttribute('data-key-labels');
    if (!rawLabels) return;
    
    try {
      const labels = JSON.parse(rawLabels);
      if (labels.some(l => l.toLowerCase() === normalizedPressed)) {
        if (isPressed) {
          // Toggle active classes based on button ID / type
          if (btn.id === 'key-clear') {
            btn.className = "h-12 md:h-14 rounded-2xl flex flex-col items-center justify-center font-display font-semibold text-sm transition-all border shadow-2xs bg-orange-100 border-orange-300 text-orange-700 scale-95 shadow-inner cursor-pointer";
          } else if (btn.id === 'key-equals') {
            btn.className = "h-12 md:h-14 rounded-2xl font-display font-bold text-xl transition-all border shadow-2xs bg-emerald-700 border-emerald-800 text-white scale-95 shadow-inner cursor-pointer";
          } else if (btn.id === 'key-divide' || btn.id === 'key-multiply' || btn.id === 'key-subtract' || btn.id === 'key-add') {
            btn.className = "h-12 md:h-14 rounded-2xl font-display font-bold text-xl transition-all border shadow-2xs bg-zinc-950 border-zinc-950 text-white scale-95 shadow-inner cursor-pointer";
          } else {
            // Numbers & standard operations
            btn.className = "h-12 md:h-14 rounded-2xl font-display font-semibold text-lg transition-all border shadow-2xs bg-zinc-200 border-zinc-400 text-zinc-900 scale-95 shadow-inner cursor-pointer";
          }
        } else {
          // Revert back to original classes
          if (btn.id === 'key-clear') {
            btn.className = "h-12 md:h-14 rounded-2xl flex flex-col items-center justify-center font-display font-semibold text-sm transition-all border shadow-2xs bg-orange-50/70 border-orange-100/50 text-orange-600 hover:bg-orange-100 hover:border-orange-200 cursor-pointer";
          } else if (btn.id === 'key-toggle-sign') {
            btn.className = "h-12 md:h-14 rounded-2xl flex flex-col items-center justify-center font-display font-medium text-sm transition-all border shadow-2xs bg-zinc-100/80 border-zinc-200 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-800 cursor-pointer";
          } else if (btn.id === 'key-percent') {
            btn.className = "h-12 md:h-14 rounded-2xl flex flex-col items-center justify-center font-display font-semibold text-sm transition-all border shadow-2xs bg-zinc-100/80 border-zinc-200 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-800 cursor-pointer";
          } else if (btn.id === 'key-backspace') {
            btn.className = "h-12 md:h-14 rounded-2xl flex flex-col items-center justify-center font-display font-semibold text-sm transition-all border shadow-2xs bg-zinc-100/80 border-zinc-200 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-800 cursor-pointer";
          } else if (btn.id === 'key-equals') {
            btn.className = "h-12 md:h-14 rounded-2xl font-display font-bold text-xl transition-all border shadow-2xs bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-500 cursor-pointer";
          } else if (btn.id === 'key-divide' || btn.id === 'key-multiply' || btn.id === 'key-subtract' || btn.id === 'key-add') {
            btn.className = "h-12 md:h-14 rounded-2xl font-display font-bold text-xl transition-all border shadow-2xs bg-zinc-900 border-zinc-900 text-white hover:bg-zinc-800 cursor-pointer";
          } else {
            btn.className = "h-12 md:h-14 rounded-2xl font-display font-semibold text-lg transition-all border shadow-2xs bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-50 hover:border-zinc-300 cursor-pointer";
          }
        }
      }
    } catch (e) {
      // Catch syntax errors in parsing custom attributes
    }
  });
}

// Keyboard input integration
window.addEventListener('keydown', (e) => {
  const key = e.key;

  if (['/', '*', '-', '+', 'Enter', 'Backspace', 'Escape'].includes(key)) {
    e.preventDefault();
  }

  highlightButton(key, true);

  if (key >= '0' && key <= '9') {
    handleDigit(key);
  } else if (key === '.') {
    handleDigit('.');
  } else if (key === '+') {
    handleOperator('+');
  } else if (key === '-') {
    handleOperator('−');
  } else if (key === '*') {
    handleOperator('×');
  } else if (key === '/') {
    handleOperator('÷');
  } else if (key === 'Enter' || key === '=') {
    handleCalculate();
  } else if (key === 'Backspace') {
    handleBackspace();
  } else if (key === 'Escape' || key.toLowerCase() === 'c') {
    handleClear();
  } else if (key === '%') {
    handlePercentage();
  } else if (key.toLowerCase() === 's' || key === '_') {
    handleToggleSign();
  }
});

window.addEventListener('keyup', (e) => {
  highlightButton(e.key, false);
});

// Initial load call
updateUI();
updateHistoryBadge();
