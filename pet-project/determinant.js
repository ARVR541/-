import { Rational } from './rational.js';

export function sarrus3x3(matrix) {
    const trace = {
        type: 'sarrus',
        formula: 'det(A) = a₁₁·a₂₂·a₃₃ + a₁₂·a₂₃·a₃₁ + a₁₃·a₂₁·a₃₂ - (a₁₃·a₂₂·a₃₁ + a₁₁·a₂₃·a₃₂ + a₁₂·a₂₁·a₃₃)',
        positiveTerms: [],
        negativeTerms: [],
        sumPositive: null,
        sumNegative: null,
        result: null
    };

    const pos1 = matrix[0][0].mul(matrix[1][1]).mul(matrix[2][2]);
    const pos2 = matrix[0][1].mul(matrix[1][2]).mul(matrix[2][0]);
    const pos3 = matrix[0][2].mul(matrix[1][0]).mul(matrix[2][1]);

    trace.positiveTerms = [
        { formula: 'a₁₁·a₂₂·a₃₃', values: `${matrix[0][0]}·${matrix[1][1]}·${matrix[2][2]}`, result: pos1 },
        { formula: 'a₁₂·a₂₃·a₃₁', values: `${matrix[0][1]}·${matrix[1][2]}·${matrix[2][0]}`, result: pos2 },
        { formula: 'a₁₃·a₂₁·a₃₂', values: `${matrix[0][2]}·${matrix[1][0]}·${matrix[2][1]}`, result: pos3 }
    ];

    const neg1 = matrix[0][2].mul(matrix[1][1]).mul(matrix[2][0]);
    const neg2 = matrix[0][0].mul(matrix[1][2]).mul(matrix[2][1]);
    const neg3 = matrix[0][1].mul(matrix[1][0]).mul(matrix[2][2]);

    trace.negativeTerms = [
        { formula: 'a₁₃·a₂₂·a₃₁', values: `${matrix[0][2]}·${matrix[1][1]}·${matrix[2][0]}`, result: neg1 },
        { formula: 'a₁₁·a₂₃·a₃₂', values: `${matrix[0][0]}·${matrix[1][2]}·${matrix[2][1]}`, result: neg2 },
        { formula: 'a₁₂·a₂₁·a₃₃', values: `${matrix[0][1]}·${matrix[1][0]}·${matrix[2][2]}`, result: neg3 }
    ];

    trace.sumPositive = pos1.add(pos2).add(pos3);
    trace.sumNegative = neg1.add(neg2).add(neg3);
    trace.result = trace.sumPositive.sub(trace.sumNegative);

    return [trace.result, trace];
}

export function laplaceDet(matrix, direction, index, traceEnabled = true, depth = 0) {
    const size = matrix.length;

    if (size === 2) {
        return det2x2(matrix, traceEnabled, depth);
    }

    if (size === 3) {
        return sarrus3x3(matrix);
    }

    const trace = {
        type: 'laplace',
        direction,
        index,
        size,
        terms: [],
        result: new Rational(0)
    };

    let result = new Rational(0);

    for (let k = 0; k < size; k++) {
        const i = direction === 'row' ? index : k;
        const j = direction === 'col' ? index : k;
        const element = matrix[i][j];

        if (!element.isZero()) {
            const minor = getMinor(matrix, i, j);
            const [minorDet, minorTrace] = laplaceDet(minor, 'row', 0, traceEnabled, depth + 1);
            const cofactor = element.mul(minorDet);
            const sign = (i + j) % 2 === 0 ? 1 : -1;
            const termValue = new Rational(sign).mul(cofactor);

            result = result.add(termValue);

            if (traceEnabled) {
                trace.terms.push({
                    i: i + 1,
                    j: j + 1,
                    element,
                    minor,
                    minorDet,
                    cofactor,
                    sign,
                    termValue,
                    subTrace: minorTrace
                });
            }
        }
    }

    trace.result = result;
    return [result, trace];
}

function det2x2(matrix, traceEnabled = true, depth = 0) {
    const trace = {
        type: '2x2',
        formula: 'ad - bc',
        a: matrix[0][0],
        b: matrix[0][1],
        c: matrix[1][0],
        d: matrix[1][1],
        ad: matrix[0][0].mul(matrix[1][1]),
        bc: matrix[0][1].mul(matrix[1][0]),
        result: null
    };

    trace.result = trace.ad.sub(trace.bc);
    return [trace.result, trace];
}

function getMinor(matrix, row, col) {
    const size = matrix.length;
    const minor = [];
    let minorRow = 0;

    for (let i = 0; i < size; i++) {
        if (i !== row) {
            minor[minorRow] = [];
            let minorCol = 0;
            for (let j = 0; j < size; j++) {
                if (j !== col) {
                    minor[minorRow][minorCol] = matrix[i][j];
                    minorCol++;
                }
            }
            minorRow++;
        }
    }

    return minor;
}

export function findBestRowOrColumn(matrix, direction) {
    const size = matrix.length;
    let bestIndex = 0;
    let maxZeros = 0;

    for (let i = 0; i < size; i++) {
        let zeros = 0;
        for (let j = 0; j < size; j++) {
            const element = direction === 'row' ? matrix[i][j] : matrix[j][i];
            if (element.isZero()) zeros++;
        }
        if (zeros > maxZeros) {
            maxZeros = zeros;
            bestIndex = i;
        }
    }

    return bestIndex;
}
