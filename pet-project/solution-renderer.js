import { getMatrix } from './matrix-input.js';

let solutionText = '';

function renderMatrix(matrix) {
    const size = matrix.length;
    let matrixStr = '\\begin{pmatrix}\n';

    for (let i = 0; i < size; i++) {
        matrixStr += '  ';
        for (let j = 0; j < size; j++) {
            matrixStr += matrix[i][j].toString();
            if (j < size - 1) matrixStr += ' & ';
        }
        if (i < size - 1) matrixStr += ' \\\\';
        matrixStr += '\n';
    }
    matrixStr += '\\end{pmatrix}';

    return `
        <div class="step">
            <h4>📋 Исходная матрица</h4>
            <div class="formula-box">
                <div class="math">$$A = ${matrixStr}$$</div>
            </div>
        </div>
    `;
}

function renderMinorMatrix(minor) {
    if (!minor || minor.length === 0) return '\\emptyset';

    const size = minor.length;
    let matrixStr = '\\begin{pmatrix}\n';

    for (let i = 0; i < size; i++) {
        matrixStr += '  ';
        for (let j = 0; j < size; j++) {
            matrixStr += minor[i][j].toString();
            if (j < size - 1) matrixStr += ' & ';
        }
        if (i < size - 1) matrixStr += ' \\\\';
        matrixStr += '\n';
    }
    matrixStr += '\\end{pmatrix}';

    return matrixStr;
}

export function displaySolution(result, trace) {
    const solutionDiv = document.getElementById('solution');
    const contentDiv = document.getElementById('solutionContent');
    const showSteps = document.getElementById('showSteps').checked;
    const precision = parseInt(document.getElementById('precision').value);

    let html = '';
    solutionText = '';

    try {
        const matrix = getMatrix();
        html += renderMatrix(matrix);
    } catch (e) {
    }

    if (showSteps) {
        html += renderTrace(trace, 0);
    }

    html += `
        <div class="answer">
            <h3>🎯 Ответ</h3>
            <div class="math-display">
                <div class="math">
                    $$\\det(A) = ${result.toString()}$$
                </div>
            </div>
            <div class="exact">Точно: ${result.toString()}</div>
            <div class="approximate">Приблизительно: ${result.toDecimal(precision)}</div>
        </div>
    `;

    contentDiv.innerHTML = html;
    solutionDiv.style.display = 'block';

    solutionText = `Детерминант матрицы:\n\n`;
    if (showSteps) {
        solutionText += renderTraceText(trace, 0);
    }
    solutionText += `\nОтвет (точно): ${result.toString()}\n`;
    solutionText += `Ответ (приблизительно): ${result.toDecimal(precision)}`;

    document.getElementById('copyBtn').disabled = false;

    if (window.MathJax) {
        MathJax.typesetPromise([contentDiv]);
    }
}

