type ValidatorRule = {
    pattern?: RegExp;
    optional?: boolean;
};

type ValidatorInput = {
    [key: string]: RegExp | ValidatorRule | undefined;
};

const defaultPattern = /^[a-zA-Z0-9 _@.+-]+$/;

/**
 * Validates incoming object (like req.query or req.body) against expected keys and regex patterns.
 * @param data - Incoming object (req.query, req.body)
 * @param expectedParams - Keys and their expected regex (or use default)
 * @returns boolean - true if all keys pass, false if any fail
 */
export default function validateParams(data: Record<string, unknown>, expectedParams: ValidatorInput): boolean {
    const expectedKeys = Object.keys(expectedParams);

    // Reject unexpected keys
    for (const key of Object.keys(data)) {
        if (!expectedKeys.includes(key)) return false;
    }

    for (const [key, rule] of Object.entries(expectedParams)) {
        const val = data[key];

        const isOptional = typeof rule !== 'undefined' && typeof rule !== 'function' && 'optional' in rule && rule.optional === true;
        const pattern =
        typeof rule === 'object' && !(rule instanceof RegExp)
            ? rule.pattern ?? defaultPattern
            : rule instanceof RegExp
            ? rule
            : defaultPattern;

        if (val === undefined || val === null) {
            if (isOptional) continue;
            return false;
        }

        // const validate = (s: string) => pattern.test(s);
        const validate = (s: string | number) => pattern.test(String(s));

        if (Array.isArray(val)) {
            // Check every item in the array
            if (!val.every(item => (typeof item === 'string' || typeof item === 'number') && validate(item))) return false;
        } else {
            // Check single value
            if ((typeof val !== 'string' && typeof val !== 'number') || !validate(val)) return false;
        }
    }

    return true;
}