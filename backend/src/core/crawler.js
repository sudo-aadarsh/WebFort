import puppeteer from 'puppeteer';

export class Crawler {
  constructor(baseUrl, maxDepth = 3, authConfig = null) {
    this.baseUrl = baseUrl;
    this.maxDepth = maxDepth;
    this.authConfig = authConfig; // { loginUrl, username, password, usernameField, passwordField, submitButton }
    this.visited = new Set();
    this.urls = [];
    this.forms = [];
    this.headers = {};
    this.technologies = new Set();
    const parsed = new URL(baseUrl);
    this.baseDomain = parsed.hostname;
    this.baseOrigin = parsed.origin;
    this.browser = null;
  }

  async crawl() {
    try {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      if (this.authConfig && this.authConfig.loginUrl) {
        await this.login();
      }

      await this.crawlUrl(this.baseUrl, 0);
    } catch (error) {
      console.error('Crawl error:', error.message);
      if (this.urls.length === 0) {
        this.urls.push(this.baseUrl);
      }
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }

    return {
      urls: [...new Set(this.urls)],
      forms: this.forms,
      headers: this.headers,
      technologies: Array.from(this.technologies)
    };
  }

  async login() {
    const page = await this.browser.newPage();
    try {
      console.log(`[Auth] Attempting login at ${this.authConfig.loginUrl}...`);
      await page.goto(this.authConfig.loginUrl, { waitUntil: 'networkidle2' });
      
      const { username, password, usernameField, passwordField, submitButton } = this.authConfig;
      
      await page.type(usernameField || 'input[type="email"], input[name="username"]', username);
      await page.type(passwordField || 'input[type="password"]', password);
      
      await Promise.all([
        page.click(submitButton || 'button[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'networkidle2' })
      ]);
      
      console.log(`[Auth] Login successful!`);
    } catch (error) {
      console.error(`[Auth] Login failed:`, error.message);
    } finally {
      await page.close();
    }
  }

  async crawlUrl(url, depth) {
    if (depth > this.maxDepth || this.visited.has(url) || this.visited.size > 50) return;
    this.visited.add(url);

    const page = await this.browser.newPage();
    
    // Set a realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 WebSecure/2.0');

    try {
      // Capture response headers for the base URL
      if (url === this.baseUrl) {
        page.on('response', response => {
          if (response.url() === url) {
            this.headers = response.headers();
          }
        });
      }

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      this.urls.push(url);

      // Detect technologies and extract data from the live DOM
      const pageData = await page.evaluate(() => {
        const extractLinks = () => {
          return Array.from(document.querySelectorAll('a[href]'))
            .map(a => a.href)
            .filter(href => href && !href.startsWith('#') && !href.startsWith('javascript:'));
        };

        const extractForms = () => {
          return Array.from(document.querySelectorAll('form')).map(form => ({
            action: form.action || window.location.href,
            method: (form.method || 'GET').toUpperCase(),
            inputs: Array.from(form.querySelectorAll('input, textarea, select')).map(input => ({
              name: input.name || '',
              type: input.type || 'text',
              value: input.value || ''
            })),
            pageUrl: window.location.href
          }));
        };

        const detectTech = () => {
          const tech = [];
          const html = document.documentElement.innerHTML.toLowerCase();
          
          if (document.querySelector('meta[name="generator"]')?.content?.toLowerCase().includes('wordpress')) tech.push('WordPress');
          if (document.querySelector('#wpadminbar') || document.querySelector('link[href*="wp-content"]')) tech.push('WordPress');
          
          if (document.querySelector('#__next')) tech.push('Next.js');
          if (document.querySelector('#root') || document.querySelector('[data-reactroot]')) tech.push('React');
          if (document.querySelector('[ng-app]') || document.querySelector('[ng-version]')) tech.push('Angular');
          if (document.querySelector('[data-v-app]') || document.querySelector('[data-server-rendered]')) tech.push('Vue.js');
          
          return tech;
        };

        return {
          links: extractLinks(),
          forms: extractForms(),
          tech: detectTech()
        };
      });

      // Update crawler state
      pageData.tech.forEach(t => this.technologies.add(t));
      this.forms.push(...pageData.forms);

      // Detect tech from headers too
      const poweredBy = this.headers['x-powered-by'] || '';
      if (poweredBy.toLowerCase().includes('php')) this.technologies.add('PHP');
      if (poweredBy.toLowerCase().includes('express')) this.technologies.add('Express.js');

      const cookies = this.headers['set-cookie'] || [];
      const cookieStr = Array.isArray(cookies) ? cookies.join(' ') : String(cookies);
      if (cookieStr.includes('laravel_session')) this.technologies.add('Laravel');
      if (cookieStr.includes('JSESSIONID')) this.technologies.add('Java');
      if (cookieStr.includes('PHPSESSID')) this.technologies.add('PHP');

      // Recursively crawl discovered links
      const nextUrls = pageData.links
        .map(link => this.resolveUrl(link))
        .filter(link => link && this.isSameDomain(link) && !this.visited.has(link));

      await page.close();

      // Limit concurrency for sub-links
      for (const nextUrl of nextUrls.slice(0, 5)) {
        await this.crawlUrl(nextUrl, depth + 1);
      }

    } catch (error) {
      console.error(`Error crawling ${url}:`, error.message);
      await page.close();
    }
  }

  resolveUrl(href) {
    if (!href) return null;
    try {
      const url = new URL(href, this.baseUrl);
      url.hash = ''; // Remove fragments
      return url.href;
    } catch {
      return null;
    }
  }

  isSameDomain(url) {
    try {
      return new URL(url).hostname === this.baseDomain;
    } catch {
      return false;
    }
  }
}
