import React, { useEffect, useState } from 'react';
import AdminNavbar from './AdminNavbar';
import { API_CONFIG, apiCall } from '../config/api';
import './Styling/admin.css';

const Transactions = () => {
	const [payments, setPayments] = useState([]);
	const [orders, setOrders] = useState([]);
	const [loading, setLoading] = useState(true);
	const [view, setView] = useState('both'); // 'payments' | 'orders' | 'both'
	const [page, setPage] = useState(1);
	const [limit] = useState(25);
	const [totalPayments, setTotalPayments] = useState(0);
	const [totalOrders, setTotalOrders] = useState(0);
	const [selectedOrder, setSelectedOrder] = useState(null);
	const [detailLoading, setDetailLoading] = useState(false);

	useEffect(() => {
		const load = async () => {
			setLoading(true);
			try {
				const url = `${API_CONFIG.ENDPOINTS.ADMIN.TRANSACTIONS}?type=${view}&page=${page}&limit=${limit}`;
				const res = await apiCall(url);
				if (res.payments) {
					setPayments(res.payments || []);
					if (res.payments._meta) setTotalPayments(res.payments._meta.total || 0);
				}
				if (res.orders) {
					setOrders(res.orders || []);
					if (res.orders._meta) setTotalOrders(res.orders._meta.total || 0);
				}
			} catch (err) {
				console.error('Failed to load transactions', err);
			} finally {
				setLoading(false);
			}
		};
		load();
	}, [view, page, limit]);

	return (
		<div className="admin-root">
			<AdminNavbar />
			<main className="admin-main container">
				<h2 className="page-title">Transactions</h2>

				<div style={{display:'flex',gap:12,alignItems:'center',marginBottom:12}}>
					<button className={`page-btn ${view==='both'?'active':''}`} onClick={() => { setView('both'); setPage(1); }}>Both</button>
					<button className={`page-btn ${view==='payments'?'active':''}`} onClick={() => { setView('payments'); setPage(1); }}>Payments</button>
					<button className={`page-btn ${view==='orders'?'active':''}`} onClick={() => { setView('orders'); setPage(1); }}>Orders</button>
					<div style={{flex:1}} />
					<div className="page-info">Showing {view} — Page {page}</div>
				</div>

				{loading ? (
					<div className="loading">Loading...</div>
				) : (
					<>
						<section className="recent-section">
							<h3>Payments</h3>
							<div className="table-scroll">
								<table className="admin-table">
									<thead>
										<tr>
											<th>ID</th>
											<th>Date</th>
											<th>Amount</th>
											<th>Method</th>
											<th>Status</th>
											<th>Txn Ref</th>
										</tr>
									</thead>
									<tbody>
									    {payments.map(p => (
										<tr key={p.id} className="clickable-row">
											<td>{p.id}</td>
											<td>{new Date(p.date).toLocaleString()}</td>
											<td>{p.amount}</td>
											<td>{p.method}</td>
											<td>{p.status}</td>
											<td>{p.transactionId || p.transaction_id || p.transactionReference || p.transactionReference}</td>
										</tr>
										))}
									</tbody>
								</table>
							</div>
						</section>

						<div className="pagination">
							<button className="page-btn" onClick={() => setPage(Math.max(1, page-1))}>Prev</button>
							<div className="page-info">Payments: {totalPayments} — Orders: {totalOrders}</div>
							<button className="page-btn" onClick={() => setPage(page+1)}>Next</button>
						</div>

						<section className="recent-section">
							<h3>Orders</h3>
							<div className="table-scroll">
								<table className="admin-table">
									<thead>
										<tr>
											<th>ID</th>
											<th>Date</th>
											<th>Amount</th>
											<th>Status</th>
											<th>Payment Status</th>
										</tr>
									</thead>
									<tbody>
								{orders.map(o => (
									<tr key={o.id} className="clickable-row" onClick={async () => {
										setDetailLoading(true);
										try {
											const orderRes = await apiCall(`/api/admin/orders/${o.id}`);
											setSelectedOrder(orderRes.order ? orderRes : { order: o, items: [] });
										} catch (err) {
											console.error('Failed to load order details', err);
											setSelectedOrder({ order: o, items: [] });
										} finally {
											setDetailLoading(false);
										}
									}}>
										<td>{o.id}</td>
										<td>{new Date(o.date).toLocaleString()}</td>
										<td>{o.amount}</td>
										<td>{o.status}</td>
										<td>{o.paymentStatus || o.payment_status}</td>
									</tr>
								))}
									</tbody>
								</table>
							</div>
						</section>
					</>
				)}
			</main>

				{selectedOrder && (
					<div className="modal-backdrop" onClick={() => setSelectedOrder(null)}>
						<div className="modal" onClick={(e) => e.stopPropagation()}>
							<div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
								<h3>Order #{selectedOrder.order.id}</h3>
								<button className="modal-close" onClick={() => setSelectedOrder(null)}>Close</button>
							</div>
							{detailLoading ? (
								<div className="loading">Loading...</div>
							) : (
								<div>
									<div className="row"><strong>Amount:</strong> {selectedOrder.order.amount}</div>
									<div className="row"><strong>Status:</strong> {selectedOrder.order.status}</div>
									<div className="row"><strong>Payment Status:</strong> {selectedOrder.order.paymentStatus || selectedOrder.order.payment_status}</div>
									<div className="row"><strong>Delivery Address:</strong> {selectedOrder.order.deliveryAddress || selectedOrder.order.delivery_address}</div>
									<h4>Items</h4>
									<table className="admin-table">
										<thead>
											<tr><th>Product ID</th><th>Qty</th><th>Unit Price</th><th>Subtotal</th></tr>
										</thead>
										<tbody>
											{(selectedOrder.items || []).map(it => (
												<tr key={it.id}><td>{it.productId || it.product_id}</td><td>{it.quantity}</td><td>{it.unitPrice || it.unit_price}</td><td>{it.subtotal}</td></tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</div>
					</div>
				)}
		</div>
	);
};

export default Transactions;
