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

export const updateAddress = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { street, city, state, zipCode, country, isDefault } = req.body;
    try {
        const address = await Address.findOne({ _id: id, user_id: req.user!._id });
        if (!address) {
            return res.status(404).json({ error: 'Address not found' });
        }

        // If this is being set as default, unset other defaults
        if (isDefault && !address.isDefault) {
            await Address.updateMany({ user_id: req.user!._id }, { isDefault: false });
        }

        address.street = street || address.street;
        address.city = city || address.city;
        address.state = state || address.state;
        address.zipCode = zipCode || address.zipCode;
        address.country = country || address.country;
        address.isDefault = isDefault !== undefined ? !!isDefault : address.isDefault;

        await address.save();
        res.json(address);
    } catch (err: any) {
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
};

export const deleteAddress = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    try {
        const address = await Address.findOne({ _id: id, user_id: req.user!._id });
        if (!address) {
            return res.status(404).json({ error: 'Address not found' });
        }

        const wasDefault = address.isDefault;
        await Address.deleteOne({ _id: id });

        // If we deleted the default address, make another one default if available
        if (wasDefault) {
            const another = await Address.findOne({ user_id: req.user!._id });
            if (another) {
                another.isDefault = true;
                await another.save();
            }
        }

        res.json({ message: 'Address removed successfully' });
    } catch (err: any) {
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
};
