import axios from 'axios';
import * as cheerio from 'cheerio';

export class Crawler {
  constructor(baseUrl, maxDepth = 3) {
    this.baseUrl = baseUrl;
    this.maxDepth = maxDepth;
    this.visited = new Set();
    this.urls = [];
    this.forms = [];
    this.headers = {};
    const parsed = new URL(baseUrl);
    this.baseDomain = parsed.hostname;
    this.baseOrigin = parsed.origin;
  }

  async crawl() {
    try {
      await this.crawlUrl(this.baseUrl, 0);
    } catch (error) {
      console.error('Crawl error:', error.message);
      // Even if crawl fails, return at least the base URL
      if (this.urls.length === 0) {
        this.urls.push(this.baseUrl);
      }
    }
    return {
      urls: [...new Set(this.urls)],
      forms: this.forms,
      headers: this.headers
    };
  }

  async crawlUrl(url, depth) {
    if (depth > this.maxDepth || this.visited.has(url) || this.visited.size > 50) return;
    this.visited.add(url);

    try {
      const response = await axios.get(url, {
        timeout: 10000,
        maxRedirects: 5,
        headers: {
          'User-Agent': 'WebFort Security Scanner/1.0',
          'Accept': 'text/html,application/xhtml+xml'
        },
        validateStatus: (status) => status < 500
      });

      // Store response headers for the base URL
      if (url === this.baseUrl) {
        this.headers = response.headers;
      }

      this.urls.push(url);

      if (typeof response.data !== 'string') return;

      const $ = cheerio.load(response.data);

      // Extract links
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        const resolved = this.resolveUrl(href);
        if (resolved && this.isSameDomain(resolved)) {
          if (!this.visited.has(resolved)) {
            // Queue for crawling (don't await to prevent stack overflow)
            this.urls.push(resolved);
          }
        }
      });

      // Extract forms
      $('form').each((_, el) => {
        const form = {
          action: this.resolveUrl($(el).attr('action')) || url,
          method: ($(el).attr('method') || 'GET').toUpperCase(),
          inputs: [],
          pageUrl: url
        };

        $(el).find('input, textarea, select').each((_, input) => {
          const $input = $(input);
          form.inputs.push({
            name: $input.attr('name') || '',
            type: $input.attr('type') || 'text',
            value: $input.attr('value') || ''
          });
        });

        if (form.inputs.length > 0) {
          this.forms.push(form);
        }
      });

      // Extract URLs from script sources and other attributes
      $('script[src], link[href], img[src]').each((_, el) => {
        const src = $(el).attr('src') || $(el).attr('href');
        const resolved = this.resolveUrl(src);
        if (resolved && this.isSameDomain(resolved)) {
          this.urls.push(resolved);
        }
      });

      // Crawl discovered links (limited depth)
      const newUrls = this.urls.filter(u => !this.visited.has(u) && this.isSameDomain(u));
      for (const newUrl of newUrls.slice(0, 10)) {
        await this.crawlUrl(newUrl, depth + 1);
      }

    } catch (error) {
      // Silently skip unreachable URLs
    }
  }

  resolveUrl(href) {
    if (!href) return null;
    if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) return null;
    
    try {
      return new URL(href, this.baseUrl).href;
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
