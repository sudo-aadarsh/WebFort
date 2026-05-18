import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';

// Load environment variables if needed
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'websecure_user',
  password: process.env.DB_PASSWORD || 'websecure_password',
  database: process.env.DB_NAME || 'websecure_db',
  port: process.env.DB_PORT || 5432
});

function convertSql(sql) {
  let i = 1;
  return sql.replace(/\?/g, () => `$${i++}`);
}

export const dbHelper = {
  prepare(sql) {
    const pgSql = convertSql(sql);
    return {
      run: async (...params) => {
        try {
          await pool.query(pgSql, params);
        } catch (err) {
          console.error("DB Run Error:", err.message, "SQL:", pgSql);
          throw err;
        }
      },
      get: async (...params) => {
        try {
          const res = await pool.query(pgSql, params);
          return res.rows[0];
        } catch (err) {
          console.error("DB Get Error:", err.message, "SQL:", pgSql);
          throw err;
        }
      },
      all: async (...params) => {
        try {
          const res = await pool.query(pgSql, params);
          return res.rows;
        } catch (err) {
          console.error("DB All Error:", err.message, "SQL:", pgSql);
          throw err;
        }
      }
    };
  }
};

export async function getDb() {
  return pool;
}

export async function initializeDatabase() {
  // Creating tables for Multi-Tenant Architecture
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tenants (
      id UUID PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      domain VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      tenant_id UUID REFERENCES tenants(id),
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'user',
      company VARCHAR(255),
      job_title VARCHAR(255),
      avatar_url TEXT,
      mfa_enabled BOOLEAN DEFAULT FALSE,
      mfa_secret VARCHAR(255),
      api_key VARCHAR(255) UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS scans (
      id UUID PRIMARY KEY,
      tenant_id UUID REFERENCES tenants(id),
      user_id UUID REFERENCES users(id),
      target_url VARCHAR(255) NOT NULL,
      scan_type VARCHAR(50) DEFAULT 'full',
      status VARCHAR(50) DEFAULT 'queued',
      progress INTEGER DEFAULT 0,
      total_vulnerabilities INTEGER DEFAULT 0,
      critical_count INTEGER DEFAULT 0,
      high_count INTEGER DEFAULT 0,
      medium_count INTEGER DEFAULT 0,
      low_count INTEGER DEFAULT 0,
      info_count INTEGER DEFAULT 0,
      pages_scanned INTEGER DEFAULT 0,
      scan_depth INTEGER DEFAULT 3,
      started_at TIMESTAMP,
      completed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS vulnerabilities (
      id UUID PRIMARY KEY,
      tenant_id UUID REFERENCES tenants(id),
      scan_id UUID REFERENCES scans(id),
      type VARCHAR(255) NOT NULL,
      severity VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      url TEXT,
      parameter VARCHAR(255),
      evidence TEXT,
      remediation TEXT,
      cvss_score REAL DEFAULT 0,
      cwe_id VARCHAR(50),
      owasp_category VARCHAR(100),
      is_false_positive BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS alert_configs (
      id UUID PRIMARY KEY,
      tenant_id UUID REFERENCES tenants(id),
      user_id UUID REFERENCES users(id),
      channel VARCHAR(50) NOT NULL,
      endpoint VARCHAR(255) NOT NULL,
      min_severity VARCHAR(50) DEFAULT 'high',
      enabled BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id UUID PRIMARY KEY,
      tenant_id UUID REFERENCES tenants(id),
      user_id UUID REFERENCES users(id),
      name VARCHAR(255) NOT NULL,
      key_hash VARCHAR(255) NOT NULL,
      last_used TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
      action VARCHAR(255) NOT NULL,
      resource VARCHAR(255),
      status_code INTEGER,
      ip_address VARCHAR(64),
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Index for fast audit trail lookups
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
  `);

  // Migrations for existing tables
  try {
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title VARCHAR(255)');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT');
  } catch (err) {
    console.error('Migration error:', err.message);
  }

  console.log('✓ PostgreSQL Database initialized with Multi-Tenancy support');
}

export default dbHelper;
