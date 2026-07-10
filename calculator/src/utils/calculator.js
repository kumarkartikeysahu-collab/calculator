/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Checks if a character is one of our recognized operators.
 */
export function isOperator(char) {
  return char === '+' || char === '−' || char === '×' || char === '÷';
}

/**
 * Normalizes input characters from the keyboard into calculator symbols.
 */
export function normalizeChar(char) {
  if (char === '*') return '×';
  if (char === '/') return '÷';
  if (char === '-') return '−';
  return char;
}

/**
 * Tokenizes a calculator expression string.
 * Supports decimal numbers, negative numbers (like "-5" or "(-5)"), and operators.
 */
export function tokenize(expr) {
  const tokens = [];
  let currentNum = '';

  for (let i = 0; i < expr.length; i++) {
    const char = expr[i];

    // Handle spaces
    if (char === ' ') {
      if (currentNum) {
        tokens.push(currentNum);
        currentNum = '';
      }
      continue;
    }

    // Handle parentheses for negative numbers (e.g. "(-5.5)")
    if (char === '(') {
      const closingIdx = expr.indexOf(')', i);
      if (closingIdx !== -1) {
        const sub = expr.substring(i + 1, closingIdx);
        // Check if sub looks like a negative number (e.g. "-5.5" or "−5.5")
        const normalizedSub = sub.replace(/−/g, '-').trim();
        if (!isNaN(Number(normalizedSub)) && normalizedSub !== '') {
          tokens.push(normalizedSub);
          i = closingIdx;
          continue;
        }
      }
    }

    // Handle unary minus: if the char is '-' or '−' and it acts as negative sign
    if (char === '−' || char === '-') {
      const lastToken = tokens[tokens.length - 1];
      const isUnary = tokens.length === 0 || isOperator(lastToken) || lastToken === '(';
      if (isUnary) {
        currentNum += '-';
        continue;
      }
    }

    if (isOperator(char)) {
      if (currentNum) {
        tokens.push(currentNum);
        currentNum = '';
      }
      tokens.push(char);
    } else {
      currentNum += char;
    }
  }

  if (currentNum) {
    tokens.push(currentNum);
  }

  return tokens;
}

/**
 * Evaluates an infix expression using the Shunting-yard algorithm
 * followed by reverse Polish notation (RPN) evaluation.
 */
export function evaluateExpression(expr) {
  const tokens = tokenize(expr);
  if (tokens.length === 0) return 0;

  // If the expression ends with an operator, evaluate the prefix part
  let validTokens = [...tokens];
  while (validTokens.length > 0 && isOperator(validTokens[validTokens.length - 1])) {
    validTokens.pop();
  }

  if (validTokens.length === 0) return 0;

  // Precedence map
  const precedence = {
    '+': 1,
    '−': 1,
    '×': 2,
    '÷': 2,
  };

  const outputQueue = [];
  const operatorStack = [];

  for (const token of validTokens) {
    if (!isOperator(token)) {
      // It's a number
      outputQueue.push(token);
    } else {
      // It's an operator
      while (
        operatorStack.length > 0 &&
        isOperator(operatorStack[operatorStack.length - 1]) &&
        precedence[operatorStack[operatorStack.length - 1]] >= precedence[token]
      ) {
        outputQueue.push(operatorStack.pop());
      }
      operatorStack.push(token);
    }
  }

  while (operatorStack.length > 0) {
    outputQueue.push(operatorStack.pop());
  }

  // Evaluate RPN
  const stack = [];
  for (const token of outputQueue) {
    if (!isOperator(token)) {
      const val = parseFloat(token.replace(/−/g, '-'));
      if (isNaN(val)) {
        throw new Error('Invalid number');
      }
      stack.push(val);
    } else {
      if (stack.length < 2) {
        throw new Error('Invalid syntax');
      }
      const b = stack.pop();
      const a = stack.pop();

      let res = 0;
      switch (token) {
        case '+':
          res = a + b;
          break;
        case '−':
          res = a - b;
          break;
        case '×':
          res = a * b;
          break;
        case '÷':
          if (b === 0) {
            throw new Error('Cannot divide by zero');
          }
          res = a / b;
          break;
        default:
          throw new Error('Unknown operator');
      }
      stack.push(res);
    }
  }

  if (stack.length !== 1) {
    throw new Error('Invalid syntax');
  }

  return stack[0];
}

/**
 * Format helper for numbers (limiting decimals gracefully and adding separators).
 */
export function formatResult(value) {
  if (!isFinite(value)) return 'Error';
  
  // Handle decimal precision
  const valueStr = value.toString();
  if (valueStr.includes('.')) {
    const [intPart, decPart] = valueStr.split('.');
    if (decPart.length > 8) {
      // Round to 8 decimal places if long
      const rounded = Math.round(value * 1e8) / 1e8;
      return rounded.toString();
    }
  }
  return valueStr;
}

/**
 * Formats the raw expression string for pleasant visual display on screen
 * by inserting proper spaces around operators.
 */
export function formatExpression(expr) {
  let formatted = '';
  for (let i = 0; i < expr.length; i++) {
    const char = expr[i];
    if (isOperator(char)) {
      formatted += ` ${char} `;
    } else {
      formatted += char;
    }
  }
  // Replace double spaces with single spaces
  return formatted.replace(/\s+/g, ' ');
}

/**
 * Toggles the sign of the last number in the expression.
 * If the expression is empty or ends with an operator, it starts a negative number.
 * If the expression ends with a number, it negates it.
 */
export function toggleLastNumberSign(expr) {
  if (!expr) return '−';
  
  const tokens = tokenize(expr);
  if (tokens.length === 0) return '−';
  
  const lastToken = tokens[tokens.length - 1];
  
  if (isOperator(lastToken)) {
    // If the last character was a minus sign, toggle it off by removing it
    if (expr.endsWith('−') || expr.endsWith('-')) {
      return expr.slice(0, -1);
    }
    return expr + '−';
  } else {
    // It's a number token (like "5.5" or "-5.5")
    let newLastToken = '';
    // Note: parsed tokens normalize '−' to '-' internally for numbers
    if (lastToken.startsWith('-')) {
      newLastToken = lastToken.slice(1);
    } else {
      newLastToken = '−' + lastToken;
    }
    
    // Replace only the last occurrence of the lastToken in the expression to avoid replacing duplicates elsewhere
    const rawLastToken = lastToken.startsWith('-') ? '−' + lastToken.slice(1) : lastToken;
    let lastOccurrenceIdx = expr.lastIndexOf(rawLastToken);
    
    // Fallback if the token used standard hyphen '-' in the raw expression
    if (lastOccurrenceIdx === -1 && lastToken.startsWith('-')) {
      lastOccurrenceIdx = expr.lastIndexOf('-' + lastToken.slice(1));
    }
    
    if (lastOccurrenceIdx !== -1) {
      return (
        expr.substring(0, lastOccurrenceIdx) +
        newLastToken +
        expr.substring(lastOccurrenceIdx + rawLastToken.length)
      );
    }
  }
  return expr;
}
