import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface OrderItem {
    book_id: {
        title: string;
        price: number;
    };
    quantity: number;
    priceAtOrder: number;
}

interface OrderAddress {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
}

interface OrderData {
    _id: string;
    items: OrderItem[];
    address_id: OrderAddress;
    totalAmount: number;
    deliveryFee: number;
    paymentMethod: string;
    createdAt: string;
}

export const generateInvoice = (order: OrderData) => {
    const doc = new jsPDF() as any;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header - Premium Style
    doc.setFillColor(33, 37, 41); // Dark background for header
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('BOOKSTACK', 15, 25);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Your Modern Digital Library', 15, 32);

    doc.setFontSize(22);
    doc.text('INVOICE', pageWidth - 15, 25, { align: 'right' });

    // Reset text color for body
    doc.setTextColor(33, 37, 41);

    // Order Info
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Order Details:', 15, 55);
    doc.setFont('helvetica', 'normal');
    doc.text(`Order ID: #${order._id.toUpperCase()}`, 15, 62);
    doc.text(`Date: ${format(new Date(order.createdAt), 'dd MMM yyyy, hh:mm a')}`, 15, 68);
    doc.text(`Status: Paid (${order.paymentMethod})`, 15, 74);

    // Bill To
    doc.setFont('helvetica', 'bold');
    doc.text('Shipping To:', pageWidth - 15, 55, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    const addr = order.address_id;
    doc.text(`${addr.street}`, pageWidth - 15, 62, { align: 'right' });
    doc.text(`${addr.city}, ${addr.state}`, pageWidth - 15, 68, { align: 'right' });
    doc.text(`${addr.zipCode}, ${addr.country}`, pageWidth - 15, 74, { align: 'right' });

    // Table of Items
    const tableData = order.items.map((item, index) => [
        index + 1,
        item.book_id.title,
        `x ${item.quantity}`,
        `INR ${item.priceAtOrder.toFixed(2)}`,
        `INR ${(item.priceAtOrder * item.quantity).toFixed(2)}`
    ]);

    autoTable(doc, {
        startY: 90,
        head: [['#', 'Item Description', 'Qty', 'Unit Price', 'Total']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [45, 62, 80], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 5 },
        columnStyles: {
            0: { cellWidth: 15 },
            2: { cellWidth: 20 },
            3: { cellWidth: 35 },
            4: { cellWidth: 35, halign: 'right' }
        }
    });

    // Summary
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    const subtotal = order.items.reduce((sum, item) => sum + (item.priceAtOrder * item.quantity), 0);

    doc.setFont('helvetica', 'normal');
    const summaryX = pageWidth - 80; // Move labels further left
    const valueX = pageWidth - 15;

    doc.text('Subtotal:', summaryX, finalY);
    doc.text(`INR ${subtotal.toFixed(2)}`, valueX, finalY, { align: 'right' });

    doc.text('Delivery Fee:', summaryX, finalY + 7);
    doc.text(order.deliveryFee > 0 ? `INR ${order.deliveryFee.toFixed(2)}` : 'FREE', valueX, finalY + 7, { align: 'right' });

    doc.setLineWidth(0.5);
    doc.line(summaryX, finalY + 12, valueX, finalY + 12);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Total Amount:', summaryX, finalY + 20);
    doc.text(`INR ${order.totalAmount.toFixed(2)}`, valueX, finalY + 20, { align: 'right' });

    // Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('Thank you for choosing BookStack!', pageWidth / 2, pageHeight - 20, { align: 'center' });
    doc.text('This is a computer-generated invoice.', pageWidth / 2, pageHeight - 15, { align: 'center' });

    // Download
    doc.save(`Invoice_${order._id.toUpperCase()}.pdf`);
};
