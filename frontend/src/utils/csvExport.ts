
interface OrderExportData {
    _id: string;
    user: string;
    email: string;
    phone: string;
    items: number;
    total: number;
    deliveryFee: number;
    status: string;
    date: string;
    payment: string;
}

export const exportOrdersToCSV = (orders: any[]) => {
    const data: OrderExportData[] = orders.map(order => ({
        _id: order._id,
        user: order.user_id?.name || 'N/A',
        email: order.user_id?.email || 'N/A',
        phone: order.user_id?.phone || 'N/A',
        items: order.items?.reduce((sum: number, i: any) => sum + i.quantity, 0) || 0,
        total: order.totalAmount,
        deliveryFee: order.deliveryFee,
        status: order.status,
        date: new Date(order.createdAt).toLocaleString(),
        payment: order.paymentMethod || 'COD'
    }));

    const headers = ['Order ID', 'Customer', 'Email', 'Phone', 'Items count', 'Total Amount', 'Delivery Fee', 'Status', 'Order Date', 'Payment Method'];

    const csvRows = [
        headers.join(','),
        ...data.map(row => [
            `"${row._id}"`,
            `"${row.user}"`,
            `"${row.email}"`,
            `"${row.phone}"`,
            row.items,
            row.total,
            row.deliveryFee,
            `"${row.status}"`,
            `"${row.date}"`,
            `"${row.payment}"`
        ].join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Orders_Export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
