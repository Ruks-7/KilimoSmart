# 🌱 KilimoSmart

A digital marketplace connecting farmers directly with buyers in Kenya, enabling seamless agricultural trade with secure payments and real-time communication.

## 📋 Overview

KilimoSmart is a full-stack web application that bridges the gap between farmers and buyers by providing:

- **Direct Farm-to-Buyer Sales** - Farmers list products, buyers purchase directly
- **Secure OTP Authentication** - Email-based verification for all users
- **M-Pesa Integration** - Seamless mobile money payments
- **Real-time Messaging** - Direct communication between farmers and buyers
- **Location-Based Discovery** - Find farmers and products by county/location
- **Product Reviews** - Build trust through buyer feedback
- **Admin Dashboard** - Comprehensive platform management

## 🏗️ Tech Stack

### Frontend
- **React 18** - UI framework
- **React Router v6** - Client-side routing
- **Bootstrap 5** - Responsive styling
- **Chart.js** - Data visualization
- **React Leaflet** - Location mapping
- **Axios** - API communication

### Backend
- **Node.js & Express** - REST API server
- **PostgreSQL** - Relational database
- **JWT** - Token-based authentication
- **SendGrid** - Email service (OTP & receipts)
- **Cloudinary** - Image storage
- **M-Pesa API** - Payment processing

## 📁 Project Structure

```
kilimosmart/
├── src/                    # React frontend
│   ├── Admin/              # Admin dashboard components
│   ├── Buyer/              # Buyer authentication & pages
│   ├── Farmer/             # Farmer dashboard & product management
│   ├── components/         # Shared UI components
│   ├── contexts/           # React context providers
│   ├── hooks/              # Custom React hooks
│   └── utils/              # Utility functions
├── backend/                # Express API server
│   ├── routes/             # API endpoints
│   │   ├── auth.js         # Authentication (OTP login/register)
│   │   ├── farmer.js       # Farmer products & management
│   │   ├── buyer.js        # Buyer orders & payments
│   │   ├── admin.js        # Admin operations
│   │   ├── messages.js     # Real-time messaging
│   │   ├── reviews.js      # Product reviews
│   │   ├── mpesa.js        # M-Pesa payment integration
│   │   └── health.js       # Health check endpoint
│   ├── middleware/         # Auth & upload middleware
│   ├── utils/              # Email service, helpers
│   ├── config/             # Database & Cloudinary config
│   └── tests/              # Jest unit & integration tests
├── build/                  # Production React build
└── api/                    # Vercel serverless functions
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 16.0.0
- npm >= 8.0.0
- PostgreSQL database
- SendGrid account (for emails)
- Cloudinary account (for images)
- M-Pesa Daraja API credentials (for payments)

### Environment Variables

Create `.env` files in the root and `backend/` directories:

```env
# Backend .env
DATABASE_URL=postgresql://user:password@host:5432/kilimosmart
JWT_SECRET=your_jwt_secret
SENDGRID_API_KEY=your_sendgrid_key
FROM_EMAIL=noreply@kilimosmart.tech
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
MPESA_CONSUMER_KEY=your_mpesa_key
MPESA_CONSUMER_SECRET=your_mpesa_secret
MPESA_PASSKEY=your_passkey
MPESA_SHORTCODE=your_shortcode
```

### Installation

```bash
# Clone the repository
git clone https://github.com/Ruks-7/KilimoSmart.git
cd kilimosmart

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
```

### Running the Application

```bash
# Start backend server (from backend/)
npm run dev

# Start frontend (from root)
npm start
```

The frontend runs on `http://localhost:3000` and backend on `http://localhost:5000`.

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user with OTP |
| POST | `/api/auth/verify-otp` | Verify OTP and get JWT |
| POST | `/api/auth/login` | Login with OTP |
| GET | `/api/farmer/products` | Get farmer's products |
| POST | `/api/farmer/products` | Add new product |
| PUT | `/api/farmer/products/:id` | Update product |
| GET | `/api/buyer/products` | Browse all products |
| POST | `/api/buyer/orders` | Create order |
| POST | `/api/mpesa/stkpush` | Initiate M-Pesa payment |
| GET | `/api/messages/:id` | Get conversation messages |
| POST | `/api/reviews` | Submit product review |
| GET | `/api/health` | Health check |

## 👥 User Roles

- **Farmer** - List products, manage inventory, receive orders, view sales analytics
- **Buyer** - Browse products, place orders, make payments, review products
- **Admin** - Manage users, view transactions, handle reports, platform oversight

## 🌍 Deployment

### Production URL
- **Live Site**: [kilimosmart.tech](https://kilimosmart.tech)

### Deployment Platforms
- **Frontend**: Vercel
- **Backend**: Vercel Serverless
- **Database**: Neon PostgreSQL

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


<p align="center">Made with 💚 for Kenyan farmers</p>
