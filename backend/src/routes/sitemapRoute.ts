/**
 * Sitemap Route
 * Handles sitemap.xml generation
 */

import { Router } from 'express';
import { generateSitemap } from '../controllers/sitemapController';

const router = Router();

/**
 * @route GET /api/v1/sitemap.xml
 * @desc Generate dynamic XML sitemap
 * @access Public
 */
router.get('/sitemap.xml', generateSitemap);

export default router;

