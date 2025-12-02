import React, { useEffect, useState } from 'react';
import AdminNavbar from './AdminNavbar';
import { API_CONFIG, apiCall } from '../config/api';
import './Styling/admin.css';

// Helper function to safely format dates
const formatDate = (dateValue, options = {}) => {
	if (!dateValue) return 'N/A';
	
	try {
		const date = new Date(dateValue);
		// Check if date is valid
		if (isNaN(date.getTime())) return 'N/A';
		
		const defaultOptions = { 
			month: 'short', 
			day: 'numeric', 
			year: 'numeric',
			...options
		};
		
		return date.toLocaleDateString('en-US', defaultOptions);
	} catch (error) {
		console.error('Date formatting error:', error);
		return 'N/A';
	}
};

const formatDateTime = (dateValue) => {
	return formatDate(dateValue, {
		month: 'short', 
		day: 'numeric', 
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
};

const Transactions = () => {
	const [payments, setPayments] = useState([]);
	const [orders, setOrders] = useState([]);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState('orders'); // 'payments' | 'orders'
	const [page, setPage] = useState(1);
	const [limit] = useState(25);
	const [totalPayments, setTotalPayments] = useState(0);
	const [totalOrders, setTotalOrders] = useState(0);
	const [selectedOrder, setSelectedOrder] = useState(null);
	const [detailLoading, setDetailLoading] = useState(false);
	const [statusFilter, setStatusFilter] = useState('all');

	useEffect(() => {
		const load = async () => {
			setLoading(true);
			try {
				const url = `${API_CONFIG.ENDPOINTS.ADMIN.TRANSACTIONS}?page=${page}&limit=${limit}`;
				const res = await apiCall(url);
				if (res.payments) {
					setPayments(res.payments || []);
					setTotalPayments(res.payments.length || res.totalPayments || 0);
				}
				if (res.orders) {
					setOrders(res.orders || []);
					setTotalOrders(res.orders.length || res.totalOrders || 0);
				}
			} catch (err) {
				console.error('Failed to load transactions', err);
			} finally {
				setLoading(false);
			}
		};
		load();
	}, [page, limit]);

	const handleViewOrder = async (orderId) => {
		setDetailLoading(true);
		setSelectedOrder(null);
		try {
			// Use the transactions/:id endpoint
			const url = `${API_CONFIG.ENDPOINTS.ADMIN.TRANSACTIONS}/${orderId}`;
			const res = await apiCall(url);
			if (res.success) {
				setSelectedOrder(res);
			} else {
				console.error('Failed to load order details:', res.message);
			}
		} catch (err) {
			console.error('Failed to load order details', err);
		} finally {
			setDetailLoading(false);
		}
	};

	const filteredOrders = statusFilter === 'all' 
		? orders 
		: orders.filter(o => {
			const orderStatus = o.status?.toLowerCase();
			const paymentStatus = o.payment_status?.toLowerCase();
			return orderStatus === statusFilter || paymentStatus === statusFilter;
		});

	const filteredPayments = statusFilter === 'all' 
		? payments 
		: payments.filter(p => p.status?.toLowerCase() === statusFilter);

	return (
		<div className="admin-root">
			<AdminNavbar />
			<main className="admin-main container">
				<h2 className="page-title">
					<span>💳</span>
					Transactions
				</h2>

				{/* Stats Cards */}
				<div className="stats-grid" style={{ marginBottom: '24px' }}>
					<div className="stat-card" style={{ borderLeft: '4px solid #004a2f' }}>
						<div className="stat-content">
							<div className="stat-icon" style={{ background: '#004a2f15', color: '#004a2f' }}>
								<span>📦</span>
							</div>
							<div className="stat-info">
								<div className="stat-title">Total Orders</div>
								<div className="stat-value">{totalOrders}</div>
							</div>
						</div>
					</div>
					<div className="stat-card" style={{ borderLeft: '4px solid #ff6337' }}>
						<div className="stat-content">
							<div className="stat-icon" style={{ background: '#ff633715', color: '#ff6337' }}>
								<span>💰</span>
							</div>
							<div className="stat-info">
								<div className="stat-title">Total Payments</div>
								<div className="stat-value">{totalPayments}</div>
							</div>
						</div>
					</div>
					<div className="stat-card" style={{ borderLeft: '4px solid #ffa323' }}>
						<div className="stat-content">
							<div className="stat-icon" style={{ background: '#ffa32315', color: '#ffa323' }}>
								<span>📊</span>
							</div>
							<div className="stat-info">
								<div className="stat-title">Total Revenue</div>
								<div className="stat-value">
									KSh {payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0).toLocaleString()}
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Tab Navigation */}
				<div className="tab-navigation">
					<button 
						className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`} 
						onClick={() => setActiveTab('orders')}
					>
						<span className="tab-icon">📦</span>
						Orders
						<span className="tab-count">{filteredOrders.length}</span>
					</button>
					<button 
						className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`} 
						onClick={() => setActiveTab('payments')}
					>
						<span className="tab-icon">💳</span>
						Payments
						<span className="tab-count">{filteredPayments.length}</span>
					</button>
				</div>

				{/* Status Filter */}
				<div className="filter-buttons" style={{ marginBottom: '20px' }}>
					<button 
						className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`} 
						onClick={() => setStatusFilter('all')}
					>
						All
					</button>
					<button 
						className={`filter-btn ${statusFilter === 'pending' ? 'active' : ''}`} 
						onClick={() => setStatusFilter('pending')}
					>
						Pending
					</button>
					<button 
						className={`filter-btn ${statusFilter === 'completed' ? 'active' : ''}`} 
						onClick={() => setStatusFilter('completed')}
					>
						Completed
					</button>
					<button 
						className={`filter-btn ${statusFilter === 'paid' ? 'active' : ''}`} 
						onClick={() => setStatusFilter('paid')}
					>
						Paid
					</button>
					<button 
						className={`filter-btn ${statusFilter === 'failed' ? 'active' : ''}`} 
						onClick={() => setStatusFilter('failed')}
					>
						Failed
					</button>
				</div>

				{loading ? (
					<div className="loading">
						<span className="loading-spinner">⏳</span>
						Loading transactions...
					</div>
				) : (
					<>
						{activeTab === 'payments' && (
							<section className="transaction-section">
								<div className="table-scroll">
									{filteredPayments.length === 0 ? (
										<div className="empty-state">
											<span className="empty-icon">💳</span>
											<p>No payments found</p>
											<small>Payments will appear here once transactions are made</small>
										</div>
									) : (
										<table className="admin-table">
											<thead>
												<tr>
													<th>Payment ID</th>
													<th>Date</th>
													<th>Amount</th>
													<th>Method</th>
													<th>Status</th>
													<th>M-Pesa Ref</th>
												</tr>
											</thead>
											<tbody>
														{filteredPayments.map(p => (
															<tr key={p.id}>
																<td>
																	<span className="payment-id">#{String(p.id).padStart(4, '0')}</span>
																</td>
																<td>{formatDateTime(p.date || p.created_at)}</td>
														<td className="amount-cell">KSh {parseFloat(p.amount || 0).toLocaleString()}</td>
														<td>
															<span className="payment-method">M-Pesa</span>
														</td>
														<td>
															<span className={`status-badge status-${p.status?.toLowerCase()}`}>
																{p.status}
															</span>
														</td>
														<td className="mpesa-ref">{p.transactionId || p.transaction_id || p.transactionReference || 'N/A'}</td>
													</tr>
												))}
											</tbody>
										</table>
									)}
								</div>
							</section>
						)}

						{activeTab === 'orders' && (
							<section className="transaction-section">
								<div className="table-scroll">
									{filteredOrders.length === 0 ? (
										<div className="empty-state">
											<span className="empty-icon">📦</span>
											<p>No orders found</p>
											<small>Orders will appear here once customers make purchases</small>
										</div>
									) : (
										<table className="admin-table">
											<thead>
												<tr>
													<th>Order ID</th>
													<th>Date</th>
													<th>Amount</th>
													<th>Order Status</th>
													<th>Payment Status</th>
													<th>Actions</th>
												</tr>
											</thead>
											<tbody>
												{filteredOrders.map(o => (
													<tr key={o.id}>
														<td>
															<span className="order-id">#{String(o.id).padStart(4, '0')}</span>
														</td>
														<td>{formatDate(o.date || o.created_at)}</td>
														<td>KSh {parseFloat(o.amount || 0).toLocaleString()}</td>
														<td>
															<span className={`status-badge status-${o.status?.toLowerCase()}`}>
																{o.status || 'Pending'}
															</span>
														</td>
														<td>
															<span className={`status-badge status-${o.payment_status?.toLowerCase()}`}>
																{o.payment_status || 'Pending'}
															</span>
														</td>
														<td>
															<button 
																className="btn-view"
																onClick={() => handleViewOrder(o.id)}
															>
																View Details
															</button>
														</td>
													</tr>
												))}
											</tbody>
										</table>
									)}
								</div>
							</section>
						)}

						{/* Pagination */}
						{((activeTab === 'payments' && filteredPayments.length > 0) || 
						  (activeTab === 'orders' && filteredOrders.length > 0)) && (
							<div className="pagination">
								<button 
									className="page-btn" 
									onClick={() => setPage(Math.max(1, page - 1))}
									disabled={page === 1}
								>
									← Previous
								</button>
								<span className="page-info">
									Page <strong>{page}</strong> 
									<span className="separator">|</span>
									Showing <strong>{activeTab === 'payments' ? filteredPayments.length : filteredOrders.length}</strong> {activeTab}
								</span>
								<button 
									className="page-btn"
									onClick={() => setPage(page + 1)}
									disabled={activeTab === 'payments' ? filteredPayments.length < limit : filteredOrders.length < limit}
								>
									Next →
								</button>
							</div>
						)}
					</>
				)}
			</main>

			{selectedOrder && (
				<div className="modal-backdrop" onClick={() => setSelectedOrder(null)}>
					<div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
						<div className="modal-header">
							<h3>
								<span className="modal-icon">📦</span>
								Order Details #{selectedOrder.order.id}
							</h3>
							<button className="modal-close" onClick={() => setSelectedOrder(null)}>✕</button>
						</div>
						{detailLoading ? (
							<div className="loading">
								<span className="loading-spinner">⏳</span>
								Loading order details...
							</div>
						) : (
							<div className="modal-content">
								<div className="detail-grid">
									<div className="detail-section">
										<h4>Order Information</h4>
										<div className="detail-row">
											<span className="detail-label">Amount</span>
											<span className="detail-value">KSh {parseFloat(selectedOrder.order.amount || 0).toLocaleString()}</span>
										</div>
										<div className="detail-row">
											<span className="detail-label">Order Status</span>
											<span className={`status-badge status-${selectedOrder.order.status?.toLowerCase()}`}>
												{selectedOrder.order.status}
											</span>
										</div>
										<div className="detail-row">
											<span className="detail-label">Payment Status</span>
											<span className={`status-badge status-${(selectedOrder.order.paymentStatus || selectedOrder.order.payment_status)?.toLowerCase()}`}>
												{selectedOrder.order.paymentStatus || selectedOrder.order.payment_status}
											</span>
										</div>
									</div>
									<div className="detail-section">
										<h4>Delivery Information</h4>
										<div className="detail-row">
											<span className="detail-label">Delivery Address</span>
											<span className="detail-value">{selectedOrder.order.deliveryAddress || selectedOrder.order.delivery_address || 'N/A'}</span>
										</div>
										<div className="detail-row">
											<span className="detail-label">Order Date</span>
											<span className="detail-value">
												{formatDateTime(selectedOrder.order.date || selectedOrder.order.created_at || selectedOrder.order.createdAt)}
											</span>
										</div>
									</div>
								</div>
								
								<div className="detail-section" style={{ marginTop: '20px' }}>
									<h4>Order Items</h4>
									{(selectedOrder.items || []).length === 0 ? (
										<p className="muted">No items found for this order</p>
									) : (
										<div className="table-scroll">
											<table className="admin-table">
												<thead>
													<tr>
														<th>Product ID</th>
														<th>Quantity</th>
														<th>Unit Price</th>
														<th>Subtotal</th>
													</tr>
												</thead>
												<tbody>
													{selectedOrder.items.map(it => (
														<tr key={it.id}>
															<td>#{it.productId || it.product_id}</td>
															<td>{it.quantity}</td>
															<td>KSh {parseFloat(it.unitPrice || it.unit_price || 0).toLocaleString()}</td>
															<td className="amount-cell">KSh {parseFloat(it.subtotal || 0).toLocaleString()}</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									)}
								</div>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
};

export default Transactions;
