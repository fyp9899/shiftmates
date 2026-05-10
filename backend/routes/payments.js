const express = require('express');
const db = require('../db');
const router = express.Router();

// Create payment record
router.post('/create', async (req, res) => {
    const { booking_id, user_id, amount, payment_method, stripe_payment_intent_id } = req.body;
    
    try {
        const [result] = await db.query(
            `INSERT INTO payments (booking_id, user_id, amount, payment_method, stripe_payment_intent_id, payment_status) 
             VALUES (?, ?, ?, ?, ?, 'pending')`,
            [booking_id, user_id, amount, payment_method, stripe_payment_intent_id]
        );
        
        res.json({ paymentId: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update payment status
router.put('/update-status', async (req, res) => {
    const { payment_intent, status, transaction_id } = req.body;
    
    try {
        await db.query(
            `UPDATE payments 
             SET payment_status = ?, transaction_id = ?, paid_at = NOW() 
             WHERE stripe_payment_intent_id = ?`,
            [status, transaction_id, payment_intent]
        );
        
        // Update booking status if payment completed
        if (status === 'completed') {
            const [payment] = await db.query('SELECT booking_id FROM payments WHERE stripe_payment_intent_id = ?', [payment_intent]);
            if (payment.length > 0) {
                await db.query('UPDATE bookings SET status = "confirmed" WHERE id = ?', [payment[0].booking_id]);
            }
        }
        
        res.json({ message: 'Payment status updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get user payment history
router.get('/user/:userId', async (req, res) => {
    const { userId } = req.params;
    
    try {
        const [payments] = await db.query(
            `SELECT p.*, b.relocation_type, b.booking_date 
             FROM payments p 
             JOIN bookings b ON p.booking_id = b.id 
             WHERE p.user_id = ? 
             ORDER BY p.created_at DESC`,
            [userId]
        );
        
        res.json(payments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get payment by booking
router.get('/booking/:bookingId', async (req, res) => {
    const { bookingId } = req.params;
    
    try {
        const [payments] = await db.query(
            'SELECT * FROM payments WHERE booking_id = ? ORDER BY created_at DESC',
            [bookingId]
        );
        
        res.json(payments[0] || null);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;