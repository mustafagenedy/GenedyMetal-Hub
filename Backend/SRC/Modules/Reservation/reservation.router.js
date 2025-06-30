import express from "express";
import { adminAuth, auth } from "../../Middleware/auth.js";
import { validation } from "../../Middleware/validation.js";
import {
    createReservation,
    deleteReservation,
    getAllReservations,
    getReservationById,
    getReservationsByEmail,
    updateReservationStatus
} from "./reservation.controller.js";
import { createReservationSchema, updateReservationSchema } from "./reservation.validation.js";

const reservationRouter = express.Router();

// Public routes (no authentication required)
reservationRouter.post("/create", validation(createReservationSchema), createReservation);

// User routes (protected with user authentication)
reservationRouter.get("/user", auth, getReservationsByEmail);

// Admin routes (protected with admin authentication)
reservationRouter.get("/all", adminAuth, getAllReservations);
reservationRouter.get("/:id", adminAuth, getReservationById);
reservationRouter.put("/:id", adminAuth, validation(updateReservationSchema), updateReservationStatus);
reservationRouter.delete("/:id", adminAuth, deleteReservation);

export default reservationRouter;