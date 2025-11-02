import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Styling/admin.css';

const AdminNavbar = () => {
	const navigate = useNavigate();
	const [menuOpen, setMenuOpen] = useState(false);
	const navRef = useRef(null);
	const btnRef = useRef(null);

	const handleLogout = () => {
		localStorage.removeItem('authToken');
		sessionStorage.removeItem('authToken');
		localStorage.removeItem('userData');
		sessionStorage.removeItem('userData');
		navigate('/');
	};

	const userData = JSON.parse(localStorage.getItem('userData') || sessionStorage.getItem('userData') || 'null');

	useEffect(() => {
		// Close menu when clicking outside
		const onClickOutside = (e) => {
			if (!menuOpen) return;
			if (navRef.current && !navRef.current.contains(e.target) && btnRef.current && !btnRef.current.contains(e.target)) {
				setMenuOpen(false);
			}
		};

		const onKey = (e) => {
			if (e.key === 'Escape') setMenuOpen(false);
		};

		const onResize = () => {
			if (window.innerWidth > 900 && menuOpen) setMenuOpen(false);
		};

		document.addEventListener('click', onClickOutside);
		window.addEventListener('keydown', onKey);
		window.addEventListener('resize', onResize);

		return () => {
			document.removeEventListener('click', onClickOutside);
			window.removeEventListener('keydown', onKey);
			window.removeEventListener('resize', onResize);
		};
	}, [menuOpen]);

	return (
		<header className="admin-topbar">
			<div className="admin-container">
				<div className="brand">
					<span className="brand-icon">🌾</span>
					<span className="brand-text">KilimoSmart</span>
					<span className="brand-badge">Admin</span>
				</div>
				<button ref={btnRef} className={`hamburger${menuOpen ? ' open' : ''}`} onClick={() => setMenuOpen(prev => !prev)} aria-label="Toggle menu">
					<span className="bar"></span>
					<span className="bar"></span>
					<span className="bar"></span>
				</button>
				<nav ref={navRef} className={`admin-nav${menuOpen ? ' show' : ''}`}>
					<Link to="/admin" className="nav-link" onClick={() => setMenuOpen(false)}>
						<span className="nav-icon">📊</span>
						<span className="nav-text">Dashboard</span>
					</Link>
					<Link to="/admin/users" className="nav-link" onClick={() => setMenuOpen(false)}>
						<span className="nav-icon">👥</span>
						<span className="nav-text">Users</span>
					</Link>
					<Link to="/admin/transactions" className="nav-link" onClick={() => setMenuOpen(false)}>
						<span className="nav-icon">💳</span>
						<span className="nav-text">Transactions</span>
					</Link>
					<Link to="/admin/reports" className="nav-link" onClick={() => setMenuOpen(false)}>
						<span className="nav-icon">📋</span>
						<span className="nav-text">Reports</span>
					</Link>
				</nav>
				<div className="admin-actions">
					{userData ? (
						<div className="admin-user">
							<span className="user-avatar">👤</span>
							<span className="user-name">{userData.first_name || userData.firstName || 'Admin'}</span>
							<button className="btn-logout" onClick={handleLogout}>
								<span>Logout</span>
							</button>
						</div>
					) : (
						<button className="btn-logout" onClick={() => navigate('/')}>Home</button>
					)}
				</div>
			</div>
		</header>
	);
};

export default AdminNavbar;
