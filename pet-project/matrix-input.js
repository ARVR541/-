import { Rational } from './rational.js';

export function setupEventListeners() {
    document.getElementById('matrixSize').addEventListener('input', function() {
        createMatrixInput();
        updateUI();
    });

    document.getElementById('method').addEventListener('change', updateUI);
    document.getElementById('autoSelect').addEventListener('change', updateUI);
    document.getElementById('showSteps').addEventListener('change', updateUI);
}

export function createMatrixInput() {
    const size = parseInt(document.getElementById('matrixSize').value);
    const container = document.getElementById('matrixContainer');

    let html = '<table class="matrix-table">';
    for (let i = 0; i < size; i++) {
        html += '<tr>';
        for (let j = 0; j < size; j++) {
            html += `<td><input type="text" id="cell_${i}_${j}" value="0" placeholder="0"></td>`;
        }
        html += '</tr>';
    }
    html += '</table>';

    container.innerHTML = html;

    const inputs = container.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('paste', handlePaste);
    });
}

function handlePaste(e) {
    e.preventDefault();
    const pastedData = (e.clipboardData || window.clipboardData).getData('text');
    const rows = pastedData.trim().split('\n');
    const size = parseInt(document.getElementById('matrixSize').value);

    const matrix = [];
    for (let i = 0; i < Math.min(rows.length, size); i++) {
        const row = rows[i].trim().split(/[\s,;]+/);
        matrix[i] = [];
        for (let j = 0; j < Math.min(row.length, size); j++) {
            matrix[i][j] = row[j] || '0';
        }
    }

    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const input = document.getElementById(`cell_${i}_${j}`);
            if (matrix[i] && matrix[i][j] !== undefined) {
                input.value = matrix[i][j];
            }
        }
    }
}

export function updateUI() {
    const size = parseInt(document.getElementById('matrixSize').value);
    const methodSelect = document.getElementById('method');
    const autoSelect = document.getElementById('autoSelect').checked;

    const sarrusOption = methodSelect.options[0];
    if (size === 3) {
        sarrusOption.disabled = false;
    } else {
        sarrusOption.disabled = true;
        if (methodSelect.value === 'sarrus') {
            methodSelect.value = 'laplace';
        }
    }

    const laplaceParams = document.querySelectorAll('#laplaceDirection, #laplaceIndex');
    laplaceParams.forEach(param => {
        param.disabled = methodSelect.value === 'sarrus' || autoSelect;
    });

    document.getElementById('laplaceIndex').max = size;
    if (parseInt(document.getElementById('laplaceIndex').value) > size) {
        document.getElementById('laplaceIndex').value = size;
    }

    showWarnings(size);
}

function showWarnings(size) {
    let warnings = [];

    if (size > 6) {
        warnings.push('⚠️ Большие матрицы могут давать много шагов вычисления');
    }

    if (size > 8) {
        warnings.push('🚨 Размер больше 8 не поддерживается из-за взрывного роста сложности O(n!)');
    }

    const oldWarnings = document.querySelectorAll('.warning');
    oldWarnings.forEach(w => w.remove());

    warnings.forEach(text => {
        const warning = document.createElement('div');
        warning.className = 'warning';
        warning.textContent = text;
        document.querySelector('.matrix-input').appendChild(warning);
    });
}

export function getMatrix() {
    const size = parseInt(document.getElementById('matrixSize').value);
    const matrix = [];

    for (let i = 0; i < size; i++) {
        matrix[i] = [];
        for (let j = 0; j < size; j++) {
            const value = document.getElementById(`cell_${i}_${j}`).value.trim();
            if (value === '') {
                matrix[i][j] = new Rational(0);
            } else {
                try {
                    matrix[i][j] = new Rational(value);
                } catch (e) {
                    throw new Error(`Неверное значение в позиции (${i+1}, ${j+1}): ${value}`);
                }
            }
        }
    }

    return matrix;
}

export function generateRandomMatrix() {
    const size = parseInt(document.getElementById('matrixSize').value);

    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const value = (Math.random() - 0.5) * 10;
            document.getElementById(`cell_${i}_${j}`).value = Math.round(value * 100) / 100;
        }
    }
}

export function clearMatrix() {
    const inputs = document.querySelectorAll('#matrixContainer input');
    inputs.forEach(input => input.value = '0');
}

export function loadExamples() {
    const size = parseInt(document.getElementById('matrixSize').value);

    if (size === 3) {
        const example = [
            ['1', '2', '3'],
            ['0', '1', '4'],
            ['5', '6', '0']
        ];
        fillMatrix(example);
        document.getElementById('method').value = 'sarrus';
    } else if (size === 4) {
        const example = [
            ['1', '0', '2', '0'],
            ['0', '3', '0', '0'],
            ['4', '0', '5', '0'],
            ['0', '0', '0', '6']
        ];
        fillMatrix(example);
        document.getElementById('method').value = 'laplace';
        document.getElementById('laplaceDirection').value = 'row';
        document.getElementById('laplaceIndex').value = '1';
        document.getElementById('autoSelect').checked = true;
    } else if (size === 2) {
        const example = [
            ['0.5', '0'],
            ['0', '0.2']
        ];
        fillMatrix(example);
        document.getElementById('method').value = 'laplace';
    }

    updateUI();
}

function fillMatrix(values) {
    const size = values.length;
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            document.getElementById(`cell_${i}_${j}`).value = values[i][j];
        }
    }
}
