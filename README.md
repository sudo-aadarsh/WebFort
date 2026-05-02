# WebFort 🛡️

**Enterprise-grade web vulnerability scanner.**

WebFort is a comprehensive, full-stack web vulnerability scanning engine designed to identify and analyze potential security flaws in web applications. Built with a modern technology stack, it provides both powerful backend scanning capabilities and an intuitive, responsive frontend dashboard.

## 🌟 Features

* **Advanced Scanning Engine:** Built-in scanners for common web vulnerabilities including:
  * SQL Injection (SQLi)
  * Remote Code Execution (RCE)
  * Security Headers Analysis
* **Intelligent Crawler:** Automatically traverses web applications to map out attack surfaces.
* **Modern Dashboard:** React-based frontend providing real-time scanning insights and interactive data visualization (via Recharts).
* **Detailed Reporting:** Generates comprehensive security reports (PDF export via PDFKit).

## 🚀 Tech Stack

### Frontend
* **Framework:** React 19 with Vite
* **State Management:** Zustand
* **Routing:** React Router v7
* **Icons:** Lucide React
* **Charts:** Recharts

### Backend
* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** SQLite (via sql.js)
* **Real-time:** WebSockets (ws)
* **Web Scraping:** Cheerio & Axios

## 🛠️ Getting Started

### Prerequisites
Make sure you have Node.js and npm installed on your machine.

### Installation

1. Clone the repository and navigate into the project directory:
   ```bash
   cd WebFort
   ```

2. Install dependencies for all workspaces from the root directory:
   ```bash
   npm install
   ```

3. Seed the database with initial configuration/data:
   ```bash
   npm run seed
   ```

### Running the Application

You can easily run both the frontend and backend development servers concurrently using the root workspace command:

```bash
npm run dev
```

Alternatively, you can run them individually:
* **Frontend only:** `npm run dev:frontend`
* **Backend only:** `npm run dev:backend`

## 📁 Project Structure

* `/frontend` - React application (Vite setup)
* `/backend` - Express API & core scanning engine
* `/docker` - Containerization configurations
* `/docs` - Additional project documentation

## 🧪 Testing
Run backend tests using the built-in Node.js test runner:
```bash
npm run test
```

## 📦 Building for Production
To build the frontend for production, run:
```bash
npm run build
```

## 📜 License
This project is proprietary and confidential.
# WebFort
