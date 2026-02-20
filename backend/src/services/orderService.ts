import Order from '../models/Order';
import Book from '../models/Book';
import ActivityLog from '../models/ActivityLog';
import User from '../models/User';
import Address from '../models/Address';
import Membership from '../models/Membership';
import Readlist from '../models/Readlist';
import { NotificationType, MembershipName, BookStatus, OrderStatus, ActivityAction, RoleName } from '../types/enums';
import { sendNotification, notifyAdmins } from '../utils/notification';
import { sendEmail } from '../utils/mailer';
import { getOrderStatusUpdateTemplate } from '../utils/emailTemplates';
import { generateInvoicePdfBase64 } from '../utils/pdfGenerator';

export const placeOrder = async (userId: string, items: any[], selectedAddressId: string) => {
    if (!items || !Array.isArray(items) || items.length === 0) throw new Error('Cart is empty');
    if (!selectedAddressId) throw new Error('Delivery address is required');

    const address = await Address.findById(selectedAddressId);
    if (!address || address.user_id.toString() !== userId.toString()) throw new Error('Address not found');

    const user = await User.findById(userId).populate('membership_id');
    if (!user) throw new Error('User not found');

    const membership = user.membership_id as any;
    const bookIds = items.map((item: any) => item.book_id);
    const books = await Book.find({ _id: { $in: bookIds } });
    const bookMap = new Map(books.map(b => [b._id.toString(), b]));

    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
        const book = bookMap.get(item.book_id);
        if (!book) throw new Error(`Book not found: ${item.book_id}`);
        if (book.noOfCopies < item.quantity) throw new Error(`Insufficient stock for "${book.title}"`);

        subtotal += book.price * item.quantity;
        orderItems.push({
            book_id: book._id,
            quantity: item.quantity,
            priceAtOrder: book.price
        });
    }

    const isPremium = membership?.name === MembershipName.PREMIUM;
    const deliveryFee = (subtotal >= 500 || isPremium) ? 0 : 50;
    const totalAmount = subtotal + deliveryFee;

    const estimatedDeliveryDate = new Date();
    estimatedDeliveryDate.setHours(estimatedDeliveryDate.getHours() + (isPremium ? 24 : 96));

    const newOrder = new Order({
        user_id: userId,
        items: orderItems,
        address_id: selectedAddressId,
        totalAmount,
        deliveryFee,
        paymentMethod: 'Cash on Delivery',
        status: 'pending',
        estimatedDeliveryDate
    });

    await newOrder.save();

    for (const item of items) {
        const book = bookMap.get(item.book_id)!;
        book.noOfCopies -= item.quantity;
        if (book.noOfCopies === 0) book.status = BookStatus.OUT_OF_STOCK;
        await book.save();
    }

    const totalItemsInOrder = items.reduce((sum, item) => sum + item.quantity, 0);
    await sendNotification(
        NotificationType.ORDER,
        `Order confirmed: ${totalItemsInOrder} book(s) will be delivered to ${address.city}`,
        userId as any,
        null as any,
        newOrder._id.toString()
    );

    await notifyAdmins(
        `New Order: ${user.name} placed order #${newOrder._id.toString().slice(-8).toUpperCase()} for ${totalItemsInOrder} item(s)`,
        NotificationType.ORDER,
        bookIds,
        newOrder._id.toString()
    );

    return newOrder;
};

