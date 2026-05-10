const express = require('express');
const db = require('../db');
const router = express.Router();

// Get chat messages for booking
router.get('/booking/:bookingId', async (req, res) => {
    const { bookingId } = req.params;
    
    try {
        const [messages] = await db.query(
            'SELECT * FROM chat_messages WHERE booking_id = ? ORDER BY created_at ASC',
            [bookingId]
        );
        
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Send message (HTTP fallback)
router.post('/send', async (req, res) => {
    const { booking_id, sender_type, sender_id, message } = req.body;
    
    try {
        const [result] = await db.query(
            'INSERT INTO chat_messages (booking_id, sender_type, sender_id, message) VALUES (?, ?, ?, ?)',
            [booking_id, sender_type, sender_id, message]
        );
        
        res.json({ messageId: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mark messages as read
router.put('/mark-read', async (req, res) => {
    const { bookingId, userId } = req.body;
    
    try {
        await db.query(
            `UPDATE chat_messages 
             SET is_read = TRUE 
             WHERE booking_id = ? AND sender_id != ? AND sender_type != 'system'`,
            [bookingId, userId]
        );
        
        res.json({ message: 'Messages marked as read' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get unread count
router.get('/unread/:userId', async (req, res) => {
    const { userId } = req.params;
    
    try {
        const [result] = await db.query(
            `SELECT COUNT(*) as count FROM chat_messages 
             WHERE sender_id != ? AND is_read = FALSE`,
            [userId]
        );
        
        res.json({ unreadCount: result[0].count });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;