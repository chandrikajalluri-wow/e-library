import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import Address from '../models/Address';

export const getAddresses = async (req: AuthRequest, res: Response) => {
    try {
        const addresses = await Address.find({ user_id: req.user!._id }).sort({ isDefault: -1, createdAt: -1 });
        res.json(addresses);
    } catch (err: any) {
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
};

export const addAddress = async (req: AuthRequest, res: Response) => {
    const { street, city, state, zipCode, country, isDefault } = req.body;
    try {
        if (!street || !city || !state || !zipCode || !country) {
            return res.status(400).json({ error: 'All address fields are required' });
        }

        // If this is set as default, unset other defaults
        if (isDefault) {
            await Address.updateMany({ user_id: req.user!._id }, { isDefault: false });
        }

        const newAddress = new Address({
            user_id: req.user!._id,
            street,
            city,
            state,
            zipCode,
            country,
            isDefault: !!isDefault
        });

        await newAddress.save();
        res.status(201).json(newAddress);
    } catch (err: any) {
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
};
