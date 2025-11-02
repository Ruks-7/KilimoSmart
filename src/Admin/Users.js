import React, { useEffect, useState } from 'react';
import AdminNavbar from './AdminNavbar';
import { API_CONFIG, apiCall } from '../config/api';
import './Styling/admin.css';

const Users = () => {
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [query, setQuery] = useState('');
	const [page, setPage] = useState(1);
	const [limit] = useState(25);
	const [total, setTotal] = useState(0);
	const [selectedUser, setSelectedUser] = useState(null);
	const [detailLoading, setDetailLoading] = useState(false);
	const [filterType, setFilterType] = useState('all'); // 'all', 'farmer', 'buyer'
	const [stats, setStats] = useState({ farmers: 0, buyers: 0, total: 0 });

	const loadUsers = async (p = page, q = '', type = filterType) => {
		setLoading(true);
		try {
			let url = `${API_CONFIG.ENDPOINTS.ADMIN.USERS}?page=${p}&limit=${limit}`;
			if (q) url += `&search=${encodeURIComponent(q)}`;
			if (type !== 'all') url += `&userType=${type}`;
			
			const res = await apiCall(url);
			const userList = res.users || [];
			setUsers(userList);
			setTotal(res.total || 0);
			setPage(res.page || p);

			// Get stats from API response or calculate from current results
			if (res.stats) {
				setStats({
					farmers: res.stats.farmers || 0,
					buyers: res.stats.buyers || 0,
					total: res.stats.total || 0
				});
			} else {
				// Fallback: calculate from current page (not ideal but better than nothing)
				const farmerCount = userList.filter(u => (u.userType || u.user_type) === 'farmer').length;
				const buyerCount = userList.filter(u => (u.userType || u.user_type) === 'buyer').length;
				setStats({ farmers: farmerCount, buyers: buyerCount, total: res.total || 0 });
			}
		} catch (err) {
			console.error('Failed to load users', err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadUsers(1, '');
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handleSearch = async (e) => {
		const q = e.target.value;
		setQuery(q);
		await loadUsers(1, q, filterType);
	};

	const handleFilterChange = async (type) => {
		setFilterType(type);
		await loadUsers(1, query, type);
	};

	const gotoPage = async (p) => {
		if (p < 1) return;
		const maxPage = Math.max(1, Math.ceil(total / limit));
		if (p > maxPage) return;
		await loadUsers(p, query, filterType);
	};

	const openUser = async (id) => {
		setDetailLoading(true);
		try {
			const res = await apiCall(`${API_CONFIG.ENDPOINTS.ADMIN.USERS}/${id}`);
			setSelectedUser(res.user || null);
		} catch (err) {
			console.error('Failed to load user details', err);
			setSelectedUser(null);
		} finally {
			setDetailLoading(false);
		}
	};

	return (
		<div className="admin-root">
			<AdminNavbar />
			<main className="admin-main container">
				<h2 className="page-title">
					<span>👥</span>
					User Management
				</h2>

				{/* Stats Cards */}
				<div className="stats-grid" style={{ marginBottom: '24px' }}>
					<div className="stat-card" style={{ borderLeft: '4px solid #004a2f' }}>
						<div className="stat-content">
							<div className="stat-icon" style={{ background: '#004a2f15', color: '#004a2f' }}>
								<span>👨‍🌾</span>
							</div>
							<div className="stat-info">
								<div className="stat-title">Farmers</div>
								<div className="stat-value">{stats.farmers}</div>
							</div>
						</div>
					</div>
					<div className="stat-card" style={{ borderLeft: '4px solid #ff6337' }}>
						<div className="stat-content">
							<div className="stat-icon" style={{ background: '#ff633715', color: '#ff6337' }}>
								<span>🛒</span>
							</div>
							<div className="stat-info">
								<div className="stat-title">Buyers</div>
								<div className="stat-value">{stats.buyers}</div>
							</div>
						</div>
					</div>
					<div className="stat-card" style={{ borderLeft: '4px solid #ffa323' }}>
						<div className="stat-content">
							<div className="stat-icon" style={{ background: '#ffa32315', color: '#ffa323' }}>
								<span>📊</span>
							</div>
							<div className="stat-info">
								<div className="stat-title">Total Users</div>
								<div className="stat-value">{stats.total}</div>
							</div>
						</div>
					</div>
				</div>

				{/* Search and Filter Tools */}
				<div className="users-tools">
					<div className="search-container">
						<span className="search-icon">🔍</span>
						<input 
							className="search-input" 
							placeholder="Search by name, email, or phone..." 
							value={query} 
							onChange={handleSearch} 
						/>
					</div>
					<div className="filter-buttons">
						<button 
							className={`filter-btn ${filterType === 'all' ? 'active' : ''}`} 
							onClick={() => handleFilterChange('all')}
						>
							All Users
						</button>
						<button 
							className={`filter-btn ${filterType === 'farmer' ? 'active' : ''}`} 
							onClick={() => handleFilterChange('farmer')}
						>
							Farmers
						</button>
						<button 
							className={`filter-btn ${filterType === 'buyer' ? 'active' : ''}`} 
							onClick={() => handleFilterChange('buyer')}
						>
							Buyers
						</button>
					</div>
				</div>

				{loading ? (
					<div className="loading">
						<span className="loading-spinner">⏳</span>
						Loading users...
					</div>
				) : users.length === 0 ? (
					<div className="empty-state">
						<span className="empty-icon">👥</span>
						<p>No users found</p>
						<small>Try adjusting your search or filter</small>
					</div>
				) : (
					<>
						<div className="table-scroll">
							<table className="admin-table">
								<thead>
									<tr>
										<th>ID</th>
										<th>Name</th>
										<th>Email</th>
										<th>Phone</th>
										<th>Type</th>
										<th>Joined</th>
										<th>Actions</th>
									</tr>
								</thead>
								<tbody>
									{users.map(u => (
										<tr key={u.id}>
											<td>
												<span className="user-id">#{String(u.id).padStart(4, '0')}</span>
											</td>
											<td>
												<div className="user-name-cell">
													<span className="user-avatar">
														{(u.userType || u.user_type) === 'farmer' ? '👨‍🌾' : '🛒'}
													</span>
													<span>{(u.firstName || u.first_name || '') + ' ' + (u.lastName || u.last_name || '')}</span>
												</div>
											</td>
											<td>{u.email}</td>
											<td>{u.phoneNumber || u.phone_number}</td>
											<td>
												<span className={`user-type-badge ${(u.userType || u.user_type)}`}>
													{u.userType || u.user_type}
												</span>
											</td>
											<td>{new Date(u.createdAt || u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
											<td>
												<button className="btn-view" onClick={() => openUser(u.id)}>
													View Details
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						<div className="pagination">
							<button className="page-btn" onClick={() => gotoPage(page - 1)} disabled={page === 1}>
								← Prev
							</button>
							<div className="page-info">
								Page <strong>{page}</strong> of <strong>{Math.max(1, Math.ceil(total / limit))}</strong> 
								<span className="separator">•</span>
								<strong>{total}</strong> total users
							</div>
							<button className="page-btn" onClick={() => gotoPage(page + 1)} disabled={page >= Math.ceil(total / limit)}>
								Next →
							</button>
						</div>
					</>
				)}

				{selectedUser && (
					<div className="modal-backdrop" onClick={() => setSelectedUser(null)}>
						<div className="modal" onClick={(e) => e.stopPropagation()}>
							<div className="modal-header">
								<h3>
									<span className="modal-icon">
										{(selectedUser.userType || selectedUser.user_type) === 'farmer' ? '👨‍🌾' : '🛒'}
									</span>
									User Details
								</h3>
								<button className="modal-close" onClick={() => setSelectedUser(null)}>✕</button>
							</div>
							{detailLoading ? (
								<div className="loading">
									<span className="loading-spinner">⏳</span>
									Loading details...
								</div>
							) : (
								<div className="modal-content">
									<div className="detail-grid">
										<div className="detail-section">
											<h4>Personal Information</h4>
											<div className="detail-row">
												<span className="detail-label">Full Name</span>
												<span className="detail-value">{(selectedUser.firstName || selectedUser.first_name || '') + ' ' + (selectedUser.lastName || selectedUser.last_name || '')}</span>
											</div>
											<div className="detail-row">
												<span className="detail-label">Email</span>
												<span className="detail-value">{selectedUser.email}</span>
											</div>
											<div className="detail-row">
												<span className="detail-label">Phone</span>
												<span className="detail-value">{selectedUser.phoneNumber || selectedUser.phone_number}</span>
											</div>
											<div className="detail-row">
												<span className="detail-label">User Type</span>
												<span className={`user-type-badge ${selectedUser.userType || selectedUser.user_type}`}>
													{selectedUser.userType || selectedUser.user_type}
												</span>
											</div>
										</div>
										<div className="detail-section">
											<h4>Account Status</h4>
											<div className="detail-row">
												<span className="detail-label">Joined</span>
												<span className="detail-value">{new Date(selectedUser.createdAt || selectedUser.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
											</div>
											<div className="detail-row">
												<span className="detail-label">Email Verified</span>
												<span className={`verify-badge ${selectedUser.emailVerified ? 'verified' : 'unverified'}`}>
													{selectedUser.emailVerified ? '✓ Verified' : '✗ Not Verified'}
												</span>
											</div>
											<div className="detail-row">
												<span className="detail-label">Total Orders</span>
												<span className="detail-value stat">{selectedUser.orderCount ?? 0}</span>
											</div>
											<div className="detail-row">
												<span className="detail-label">Total Payments</span>
												<span className="detail-value stat">{selectedUser.paymentCount ?? 0}</span>
											</div>
										</div>
									</div>
								</div>
							)}
						</div>
					</div>
				)}
			</main>
		</div>
	);
};

export default Users;
