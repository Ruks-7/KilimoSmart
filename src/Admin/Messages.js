import AdminNavbar from './AdminNavbar';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_CONFIG, apiCall } from '../config/api';
import './Styling/admin.css';

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

const Messages = () => {
	const [conversations, setConversations] = useState([]);
	const [stats, setStats] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [unauthorized, setUnauthorized] = useState(false);
	const [selectedConversation, setSelectedConversation] = useState(null);
	const [conversationMessages, setConversationMessages] = useState([]);
	const [loadingMessages, setLoadingMessages] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [statusFilter, setStatusFilter] = useState('');
	const [page, setPage] = useState(1);
	const [totalCount, setTotalCount] = useState(0);
	const [notificationMessage, setNotificationMessage] = useState('');
	const [notificationType, setNotificationType] = useState('success');
	const [showNotification, setShowNotification] = useState(false);
	const navigate = useNavigate();
	const limit = 25;

	const showToast = (msg, type = 'success') => {
		setNotificationMessage(msg);
		setNotificationType(type);
		setShowNotification(true);
		setTimeout(() => setShowNotification(false), 3500);
	};

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

	useEffect(() => {
		if (checkTokenExpiry()) {
			localStorage.removeItem('authToken');
			localStorage.removeItem('user');
			navigate('/admin/login');
			return;
		}

		loadConversations();
	}, [navigate, page, searchQuery, statusFilter]);

	const loadConversations = async () => {
		setLoading(true);
		setError(null);

		try {
			const params = new URLSearchParams({
				page: page.toString(),
				limit: limit.toString(),
				...(searchQuery && { search: searchQuery }),
				...(statusFilter && { status: statusFilter })
			});

			const response = await apiCall(`${API_CONFIG.ENDPOINTS.ADMIN.MESSAGES}?${params}`);
			setConversations(response.conversations || []);
			setStats(response.stats || {});
			setTotalCount(response.total || 0);
		} catch (err) {
			console.error('Failed to load conversations', err);
			if (err && (err.status === 401 || err.status === 403)) {
				setUnauthorized(true);
				setError('Admin access required. Please sign in.');
			} else {
				setError(err.message || 'Failed to load conversations');
			}
		} finally {
			setLoading(false);
		}
	};

	const loadConversationDetails = async (conversationId) => {
		setLoadingMessages(true);
		try {
			const response = await apiCall(API_CONFIG.ENDPOINTS.ADMIN.MESSAGE_DETAILS(conversationId));
			setSelectedConversation(response.conversation);
			setConversationMessages(response.messages || []);
		} catch (err) {
			console.error('Failed to load conversation details', err);
			showToast('Failed to load conversation details', 'error');
		} finally {
			setLoadingMessages(false);
		}
	};

	const updateConversationStatus = async (conversationId, newStatus) => {
		try {
			await apiCall(API_CONFIG.ENDPOINTS.ADMIN.UPDATE_MESSAGE_STATUS(conversationId), {
				method: 'PUT',
				body: JSON.stringify({ status: newStatus })
			});

			showToast(`Conversation marked as ${newStatus}`, 'success');
			
			// Update local state
			setConversations(conversations.map(conv => 
				conv.conversation_id === conversationId 
					? { ...conv, status: newStatus }
					: conv
			));

			if (selectedConversation?.conversation_id === conversationId) {
				setSelectedConversation({ ...selectedConversation, status: newStatus });
			}

			// Reload to update stats
			loadConversations();
		} catch (err) {
			console.error('Failed to update conversation status', err);
			showToast('Failed to update conversation status', 'error');
		}
	};

	const handleSearch = (e) => {
		setSearchQuery(e.target.value);
		setPage(1); 
	};

	const handleStatusFilter = (e) => {
		setStatusFilter(e.target.value);
		setPage(1); 
	};

	const totalPages = Math.ceil(totalCount / limit);

	return (
		<div>
			<AdminNavbar />
			<main className="admin-main container">
				<h2 className="page-title">Message Oversight</h2>

				{/* Error banner */}
				{error && (
					<div className="table-scroll" style={{ background: '#fff6f6', border: '1px solid #f5c2c2', marginBottom: 16 }}>
						<strong style={{ color: '#b92b27' }}>{unauthorized ? 'Unauthorized:' : 'Error:'}</strong>
						<span style={{ marginLeft: 8 }}>{error}</span>
						<div style={{ marginTop: 8 }}>
							{unauthorized ? (
								<>
									<a className="btn-primary" href="/admin/login" style={{ textDecoration: 'none' }}>Sign in</a>
									<button className="action-btn" style={{ marginLeft: 8 }} onClick={() => { setError(null); setUnauthorized(false); }}>Dismiss</button>
								</>
							) : (
								<>
									<button className="action-btn" onClick={() => { setError(null); }}>Dismiss</button>
									<button className="btn-primary" style={{ marginLeft: 8 }} onClick={loadConversations}>Retry</button>
								</>
							)}
						</div>
					</div>
				)}

				{loading && !conversations.length ? (
					<div className="loading">Loading...</div>
				) : (
					<>
						{/* Stats Cards Grid */}
						<section className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
							<StatCard 
								title="Total Conversations" 
								value={stats?.totalConversations || 0} 
								icon={<span>💬</span>} 
								accent="#004a2f" 
							/>
							<StatCard 
								title="Total Messages" 
								value={stats?.totalMessages || 0} 
								icon={<span>📨</span>} 
								accent="#ff6337" 
							/>
							<StatCard 
								title="Active" 
								value={stats?.activeConversations || 0} 
								icon={<span>✅</span>} 
								accent="#228b22" 
							/>
							<StatCard 
								title="Unread Messages" 
								value={stats?.totalUnread || 0} 
								icon={<span>🔔</span>} 
								accent="#ffa323" 
							/>
						</section>

						{/* Search and Filters */}
						<section className="filters-section" style={{ marginTop: 24, marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
							<input
								type="text"
								placeholder="Search by name or subject..."
								value={searchQuery}
								onChange={handleSearch}
								className="form-input"
								style={{ flex: '1 1 300px', padding: '10px 12px' }}
							/>
							<select
								value={statusFilter}
								onChange={handleStatusFilter}
								className="form-input"
								style={{ flex: '0 1 180px', padding: '10px 12px' }}
							>
								<option value="">All Statuses</option>
								<option value="active">Active</option>
								<option value="archived">Archived</option>
								<option value="closed">Closed</option>
							</select>
							<button 
								className="btn-primary" 
								onClick={loadConversations}
								style={{ flex: '0 1 auto' }}
							>
								🔄 Refresh
							</button>
						</section>

						{/* Main Content Area - Split View */}
						<div style={{ display: 'grid', gridTemplateColumns: selectedConversation ? '1fr 1.5fr' : '1fr', gap: 16, overflow: 'hidden' }}>
							{/* Conversations List */}
							<section className="recent-section" style={{ minWidth: 0 }}>
								<h3 className="section-title">
									<span className="title-icon">💬</span>
									Conversations ({totalCount})
								</h3>
								<div className="table-scroll" style={{ overflowX: 'auto', maxWidth: '100%' }}>
									{conversations.length > 0 ? (
										<table className="admin-table">
											<thead>
												<tr>
													<th>Subject</th>
													<th>Buyer</th>
													<th>Farmer</th>
													<th>Messages</th>
													<th>Unread</th>
													<th>Status</th>
													<th>Last Activity</th>
													<th>Actions</th>
												</tr>
											</thead>
											<tbody>
												{conversations.map(conv => (
													<tr 
														key={conv.conversation_id}
														className={selectedConversation?.conversation_id === conv.conversation_id ? 'selected-row' : 'clickable-row'}
														onClick={() => loadConversationDetails(conv.conversation_id)}
													>
														<td>
															<strong>{conv.subject || 'No subject'}</strong>
															{conv.last_message && (
																<div style={{ fontSize: '0.85em', color: '#666', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
																	{conv.last_message}
																</div>
															)}
														</td>
														<td>
															<div>{conv.buyer_name}</div>
															<div style={{ fontSize: '0.85em', color: '#666' }}>{conv.buyer_email}</div>
														</td>
														<td>
															<div>{conv.farmer_name}</div>
															<div style={{ fontSize: '0.85em', color: '#666' }}>{conv.farmer_email}</div>
														</td>
														<td>{conv.message_count || 0}</td>
														<td>
															{parseInt(conv.unread_count) > 0 && (
																<span className="status-badge status-pending">
																	{conv.unread_count}
																</span>
															)}
														</td>
														<td>
															<span className={`status-badge status-${conv.status}`}>
																{conv.status}
															</span>
														</td>
														<td>
															{new Date(conv.last_message_at).toLocaleDateString('en-US', { 
																month: 'short', 
																day: 'numeric', 
																year: 'numeric',
																hour: '2-digit',
																minute: '2-digit'
															})}
														</td>
														<td onClick={(e) => e.stopPropagation()}>
															<select
																value={conv.status}
																onChange={(e) => updateConversationStatus(conv.conversation_id, e.target.value)}
																className="form-input"
																style={{ padding: '4px 8px', fontSize: '0.85em' }}
															>
																<option value="active">Active</option>
																<option value="archived">Archived</option>
																<option value="closed">Closed</option>
															</select>
														</td>
													</tr>
												))}
											</tbody>
										</table>
									) : (
										<div className="empty-table">
											<span className="empty-icon">💬</span>
											<p>No conversations found</p>
										</div>
									)}
								</div>

								{/* Pagination */}
								{totalPages > 1 && (
									<div className="pagination" style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center' }}>
										<button
											onClick={() => setPage(p => Math.max(1, p - 1))}
											disabled={page === 1}
											className="action-btn"
										>
											Previous
										</button>
										<span>Page {page} of {totalPages}</span>
										<button
											onClick={() => setPage(p => Math.min(totalPages, p + 1))}
											disabled={page === totalPages}
											className="action-btn"
										>
											Next
										</button>
									</div>
								)}
							</section>

							{/* Conversation Details */}
							{selectedConversation && (
								<section className="recent-section" style={{ minWidth: 0, overflow: 'hidden' }}>
									<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
										<h3 className="section-title" style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: '1 1 auto', minWidth: 0 }}>
											<span className="title-icon">📨</span>
											{selectedConversation.subject}
										</h3>
										<button 
											className="action-btn" 
											onClick={() => setSelectedConversation(null)}
											style={{ flexShrink: 0 }}
										>
											✕ Close
										</button>
									</div>

									{/* Conversation Info */}
									<div style={{ background: '#f9f9f9', padding: 16, borderRadius: 8, marginBottom: 16 }}>
										<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.9em' }}>
											<div>
												<strong>Buyer:</strong> {selectedConversation.buyer_name}
												<div style={{ color: '#666', fontSize: '0.9em' }}>{selectedConversation.buyer_email}</div>
											</div>
											<div>
												<strong>Farmer:</strong> {selectedConversation.farmer_name}
												<div style={{ color: '#666', fontSize: '0.9em' }}>{selectedConversation.farmer_email}</div>
											</div>
											<div>
												<strong>Status:</strong> <span className={`status-badge status-${selectedConversation.status}`}>{selectedConversation.status}</span>
											</div>
											<div>
												<strong>Created:</strong> {new Date(selectedConversation.created_at).toLocaleDateString('en-US', { 
													month: 'short', 
													day: 'numeric', 
													year: 'numeric'
												})}
											</div>
											{selectedConversation.order_id && (
												<div>
													<strong>Order ID:</strong> #{selectedConversation.order_id}
												</div>
											)}
										</div>
									</div>

									{/* Messages */}
									<div className="table-scroll" style={{ maxHeight: '600px', overflowY: 'auto', overflowX: 'hidden' }}>
										{loadingMessages ? (
											<div className="loading" style={{ padding: 40 }}>Loading messages...</div>
										) : conversationMessages.length > 0 ? (
											<div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px' }}>
												{conversationMessages.map(msg => (
													<div 
														key={msg.message_id}
														style={{
															background: msg.sender_type === 'buyer' ? '#e3f2fd' : '#f1f8e9',
															padding: 12,
															borderRadius: 8,
															borderLeft: `4px solid ${msg.sender_type === 'buyer' ? '#004a2f' : '#228b22'}`,
															overflow: 'hidden',
															wordWrap: 'break-word'
														}}
													>
														<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
															<div style={{ minWidth: 0, overflow: 'hidden' }}>
																<strong style={{ wordBreak: 'break-word' }}>{msg.sender_name}</strong>
																<span style={{ 
																	marginLeft: 8, 
																	fontSize: '0.85em', 
																	color: '#666',
																	textTransform: 'uppercase',
																	whiteSpace: 'nowrap'
																}}>
																	({msg.sender_type})
																</span>
															</div>
															<div style={{ fontSize: '0.85em', color: '#666', whiteSpace: 'nowrap', flexShrink: 0 }}>
																{new Date(msg.created_at).toLocaleDateString('en-US', { 
																	month: 'short', 
																	day: 'numeric', 
																	year: 'numeric',
																	hour: '2-digit',
																	minute: '2-digit'
																})}
															</div>
														</div>
														<div style={{ 
															whiteSpace: 'pre-wrap', 
															wordBreak: 'break-word', 
															overflowWrap: 'break-word',
															maxWidth: '100%'
														}}>
															{msg.message_text}
														</div>
														{!msg.is_read && (
															<div style={{ marginTop: 8, fontSize: '0.85em', color: '#ff6337' }}>
																● Unread
															</div>
														)}
													</div>
												))}
											</div>
										) : (
											<div className="empty-table">
												<span className="empty-icon">📨</span>
												<p>No messages in this conversation</p>
											</div>
										)}
									</div>
								</section>
							)}
						</div>
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

export default Messages;
