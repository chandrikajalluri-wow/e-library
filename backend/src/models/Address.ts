import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAddress extends Document {
    user_id: Types.ObjectId;
    phoneNumber: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    isDefault: boolean;
    createdAt: Date;
}

const addressSchema = new Schema<IAddress>(
    {
        user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        phoneNumber: { type: String, required: true },
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        zipCode: { type: String, required: true },
        country: { type: String, required: true },
        isDefault: { type: Boolean, default: false },
    },
    { timestamps: true }
);

export default mongoose.model<IAddress>('Address', addressSchema);
