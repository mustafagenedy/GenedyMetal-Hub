import Reservation from "../../DB/Model/reservation.model.js";

// Escape regex metacharacters so user-supplied search strings cannot
// craft catastrophic-backtracking patterns (ReDoS).
function escapeRegex(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Create new reservation (public)
export const createReservation = async (req, res) => {
    try {
        const {
            fullName, phone, visitType,
            preferredDate, preferredTime, address, notes
        } = req.body;
        const email = String(req.body.email || "").trim().toLowerCase();

        const newReservation = new Reservation({
            fullName,
            phone,
            email,
            visitType,
            preferredDate: preferredDate ? new Date(preferredDate) : null,
            preferredTime,
            address,
            notes
        });

        await newReservation.save();

        return res.status(201).json({
            message: "Reservation created successfully",
            reservation: {
                id: newReservation._id,
                fullName: newReservation.fullName,
                email: newReservation.email,
                visitType: newReservation.visitType,
                status: newReservation.status,
                createdAt: newReservation.createdAt
            }
        });
    } catch (error) {
        console.error('[reservations] create error:', error.message);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Admin: list all reservations
export const getAllReservations = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page || "1", 10), 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 100);
        const status = req.query.status;
        const search = req.query.search;

        const query = {};
        if (status) query.status = status;
        if (search) {
            const safe = escapeRegex(search);
            query.$or = [
                { fullName: { $regex: safe, $options: 'i' } },
                { email: { $regex: safe, $options: 'i' } }
            ];
        }

        const reservations = await Reservation.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip((page - 1) * limit)
            .exec();

        const total = await Reservation.countDocuments(query);

        return res.status(200).json({
            reservations,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        console.error('[reservations] getAll error:', error.message);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Admin: get one reservation
export const getReservationById = async (req, res) => {
    try {
        const reservation = await Reservation.findById(req.params.id);
        if (!reservation) {
            return res.status(404).json({ message: "Reservation not found" });
        }
        return res.status(200).json({ reservation });
    } catch (error) {
        console.error('[reservations] getById error:', error.message);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Admin: update status
export const updateReservationStatus = async (req, res) => {
    try {
        const { status, preferredDate, preferredTime, notes } = req.body;
        const reservation = await Reservation.findById(req.params.id);

        if (!reservation) {
            return res.status(404).json({ message: "Reservation not found" });
        }

        if (status) reservation.status = status;
        if (preferredDate) reservation.preferredDate = new Date(preferredDate);
        if (preferredTime) reservation.preferredTime = preferredTime;
        if (notes !== undefined) reservation.notes = notes;

        await reservation.save();

        return res.status(200).json({
            message: "Reservation updated successfully",
            reservation
        });
    } catch (error) {
        console.error('[reservations] update error:', error.message);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Admin: delete
export const deleteReservation = async (req, res) => {
    try {
        const reservation = await Reservation.findByIdAndDelete(req.params.id);
        if (!reservation) {
            return res.status(404).json({ message: "Reservation not found" });
        }
        return res.status(200).json({ message: "Reservation deleted successfully" });
    } catch (error) {
        console.error('[reservations] delete error:', error.message);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Authenticated user: list ONLY my own reservations.
// IDOR fix: ignore any ?email= query param — always key on req.user.email.
export const getMyReservations = async (req, res) => {
    try {
        const email = String(req.user.email || "").trim().toLowerCase();
        const status = req.query.status;

        const query = { email };
        if (status && status !== 'all') query.status = status;

        const reservations = await Reservation.find(query)
            .sort({ createdAt: -1 })
            .exec();

        return res.status(200).json({
            success: true,
            data: reservations,
            message: "Reservations retrieved successfully"
        });
    } catch (error) {
        console.error('[reservations] getMine error:', error.message);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Backwards compatibility alias for the existing /reservations/user route.
// Same behavior as getMyReservations — never trusts query.email anymore.
export const getReservationsByEmail = getMyReservations;
