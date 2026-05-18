import axios from 'axios';
import nodemailer from 'nodemailer';
import db from '../config/database.js';

const SEVERITY_LEVELS = { info: 0, low: 1, medium: 2, high: 3, critical: 4 };

// Configure mail transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  port: process.env.SMTP_PORT || 2525,
  auth: {
    user: process.env.SMTP_USER || 'user',
    pass: process.env.SMTP_PASS || 'pass',
  },
});

export async function dispatchAlerts(userId, scan, vulnerabilities, tenantId = null) {
  try {
    const configs = await db.prepare('SELECT * FROM alert_configs WHERE user_id = ? AND enabled = true AND tenant_id IS NOT DISTINCT FROM ?').all(userId, tenantId);
    
    if (!configs || configs.length === 0) return;

    const highestSeverity = vulnerabilities.reduce((highest, v) => {
      return SEVERITY_LEVELS[v.severity] > SEVERITY_LEVELS[highest] ? v.severity : highest;
    }, 'info');

    const filteredConfigs = configs.filter(c => 
      SEVERITY_LEVELS[highestSeverity] >= SEVERITY_LEVELS[c.min_severity]
    );

    const scanUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reports/${scan.id}`;
    
    const message = `WebSecure Security Alert\n\nTarget: ${scan.target_url}\nScan ID: ${scan.id}\nHighest Severity: ${highestSeverity.toUpperCase()}\nTotal Vulnerabilities: ${vulnerabilities.length}\nCritical: ${scan.critical_count}\nHigh: ${scan.high_count}\n\nView Report: ${scanUrl}`;

    for (const config of filteredConfigs) {
      if (config.channel === 'slack') {
        await axios.post(config.endpoint, {
          text: message,
          blocks: [
            {
              type: "header",
              text: { type: "plain_text", text: "🛡️ WebSecure Security Alert" }
            },
            {
              type: "section",
              text: { type: "mrkdwn", text: `*Target:* ${scan.target_url}\n*Severity:* ${highestSeverity.toUpperCase()}\n*Critical Issues:* ${scan.critical_count}\n*High Issues:* ${scan.high_count}` }
            },
            {
              type: "actions",
              elements: [
                {
                  type: "button",
                  text: { type: "plain_text", text: "View Report" },
                  url: scanUrl
                }
              ]
            }
          ]
        }).catch(err => console.error('Slack alert failed:', err.message));
      } else if (config.channel === 'email') {
        await transporter.sendMail({
          from: '"WebSecure Security" <security@websecure.io>',
          to: config.endpoint,
          subject: `Security Alert [${highestSeverity.toUpperCase()}] - ${scan.target_url}`,
          text: message,
        }).catch(err => console.error('Email alert failed:', err.message));
      } else if (config.channel === 'webhook') {
        await axios.post(config.endpoint, {
          scan,
          vulnerabilities,
        }).catch(err => console.error('Webhook alert failed:', err.message));
      }
    }
  } catch (err) {
    console.error('Error dispatching alerts:', err.message);
  }
}
