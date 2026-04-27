export const validation = (schema) => {
    return (req, res, next) => {
        // stripUnknown drops fields the schema doesn't know about (mass-assignment guard).
        const { error, value } = schema.validate(req.body, {
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