export const getAllOrders = async (query: any) => {
    const { status, search, startDate, endDate, sort, membership, page, limit, reason } = query;
    let filter: any = {};

    if (reason && reason !== 'all') {
        filter.returnReason = reason === 'Others' ? { $nin: ['Damaged Book', 'Pages Missing', 'Print Error'] } : reason;
    }

    if (status && status !== 'all') {
        filter.status = typeof status === 'string' && status.includes(',') ? { $in: status.split(',') } : status;
    }

    if (startDate && endDate) {
        filter.createdAt = { $gte: new Date(startDate as string), $lte: new Date(endDate as string) };
    }

    let userIds: any[] = [];
    let hasUserFilter = false;

    if (search) {
        const users = await User.find({ name: { $regex: search, $options: 'i' } }).select('_id');
        userIds = users.map(user => user._id);
        hasUserFilter = true;
    }

    if (membership && membership !== 'all') {
        const membershipDoc = await Membership.findOne({ name: membership });
        if (membershipDoc) {
            const usersWithMembership = await User.find({ membership_id: membershipDoc._id }).select('_id');
            const membershipUserIds = usersWithMembership.map(u => u._id.toString());
            userIds = hasUserFilter ? userIds.filter(id => membershipUserIds.includes(id.toString())) : membershipUserIds;
            hasUserFilter = true;
        }
    }

    if (hasUserFilter) filter.user_id = { $in: userIds };

    if (search) {
        filter.$or = [{ user_id: filter.user_id }, { $expr: { $regexMatch: { input: { $toString: "$_id" }, regex: search, options: "i" } } }];
        delete filter.user_id;
    }

    let sortOption: any = { createdAt: -1 };
    if (sort === 'oldest') sortOption = { createdAt: 1 };
    else if (sort === 'total_asc') sortOption = { totalAmount: 1 };
    else if (sort === 'total_desc') sortOption = { totalAmount: -1 };

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;

    const totalOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / limitNum);

    const counts = {
        total: totalOrders,
        pending: await Order.countDocuments({ ...filter, status: 'pending' }),
        processing: await Order.countDocuments({ ...filter, status: 'processing' }),
        shipped: await Order.countDocuments({ ...filter, status: 'shipped' }),
        delivered: await Order.countDocuments({ ...filter, status: 'delivered' }),
        cancelled: await Order.countDocuments({ ...filter, status: 'cancelled' }),
    };

    const orders = await Order.find(filter)
        .populate({ path: 'user_id', select: 'name email phone membership_id', populate: { path: 'membership_id', select: 'name displayName' } })
        .populate({ path: 'items.book_id', select: 'title cover_image_url price addedBy', populate: { path: 'addedBy', select: 'name' } })
        .populate('address_id')
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum);

    return { orders, totalOrders, totalPages, currentPage: pageNum, limit: limitNum, counts };
};

const isStatusTransitionAllowed = (current: string, next: string): boolean => {
    const sequence = [OrderStatus.PENDING, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED];
    const currentIndex = sequence.indexOf(current as OrderStatus);
    const nextIndex = sequence.indexOf(next as OrderStatus);
    if (currentIndex !== -1 && nextIndex !== -1) return nextIndex === currentIndex + 1;
    if (next === OrderStatus.CANCELLED) return current === OrderStatus.PENDING || current === OrderStatus.PROCESSING;
    if (current === OrderStatus.RETURN_REQUESTED) return [OrderStatus.RETURN_ACCEPTED, OrderStatus.RETURN_REJECTED, OrderStatus.REFUND_INITIATED].includes(next as OrderStatus);
    if (current === OrderStatus.RETURN_ACCEPTED) return [OrderStatus.RETURNED, OrderStatus.REFUND_INITIATED].includes(next as OrderStatus);
    if (current === OrderStatus.RETURNED) return [OrderStatus.PROCESSING, OrderStatus.REFUND_INITIATED].includes(next as OrderStatus);
    if (current === OrderStatus.REFUND_INITIATED) return next === OrderStatus.REFUNDED;
    return false;
};

