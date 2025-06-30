import express from "express";
import { auth } from "../../Middleware/auth.js";
import { validation } from "../../Middleware/validation.js";
import {
    createMessage,
    deleteMessage,
    getAllMessages,
    getMessageById,
    getMessagesByEmail,
    updateMessageStatus
} from "./message.controller.js";
import { createMessageSchema, updateMessageSchema } from "./message.validation.js";

const router = express.Router();

// Public routes
router.post("/", validation(createMessageSchema), createMessage);

// Protected routes (admin only)
router.get("/", auth, getAllMessages);
router.get("/email/:email", auth, getMessagesByEmail);
router.get("/:id", auth, getMessageById);
router.put("/:id", auth, validation(updateMessageSchema), updateMessageStatus);
router.delete("/:id", auth, deleteMessage);

export default router;