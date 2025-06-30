import Joi from "joi";

export const signupSchema = Joi.object({
    fullName: Joi.string().min(3).max(50).required().messages({
        'string.min': 'Full name must be at least 3 characters long',
        'string.max': 'Full name cannot exceed 50 characters',
        'any.required': 'Full name is required'
    }),
    email: Joi.string().email().required().messages({
        'string.email': 'Please enter a valid email address',
        'any.required': 'Email is required'
    }),
    phone: Joi.string().min(10).max(15).required().messages({
        'string.min': 'Phone number must be at least 10 digits',
        'string.max': 'Phone number cannot exceed 15 digits',
        'any.required': 'Phone number is required'
    }),
    password: Joi.string()
        .min(8)
        .max(30)
        .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).+$"))
        .required()
        .messages({
            'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
        }),
    confirmPassword: Joi.ref("password"),
});

export const signinSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Please enter a valid email address',
        'any.required': 'Email is required'
    }),
    password: Joi.string().required().messages({
        'any.required': 'Password is required'
    }),
});