export const validation = (schema) => {
    return (req, res, next) => {
        console.log('=== VALIDATION CHECK ===');
        console.log('Request body:', req.body);
        
        const { error } = schema.validate(req.body, { abortEarly: false });
        
        if (error) {
            console.log('Validation error:', error.details);
            const errorMessages = error.details.map(detail => detail.message);
            return res.status(400).json({
                message: 'Validation failed',
                errors: errorMessages
            });
        } else {
            console.log('Validation passed');
            next();
        }
    }
}