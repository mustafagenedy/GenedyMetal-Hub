import Reservation from "../../../DB/Model/reservation.model.js";

// Create new reservation
export const createReservation = async (req, res) => {
    try {
        console.log('=== RESERVATION REQUEST RECEIVED ===');
        console.log('Request body:', req.body);
        
        const {
            fullName,
            phone,
            email,
            visitType,
            preferredDate,
            preferredTime,
            address,
            notes
        } = req.body;

        console.log('Extracted data:', {
            fullName,
            phone,
            email,
            visitType,
            preferredDate,
            preferredTime,
            address,
            notes
        });

        // Create new reservation
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

        console.log('Reservation object created:', newReservation);

        await newReservation.save();
        console.log('Reservation saved to database successfully');

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
        console.error('=== RESERVATION ERROR ===');
        console.error('Create reservation error:', error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Get all reservations (for admin)
export const getAllReservations = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, search } = req.query;
        
        let query = {};
        
        // Filter by status if provided
        if (status) {
            query.status = status;
        }
        
        // Search by name or email if provided
        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const reservations = await Reservation.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
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
        console.error('Get reservations error:', error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Get reservation by ID
export const getReservationById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const reservation = await Reservation.findById(id);
        
        if (!reservation) {
            return res.status(404).json({ message: "Reservation not found" });
        }

        return res.status(200).json({ reservation });

    } catch (error) {
        console.error('Get reservation error:', error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Update reservation status (for admin)
export const updateReservationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, preferredDate, preferredTime, notes } = req.body;

        const reservation = await Reservation.findById(id);
        
        if (!reservation) {
            return res.status(404).json({ message: "Reservation not found" });
        }

        // Update fields
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
        console.error('Update reservation error:', error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Delete reservation (for admin)
export const deleteReservation = async (req, res) => {
    try {
        const { id } = req.params;
        
        const reservation = await Reservation.findByIdAndDelete(id);
        
        if (!reservation) {
            return res.status(404).json({ message: "Reservation not found" });
        }

        return res.status(200).json({ message: "Reservation deleted successfully" });

    } catch (error) {
        console.error('Delete reservation error:', error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Get reservations by email (for users to see their own reservations)
export const getReservationsByEmail = async (req, res) => {
    try {
        const { email, status } = req.query;
        const userEmail = email || req.user.email; // Use authenticated user's email if not provided
        
        let query = { email: userEmail };
        
        // Filter by status if provided
        if (status && status !== 'all') {
            query.status = status;
        }
        
        const reservations = await Reservation.find(query)
            .sort({ createdAt: -1 })
            .exec();

        return res.status(200).json({
            success: true,
            data: reservations,
            message: "Reservations retrieved successfully"
        });

    } catch (error) {
        console.error('Get reservations by email error:', error);
        return res.status(500).json({ 
            success: false,
            message: "Internal server error" 
        });
    }
}; 