import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';
import { broadcast } from '../services/websocket.js';
import { dispatchAlerts } from '../services/alerts.js';
import { analyzeVulnerability } from '../services/ai.js';
import { publish, QUEUES } from '../services/queue.js';
import { XSSScanner } from './scanners/xss.js';
import { SQLiScanner } from './scanners/sqli.js';
import { CSRFScanner } from './scanners/csrf.js';
import { IDORScanner } from './scanners/idor.js';
import { RCEScanner } from './scanners/rce.js';
import { FileInclusionScanner } from './scanners/file-inclusion.js';
import { HeadersScanner } from './scanners/headers.js';
import { SSRFScanner } from './scanners/ssrf.js';
import { OpenRedirectScanner } from './scanners/open-redirect.js';
import { SecretsScanner } from './scanners/secrets.js';
import { Crawler } from './crawler.js';
import { logger, metrics } from '../utils/logger.js';

const activeScans = new Map();

export class ScanEngine {
  /**
   * Start a scan — publishes to RabbitMQ if available,
   * otherwise falls back to in-process execution.
   */
  static async startScan(scanId, targetUrl, scanType, scanDepth, tenantId, authConfig = null) {
    const job = { scanId, targetUrl, scanType, scanDepth, tenantId, authConfig };
    metrics.scansStarted++;

    // Try to publish to the distributed queue
    const published = publish(QUEUES.SCAN_JOBS, job);

    if (published) {
      logger.info({ scanId, tenantId, targetUrl }, 'Scan dispatched to RabbitMQ');
      return;
    }

    // Fallback: run in-process (single-server mode)
    logger.warn({ scanId, tenantId }, 'RabbitMQ unavailable, running scan in-process');
    ScanEngine.executeScan(job);
  }