export const updateOrderStatus = async (orderId: string, status: string, admin: any) => {
    const validStatuses = Object.values(OrderStatus) as string[];
    if (!validStatuses.includes(status)) throw new Error('Invalid status');

    const order = await Order.findById(orderId).populate('user_id', 'name email');
    if (!order) throw new Error('Order not found');

    const previousStatus = order.status;
    if (previousStatus !== status && !isStatusTransitionAllowed(previousStatus, status)) {
        throw new Error(`Invalid status transition from ${previousStatus} to ${status}`);
    }

    if (status === OrderStatus.REFUNDED && !order.refundDetails?.accountNumber) {
        throw new Error('Cannot mark as Refunded. Bank details missing.');
    }

    order.status = status as OrderStatus;

    if ((status === OrderStatus.CANCELLED || status === OrderStatus.RETURNED) && previousStatus !== status) {
        for (const item of order.items) {
            const book = await Book.findById(item.book_id);
            if (book) {
                book.noOfCopies += item.quantity;
                if (book.status === BookStatus.OUT_OF_STOCK && book.noOfCopies > 0) book.status = BookStatus.AVAILABLE;
                await book.save();
            }
        }
        await Readlist.deleteMany({ user_id: order.user_id, book_id: { $in: order.items.map(i => i.book_id) }, dueDate: null });
    }

    if (status === OrderStatus.DELIVERED && (!order.deliveredAt || previousStatus !== OrderStatus.DELIVERED)) {
        order.deliveredAt = new Date();
        const user = await User.findById(order.user_id).populate('membership_id');
        const membership = user?.membership_id as any;
        const accessDuration = membership?.accessDuration || 14;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + accessDuration);

        for (const item of order.items) {
            await Readlist.findOneAndUpdate(
                { user_id: order.user_id, book_id: item.book_id },
                { status: 'active', addedAt: new Date(), dueDate: dueDate, source: 'order' },
                { upsert: true }
            );
        }
    }

    // Notifications
    const statusLabels: Record<string, string> = {
        [OrderStatus.PROCESSING]: 'is being processed',
        [OrderStatus.SHIPPED]: 'has been shipped',
        [OrderStatus.DELIVERED]: 'has been delivered',
        [OrderStatus.CANCELLED]: 'has been cancelled'
    };

    if (statusLabels[status] && previousStatus !== status) {
        await sendNotification(NotificationType.ORDER, `Your order #${order._id.toString().slice(-8).toUpperCase()} ${statusLabels[status]}.`, order.user_id as any, null as any, order._id.toString());
    }

    if ((status === OrderStatus.RETURNED || status === OrderStatus.RETURN_REJECTED) && previousStatus !== status) {
        const message = status === OrderStatus.RETURNED ? `Your exchange request for Order #${order._id.toString().slice(-8).toUpperCase()} has been APPROVED.` : `Your exchange request for Order #${order._id.toString().slice(-8).toUpperCase()} has been REJECTED.`;
        await sendNotification(NotificationType.ORDER, message, order.user_id as any, null as any, order._id.toString());
    }

    if ((status === OrderStatus.REFUND_INITIATED || status === OrderStatus.REFUNDED) && previousStatus !== status) {
        const message = status === OrderStatus.REFUND_INITIATED ? `Refund initiated for Order #${order._id.toString().slice(-8).toUpperCase()}. Please provide your bank details.` : `Refund completed for Order #${order._id.toString().slice(-8).toUpperCase()}.`;
        await sendNotification(NotificationType.ORDER, message, order.user_id as any, null as any, order._id.toString());
    }

    await order.save();

    await new ActivityLog({
        user_id: admin._id,
        action: status === OrderStatus.RETURN_REQUESTED ? ActivityAction.EXCHANGE_REQUEST_UPDATED : ActivityAction.ORDER_STATUS_UPDATED,
        description: `Order #${order._id} status updated to ${status} by ${admin.name}`,
    }).save();

    // Email
    const populatedOrder = (await Order.findById(order._id).populate('items.book_id', 'title').populate('address_id')) || order;
    const user = order.user_id as any;
    const emailSubject = `Your Order Status Update - #${order._id.toString().slice(-8).toUpperCase()}`;
    const emailText = `Hi ${user.name}, your order #${order._id.toString().slice(-8).toUpperCase()} status is ${status}.`;

    const attachments = [];
    if (['shipped', 'delivered'].includes(status.toLowerCase())) {
        try {
            const pdfBase64 = await generateInvoicePdfBase64(populatedOrder);
            attachments.push({ name: `Invoice_${order._id.toString().slice(-8).toUpperCase()}.pdf`, content: pdfBase64 });
        } catch (pdfErr) { console.error('PDF error:', pdfErr); }
    }

    sendEmail(user.email, emailSubject, emailText, getOrderStatusUpdateTemplate(user.name, populatedOrder, status), attachments).catch(e => console.error('Email error:', e));

    return order;
};

