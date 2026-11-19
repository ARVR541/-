export class Rational {
    constructor(num, den = 1n) {
        if (typeof num === 'string') {
            const parsed = this.parseNumber(num);
            this.num = parsed.num;
            this.den = parsed.den;
        } else if (typeof num === 'number') {
            const parsed = this.parseNumber(num.toString());
            this.num = parsed.num;
            this.den = parsed.den;
        } else {
            this.num = BigInt(num);
            this.den = BigInt(den);
        }
        this.normalize();
    }
    parseNumber(str) {
        str = str.trim();
        if (str.includes('e') || str.includes('E')) {
            const [mantissa, exponent] = str.toLowerCase().split('e');
            const exp = parseInt(exponent);
            const mantissaNum = new Rational(mantissa);
            const factor = new Rational(10n ** BigInt(Math.abs(exp)));
            return exp >= 0 ? mantissaNum.mul(factor) : mantissaNum.div(factor);
        }

        if (str.includes('.')) {
            const sign = str.startsWith('-') ? -1n : 1n;
            const [intPart, fracPart] = str.replace(/^[+-]/, '').split('.');
            const denominator = 10n ** BigInt(fracPart.length);
            const numerator = sign * (BigInt(intPart || '0') * denominator + BigInt(fracPart || '0'));
            return { num: numerator, den: denominator };
        }

        return { num: BigInt(str), den: 1n };
    }

    gcd(a, b) {
        a = a < 0n ? -a : a;
        b = b < 0n ? -b : b;
        while (b !== 0n) {
            [a, b] = [b, a % b];
        }
        return a;
    }

    normalize() {
        if (this.den === 0n) throw new Error('Division by zero');

        const g = this.gcd(this.num, this.den);
        this.num /= g;
        this.den /= g;

        if (this.den < 0n) {
            this.num = -this.num;
            this.den = -this.den;
        }
    }

    add(other) {
        const num = this.num * other.den + other.num * this.den;
        const den = this.den * other.den;
        return new Rational(num, den);
    }

    sub(other) {
        const num = this.num * other.den - other.num * this.den;
        const den = this.den * other.den;
        return new Rational(num, den);
    }

    mul(other) {
        const num = this.num * other.num;
        const den = this.den * other.den;
        return new Rational(num, den);
    }

    div(other) {
        if (other.isZero()) throw new Error('Division by zero');
        const num = this.num * other.den;
        const den = this.den * other.num;
        return new Rational(num, den);
    }

    neg() {
        return new Rational(-this.num, this.den);
    }

    isZero() {
        return this.num === 0n;
    }

    toString() {
        if (this.den === 1n) {
            return this.num.toString();
        }
        return `${this.num}/${this.den}`;
    }

    toDecimal(precision = 6) {
        const sign = this.num < 0n ? -1 : 1;
        const absNum = this.num < 0n ? -this.num : this.num;

        let result = '';
        let quotient = absNum / this.den;
        let remainder = absNum % this.den;

        if (sign < 0) result += '-';
        result += quotient.toString();

        if (remainder !== 0n && precision > 0) {
            result += '.';
            for (let i = 0; i < precision; i++) {
                remainder *= 10n;
                result += (remainder / this.den).toString();
                remainder %= this.den;
                if (remainder === 0n) break;
            }
        }

        return result;
    }
}
