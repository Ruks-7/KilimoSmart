import React from 'react';
import AdminNavbar from './AdminNavbar';
import './Styling/admin.css';

const Reports = () => {
	return (
		<div className="admin-root">
			<AdminNavbar />
			<main className="admin-main container">
				<h2 className="page-title">Reports</h2>
				<p className="muted">Generate and export platform reports (CSV/JSON) — basic summaries available here.</p>

				<section className="reports-grid">
					<div className="report-card">
						<h4>Sales by month</h4>
						<p>Generate monthly sales CSV.</p>
						<button className="btn-primary">Generate</button>
					</div>

					<div className="report-card">
						<h4>Top sellers</h4>
						<p>Top performing farmers by revenue.</p>
						<button className="btn-primary">Generate</button>
					</div>

					<div className="report-card">
						<h4>Low stock</h4>
						<p>Products low in stock across the platform.</p>
						<button className="btn-primary">Generate</button>
					</div>
				</section>
			</main>
		</div>
	);
};

export default Reports;
