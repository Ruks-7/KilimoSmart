import AdminNavbar from './AdminNavbar';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_CONFIG, apiCall } from '../config/api';
import './Styling/admin.css';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	ArcElement,
	Title,
	Tooltip,
	Legend
);

const StatCard = ({ title, value, icon, accent }) => (
	<div className="stat-card" style={{ borderLeft: `4px solid ${accent}` }}>
		<div className="stat-content">
			<div className="stat-icon" style={{ background: `${accent}15`, color: accent }}>{icon}</div>
			<div className="stat-info">
				<div className="stat-title">{title}</div>
				<div className="stat-value">{value}</div>
			</div>
		</div>
	</div>
);

const Dashboard = () => {
	const [stats, setStats] = useState(null);
	const [transactions, setTransactions] = useState({ payments: [], orders: [] });
	const [salesData, setSalesData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [unauthorized, setUnauthorized] = useState(false);
	const [notificationMessage, setNotificationMessage] = useState('');
	const [notificationType, setNotificationType] = useState('success');
	const [showNotification, setShowNotification] = useState(false);
	const navigate = useNavigate();

	// Computed analytics data
	const [orderStatusDistribution, setOrderStatusDistribution] = useState({ pending: 0, completed: 0, cancelled: 0 });

	useEffect(() => {

			// Token expiry check
			const checkTokenExpiry = () => {
				const token = localStorage.getItem('authToken');
				if (!token) return false;
				try {
					const payload = JSON.parse(atob(token.split('.')[1]));
					if (payload.exp && Date.now() / 1000 > payload.exp) {
						return true;
					}
				} catch (e) {}
				return false;
			};

			if (checkTokenExpiry()) {
				localStorage.removeItem('authToken');
				localStorage.removeItem('user');
				navigate('/admin/login');
				return;
			}

			const load = async () => {
				try {
					const s = await apiCall(API_CONFIG.ENDPOINTS.ADMIN.STATS);
					setStats(s.stats || s);
				} catch (err) {
					console.error('Failed to load stats', err);
					if (err && (err.status === 401 || err.status === 403)) {
						setUnauthorized(true);
						setError('Admin access required. Please sign in.');
						setLoading(false);
						return;
					}
					setError(err.message || 'Failed to load stats');
				}

				try {
					const t = await apiCall(API_CONFIG.ENDPOINTS.ADMIN.TRANSACTIONS);
					const orders = t.orders || [];
					const payments = t.payments || [];
					setTransactions({ payments, orders });

					// Calculate order status distribution
					const statusCount = { pending: 0, completed: 0, cancelled: 0 };
					orders.forEach(order => {
						const status = order.status?.toLowerCase();
						if (status === 'pending') statusCount.pending++;
						else if (status === 'completed') statusCount.completed++;
						else if (status === 'cancelled') statusCount.cancelled++;
				});
				setOrderStatusDistribution(statusCount);
			} catch (err) {
				console.error('Failed to load transactions', err);
					if (err && (err.status === 401 || err.status === 403)) {
						setUnauthorized(true);
						setError('Admin access required. Please sign in.');
						setLoading(false);
						return;
					}
					setError(prev => prev || (err.message || 'Failed to load transactions'));
				}

				try {
					const sales = await apiCall(API_CONFIG.ENDPOINTS.ADMIN.SALES_OVER_TIME);
					setSalesData(sales.data || []);
				} catch (err) {
					console.error('Failed to load sales data', err);
					if (err && (err.status === 401 || err.status === 403)) {
						setUnauthorized(true);
						setError('Admin access required. Please sign in.');
						setLoading(false);
						return;
					}
					setError(prev => prev || (err.message || 'Failed to load sales data'));
				}

				setLoading(false);
			};

			load();
		}, [navigate]);

	const showToast = (msg, type = 'success') => {
		setNotificationMessage(msg);
		setNotificationType(type);
		setShowNotification(true);
		setTimeout(() => setShowNotification(false), 3500);
	}

	return (
		<div>
			<AdminNavbar />
			<main className="admin-main container">
				<h2 className="page-title">Admin Dashboard</h2>

				{/* Error banner */}
				{error && (
					<div className="table-scroll" style={{ background: '#fff6f6', border: '1px solid #f5c2c2', marginBottom: 16 }}>
						<strong style={{ color: '#b92b27' }}>{unauthorized ? 'Unauthorized:' : 'Error:'}</strong>
						<span style={{ marginLeft: 8 }}>{error}</span>
						<div style={{ marginTop: 8 }}>
							{unauthorized ? (
								<>
									<a className="btn-primary" href="/login" style={{ textDecoration: 'none' }}>Sign in</a>
									<button className="action-btn" style={{ marginLeft: 8 }} onClick={() => { setError(null); setUnauthorized(false); }}>Dismiss</button>
								</>
							) : (
								<>
									<button className="action-btn" onClick={() => { setError(null); }}>Dismiss</button>
									<button className="btn-primary" style={{ marginLeft: 8 }} onClick={() => window.location.reload()}>Retry</button>
								</>
							)}
						</div>
					</div>
				)}

				{loading ? (
					<div className="loading">Loading...</div>
				) : (
					<>
						{/* Stats Cards Grid */}
						<section className="stats-grid">
							<StatCard 
								title="Total Users" 
								value={stats?.totalUsers || 0} 
								icon={<span>👥</span>} 
								accent="#004a2f" 
							/>
							<StatCard 
								title="Total Products" 
								value={stats?.totalProducts || 0} 
								icon={<span>🛒</span>} 
								accent="#ff6337" 
							/>
							<StatCard 
								title="Total Orders" 
								value={stats?.totalOrders || 0} 
								icon={<span>📦</span>} 
								accent="#ffa323" 
							/>
							<StatCard 
								title="Total Revenue" 
								value={stats?.totalRevenue ? `KSh ${stats.totalRevenue.toLocaleString()}` : 'KSh 0'} 
								icon={<span>💰</span>} 
								accent="#228b22" 
							/>
						</section>

						{/* Charts Grid - Two Column Layout */}
						<div className="dashboard-charts-grid">
							{/* Order Status Distribution Chart */}
							<section className="chart-section">
								<h3 className="section-title">
									<span className="title-icon">📊</span>
									Order Status Overview
								</h3>
								<div className="chart-container chart-medium">
									{(orderStatusDistribution.pending + orderStatusDistribution.completed + orderStatusDistribution.cancelled) > 0 ? (
										<Doughnut
											data={{
												labels: ['Pending', 'Completed', 'Cancelled'],
												datasets: [{
													data: [
														orderStatusDistribution.pending,
														orderStatusDistribution.completed,
														orderStatusDistribution.cancelled
													],
													backgroundColor: ['#ffa323', '#004a2f', '#ff6337'],
													borderColor: ['#fff', '#fff', '#fff'],
													borderWidth: 3,
													hoverOffset: 8
												}]
											}}
											options={{
												responsive: true,
												maintainAspectRatio: false,
												plugins: {
													legend: {
														position: 'bottom',
														labels: {
															font: { size: 13, weight: '600' },
															color: '#333',
															padding: 15,
															usePointStyle: true
														}
													},
													tooltip: {
														backgroundColor: 'rgba(0, 0, 0, 0.8)',
														padding: 12,
														titleFont: { size: 14, weight: '600' },
														bodyFont: { size: 13 },
														cornerRadius: 8,
														callbacks: {
															label: (context) => {
																const label = context.label || '';
																const value = context.parsed || 0;
																const total = context.dataset.data.reduce((a, b) => a + b, 0);
																const percentage = ((value / total) * 100).toFixed(1);
																return `${label}: ${value} (${percentage}%)`;
															}
														}
													}
												}
											}}
										/>
									) : (
										<div className="no-data">
											<span className="no-data-icon">📊</span>
											<p>No order data</p>
										</div>
									)}
								</div>
							</section>

							{/* Sales Performance Chart */}
							{salesData.length > 0 && (
								<section className="chart-section">
									<h3 className="section-title">
										<span className="title-icon">📈</span>
										Sales Performance
									</h3>
									<div className="chart-container chart-medium">
										<Line
											data={{
												labels: salesData.map(d => {
													const [year, month] = d.period.split('-');
													const date = new Date(year, month - 1);
													return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
												}),
												datasets: [{
													label: 'Sales Volume (KSh)',
													data: salesData.map(d => d.sales),
													borderColor: '#ff6337',
													backgroundColor: 'rgba(255, 99, 55, 0.1)',
													tension: 0.4,
													fill: true,
													borderWidth: 3,
													pointRadius: 5,
													pointHoverRadius: 7,
													pointBackgroundColor: '#ff6337',
													pointBorderColor: '#fff',
													pointBorderWidth: 2,
													pointHoverBackgroundColor: '#ff6337',
													pointHoverBorderColor: '#fff',
												}]
											}}
											options={{
												responsive: true,
												maintainAspectRatio: false,
												plugins: { 
													legend: { 
														position: 'top',
														labels: {
															font: { size: 13, weight: '600' },
															color: '#333',
															usePointStyle: true,
															padding: 12
														}
													}, 
													tooltip: {
														backgroundColor: 'rgba(0, 0, 0, 0.8)',
														padding: 12,
														titleFont: { size: 14, weight: '600' },
														bodyFont: { size: 13 },
														cornerRadius: 8,
													}
												},
												scales: { 
													y: { 
														beginAtZero: true, 
														ticks: { 
															callback: value => `KSh ${value.toLocaleString()}`,
															font: { size: 11 },
															color: '#666'
														},
														grid: {
															color: 'rgba(0, 0, 0, 0.05)',
														}
													},
													x: {
														ticks: {
															font: { size: 11 },
															color: '#666'
														},
														grid: {
															display: false
														}
													}
												}
											}}
										/>
									</div>
								</section>
							)}
						</div>

						{/* Quick Actions - Moved below charts */}
						<div className="quick-actions-card quick-actions-horizontal">
							<h3 className="section-title">
								<span className="title-icon">⚡</span>
								Quick Actions
							</h3>
							<div className="quick-actions-buttons">
								<button className="btn-action refresh" onClick={() => { showToast('Refreshing data...', 'info'); setTimeout(() => window.location.reload(), 500); }}>
									<span className="btn-icon">🔄</span>
									<span className="btn-text">Refresh</span>
								</button>
								<button className="btn-action export" onClick={() => showToast('Export feature coming soon', 'info')}>
									<span className="btn-icon">📥</span>
									<span className="btn-text">Export</span>
								</button>
								<button className="btn-action view-mode" onClick={() => navigate('/admin/users')}>
									<span className="btn-icon">👥</span>
									<span className="btn-text">Users</span>
								</button>
								<button className="btn-action" onClick={() => navigate('/admin/messages')}>
									<span className="btn-icon">💬</span>
									<span className="btn-text">Messages</span>
								</button>
								<button className="btn-action reports" onClick={() => navigate('/admin/reports')}>
									<span className="btn-icon">📄</span>
									<span className="btn-text">Reports</span>
								</button>
								<button className="btn-action" onClick={() => navigate('/admin/transactions')}>
									<span className="btn-icon">💳</span>
									<span className="btn-text">Transactions</span>
								</button>
							</div>
						</div>

						{/* Activity tables */}
						<section className="recent-section">
							<h3 className="section-title">
								<span className="title-icon">📋</span>
								Recent Orders
							</h3>
							<div className="table-scroll">
								{transactions.orders.length > 0 ? (
									<table className="admin-table">
										<thead>
											<tr>
												<th>Order ID</th>
												<th>Date</th>
												<th>Amount</th>
												<th>Status</th>
												<th>Payment</th>
											</tr>
										</thead>
										<tbody>
											{transactions.orders.slice(0, 10).map(o => (
												<tr key={o.id} className="clickable-row">
													<td>
														<span className="order-id">#{String(o.id).padStart(4, '0')}</span>
													</td>
													<td>{new Date(o.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
													<td className="amount-cell">KSh {parseFloat(o.amount || 0).toLocaleString()}</td>
													<td><span className={`status-badge status-${o.status?.toLowerCase()}`}>{o.status}</span></td>
													<td><span className={`status-badge status-${o.paymentStatus?.toLowerCase() || o.payment_status?.toLowerCase()}`}>{o.paymentStatus || o.payment_status}</span></td>
												</tr>
											))}
										</tbody>
									</table>
								) : (
									<div className="empty-table">
										<span className="empty-icon">📋</span>
										<p>No orders yet</p>
									</div>
								)}
							</div>
						</section>

						<section className="recent-section">
							<h3 className="section-title">
								<span className="title-icon">💳</span>
								Recent Payments
							</h3>
							<div className="table-scroll">
								{transactions.payments.length > 0 ? (
									<table className="admin-table">
										<thead>
											<tr>
												<th>Payment ID</th>
												<th>Date</th>
												<th>Amount</th>
												<th>Method</th>
												<th>Status</th>
											</tr>
										</thead>
										<tbody>
											{transactions.payments.slice(0, 10).map(p => (
												<tr key={p.id} className="clickable-row">
													<td>
														<span className="payment-id">#{String(p.id).padStart(4, '0')}</span>
													</td>
													<td>{new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
													<td className="amount-cell">KSh {parseFloat(p.amount || 0).toLocaleString()}</td>
													<td>
														<span className="payment-method">{p.method}</span>
													</td>
													<td><span className={`status-badge status-${p.status?.toLowerCase()}`}>{p.status}</span></td>
												</tr>
											))}
										</tbody>
									</table>
								) : (
									<div className="empty-table">
										<span className="empty-icon">💳</span>
										<p>No payments yet</p>
									</div>
								)}
							</div>
						</section>
					</>
				)}
			</main>
			{/* Notification toast */}
			{showNotification && (
				<div className={`toast-toast ${notificationType}`}>{notificationMessage}</div>
			)}
		</div>
	);
};

export default Dashboard;

