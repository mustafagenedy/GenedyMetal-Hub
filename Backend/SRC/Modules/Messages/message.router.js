import express from "express";
import { adminAuth, auth } from "../../Middleware/auth.js";
import { contactLimiter } from "../../Middleware/rateLimit.js";
import { validation } from "../../Middleware/validation.js";
import {
    createMessage,
    deleteMessage,
    getAllMessages,
    getMessageById,
    getMessagesByEmail,
    getMyMessages,
    updateMessageStatus
} from "./message.controller.js";
import { createMessageSchema, updateMessageSchema } from "./message.validation.js";

const router = express.Router();

// Public — anyone can submit a contact message (rate-limited)
router.post("/", contactLimiter, validation(createMessageSchema), createMessage);

// Authenticated user — list ONLY my own messages
router.get("/mine", auth, getMyMessages);

// Admin-only routes
router.get("/",             adminAuth, getAllMessages);
router.get("/email/:email", adminAuth, getMessagesByEmail);
router.get("/:id",          adminAuth, getMessageById);
router.put("/:id",          adminAuth, validation(updateMessageSchema), updateMessageStatus);
router.delete("/:id",       adminAuth, deleteMessage);

export default router;