export const submitRefundDetails = async (orderId: string, userId: string, details: any, userName: string) => {
    const { accountName, bankName, accountNumber, ifscCode } = details;
    if (!accountName || !bankName || !accountNumber || !ifscCode) throw new Error('All bank details are required');

    const order = await Order.findById(orderId);
    if (!order) throw new Error('Order not found');
    if (order.user_id.toString() !== userId.toString()) throw new Error('Unauthorized');
    if (order.status !== OrderStatus.REFUND_INITIATED) throw new Error('Refund not initiated');

    order.refundDetails = { accountName, bankName, accountNumber, ifscCode, submittedAt: new Date() };
    await order.save();

    await notifyAdmins(`Refund Details Submitted: User ${userName} for Order #${order._id.toString().slice(-8).toUpperCase()}`, NotificationType.ORDER, order.items.map(i => i.book_id.toString()), order._id.toString());

    return order;
};

export const bulkUpdateOrderStatus = async (orderIds: string[], status: string, admin: any) => {
    const validStatuses = Object.values(OrderStatus) as string[];
    if (!validStatuses.includes(status)) throw new Error('Invalid status');

    const orders = await Order.find({ _id: { $in: orderIds } }).populate('user_id', 'name email');
    let modifiedCount = 0;
    let skippedCount = 0;

    for (const order of orders) {
        const previousStatus = order.status;
        if (previousStatus === status || !isStatusTransitionAllowed(previousStatus, status) || (status === OrderStatus.REFUNDED && !order.refundDetails?.accountNumber)) {
            skippedCount++;
            continue;
        }

        order.status = status as OrderStatus;
        if (status === OrderStatus.RETURNED || status === OrderStatus.CANCELLED) {
            await Readlist.deleteMany({ user_id: order.user_id, book_id: { $in: order.items.map(i => i.book_id) }, dueDate: null });
        }

        if (status === OrderStatus.DELIVERED && (!order.deliveredAt || previousStatus !== OrderStatus.DELIVERED)) {
            order.deliveredAt = new Date();
            const user = await User.findById(order.user_id).populate('membership_id');
            const membership = user?.membership_id as any;
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + (membership?.accessDuration || 14));
            for (const item of order.items) {
                await Readlist.findOneAndUpdate({ user_id: order.user_id, book_id: item.book_id }, { status: 'active', addedAt: new Date(), dueDate, source: 'order' }, { upsert: true });
            }
        }

        await new ActivityLog({ user_id: admin._id, action: ActivityAction.ORDER_STATUS_UPDATED, description: `Order #${order._id} status updated to ${status} by ${admin.name}` }).save();
        await order.save();

        const statusLabels: any = { [OrderStatus.PROCESSING]: 'is being processed', [OrderStatus.SHIPPED]: 'has been shipped', [OrderStatus.DELIVERED]: 'has been delivered', [OrderStatus.CANCELLED]: 'has been cancelled', [OrderStatus.RETURNED]: 'exchange has been approved' };
        if (statusLabels[status]) await sendNotification(NotificationType.ORDER, `Your order #${order._id.toString().slice(-8).toUpperCase()} ${statusLabels[status]}.`, order.user_id as any, null as any, order._id.toString());

        modifiedCount++;
    }

    return { modifiedCount, skippedCount };
};

export const getOrderById = async (orderId: string) => {
    const order = await Order.findById(orderId)
        .populate('user_id', 'name email phone')
        .populate({ path: 'items.book_id', select: 'title cover_image_url price addedBy', populate: { path: 'addedBy', select: 'name' } })
        .populate('address_id');
    if (!order) throw new Error('Order not found');
    return order;
};

