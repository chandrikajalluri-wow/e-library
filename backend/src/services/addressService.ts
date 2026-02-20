import Address from '../models/Address';

export const getAddresses = async (userId: string) => {
    return await Address.find({ user_id: userId }).sort({ isDefault: -1, createdAt: -1 });
};

export const addAddress = async (userId: string, data: any) => {
    const { street, city, state, zipCode, country, phoneNumber, isDefault } = data;
    if (!street || !city || !state || !zipCode || !country || !phoneNumber) {
        throw new Error('All address fields are required');
    }

    if (isDefault) {
        await Address.updateMany({ user_id: userId }, { isDefault: false });
    }

    const newAddress = new Address({
        user_id: userId,
        street,
        city,
        state,
        zipCode,
        country,
        phoneNumber,
        isDefault: !!isDefault
    });

    return await newAddress.save();
};

export const updateAddress = async (addressId: string, userId: string, data: any) => {
    const { street, city, state, zipCode, country, phoneNumber, isDefault } = data;
    const address = await Address.findOne({ _id: addressId, user_id: userId });
    if (!address) throw new Error('Address not found');

    if (isDefault && !address.isDefault) {
        await Address.updateMany({ user_id: userId }, { isDefault: false });
    }

    address.street = street || address.street;
    address.city = city || address.city;
    address.state = state || address.state;
    address.zipCode = zipCode || address.zipCode;
    address.country = country || address.country;
    address.phoneNumber = phoneNumber || address.phoneNumber;
    address.isDefault = isDefault !== undefined ? !!isDefault : address.isDefault;

    return await address.save();
};

export const deleteAddress = async (addressId: string, userId: string) => {
    const address = await Address.findOne({ _id: addressId, user_id: userId });
    if (!address) throw new Error('Address not found');

    const wasDefault = address.isDefault;
    await Address.deleteOne({ _id: addressId });

    if (wasDefault) {
        const another = await Address.findOne({ user_id: userId });
        if (another) {
            another.isDefault = true;
            await another.save();
        }
    }

    return true;
};
