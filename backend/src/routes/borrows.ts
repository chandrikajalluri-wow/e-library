import express from 'express';
import { auth, checkRole } from '../middleware/authMiddleware';
import { RoleName } from '../types/enums';
import * as borrowController from '../controllers/borrowController';

const router = express.Router();

// Issue a book (User)
router.post('/issue', auth, borrowController.issueBook);

// Request return (User)
router.post('/return/:id', auth, borrowController.requestReturn);

// Pay fine (User - Dummy)
router.post('/pay-fine/:id', auth, borrowController.payFine);

// Accept return (Admin)
router.post('/accept-return/:id', auth, checkRole([RoleName.ADMIN]), borrowController.acceptReturn);

// My Borrows (User)
router.get('/my', auth, borrowController.getMyBorrows);

// All Borrows (Admin)
router.get('/', auth, checkRole([RoleName.ADMIN]), borrowController.getAllBorrows);

export default router;