export const getMyOrders = async (userId: string, filter: any) => {
    const { status, sort } = filter;
    let query: any = { user_id: userId };
    if (status && status !== 'all') {
        query.status = typeof status === 'string' && status.includes(',') ? { $in: status.split(',') } : status;
    }
    let sortObj: any = { createdAt: -1 };
    if (sort === 'oldest') sortObj = { createdAt: 1 };
    else if (sort === 'price_high') sortObj = { totalAmount: -1 };
    else if (sort === 'price_low') sortObj = { totalAmount: 1 };

    return await Order.find(query).populate({ path: 'items.book_id', select: 'title cover_image_url price author addedBy', populate: { path: 'addedBy', select: 'name' } }).populate('address_id').sort(sortObj);
};

export const cancelOwnOrder = async (orderId: string, userId: string) => {
    const order = await Order.findById(orderId);
    if (!order) throw new Error('Order not found');
    if (order.user_id.toString() !== userId.toString()) throw new Error('Unauthorized');
    if (!['pending', 'processing'].includes(order.status)) throw new Error(`Cannot cancel order in ${order.status} status`);

    for (const item of order.items) {
        const book = await Book.findById(item.book_id);
        if (book) {
            book.noOfCopies += item.quantity;
            if (book.status === BookStatus.OUT_OF_STOCK && book.noOfCopies > 0) book.status = BookStatus.AVAILABLE;
            await book.save();
        }
    }

    order.status = OrderStatus.CANCELLED;
    await order.save();

    await sendNotification(NotificationType.ORDER, `Order cancelled: Your order #${order._id.toString().slice(-8).toUpperCase()} has been cancelled.`, userId as any, null as any, order._id.toString());
    return order;
};

export const requestReturnOrder = async (orderId: string, userId: string, reason: string, file: any, userName: string) => {
    if (!reason) throw new Error('Reason for exchange is required');
    const order = await Order.findById(orderId);
    if (!order) throw new Error('Order not found');
    if (order.user_id.toString() !== userId.toString()) throw new Error('Unauthorized');
    if (order.status !== OrderStatus.DELIVERED) throw new Error(`Cannot request exchange for order in ${order.status}`);

    const deliveryDateStr = order.deliveredAt || (order as any).updatedAt || order.createdAt;
    const diffInDays = (new Date().getTime() - new Date(deliveryDateStr).getTime()) / (1000 * 3600 * 24);
    if (diffInDays > 7) throw new Error('Exchange window has expired');

    order.status = OrderStatus.RETURN_REQUESTED;
    order.returnReason = reason;
    if (file) order.exchangeImageUrl = file.path;

    await order.save();
    await sendNotification(NotificationType.ORDER, `Exchange request submitted for Order #${order._id.toString().slice(-8).toUpperCase()}.`, userId as any, null as any, order._id.toString());
    return order;
};

export const generateInvoicePdf = async (orderId: string, user: any) => {
    const order = await Order.findById(orderId)
        .populate('user_id', 'name email')
        .populate('items.book_id', 'title cover_image_url price author addedBy')
        .populate('address_id');
    if (!order) throw new Error('Order not found');

    const userRole = (user.role_id as any).name;
    const currentUserId = user._id.toString();

    if (userRole !== RoleName.SUPER_ADMIN && userRole !== RoleName.ADMIN && order.user_id._id.toString() !== currentUserId) {
        throw new Error('Unauthorized');
    }

    let orderToGenerate = order.toObject();
    if (userRole === RoleName.ADMIN) {
        const filteredItems = orderToGenerate.items.filter((item: any) => item.book_id?.addedBy?.toString() === currentUserId);
        if (filteredItems.length === 0) throw new Error('Unauthorized');
        orderToGenerate.items = filteredItems;
        const subtotal = filteredItems.reduce((sum: number, item: any) => sum + (item.priceAtOrder * item.quantity), 0);
        orderToGenerate.totalAmount = subtotal + order.deliveryFee;
    }

    const pdfBase64 = await generateInvoicePdfBase64(orderToGenerate);
    return { buffer: Buffer.from(pdfBase64, 'base64'), orderId: orderToGenerate._id };
};
