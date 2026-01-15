import React, { useEffect, useState } from 'react';
import { getAllOfflineBooks, removeOfflineBook } from '../utils/db';
import { toast } from 'react-toastify';
import Loader from '../components/Loader';
import Footer from '../components/Footer';
import '../styles/OfflineBooks.css';

const OfflineBooks: React.FC = () => {
    const [offlineBooks, setOfflineBooks] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewingPdf, setViewingPdf] = useState<{ blob: Blob; title: string } | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    useEffect(() => {
        fetchOfflineBooks();
    }, []);

    useEffect(() => {
        if (!viewingPdf) {
            setPdfUrl(null);
            return;
        }

        // Ensure the blob is treated as a PDF
        const blob = new Blob([viewingPdf.blob], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);

        return () => {
            URL.revokeObjectURL(url);
        };
    }, [viewingPdf]);

    const fetchOfflineBooks = async () => {
        try {
            const books = await getAllOfflineBooks();
            console.log(`Found ${books.length} offline books`);
            setOfflineBooks(books);
        } catch (err) {
            console.error('Failed to load offline books:', err);
            toast.error('Failed to load offline books');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemove = async (id: string) => {
        try {
            await removeOfflineBook(id);
            setOfflineBooks(offlineBooks.filter(book => book.id !== id));
            toast.info('Removed from offline library');
        } catch (err) {
            toast.error('Failed to remove book');
        }
    };

    const handleRead = (book: any) => {
        setViewingPdf({ blob: book.blob, title: book.title });
    };

    const handleDownloadCurrent = () => {
        if (!pdfUrl || !viewingPdf) return;
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.setAttribute('download', `${viewingPdf.title.replace(/\s+/g, '_')}.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleOpenInNewTab = () => {
        if (pdfUrl) {
            window.open(pdfUrl, '_blank');
        }
    };

    const closeViewer = () => {
        setViewingPdf(null);
    };

    if (isLoading) return <Loader />;

    return (
        <div className="offline-books-container saas-reveal">
            <div className="offline-books-header">
                <h1>📶 Offline Library</h1>
                <p className="text-muted">Books available for offline reading</p>
            </div>

            {offlineBooks.length === 0 ? (
                <div className="offline-empty-state">
                    <h3>No books saved for offline reading.</h3>
                    <p>Explore our Premium collection and save books to read them anytime!</p>
                </div>
            ) : (
                <div className="offline-books-grid">
                    {offlineBooks.map((book) => (
                        <div key={book.id} className="offline-book-card">
                            {book.cover_image_url && (
                                <img src={book.cover_image_url} alt={book.title} className="offline-book-cover" />
                            )}
                            <div className="offline-book-details">
                                <h3 className="offline-book-title">{book.title}</h3>
                                <p className="offline-book-author">by {book.author}</p>
                                <div className="offline-book-actions">
                                    <button onClick={() => handleRead(book)} className="btn-primary">
                                        📖 Read
                                    </button>
                                    <button onClick={() => handleRemove(book.id)} className="btn-secondary">
                                        Remove
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {viewingPdf && (
                <div className="offline-viewer-modal">
                    <div className="offline-viewer-header">
                        <h3>{viewingPdf.title}</h3>
                        <div className="offline-viewer-controls">
                            <button onClick={handleOpenInNewTab} className="btn-secondary viewer-btn">
                                🔗 Open in Browser
                            </button>
                            <button onClick={handleDownloadCurrent} className="btn-secondary viewer-btn">
                                📥 Save to Device
                            </button>
                            <button onClick={closeViewer} className="close-viewer-btn">
                                Close
                            </button>
                        </div>
                    </div>
                    {pdfUrl ? (
                        <iframe
                            src={pdfUrl}
                            title={viewingPdf.title}
                            className="offline-viewer-frame"
                            width="100%"
                            height="100%"
                            onLoad={() => console.log('PDF Iframe loaded')}
                            onError={(e) => console.error('PDF Iframe error', e)}
                        >
                            <div className="offline-viewer-fallback">
                                <p>Your browser doesn't support viewing PDFs directly.</p>
                                <button onClick={handleDownloadCurrent} className="btn-primary">
                                    Download to Read
                                </button>
                            </div>
                        </iframe>
                    ) : (
                        <div className="offline-viewer-loading">
                            <Loader />
                            <p>Preparing document...</p>
                        </div>
                    )}
                </div>
            )}
            <Footer />
        </div>
    );
};

export default OfflineBooks;
