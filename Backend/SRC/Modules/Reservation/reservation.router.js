import express from "express";
import { adminAuth, auth } from "../../Middleware/auth.js";
import { contactLimiter } from "../../Middleware/rateLimit.js";
import { validation } from "../../Middleware/validation.js";
import {
    createReservation,
    deleteReservation,
    getAllReservations,
    getMyReservations,
    getReservationById,
    getReservationsByEmail,
    updateReservationStatus
} from "./reservation.controller.js";
import { createReservationSchema, updateReservationSchema } from "./reservation.validation.js";

const reservationRouter = express.Router();

// Public — anyone can create a reservation (rate-limited)
reservationRouter.post("/create", contactLimiter, validation(createReservationSchema), createReservation);

// Authenticated user — only my own reservations (IDOR-safe)
reservationRouter.get("/mine", auth, getMyReservations);
// Backwards-compatible alias used by the dashboard frontend
reservationRouter.get("/user", auth, getReservationsByEmail);

// Admin
reservationRouter.get("/all",   adminAuth, getAllReservations);
reservationRouter.get("/:id",   adminAuth, getReservationById);
reservationRouter.put("/:id",   adminAuth, validation(updateReservationSchema), updateReservationStatus);
reservationRouter.delete("/:id", adminAuth, deleteReservation);

export default reservationRouter;