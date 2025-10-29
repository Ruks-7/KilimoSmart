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

	const loadUsers = async (p = page, q = '') => {
		setLoading(true);
		try {
			const url = `${API_CONFIG.ENDPOINTS.ADMIN.USERS}?page=${p}&limit=${limit}${q ? `&search=${encodeURIComponent(q)}` : ''}`;
			const res = await apiCall(url);
			setUsers(res.users || res.users || []);
			setTotal(res.total || 0);
			setPage(res.page || p);
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
		// small debounce would be better; keep simple
		await loadUsers(1, q);
	};

	const gotoPage = async (p) => {
		if (p < 1) return;
		const maxPage = Math.max(1, Math.ceil(total / limit));
		if (p > maxPage) return;
		await loadUsers(p, query);
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
				<h2 className="page-title">Users</h2>

				<div className="users-tools">
					<input className="search-input" placeholder="Search users by name or email" value={query} onChange={handleSearch} />
				</div>

				{loading ? (
					<div className="loading">Loading users...</div>
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
									</tr>
								</thead>
								<tbody>
									{users.map(u => (
										<tr key={u.id} className="clickable-row" onClick={() => openUser(u.id)}>
											<td>{u.id}</td>
											<td>{(u.firstName || u.first_name || '') + ' ' + (u.lastName || u.last_name || '')}</td>
											<td>{u.email}</td>
											<td>{u.phoneNumber || u.phone_number}</td>
											<td>{u.userType || u.user_type}</td>
											<td>{new Date(u.createdAt || u.created_at).toLocaleString()}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						<div className="pagination">
							<button className="page-btn" onClick={() => gotoPage(page - 1)}>Prev</button>
							<div className="page-info">Page {page} of {Math.max(1, Math.ceil(total / limit))} — {total} users</div>
							<button className="page-btn" onClick={() => gotoPage(page + 1)}>Next</button>
						</div>
					</>
				)}

				{selectedUser && (
					<div className="modal-backdrop" onClick={() => setSelectedUser(null)}>
						<div className="modal" onClick={(e) => e.stopPropagation()}>
							<div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
								<h3>User details</h3>
								<button className="modal-close" onClick={() => setSelectedUser(null)}>Close</button>
							</div>
							{detailLoading ? (
								<div className="loading">Loading details...</div>
							) : (
								<div>
									<div className="grid">
										<div>
											<div className="row"><strong>Name:</strong> {(selectedUser.firstName || selectedUser.first_name || '') + ' ' + (selectedUser.lastName || selectedUser.last_name || '')}</div>
											<div className="row"><strong>Email:</strong> {selectedUser.email}</div>
											<div className="row"><strong>Phone:</strong> {selectedUser.phoneNumber || selectedUser.phone_number}</div>
											<div className="row"><strong>Type:</strong> {selectedUser.userType || selectedUser.user_type}</div>
										</div>
										<div>
											<div className="row"><strong>Joined:</strong> {new Date(selectedUser.createdAt || selectedUser.created_at).toLocaleString()}</div>
											<div className="row"><strong>Email verified:</strong> {selectedUser.emailVerified ? 'Yes' : 'No'}</div>
											<div className="row"><strong>Orders:</strong> {selectedUser.orderCount ?? 0}</div>
											<div className="row"><strong>Payments:</strong> {selectedUser.paymentCount ?? 0}</div>
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
