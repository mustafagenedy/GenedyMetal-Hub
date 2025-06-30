import Joi from "joi";

export const createMessageSchema = Joi.object({
    name: Joi.string().min(2).max(50).required().messages({
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name cannot exceed 50 characters',
        'any.required': 'Name is required'
    }),
    phone: Joi.string().min(10).max(15).required().messages({
        'string.min': 'Phone number must be at least 10 digits',
        'string.max': 'Phone number cannot exceed 15 digits',
        'any.required': 'Phone number is required'
    }),
    email: Joi.string().email().required().messages({
        'string.email': 'Please enter a valid email address',
        'any.required': 'Email is required'
    }),
    message: Joi.string().min(1).max(500).required().messages({
        'string.min': 'Message cannot be empty',
        'string.max': 'Message cannot exceed 500 characters',
        'any.required': 'Message is required'
    })
});

export const updateMessageSchema = Joi.object({
    status: Joi.string().valid('pending', 'read', 'replied').required().messages({
        'any.only': 'Status must be pending, read, or replied',
        'any.required': 'Status is required'
    })
});