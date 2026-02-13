import PDFDocument from 'pdfkit';

/**
 * Generates a PDF invoice buffer for an order.
 * @param order The populated order object (with book titles and address details)
 * @returns A promise that resolves to a base64 encoded string of the PDF content
 */
export const generateInvoicePdfBase64 = async (order: any): Promise<string> => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                margin: 50,
                size: 'A4'
            });
            const chunks: Buffer[] = [];

            doc.on('data', (chunk: Buffer) => chunks.push(chunk));
            doc.on('end', () => {
                const result = Buffer.concat(chunks);
                resolve(result.toString('base64'));
            });
            doc.on('error', (err: Error) => reject(err));

            // Header - Dark background (Simulating the Premium Frontend Header)
            doc.rect(0, 0, 612, 100).fill('#212529'); // Full width of A4 is ~595.28 but rect can bleed

            doc.fillColor('#ffffff').fontSize(24).font('Helvetica-Bold').text('BOOKSTACK', 50, 40);
            doc.fontSize(10).font('Helvetica').text('Your Modern Digital Library', 50, 70);

            doc.fontSize(22).font('Helvetica-Bold').text('INVOICE', 0, 40, { align: 'right', width: 545 });

            // Content Start (Below the dark header)
            doc.moveDown(4);

            const contentStartY = 120;
            doc.fillColor('#212529').fontSize(11).font('Helvetica-Bold').text('Order Details:', 50, contentStartY);
            doc.font('Helvetica').fontSize(10);
            doc.text(`Order ID: #${(order._id || 'N/A').toString().toUpperCase()}`, 50, contentStartY + 15);
            doc.text(`Date: ${order.createdAt ? new Date(order.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}`, 50, contentStartY + 30);

            // Status Handling
            const statusColors: Record<string, string> = {
                'cancelled': '#ef4444',
                'return_rejected': '#f59e0b',
                'pending': '#6366f1',
                'delivered': '#10b981'
            };

            const status = order.status || 'pending';
            const statusLabel = status.toUpperCase().replace(/_/g, ' ');
            const statusColor = statusColors[status] || '#212529';

            doc.fillColor(statusColor).text(`Status: ${statusLabel} (${order.paymentMethod || 'COD'})`, 50, contentStartY + 45);
            doc.fillColor('#212529');

            // Visual Stamp for Critical Statuses
            if (status === 'cancelled') {
                doc.save();
                doc.fillColor('#ef4444').fontSize(14).font('Helvetica-Bold').text('CANCELLED', 450, 80, { align: 'right', width: 100 });
                doc.restore();
            } else if (status === 'return_rejected') {
                doc.save();
                doc.fillColor('#f59e0b').fontSize(14).font('Helvetica-Bold').text('REJECTED', 450, 80, { align: 'right', width: 100 });
                doc.restore();
            } else if (status === 'delivered') {
                doc.save();
                doc.fillColor('#10b981').fontSize(14).font('Helvetica-Bold').text('PAID', 450, 80, { align: 'right', width: 100 });
                doc.restore();
            }

            // Shipping To
            doc.font('Helvetica-Bold').fontSize(11).text('Shipping To:', 350, contentStartY, { align: 'right', width: 200 });
            const address = order.address_id || {};
            doc.font('Helvetica').fontSize(10);
            doc.text(`${address.street || 'Address not found'}`, 350, contentStartY + 15, { align: 'right', width: 200 });
            doc.text(`${address.city || ''}, ${address.state || ''}`, 350, contentStartY + 30, { align: 'right', width: 200 });
            doc.text(`${address.zipCode || ''}, ${address.country || ''}`, 350, contentStartY + 45, { align: 'right', width: 200 });
            if (address.phoneNumber) {
                doc.text(`Phone: ${address.phoneNumber}`, 350, contentStartY + 60, { align: 'right', width: 200 });
            }

            // Items Table Header
            const tableTop = contentStartY + 90;
            doc.rect(50, tableTop, 500, 25).fill('#2d3e50'); // Dark table header
            doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');
            doc.text('#', 60, tableTop + 7);
            doc.text('Item Description', 90, tableTop + 7);
            doc.text('Qty', 350, tableTop + 7, { width: 50, align: 'center' });
            doc.text('Unit Price', 410, tableTop + 7, { width: 60, align: 'right' });
            doc.text('Total', 480, tableTop + 7, { width: 60, align: 'right' });

            // Items Grid
            let currentY = tableTop + 25;
            doc.fillColor('#212529').font('Helvetica');
            (order.items || []).forEach((item: any, index: number) => {
                const title = item.book_id?.title || 'Book Details Not Available';
                doc.text((index + 1).toString(), 60, currentY + 7);
                doc.text(title, 90, currentY + 7, { width: 250 });
                doc.text((item.quantity || 0).toString(), 350, currentY + 7, { width: 50, align: 'center' });
                doc.text(`₹${(item.priceAtOrder || 0).toFixed(2)}`, 410, currentY + 7, { width: 60, align: 'right' });
                doc.text(`₹${((item.quantity || 0) * (item.priceAtOrder || 0)).toFixed(2)}`, 480, currentY + 7, { width: 60, align: 'right' });

                currentY += 25;
                doc.moveTo(50, currentY).lineTo(550, currentY).stroke('#eee');
            });

            // Summary
            currentY += 10;
            doc.fontSize(10).font('Helvetica');
            const subtotal = (order.items || []).reduce((sum: number, item: any) => sum + ((item.priceAtOrder || 0) * (item.quantity || 0)), 0);

            doc.text('Subtotal:', 350, currentY, { width: 120, align: 'right' });
            doc.text(`₹${subtotal.toFixed(2)}`, 480, currentY, { width: 60, align: 'right' });

            currentY += 15;
            doc.text('Delivery Fee:', 350, currentY, { width: 120, align: 'right' });
            doc.text((order.deliveryFee || 0) > 0 ? `₹${(order.deliveryFee || 0).toFixed(2)}` : 'FREE', 480, currentY, { width: 60, align: 'right' });

            currentY += 15;
            doc.moveTo(350, currentY).lineTo(550, currentY).stroke('#eee');

            currentY += 10;
            doc.fontSize(14).font('Helvetica-Bold').fillColor('#2d3e50');
            doc.text('Total Amount:', 300, currentY, { width: 170, align: 'right' });
            doc.text(`₹${(order.totalAmount || 0).toFixed(2)}`, 480, currentY, { width: 60, align: 'right' });

            // Footer
            doc.fontSize(10).fillColor('#6c757d').font('Helvetica-Oblique');
            doc.text('Thank you for choosing BookStack!', 50, 750, { align: 'center', width: 500 });
            doc.fontSize(8).text('This is a computer-generated invoice.', 50, 765, { align: 'center', width: 500 });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};
