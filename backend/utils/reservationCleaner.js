const { query } = require('../config/database');

// Periodically scan ORDER_RESERVATION for expired reservations and release them
const releaseExpiredReservations = async () => {
  try {
    // Find reservations that have expired and are not yet released
    const res = await query("SELECT reservation_id, order_id FROM ORDER_RESERVATION WHERE expires_at <= CURRENT_TIMESTAMP AND released = FALSE");
    if (res.rows.length === 0) return;

    for (const r of res.rows) {
      const oid = r.order_id;
      try {
        // Get order items
        const items = await query('SELECT product_id, quantity_ordered FROM ORDER_ITEMS WHERE order_id = $1', [oid]);
        for (const it of items.rows) {
          try {
            await query('UPDATE PRODUCT SET quantity_available = quantity_available + $1, updated_at = CURRENT_TIMESTAMP WHERE product_id = $2', [it.quantity_ordered, it.product_id]);
          } catch (e) {
            console.error('Failed to restore quantity for product', it.product_id, e.message || e);
          }
        }

        // Mark reservation released and cancel the order if still pending
        await query('UPDATE ORDER_RESERVATION SET released = TRUE WHERE order_id = $1', [oid]);
        await query('UPDATE "ORDER" SET status = $1, payment_status = $2 WHERE order_id = $3 AND payment_status = $4', ['cancelled', 'failed', oid, 'pending']);

        console.log('Released reservation for order', oid);
      } catch (e) {
        console.error('Error releasing reservation for order', oid, e.message || e);
      }
    }
  } catch (e) {
    console.error('Error scanning reservations:', e.message || e);
  }
};

// Start background cleaner interval (run every minute)
let intervalHandle = null;
const startReservationCleaner = (intervalMs = 60 * 1000) => {
  if (intervalHandle) return;
  intervalHandle = setInterval(() => {
    releaseExpiredReservations().catch(err => console.error('Reservation cleaner error:', err));
  }, intervalMs);
  console.log('Reservation cleaner started, running every', intervalMs, 'ms');
};

const stopReservationCleaner = () => {
  if (!intervalHandle) return;
  clearInterval(intervalHandle);
  intervalHandle = null;
};

module.exports = { startReservationCleaner, stopReservationCleaner, releaseExpiredReservations };
