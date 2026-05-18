# 🛡️ WebSecure Vulnerability Scanner

WebSecure is an enterprise-grade, cloud-native, multi-tenant Dynamic Application Security Testing (DAST) SaaS platform. Built with scalability and security in mind, WebSecure automates vulnerability discovery, false-positive filtering using AI, and seamless CI/CD integration.

---

## ✨ Key Features

### 🏢 SaaS-Ready Architecture
* **Strict Multi-Tenancy:** Data is securely isolated using tenant-scoped database queries across all services.
* **Microservices Ready:** API backend, independent RabbitMQ scan workers, and a React SPA frontend.
* **Out-of-Band (OOB) Interaction:** Built-in tracker for detecting "blind" vulnerabilities (RCE, SQLi, SSRF).

### 🕵️ Advanced Vulnerability Scanning
* **10+ Vulnerability Classes:** Automated detection of SQLi, XSS, RCE, SSRF, LFI/RFI, IDOR, CSRF, Secrets, and more.
* **SSRF & OOB Detection:** Built-in tracker for detecting "blind" vulnerabilities via Out-of-Band interactions.
* **Secrets Discovery:** Scans client-side JavaScript for hardcoded API keys (AWS, Stripe, GitHub, etc.) and credentials.
* **Open Redirect Audit:** Identifies unsafe navigation patterns leveraged in phishing attacks.
* **AI-Powered Analysis:** Uses OpenAI (GPT-4) to intelligently analyze payloads and filter false positives.

### 🔐 Authentication & Security
* **MFA & SSO:** Supports Two-Factor Authentication (TOTP) and Google OAuth2 Single Sign-On.
* **RBAC:** Role-Based Access Control via secure JSON Web Tokens (JWT).
* **SOC2/GDPR Compliance:** Built-in asynchronous Audit Logging for all sensitive data modifications.

### 📊 Observability & Monitoring
* **Full Stack Metrics:** Built-in Prometheus integration for real-time system performance tracking.
* **Grafana Dashboards:** Beautiful, pre-configured dashboards for monitoring scan throughput and system health.

---

## 🛠️ Technology Stack

* **Frontend:** React, Vite, Recharts, Material 3 UI
* **Backend:** Node.js, Express.js
* **Database:** PostgreSQL, Redis (Caching/Limiting)
* **Message Broker:** RabbitMQ
* **Monitoring:** Prometheus, Grafana
* **AI Engine:** OpenAI API
* **Orchestration:** Docker Compose, Kubernetes

---

## 🚦 Getting Started

### Step 1 — Environment Setup
```bash
cp .env.example .env
cp .env.example backend/.env
cp .env.example frontend/.env
```
Update your credentials in the `.env` files.

### Step 2 — Start Infrastructure (Docker)
```bash
docker compose up -d
```

### Step 3 — Seed & Run
```bash
npm install
npm run seed
npm run dev
```

### 🏁 Local URLs
| Service | URL | Default Port |
|---|---|---|
| 🖥️ **Frontend** | http://localhost:5173 | 5173 |
| 🔌 **Backend API** | http://localhost:3002/api/health | 3002 |
| 📊 **Monitoring** | http://localhost:3010 | 3010 (Grafana) |
| 🐇 **RabbitMQ UI** | http://localhost:15672 | 15672 |

---

## 📚 Security Education Hub

WebSecure offers an integrated **Security Education Hub** covering 10+ vulnerability classes. Developers can review OWASP guidelines, analyze vulnerable vs. secure code snippets, and learn remediation best practices directly within the platform.

---

## 📜 License
This project is proprietary and confidential.
