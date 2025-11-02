import React, { useState, useEffect } from 'react';
import AdminNavbar from './AdminNavbar';
import { API_CONFIG, apiCall } from '../config/api';
import './Styling/admin.css';

const Reports = () => {
	const [generating, setGenerating] = useState(null);
	const [stats, setStats] = useState(null);
	const [notification, setNotification] = useState(null);

	useEffect(() => {
		const loadStats = async () => {
			try {
				const res = await apiCall(API_CONFIG.ENDPOINTS.ADMIN.STATS);
				setStats(res.stats || res);
			} catch (err) {
				console.error('Failed to load stats', err);
			}
		};
		loadStats();
	}, []);

	const handleGenerate = async (reportType) => {
		setGenerating(reportType);
		// Simulate report generation
		setTimeout(() => {
			setGenerating(null);
			setNotification({ type: 'success', message: `${reportType} report generated successfully!` });
			setTimeout(() => setNotification(null), 3000);
		}, 2000);
	};

	return (
		<div className="admin-root">
			<AdminNavbar />
			<main className="admin-main container">
				<h2 className="page-title">
					<span>📊</span>
					Reports & Analytics
				</h2>
				
				<p className="page-description">
					Generate comprehensive reports and export platform data for analysis. 
					All reports are generated in CSV format for easy integration with other tools.
				</p>

				{/* Quick Stats Overview */}
				{stats && (
					<div className="stats-grid" style={{ marginBottom: '32px' }}>
						<div className="stat-card" style={{ borderLeft: '4px solid #004a2f' }}>
							<div className="stat-content">
								<div className="stat-icon" style={{ background: '#004a2f15', color: '#004a2f' }}>
									<span>👥</span>
								</div>
								<div className="stat-info">
									<div className="stat-title">Total Users</div>
									<div className="stat-value">{stats.totalUsers || 0}</div>
								</div>
							</div>
						</div>
						<div className="stat-card" style={{ borderLeft: '4px solid #ff6337' }}>
							<div className="stat-content">
								<div className="stat-icon" style={{ background: '#ff633715', color: '#ff6337' }}>
									<span>🛒</span>
								</div>
								<div className="stat-info">
									<div className="stat-title">Total Products</div>
									<div className="stat-value">{stats.totalProducts || 0}</div>
								</div>
							</div>
						</div>
						<div className="stat-card" style={{ borderLeft: '4px solid #ffa323' }}>
							<div className="stat-content">
								<div className="stat-icon" style={{ background: '#ffa32315', color: '#ffa323' }}>
									<span>📦</span>
								</div>
								<div className="stat-info">
									<div className="stat-title">Total Orders</div>
									<div className="stat-value">{stats.totalOrders || 0}</div>
								</div>
							</div>
						</div>
						<div className="stat-card" style={{ borderLeft: '4px solid #228b22' }}>
							<div className="stat-content">
								<div className="stat-icon" style={{ background: '#228b2215', color: '#228b22' }}>
									<span>💰</span>
								</div>
								<div className="stat-info">
									<div className="stat-title">Total Revenue</div>
									<div className="stat-value">
										{stats.totalRevenue ? `KSh ${stats.totalRevenue.toLocaleString()}` : 'KSh 0'}
									</div>
								</div>
							</div>
						</div>
					</div>
				)}

				<section className="reports-grid">
					{/* Sales Reports */}
					<div className="report-card">
						<div className="report-icon" style={{ background: '#004a2f15', color: '#004a2f' }}>
							📈
						</div>
						<h4>Monthly Sales Report</h4>
						<p>Detailed breakdown of sales by month including revenue, orders, and growth metrics.</p>
						<ul className="report-features">
							<li>✓ Month-by-month revenue</li>
							<li>✓ Order volume trends</li>
							<li>✓ Growth percentages</li>
						</ul>
						<button 
							className="btn-primary" 
							onClick={() => handleGenerate('Monthly Sales')}
							disabled={generating === 'Monthly Sales'}
						>
							{generating === 'Monthly Sales' ? '⏳ Generating...' : '📥 Generate CSV'}
						</button>
					</div>

					{/* Top Farmers Report */}
					<div className="report-card">
						<div className="report-icon" style={{ background: '#ff633715', color: '#ff6337' }}>
							👨‍🌾
						</div>
						<h4>Top Farmers Report</h4>
						<p>Ranking of farmers by revenue, number of products sold, and customer ratings.</p>
						<ul className="report-features">
							<li>✓ Revenue by farmer</li>
							<li>✓ Product count</li>
							<li>✓ Performance metrics</li>
						</ul>
						<button 
							className="btn-primary" 
							onClick={() => handleGenerate('Top Farmers')}
							disabled={generating === 'Top Farmers'}
						>
							{generating === 'Top Farmers' ? '⏳ Generating...' : '📥 Generate CSV'}
						</button>
					</div>

					{/* Product Performance */}
					<div className="report-card">
						<div className="report-icon" style={{ background: '#ffa32315', color: '#ffa323' }}>
							🛒
						</div>
						<h4>Product Performance</h4>
						<p>Analysis of best-selling products, stock levels, and pricing trends.</p>
						<ul className="report-features">
							<li>✓ Top selling products</li>
							<li>✓ Low stock alerts</li>
							<li>✓ Price comparisons</li>
						</ul>
						<button 
							className="btn-primary" 
							onClick={() => handleGenerate('Product Performance')}
							disabled={generating === 'Product Performance'}
						>
							{generating === 'Product Performance' ? '⏳ Generating...' : '📥 Generate CSV'}
						</button>
					</div>

					{/* User Activity Report */}
					<div className="report-card">
						<div className="report-icon" style={{ background: '#228b2215', color: '#228b22' }}>
							👥
						</div>
						<h4>User Activity Report</h4>
						<p>Comprehensive user engagement metrics including registration trends and activity levels.</p>
						<ul className="report-features">
							<li>✓ User registration trends</li>
							<li>✓ Farmer vs Buyer ratio</li>
							<li>✓ Activity statistics</li>
						</ul>
						<button 
							className="btn-primary" 
							onClick={() => handleGenerate('User Activity')}
							disabled={generating === 'User Activity'}
						>
							{generating === 'User Activity' ? '⏳ Generating...' : '📥 Generate CSV'}
						</button>
					</div>

					{/* Payment Report */}
					<div className="report-card">
						<div className="report-icon" style={{ background: '#004a2f15', color: '#004a2f' }}>
							💳
						</div>
						<h4>Payment Transactions</h4>
						<p>Complete payment history with M-Pesa transaction details and status tracking.</p>
						<ul className="report-features">
							<li>✓ All M-Pesa transactions</li>
							<li>✓ Payment success rates</li>
							<li>✓ Transaction references</li>
						</ul>
						<button 
							className="btn-primary" 
							onClick={() => handleGenerate('Payment Transactions')}
							disabled={generating === 'Payment Transactions'}
						>
							{generating === 'Payment Transactions' ? '⏳ Generating...' : '📥 Generate CSV'}
						</button>
					</div>

					{/* Order Report */}
					<div className="report-card">
						<div className="report-icon" style={{ background: '#ff633715', color: '#ff6337' }}>
							📦
						</div>
						<h4>Order History Report</h4>
						<p>Detailed order information including items, delivery addresses, and fulfillment status.</p>
						<ul className="report-features">
							<li>✓ Complete order details</li>
							<li>✓ Delivery information</li>
							<li>✓ Order status tracking</li>
						</ul>
						<button 
							className="btn-primary" 
							onClick={() => handleGenerate('Order History')}
							disabled={generating === 'Order History'}
						>
							{generating === 'Order History' ? '⏳ Generating...' : '📥 Generate CSV'}
						</button>
					</div>
				</section>

				{/* Export All Data */}
				<div className="export-all-section">
					<h3 className="section-title">
						<span className="title-icon">📤</span>
						Bulk Export
					</h3>
					<div className="export-all-card">
						<div className="export-all-content">
							<h4>Export All Platform Data</h4>
							<p>Generate a comprehensive export of all platform data including users, products, orders, and payments.</p>
							<p className="warning-text">⚠️ This may take several minutes depending on the amount of data.</p>
						</div>
						<button 
							className="btn-primary btn-large" 
							onClick={() => handleGenerate('Complete Platform')}
							disabled={generating === 'Complete Platform'}
						>
							{generating === 'Complete Platform' ? '⏳ Generating Complete Export...' : '📥 Export All Data'}
						</button>
					</div>
				</div>

				{/* Notification Toast */}
				{notification && (
					<div className={`toast-toast ${notification.type}`}>
						{notification.message}
					</div>
				)}
			</main>
		</div>
	);
};

export default Reports;