  /**
   * The actual scan execution logic.
   * Called either in-process (fallback) or by a standalone worker.
   */
  static async executeScan({ scanId, targetUrl, scanType, scanDepth, tenantId, authConfig = null }) {
    const controller = new AbortController();
    activeScans.set(scanId, { controller, status: 'running' });
    logger.info({ scanId, tenantId, targetUrl }, 'Starting scan execution');

    try {
      await db.prepare("UPDATE scans SET status = 'running', started_at = NOW() WHERE id = ? AND tenant_id IS NOT DISTINCT FROM ?").run(scanId, tenantId);
      broadcast(scanId, { type: 'scan.started', scanId }, tenantId);

      // Phase 1: Crawl target
      await ScanEngine.updateProgress(scanId, 5, 'Crawling target...', tenantId);
      const crawler = new Crawler(targetUrl, scanDepth, authConfig);
      const crawlResults = await crawler.crawl();

      const urls = crawlResults.urls;
      const forms = crawlResults.forms;
      const technologies = crawlResults.technologies || [];
      const pagesScanned = urls.length;

      await db.prepare('UPDATE scans SET pages_scanned = ? WHERE id = ? AND tenant_id IS NOT DISTINCT FROM ?').run(pagesScanned, scanId, tenantId);
      await ScanEngine.updateProgress(scanId, 15, `Found ${pagesScanned} pages, ${forms.length} forms. Tech: ${technologies.join(', ') || 'Unknown'}`, tenantId);

      if (controller.signal.aborted) return;

      // Phase 2: Run scanners
      const scanners = ScanEngine.getScanners(scanType);
      const totalScanners = scanners.length;
      let completedScanners = 0;
      const allVulnerabilities = [];

      await Promise.all(scanners.map(async (ScannerClass) => {
        if (controller.signal.aborted) return;

        const scannerName = ScannerClass.name;
        try {
          const scanner = new ScannerClass(targetUrl, urls, forms);
          const vulnerabilities = await scanner.scan();
          allVulnerabilities.push(...vulnerabilities);

          await Promise.all(vulnerabilities.map(async (vuln) => {
            metrics.vulnerabilitiesFound++;
            // Run AI analysis
            const aiAnalysis = await analyzeVulnerability(vuln);
            const isFalsePositive = aiAnalysis.isFalsePositive && aiAnalysis.confidence > 80;
            
            if (isFalsePositive) {
              logger.debug({ scanId, vulnType: vuln.type }, 'AI flagged false positive');
            }

            await db.prepare(`
              INSERT INTO vulnerabilities
                (id, tenant_id, scan_id, type, severity, title, description, url, parameter, evidence, remediation, cvss_score, cwe_id, owasp_category, is_false_positive)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              uuidv4(), tenantId, scanId, vuln.type, vuln.severity, vuln.title,
              vuln.description, vuln.url, vuln.parameter || null,
              vuln.evidence || null, vuln.remediation, vuln.cvssScore,
              vuln.cweId || null, vuln.owaspCategory || null,
              isFalsePositive ? 1 : 0
            );

            broadcast(scanId, { type: 'scan.vulnerability', scanId, vulnerability: { ...vuln, isFalsePositive } }, tenantId);
          }));
        } catch (err) {
          console.error(`Scanner ${scannerName} error:`, err.message);
        }

        completedScanners++;
        await ScanEngine.updateProgress(
          scanId,
          15 + Math.floor((completedScanners / totalScanners) * 75),
          `Completed ${scannerName}...`,
          tenantId
        );
      }));

      // Phase 3: Finalize
      if (controller.signal.aborted) return;

      const counts = {
        total: allVulnerabilities.length,
        critical: allVulnerabilities.filter(v => v.severity === 'critical').length,
        high: allVulnerabilities.filter(v => v.severity === 'high').length,
        medium: allVulnerabilities.filter(v => v.severity === 'medium').length,
        low: allVulnerabilities.filter(v => v.severity === 'low').length,
        info: allVulnerabilities.filter(v => v.severity === 'info').length,
      };

      await db.prepare(`
        UPDATE scans
        SET status = 'completed', progress = 100, completed_at = NOW(),
            total_vulnerabilities = ?, critical_count = ?, high_count = ?,
            medium_count = ?, low_count = ?, info_count = ?
        WHERE id = ? AND tenant_id IS NOT DISTINCT FROM ?
      `).run(counts.total, counts.critical, counts.high, counts.medium, counts.low, counts.info, scanId, tenantId);

      await ScanEngine.updateProgress(scanId, 100, 'Scan complete', tenantId);
      metrics.scansCompleted++;
      logger.info({ scanId, tenantId, vulnTotal: counts.total }, 'Scan completed successfully');
      broadcast(scanId, { type: 'scan.completed', scanId, results: counts }, tenantId);

      // Dispatch alerts
      const scanRecord = await db.prepare('SELECT * FROM scans WHERE id = ? AND tenant_id IS NOT DISTINCT FROM ?').get(scanId, tenantId);
      if (allVulnerabilities.length > 0 && scanRecord) {
        dispatchAlerts(scanRecord.user_id, scanRecord, allVulnerabilities, tenantId);
      }

    } catch (error) {
      metrics.scansFailed++;
      logger.error({ scanId, tenantId, error: error.message, stack: error.stack }, 'Scan failed');
      await db.prepare("UPDATE scans SET status = 'failed' WHERE id = ? AND tenant_id IS NOT DISTINCT FROM ?").run(scanId, tenantId);
      broadcast(scanId, { type: 'scan.error', scanId, error: error.message }, tenantId);
    } finally {
      activeScans.delete(scanId);
    }
  }

  static getScanners(scanType) {
    const allScanners = [
      HeadersScanner, 
      XSSScanner, 
      SQLiScanner, 
      CSRFScanner, 
      IDORScanner, 
      RCEScanner, 
      FileInclusionScanner,
      SSRFScanner,
      OpenRedirectScanner,
      SecretsScanner
    ];

    if (scanType === 'quick') return [HeadersScanner, XSSScanner, SQLiScanner, OpenRedirectScanner];
    if (scanType === 'api') return [HeadersScanner, SQLiScanner, IDORScanner, RCEScanner, SSRFScanner];
    return allScanners;
  }

  static async updateProgress(scanId, progress, message, tenantId = null) {
    await db.prepare('UPDATE scans SET progress = ? WHERE id = ? AND tenant_id IS NOT DISTINCT FROM ?').run(progress, scanId, tenantId);
    broadcast(scanId, { type: 'scan.progress', scanId, progress, message }, tenantId);
  }

  static cancelScan(scanId) {
    const scan = activeScans.get(scanId);
    if (scan) {
      scan.controller.abort();
      activeScans.delete(scanId);
    }
  }
}
