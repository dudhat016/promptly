import express from 'express';
import { DataService } from '../services/dataService.js';
import { authMiddleware } from '../middleware/auth.js';



const router = express.Router();

/**
 * Generic Data Router
 * Handles standard CRUD operations for Firestore collections
 */

// GET collection
router.get('/:collection', async (req, res, next) => {
  try {
    const data = await DataService.getCollection(req.params.collection);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// GET document
router.get('/:collection/:id', async (req, res, next) => {
  try {
    const data = await DataService.getDocument(req.params.collection, req.params.id);
    res.json({ success: true, data: data || null });
  } catch (error) {
    next(error);
  }
});

// POST (Create)
router.post('/:collection', authMiddleware, async (req, res, next) => {
  try {
    const result = await DataService.createDocument(req.params.collection, req.body);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

// PATCH (Update)
router.patch('/:collection/:id', authMiddleware, async (req, res, next) => {
  try {
    const result = await DataService.updateDocument(req.params.collection, req.params.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// DELETE
router.delete('/:collection/:id', authMiddleware, async (req, res, next) => {
  try {
    const result = await DataService.deleteDocument(req.params.collection, req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;

