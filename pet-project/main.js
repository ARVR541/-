import { setupEventListeners, createMatrixInput, updateUI, getMatrix, generateRandomMatrix, clearMatrix, loadExamples } from './matrix-input.js';
import { sarrus3x3, laplaceDet, findBestRowOrColumn } from './determinant.js';
import { displaySolution, showError, copySolution } from './solution-renderer.js';

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    createMatrixInput();
    updateUI();
    document.getElementById('randomBtn').addEventListener('click', generateRandomMatrix);
    document.getElementById('clearBtn').addEventListener('click', clearMatrix);
    document.getElementById('examplesBtn').addEventListener('click', loadExamples);
    document.getElementById('calculateBtn').addEventListener('click', calculateDeterminant);
    document.getElementById('copyBtn').addEventListener('click', copySolution);
});

function calculateDeterminant() {
    const calculateBtn = document.getElementById('calculateBtn');
    const originalText = calculateBtn.textContent;

    try {
        calculateBtn.innerHTML = '<span class="loading"></span> Вычисляем...';
        calculateBtn.disabled = true;

        setTimeout(() => {
            try {
                const matrix = getMatrix();
                const size = matrix.length;
                const method = document.getElementById('method').value;

                if (size > 8) {
                    throw new Error('Размер матрицы не может быть больше 8');
                }

                let result;
                let trace;

                if (method === 'sarrus' && size === 3) {
                    [result, trace] = sarrus3x3(matrix);
                } else {
                    const direction = document.getElementById('laplaceDirection').value;
                    let index = parseInt(document.getElementById('laplaceIndex').value) - 1;
                    const autoSelect = document.getElementById('autoSelect').checked;

                    if (autoSelect) {
                        index = findBestRowOrColumn(matrix, direction);
                    }

                    [result, trace] = laplaceDet(matrix, direction, index, true);
                }

                displaySolution(result, trace);

                calculateBtn.innerHTML = '✅ Готово!';
                calculateBtn.classList.add('success-animation');

                setTimeout(() => {
                    calculateBtn.textContent = originalText;
                    calculateBtn.classList.remove('success-animation');
                }, 2000);

            } catch (error) {
                showError(error.message);
                calculateBtn.textContent = originalText;
            } finally {
                calculateBtn.disabled = false;
            }
        }, 500);

    } catch (error) {
        showError(error.message);
        calculateBtn.textContent = originalText;
        calculateBtn.disabled = false;
    }
}
