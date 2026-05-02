import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';
import { broadcast } from '../services/websocket.js';
import { XSSScanner } from './scanners/xss.js';
import { SQLiScanner } from './scanners/sqli.js';
import { CSRFScanner } from './scanners/csrf.js';
import { IDORScanner } from './scanners/idor.js';
import { RCEScanner } from './scanners/rce.js';
import { FileInclusionScanner } from './scanners/file-inclusion.js';
import { HeadersScanner } from './scanners/headers.js';
import { Crawler } from './crawler.js';

const activeScans = new Map();

export class ScanEngine {
  static async startScan(scanId, targetUrl, scanType, scanDepth) {
    const controller = new AbortController();
    activeScans.set(scanId, { controller, status: 'running' });

    // Run scan asynchronously
    setImmediate(async () => {
      try {
        db.prepare('UPDATE scans SET status = "running", started_at = datetime("now") WHERE id = ?').run(scanId);
        broadcast(scanId, { type: 'scan.started', scanId });

        // Phase 1: Crawl target
        ScanEngine.updateProgress(scanId, 5, 'Crawling target...');
        const crawler = new Crawler(targetUrl, scanDepth);
        const crawlResults = await crawler.crawl();
        
        const urls = crawlResults.urls;
        const forms = crawlResults.forms;
        const pagesScanned = urls.length;

        db.prepare('UPDATE scans SET pages_scanned = ? WHERE id = ?').run(pagesScanned, scanId);
        ScanEngine.updateProgress(scanId, 15, `Found ${pagesScanned} pages, ${forms.length} forms`);

        if (controller.signal.aborted) return;

        // Phase 2: Run scanners
        const scanners = ScanEngine.getScanners(scanType);
        const totalScanners = scanners.length;
        let completedScanners = 0;
        const allVulnerabilities = [];

        for (const ScannerClass of scanners) {
          if (controller.signal.aborted) return;

          const scannerName = ScannerClass.name;
          ScanEngine.updateProgress(scanId, 15 + Math.floor((completedScanners / totalScanners) * 75), `Running ${scannerName}...`);

          try {
            const scanner = new ScannerClass(targetUrl, urls, forms);
            const vulnerabilities = await scanner.scan();
            allVulnerabilities.push(...vulnerabilities);

            // Save vulnerabilities to database
            const insert = db.prepare(`
              INSERT INTO vulnerabilities (id, scan_id, type, severity, title, description, url, parameter, evidence, remediation, cvss_score, cwe_id, owasp_category)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            for (const vuln of vulnerabilities) {
              insert.run(
                uuidv4(), scanId, vuln.type, vuln.severity, vuln.title,
                vuln.description, vuln.url, vuln.parameter || null,
                vuln.evidence || null, vuln.remediation, vuln.cvssScore,
                vuln.cweId || null, vuln.owaspCategory || null
              );

              // Broadcast vulnerability found
              broadcast(scanId, { type: 'scan.vulnerability', scanId, vulnerability: vuln });
            }
          } catch (err) {
            console.error(`Scanner ${scannerName} error:`, err.message);
          }

          completedScanners++;
        }

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

        db.prepare(`
          UPDATE scans SET status = "completed", progress = 100, completed_at = datetime("now"),
          total_vulnerabilities = ?, critical_count = ?, high_count = ?, medium_count = ?, low_count = ?, info_count = ?
          WHERE id = ?
        `).run(counts.total, counts.critical, counts.high, counts.medium, counts.low, counts.info, scanId);

        ScanEngine.updateProgress(scanId, 100, 'Scan complete');
        broadcast(scanId, { type: 'scan.completed', scanId, results: counts });

      } catch (error) {
        console.error(`Scan ${scanId} failed:`, error);
        db.prepare('UPDATE scans SET status = "failed" WHERE id = ?').run(scanId);
        broadcast(scanId, { type: 'scan.error', scanId, error: error.message });
      } finally {
        activeScans.delete(scanId);
      }
    });
  }

  static getScanners(scanType) {
    const allScanners = [HeadersScanner, XSSScanner, SQLiScanner, CSRFScanner, IDORScanner, RCEScanner, FileInclusionScanner];
    
    if (scanType === 'quick') {
      return [HeadersScanner, XSSScanner, SQLiScanner];
    }
    if (scanType === 'api') {
      return [HeadersScanner, SQLiScanner, IDORScanner, RCEScanner];
    }
    return allScanners; // full scan
  }

  static updateProgress(scanId, progress, message) {
    db.prepare('UPDATE scans SET progress = ? WHERE id = ?').run(progress, scanId);
    broadcast(scanId, { type: 'scan.progress', scanId, progress, message });
  }

  static cancelScan(scanId) {
    const scan = activeScans.get(scanId);
    if (scan) {
      scan.controller.abort();
      activeScans.delete(scanId);
    }
  }
}