function renderTrace(trace, depth) {
    let html = '';
    const indent = '  '.repeat(depth);

    if (trace.type === 'sarrus') {
        html += `
            <div class="step">
                <h4>🔺 Метод Саррюса (3×3)</h4>
                <div class="formula-box">
                    <div class="math">$$\\det(A) = a_{11}a_{22}a_{33} + a_{12}a_{23}a_{31} + a_{13}a_{21}a_{32} - (a_{13}a_{22}a_{31} + a_{11}a_{23}a_{32} + a_{12}a_{21}a_{33})$$</div>
                </div>

                <h5>✅ Положительные слагаемые:</h5>
                <div style="display: flex; flex-wrap: wrap; gap: 10px; margin: 15px 0;">
                    ${trace.positiveTerms.map((term, i) => `
                        <div class="term-box positive">
                            <div style="font-weight: 600; margin-bottom: 8px;">${i + 1}. ${term.formula}</div>
                            <div style="font-family: monospace; font-size: 0.9em; color: #666;">
                                ${term.values} = <strong>${term.result}</strong>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <h5>❌ Отрицательные слагаемые:</h5>
                <div style="display: flex; flex-wrap: wrap; gap: 10px; margin: 15px 0;">
                    ${trace.negativeTerms.map((term, i) => `
                        <div class="term-box negative">
                            <div style="font-weight: 600; margin-bottom: 8px;">${i + 1}. ${term.formula}</div>
                            <div style="font-family: monospace; font-size: 0.9em; color: #666;">
                                ${term.values} = <strong>${term.result}</strong>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="formula-box">
                    <div class="math">
                        $$S_+ = ${trace.sumPositive}$$<br>
                        $$S_- = ${trace.sumNegative}$$<br>
                        $$\\det = S_+ - S_- = ${trace.sumPositive} - ${trace.sumNegative} = \\boxed{${trace.result}}$$
                    </div>
                </div>
            </div>
        `;
    } else if (trace.type === '2x2') {
        html += `
            <div class="step">
                <h4>📐 Детерминант 2×2</h4>
                <div class="formula-box">
                    <div class="math">$$\\det\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} = ad - bc$$</div>
                </div>
                <div class="step-content">
                    <strong>Подстановка значений:</strong>
                    a = ${trace.a}, b = ${trace.b}, c = ${trace.c}, d = ${trace.d}

                    <strong>Вычисления:</strong>
                    ad = ${trace.a} × ${trace.d} = ${trace.ad}
                    bc = ${trace.b} × ${trace.c} = ${trace.bc}

                    <strong>Результат:</strong>
                    det = ad - bc = ${trace.ad} - ${trace.bc} = ${trace.result}
                </div>
            </div>
        `;
    } else if (trace.type === 'laplace') {
        const directionText = trace.direction === 'row' ? 'строке' : 'столбцу';
        const directionSymbol = trace.direction === 'row' ? 'i' : 'j';
        const sumIndex = trace.direction === 'row' ? 'k' : 'k';
        const elementIndex = trace.direction === 'row' ? 'i,k' : 'k,j';
        const minorIndex = trace.direction === 'row' ? 'i,k' : 'k,j';

        html += `
            <div class="step">
                <h4>🔍 Разложение по ${directionText} ${trace.index + 1}</h4>
                <div class="formula-box">
                    <div class="math">
                        $$\\det(A) = \\sum_{${sumIndex}=1}^{${trace.size}} (-1)^{${directionSymbol}+${sumIndex}} \\cdot a_{${elementIndex}} \\cdot M_{${minorIndex}}$$
                    </div>
                </div>
        `;

        trace.terms.forEach((term, i) => {
            const sign = term.sign > 0 ? '+' : '-';
            const power = (trace.index + i) % 2 === 0 ? 'i+k' : 'i+k';
            const signColor = term.sign > 0 ? '#27ae60' : '#e74c3c';

            const minorStr = renderMinorMatrix(term.minor);

            html += `
                <div class="trace-node">
                    <h5>📊 Слагаемое ${i + 1}: $a_{${term.i},${term.j}} = ${term.element}$</h5>
                    <div class="formula-box">
                        <div class="math">
                            $$\\text{Знак: } ${sign}(-1)^{${power}} = ${sign}$$<br>
                            $$\\text{Элемент: } a_{${term.i},${term.j}} = ${term.element}$$<br>
                            $$\\text{Минор: } M_{${term.i},${term.j}} = ${minorStr}$$<br>
                            $$\\text{Кофактор: } C_{${term.i},${term.j}} = ${term.cofactor}$$<br>
                            $$\\text{Вклад: } ${term.termValue}$$
                        </div>
                    </div>
                    ${renderTrace(term.subTrace, depth + 1)}
                </div>
            `;
        });

        html += `
                <div class="formula-box">
                    <div class="math">
                        $$\\text{Итого: } \\boxed{${trace.result}}$$
                    </div>
                </div>
            </div>
        `;
    }

    return html;
}

function renderTraceText(trace, depth) {
    let text = '';
    const indent = '  '.repeat(depth);

    if (trace.type === 'sarrus') {
        text += `${indent}Метод Саррюса (3×3)\n`;
        text += `${indent}${trace.formula}\n\n`;

        text += `${indent}Положительные слагаемые:\n`;
        trace.positiveTerms.forEach((term, i) => {
            text += `${indent}  ${i + 1}. ${term.formula} = ${term.values} = ${term.result}\n`;
        });

        text += `\n${indent}Отрицательные слагаемые:\n`;
        trace.negativeTerms.forEach((term, i) => {
            text += `${indent}  ${i + 1}. ${term.formula} = ${term.values} = ${term.result}\n`;
        });

        text += `\n${indent}S₊ = ${trace.sumPositive}\n`;
        text += `${indent}S₋ = ${trace.sumNegative}\n`;
        text += `${indent}det = S₊ - S₋ = ${trace.result}\n\n`;
    } else if (trace.type === '2x2') {
        text += `${indent}Детерминант 2×2\n`;
        text += `${indent}Формула: ${trace.formula}\n`;
        text += `${indent}a = ${trace.a}, b = ${trace.b}, c = ${trace.c}, d = ${trace.d}\n`;
        text += `${indent}ad = ${trace.a} × ${trace.d} = ${trace.ad}\n`;
        text += `${indent}bc = ${trace.b} × ${trace.c} = ${trace.bc}\n`;
        text += `${indent}det = ad - bc = ${trace.ad} - ${trace.bc} = ${trace.result}\n\n`;
    } else if (trace.type === 'laplace') {
        const directionText = trace.direction === 'row' ? 'строке' : 'столбцу';
        text += `${indent}Разложение по ${directionText} ${trace.index + 1}\n`;
        text += `${indent}Формула: det(A) = ∑ₖ (-1)^(i+k) × a_{i,k} × M_{i,k}\n\n`;

        trace.terms.forEach((term, i) => {
            const sign = term.sign > 0 ? '+' : '-';
            text += `${indent}  Слагаемое ${i + 1}: a_{${term.i},${term.j}} = ${term.element}\n`;
            text += `${indent}    Знак: ${sign}, Кофактор: ${term.cofactor}, Вклад: ${term.termValue}\n`;
            text += renderTraceText(term.subTrace, depth + 2);
        });

        text += `${indent}Итого: ${trace.result}\n\n`;
    }

    return text;
}

export function showError(message) {
    const solutionDiv = document.getElementById('solution');
    const contentDiv = document.getElementById('solutionContent');

    contentDiv.innerHTML = `<div class="error">Ошибка: ${message}</div>`;
    solutionDiv.style.display = 'block';
    document.getElementById('copyBtn').disabled = true;
}

export function copySolution() {
    if (solutionText) {
        navigator.clipboard.writeText(solutionText).then(() => {
            const btn = document.getElementById('copyBtn');
            const originalText = btn.textContent;
            const originalBg = btn.style.background;

            btn.innerHTML = '📋 Скопировано!';
            btn.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
            btn.classList.add('success-animation');

            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = originalBg;
                btn.classList.remove('success-animation');
            }, 2000);
        }).catch(err => {
            console.error('Ошибка копирования:', err);
            const btn = document.getElementById('copyBtn');
            btn.textContent = '❌ Ошибка';
            btn.style.background = '#e74c3c';
            setTimeout(() => {
                btn.textContent = 'Копировать решение';
                btn.style.background = '';
            }, 2000);
        });
    }
}
