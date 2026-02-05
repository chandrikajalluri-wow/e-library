
interface OrderExportData {
    _id: string;
    user: string;
    email: string;
    phone: string;
    bookIds: string;
    items: number;
    total: number;
    deliveryFee: number;
    status: string;
    date: string;
    payment: string;
}

interface BookExportData {
    _id: string;
    title: string;
    author: string;
    category: string;
    isbn: string;
    genre: string;
    language: string;
    price: number;
    pages: number;
    publishedYear: number;
    copies: number;
    status: string;
    isPremium: boolean;
    rating: number;
    addedBy: string;
}

export const exportOrdersToCSV = (orders: any[]) => {
    const data: OrderExportData[] = orders.map(order => ({
        _id: order._id,
        user: order.user_id?.name || 'N/A',
        email: order.user_id?.email || 'N/A',
        phone: order.user_id?.phone || 'N/A',
        bookIds: order.items?.map((item: any) => item.book_id?._id || 'N/A').join(', ') || 'N/A',
        items: order.items?.reduce((sum: number, i: any) => sum + i.quantity, 0) || 0,
        total: order.totalAmount,
        deliveryFee: order.deliveryFee,
        status: order.status,
        date: new Date(order.createdAt).toLocaleString(),
        payment: order.paymentMethod || 'COD'
    }));

    const headers = ['Order ID', 'Customer', 'Email', 'Phone', 'Book IDs', 'Items count', 'Total Amount', 'Delivery Fee', 'Status', 'Order Date', 'Payment Method'];

    const csvRows = [
        headers.join(','),
        ...data.map(row => [
            `"${row._id}"`,
            `"${row.user}"`,
            `"${row.email}"`,
            `"${row.phone}"`,
            `"${row.bookIds}"`,
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

export const exportBooksToCSV = (books: any[]) => {
    const data: BookExportData[] = books.map(book => ({
        _id: book._id,
        title: book.title,
        author: book.author,
        category: typeof book.category_id === 'string' ? book.category_id : (book.category_id?.name || 'N/A'),
        isbn: book.isbn || 'N/A',
        genre: book.genre || 'N/A',
        language: book.language || 'N/A',
        price: book.price || 0,
        pages: book.pages || 0,
        publishedYear: book.publishedYear || 0,
        copies: book.noOfCopies || 0,
        status: book.status || 'N/A',
        isPremium: book.isPremium || false,
        rating: book.rating || 0,
        addedBy: (book.addedBy as any)?.name || 'N/A'
    }));

    const headers = ['Book ID', 'Title', 'Author', 'Category', 'ISBN', 'Genre', 'Language', 'Price', 'Pages', 'Published Year', 'Copies', 'Status', 'Premium', 'Rating', 'Added By'];

    const csvRows = [
        headers.join(','),
        ...data.map(row => [
            `"${row._id}"`,
            `"${row.title}"`,
            `"${row.author}"`,
            `"${row.category}"`,
            `"${row.isbn}"`,
            `"${row.genre}"`,
            `"${row.language}"`,
            row.price,
            row.pages,
            row.publishedYear,
            row.copies,
            `"${row.status}"`,
            row.isPremium ? 'Yes' : 'No',
            row.rating,
            `"${row.addedBy}"`
        ].join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Books_Export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
