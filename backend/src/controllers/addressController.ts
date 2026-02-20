import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import * as addressService from '../services/addressService';

export const getAddresses = async (req: AuthRequest, res: Response) => {
    try {
        const addresses = await addressService.getAddresses(req.user!._id);
        res.json(addresses);
    } catch (err: any) {
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
};

export const addAddress = async (req: AuthRequest, res: Response) => {
    try {
        const newAddress = await addressService.addAddress(req.user!._id, req.body);
        res.status(201).json(newAddress);
    } catch (err: any) {
        res.status(err.message === 'All address fields are required' ? 400 : 500).json({ error: err.message });
    }
};

export const updateAddress = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const address = await addressService.updateAddress(id, req.user!._id, req.body);
        res.json(address);
    } catch (err: any) {
        res.status(err.message === 'Address not found' ? 404 : 500).json({ error: err.message });
    }
};

export const deleteAddress = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        await addressService.deleteAddress(id, req.user!._id);
        res.json({ message: 'Address removed successfully' });
    } catch (err: any) {
        res.status(err.message === 'Address not found' ? 404 : 500).json({ error: err.message });
    }
};

