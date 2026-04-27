// HTML forms send empty optional fields as "" rather than omitting them.
// Joi treats "" as "value present but empty" and rejects optional strings
// with "X is not allowed to be empty". Coerce empty strings to undefined
// so optional fields behave intuitively without needing .allow('') everywhere.
function coerceEmptyToUndefined(body) {
    if (!body || typeof body !== 'object') return body;
    const out = {};
    for (const [k, v] of Object.entries(body)) {
        out[k] = (typeof v === 'string' && v.trim() === '') ? undefined : v;
    }
    return out;
}

export const validation = (schema) => {
    return (req, res, next) => {
        const cleaned = coerceEmptyToUndefined(req.body);

        // stripUnknown drops fields the schema doesn't know about (mass-assignment guard).
        const { error, value } = schema.validate(cleaned, {
            abortEarly: false,
            stripUnknown: true,
            convert: true,
        });

        if (error) {
            const errors = error.details.map(d => d.message);
            return res.status(400).json({
                message: 'Validation failed',
                errors
            });
        }

        // Replace req.body with the sanitized value so downstream
        // controllers can't see anything outside the schema.
        req.body = value;
        next();
    };
};
