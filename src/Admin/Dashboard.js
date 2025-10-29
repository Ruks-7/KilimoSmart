import AdminNavbar from './AdminNavbar';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_CONFIG, apiCall } from '../config/api';
import './Styling/admin.css';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const StatCard = ({ title, value, icon, accent }) => (
	<div className="stat-card" style={{ borderTop: `4px solid ${accent}` }}>
		<div className="stat-icon" style={{ color: accent }}>{icon}</div>
		<div className="stat-title">{title}</div>
		<div className="stat-value">{value}</div>
	</div>
);

const Dashboard = () => {
	const [stats, setStats] = useState(null);
	const [transactions, setTransactions] = useState({ payments: [], orders: [] });
	const [salesData, setSalesData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [unauthorized, setUnauthorized] = useState(false);
	const [isMobile, setIsMobile] = useState(false);
	const [notificationMessage, setNotificationMessage] = useState('');
	const [notificationType, setNotificationType] = useState('success');
	const [showNotification, setShowNotification] = useState(false);
	const navigate = useNavigate();

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
					setTransactions({ payments: t.payments || [], orders: t.orders || [] });
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

	// detect mobile by userAgent (lightweight, similar to farmer dashboard behaviour)
	useEffect(() => {
		try {
			const ua = navigator.userAgent || '';
			setIsMobile(/Mobi|Android|iPhone|iPad/i.test(ua));
		} catch (err) {
			setIsMobile(false);
		}
	}, []);

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
						{/* Top grid: left = stats, right = chart + quick actions */}
						<div className="dashboard-grid">
							<div className="left-col">
																<section className="stats-grid">
																	<StatCard title="Total Users" value={stats?.totalUsers || 0} icon={<span>👥</span>} accent="#004a2f" />
																	<StatCard title="Total Products" value={stats?.totalProducts || 0} icon={<span>🛒</span>} accent="#ff6337" />
																	<StatCard title="Total Orders" value={stats?.totalOrders || 0} icon={<span>📦</span>} accent="#ffa323" />
																	<StatCard title="Total Revenue" value={stats?.totalRevenue ? `Ksh ${stats.totalRevenue}` : 'Ksh 0'} icon={<span>💰</span>} accent="#228b22" />
																</section>
							</div>
							<div className="right-col">
								<div className="quick-actions">
									<div className="qa-left">
										<button className="btn-primary" onClick={() => { showToast('Refreshed data'); window.location.reload(); }}>Refresh</button>
										<button className="btn-primary" onClick={() => showToast('Export started', 'info')}>Export CSV</button>
									</div>
									<div className="qa-right muted">{isMobile ? 'Mobile view' : 'Desktop view'}</div>
								</div>

								<section className="chart-section">
									<h3>Sales Over Time</h3>
									<div className="chart-container">
										{salesData.length > 0 ? (
											<Line
												data={{
													labels: salesData.map(d => {
														const [year, month] = d.period.split('-');
														const date = new Date(year, month - 1);
														return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
													}),
													datasets: [{
														label: 'Sales (KSh)',
														data: salesData.map(d => d.sales),
														borderColor: 'var(--accent-color)',
														backgroundColor: 'rgba(255, 99, 55, 0.1)',
														tension: 0.4,
														fill: true,
													}]
												}}
												options={{
													responsive: true,
													plugins: { legend: { position: 'top' }, title: { display: false } },
													scales: { y: { beginAtZero: true, ticks: { callback: value => `KSh ${value.toLocaleString()}` } } }
												}}
											/>
										) : (
											<div className="no-data">No sales data available</div>
										)}
									</div>
								</section>
							</div>
						</div>

						{/* Activity tables */}
						<section className="recent-section">
							<h3>Recent Orders</h3>
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
										{transactions.orders.slice(0, 10).map(o => (
											<tr key={o.id} className="clickable-row">
												<td>{o.id}</td>
												<td>{new Date(o.date).toLocaleString()}</td>
												<td>{o.amount}</td>
												<td><span className={`status-badge status-${o.status?.toLowerCase()}`}>{o.status}</span></td>
												<td><span className={`status-badge status-${o.paymentStatus?.toLowerCase()}`}>{o.paymentStatus || o.payment_status}</span></td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</section>

						<section className="recent-section">
							<h3>Recent Payments</h3>
							<div className="table-scroll">
								<table className="admin-table">
									<thead>
										<tr>
											<th>ID</th>
											<th>Date</th>
											<th>Amount</th>
											<th>Method</th>
											<th>Status</th>
										</tr>
									</thead>
									<tbody>
										{transactions.payments.slice(0, 10).map(p => (
											<tr key={p.id} className="clickable-row">
												<td>{p.id}</td>
												<td>{new Date(p.date).toLocaleString()}</td>
												<td>{p.amount}</td>
												<td>{p.method}</td>
												<td><span className={`status-badge status-${p.status?.toLowerCase()}`}>{p.status}</span></td>
											</tr>
										))}
									</tbody>
								</table>
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

