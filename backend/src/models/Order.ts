import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IOrderItem {
    book_id: Types.ObjectId;
    quantity: number;
    priceAtOrder: number;
}

export interface IOrder extends Document {
    user_id: Types.ObjectId;
    items: IOrderItem[];
    address_id: Types.ObjectId;
    totalAmount: number;
    deliveryFee: number;
    paymentMethod: string;
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    createdAt: Date;
}

const orderSchema = new Schema<IOrder>(
    {
        user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        items: [
            {
                book_id: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
                quantity: { type: Number, required: true },
                priceAtOrder: { type: Number, required: true },
            },
        ],
        address_id: { type: Schema.Types.ObjectId, ref: 'Address', required: true },
        totalAmount: { type: Number, required: true },
        deliveryFee: { type: Number, required: true },
        paymentMethod: { type: String, default: 'Cash on Delivery' },
        status: {
            type: String,
            enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
            default: 'pending',
        },
    },
    { timestamps: true }
);

export default mongoose.model<IOrder>('Order', orderSchema);
