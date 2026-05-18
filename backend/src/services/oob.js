import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';

/**
 * OOB Service — Tracks out-of-band interactions (DNS/HTTP).
 * In production, this would be linked to a public-facing interactsh-style server.
 */
class OOBService {
  constructor() {
    this.interactions = new Map();
  }

  /**
   * Generates a unique interaction URL/token.
   */
  generateToken(scanId) {
    const token = uuidv4().replace(/-/g, '');
    const baseUrl = process.env.API_URL || 'http://localhost:3002';
    const callbackUrl = `${baseUrl}/api/oob/${token}`;
    
    this.interactions.set(token, { scanId, createdAt: Date.now(), hits: [] });
    return { token, callbackUrl };
  }

  /**
   * Records a hit to an interaction token.
   */
  async recordHit(token, data) {
    const interaction = this.interactions.get(token);
    if (interaction) {
      interaction.hits.push({ timestamp: Date.now(), ...data });
      console.log(`[OOB] Interaction detected for token ${token}!`);
      
      // In production, this might trigger an immediate notification or DB update
    }
  }

  /**
   * Checks if a token has been hit.
   */
  hasInteraction(token) {
    const interaction = this.interactions.get(token);
    return interaction && interaction.hits.length > 0;
  }

  /**
   * Cleanup old tokens.
   */
  cleanup() {
    const now = Date.now();
    for (const [token, data] of this.interactions.entries()) {
      if (now - data.createdAt > 3600000) { // 1 hour TTL
        this.interactions.delete(token);
      }
    }
  }
}

export const oobService = new OOBService();
