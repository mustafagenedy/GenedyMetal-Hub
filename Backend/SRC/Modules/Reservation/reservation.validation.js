import Joi from "joi";

export const createReservationSchema = Joi.object({
    fullName: Joi.string().min(2).max(50).required().messages({
        'string.min': 'Full name must be at least 2 characters long',
        'string.max': 'Full name cannot exceed 50 characters',
        'any.required': 'Full name is required'
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
    visitType: Joi.string().valid('consultation', 'follow-up', 'emergency', 'routine', 'other').required().messages({
        'any.only': 'Please select a valid visit type',
        'any.required': 'Visit type is required'
    }),
    preferredDate: Joi.date().min('now').optional().messages({
        'date.min': 'Preferred date cannot be in the past'
    }),
    preferredTime: Joi.string().valid('morning', 'afternoon', 'evening').optional().messages({
        'any.only': 'Please select a valid time slot'
    }),
    address: Joi.string().max(200).optional().messages({
        'string.max': 'Address cannot exceed 200 characters'
    }),
    notes: Joi.string().max(500).optional().messages({
        'string.max': 'Notes cannot exceed 500 characters'
    })
});

export const updateReservationSchema = Joi.object({
    status: Joi.string().valid('pending', 'confirmed', 'cancelled', 'completed').optional().messages({
        'any.only': 'Please select a valid status'
    }),
    preferredDate: Joi.date().min('now').optional().messages({
        'date.min': 'Preferred date cannot be in the past'
    }),
    preferredTime: Joi.string().valid('morning', 'afternoon', 'evening').optional().messages({
        'any.only': 'Please select a valid time slot'
    }),
    notes: Joi.string().max(500).optional().messages({
        'string.max': 'Notes cannot exceed 500 characters'
    })
}); 