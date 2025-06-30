import Message from "../../../DB/Model/message.model.js";

export const createMessage = async (req, res) => {
    try {
        const { name, email, phone, message } = req.body;
        
        // Check if message already exists (optional duplicate check)
        const existingMessage = await Message.findOne({ 
            email, 
            message, 
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
        });
        
        if (existingMessage) {
            return res.status(400).json({ 
                success: false,
                message: "Similar message already sent recently" 
            });
        }
        
        const newMessage = new Message({ name, email, phone, message });
        await newMessage.save();
        
        res.status(201).json({
            success: true,
            message: "Message sent successfully",
            data: newMessage
        });
    } catch (error) {
        console.error("Error creating message:", error);
        res.status(500).json({ 
            success: false,
            message: "Failed to create message",
            error: error.message 
        });
    }
};

export const getAllMessages = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
        
        const filter = {};
        if (status) filter.status = status;
        
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        const messages = await Message.find(filter)
            .sort(sort)
            .limit(limit * 1)
            .skip((page - 1) * limit);
            
        const total = await Message.countDocuments(filter);
        
        res.status(200).json({
            success: true,
            data: messages,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalMessages: total,
                hasNext: page * limit < total,
                hasPrev: page > 1
            }
        });
    } catch (error) {
        console.error("Error getting messages:", error);
        res.status(500).json({ 
            success: false,
            message: "Failed to get messages",
            error: error.message 
        });
    }
};

export const getMessageById = async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);
        
        if (!message) {
            return res.status(404).json({
                success: false,
                message: "Message not found"
            });
        }
        
        res.status(200).json({
            success: true,
            data: message
        });
    } catch (error) {
        console.error("Error getting message:", error);
        res.status(500).json({ 
            success: false,
            message: "Failed to get message",
            error: error.message 
        });
    }
};

export const updateMessageStatus = async (req, res) => {
    try {
        const { status } = req.body;
        
        const message = await Message.findByIdAndUpdate(
            req.params.id, 
            { status }, 
            { new: true, runValidators: true }
        );
        
        if (!message) {
            return res.status(404).json({
                success: false,
                message: "Message not found"
            });
        }
        
        res.status(200).json({
            success: true,
            message: "Message status updated successfully",
            data: message
        });
    } catch (error) {
        console.error("Error updating message status:", error);
        res.status(500).json({ 
            success: false,
            message: "Failed to update message status",
            error: error.message 
        });
    }
};

export const deleteMessage = async (req, res) => {
    try {
        const message = await Message.findByIdAndDelete(req.params.id);
        
        if (!message) {
            return res.status(404).json({
                success: false,
                message: "Message not found"
            });
        }
        
        res.status(200).json({
            success: true,
            message: "Message deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting message:", error);
        res.status(500).json({ 
            success: false,
            message: "Failed to delete message",
            error: error.message 
        });
    }
};

export const getMessagesByEmail = async (req, res) => {
    try {
        const { email } = req.params;
        const { page = 1, limit = 10 } = req.query;
        
        const messages = await Message.find({ email })
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);
            
        const total = await Message.countDocuments({ email });
        
        res.status(200).json({
            success: true,
            data: messages,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalMessages: total
            }
        });
    } catch (error) {
        console.error("Error getting messages by email:", error);
        res.status(500).json({ 
            success: false,
            message: "Failed to get messages by email",
            error: error.message 
        });
    }
};