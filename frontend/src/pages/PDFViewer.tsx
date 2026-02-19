import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, ZoomIn, ZoomOut, Maximize2, Minimize2, Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, List, BadgeCheck } from 'lucide-react';
import { getBook } from '../services/bookService';
import { getReadingProgress, updateReadingProgress } from '../services/userService';
import { getMyMembership } from '../services/membershipService';
import { toast } from 'react-toastify';
import '../styles/PDFViewer.css';

// Declare pdf.js global
declare const pdfjsLib: any;

const PDFViewer: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [book, setBook] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [scale, setScale] = useState(1.5);
    const [bookmarks, setBookmarks] = useState<number[]>([]);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showBookmarks, setShowBookmarks] = useState(false);
    const [useFallback, setUseFallback] = useState(false);
    const [rendering, setRendering] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);

    // Page Input State
    const [pageInput, setPageInput] = useState<string>('1');
    const [isInputFocused, setIsInputFocused] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const saveTimerRef = useRef<number | null>(null);
    const pdfDocRef = useRef<any>(null);
    // Keep a ref to pagesContainer to avoid stale closures if needed
    const pagesContainerRef = useRef<HTMLDivElement>(null);
    const renderIdRef = useRef(0);

    useEffect(() => {
        if (id) {
            fetchBookAndProgress(id);
        }

        // Set pdf.js worker
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }

        return () => {
            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current);
            }
            saveProgress();
        };
    }, [id]);

    useEffect(() => {
        if (pdfDoc && totalPages > 0 && !loading && !rendering) {
            renderAllPages();
        }
    }, [pdfDoc, scale, loading, totalPages]);

    // Sync page input with current page when not focused
    useEffect(() => {
        if (!isInputFocused) {
            setPageInput(currentPage.toString());
        }
    }, [currentPage, isInputFocused]);

    // Track current page based on scroll position
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleScroll = () => {
            // Updated to work with lazy loaded placeholders
            const pages = container.querySelectorAll('.pdf-page');
            const containerTop = container.scrollTop;
            const containerHeight = container.clientHeight;
            const viewportCenter = containerTop + containerHeight / 2;

            let currentPageNum = 1;
            pages.forEach((page, index) => {
                const pageElement = page as HTMLElement;
                const pageTop = pageElement.offsetTop;
                const pageBottom = pageTop + pageElement.offsetHeight;

                if (viewportCenter >= pageTop && viewportCenter <= pageBottom) {
                    currentPageNum = index + 1;
                }
            });

            if (currentPageNum !== currentPage) {
                setCurrentPage(currentPageNum);
                debouncedSaveProgress();
            }
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [currentPage, containerRef.current]);

    const fetchBookAndProgress = async (bookId: string) => {
        try {
            const bookData = await getBook(bookId);
            if (!bookData.pdf_url) {
                toast.error('This book does not have a PDF version available.');
                navigate(-1);
                return;
            }
            setBook(bookData);

            // Check premium access
            if (bookData.isPremium) {
                try {
                    const membership = await getMyMembership();
                    if (!membership?.canAccessPremiumBooks) {
                        toast.error('This is a premium book. Upgrade to Premium membership to read it.');
                        navigate(-1);
                        return;
                    }
                } catch (err) {
                    console.error('Error checking membership for PDF access:', err);
                }
            }

            // Check if pdf.js is loaded
            console.log('Checking pdf.js availability...', typeof pdfjsLib);
            if (typeof pdfjsLib === 'undefined') {
                console.error('pdf.js library is not loaded from CDN');
                toast.warning('PDF library not loaded. Using fallback viewer...');
                setUseFallback(true);
                setLoading(false);
                return;
            }

            console.log('pdf.js loaded successfully, version:', pdfjsLib.version);
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

            // Use backend proxy URL to avoid CORS issues
            const proxyPdfUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/books/${bookId}/view`;
            console.log('Loading PDF through backend proxy:', proxyPdfUrl);

            // Load PDF with CORS mode
            const loadingTask = pdfjsLib.getDocument({
                url: proxyPdfUrl,
                httpHeaders: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                withCredentials: false,
            });

            const pdf = await loadingTask.promise;
            setPdfDoc(pdf);
            pdfDocRef.current = pdf;
            setTotalPages(pdf.numPages);

            // Fetch reading progress
            try {
                console.log('Fetching reading progress for book:', bookId);
                const progress = await getReadingProgress(bookId);
                console.log('Raw API response:', JSON.stringify(progress, null, 2));
                console.log('Progress object:', progress);
                console.log('Progress.bookmarks type:', typeof progress.bookmarks);
                console.log('Progress.bookmarks value:', progress.bookmarks);
                console.log('Progress.bookmarks is array?:', Array.isArray(progress.bookmarks));

                const lastPage = progress.last_page || 1;
                const savedBookmarks = Array.isArray(progress.bookmarks) ? progress.bookmarks : [];
                const status = progress.status;

                setCurrentPage(lastPage);
                setBookmarks(savedBookmarks);
                setIsCompleted(status === 'completed' || status === 'returned');

                console.log('Set current page to:', lastPage);
                console.log('Set bookmarks to:', savedBookmarks);
            } catch (err: any) {
                // If user hasn't added the book, they won't have progress
                console.log('No previous progress found:', err?.response?.data?.error || err?.message);
                setCurrentPage(1);
                setBookmarks([]);
            }

            setLoading(false);
        } catch (err: any) {
            console.error('Error loading PDF with pdf.js:', err);

            // Try to extract more detail from the proxy response
            let detailedError = err?.message || 'Unknown error';

            // pdf.js errors might wrap the underlying HTTP error
            if (err.name === 'PasswordException') {
                detailedError = 'This PDF is password protected.';
            } else if (err.name === 'UnknownErrorException' && err.message.includes('403')) {
                detailedError = 'Access Denied: Your access period may have expired or you haven\'t added this book to your library yet.';
            }

            try {
                // If it's a fetch or Axios error, it might have response data
                const responseData = err?.response?.data;
                if (responseData && responseData.error) {
                    detailedError = responseData.error;
                }
            } catch (e) {
                console.log('Could not parse detailed error response');
            }

            console.error('Error details:', detailedError);

            toast.error(`PDF Access Denied: ${detailedError}`);
            navigate(-1);
            setLoading(false);
        }
    };

    const renderAllPages = async () => {
        if (!pdfDoc || !pagesContainerRef.current || !containerRef.current) return;

        // Increment render ID immediately to handle potential race conditions
        const currentRenderId = ++renderIdRef.current;
        setRendering(true);

        try {
            // 1. PRE-FETCH DIMENSIONS (Async)
            // Do this BEFORE clearing the DOM to prevent layout collapse
            const firstPage = await pdfDoc.getPage(1);
            const viewport = firstPage.getViewport({ scale });
            const pageHeight = viewport.height;
            const pageWidth = viewport.width;

            // Check if cancelled while awaiting
            if (renderIdRef.current !== currentRenderId) return;

            // 2. CAPTURE SCROLL STATE (Synchronous)
            const container = containerRef.current;
            const currentScrollTop = container.scrollTop;
            const currentScrollHeight = container.scrollHeight || 1;
            // Calculate ratio to maintain position after resize
            const scrollRatio = currentScrollHeight > 0 ? currentScrollTop / currentScrollHeight : 0;
            const centerPage = currentPage; // Capture logic of where we are

            // 3. UPDATE DOM (Synchronous Block)
            const pagesContainer = pagesContainerRef.current;
            pagesContainer.innerHTML = ''; // Clear old pages

            // Create placeholders using a fragment (Performance)
            const fragment = document.createDocumentFragment();

            for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                const pageWrapper = document.createElement('div');
                pageWrapper.className = 'pdf-page placeholder';
                pageWrapper.setAttribute('data-page-number', pageNum.toString());

                // Set explicit dimensions
                pageWrapper.style.width = `${pageWidth}px`;
                pageWrapper.style.height = `${pageHeight}px`;
                pageWrapper.style.position = 'relative';

                fragment.appendChild(pageWrapper);
            }

            pagesContainer.appendChild(fragment);

            // 4. RESTORE SCROLL (Synchronous)
            // The container now has its new full height. Restore position immediately.
            const newScrollHeight = container.scrollHeight;

            if (newScrollHeight > 0) {
                // Try to restore exact relative position
                container.scrollTop = scrollRatio * newScrollHeight;
            } else {
                scrollToPage(centerPage);
            }

            // 5. OBSERVE & RENDER (Synchronous setup)
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const target = entry.target as HTMLElement;
                        const pageNumAttr = target.getAttribute('data-page-number');
                        if (!pageNumAttr) return;

                        const pageNum = parseInt(pageNumAttr);

                        // Check if already rendered or rendering
                        if (pageNum > 0 && !target.hasAttribute('data-rendered')) {
                            renderPage(target, pageNum, currentRenderId);
                        }
                    }
                });
            }, {
                root: containerRef.current,
                rootMargin: '600px',
                threshold: 0.1
            });

            // Observe all page wrappers
            const wrappers = pagesContainer.querySelectorAll('.pdf-page');
            wrappers.forEach(wrapper => observer.observe(wrapper));

            // Instant feedback: Render visible pages immediately
            const startPage = Math.max(1, centerPage - 1);
            const endPage = Math.min(totalPages, centerPage + 1);

            for (let i = startPage; i <= endPage; i++) {
                const p = pagesContainer.querySelector(`[data-page-number="${i}"]`) as HTMLElement;
                if (p) renderPage(p, i, currentRenderId);
            }

            setRendering(false);

        } catch (err) {
            console.error('Error setting up pages:', err);
            setRendering(false);
        }
    };

    const renderPage = async (wrapper: HTMLElement, pageNum: number, renderId: number) => {
        // Prevent concurrent renders of same page or cancelled renders
        // Also ensure we have the doc
        if (renderIdRef.current !== renderId || wrapper.hasAttribute('data-rendered') || !pdfDoc) return;

        // Mark as rendered immediately to prevent duplicate calls
        wrapper.setAttribute('data-rendered', 'true');
        wrapper.classList.remove('placeholder');

        try {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({
                canvasContext: context,
                viewport: viewport,
            }).promise;

            // Check if cancelled during await
            if (renderIdRef.current === renderId) {
                wrapper.innerHTML = ''; // Clear any placeholder content
                wrapper.appendChild(canvas);
            }
        } catch (err) {
            console.error(`Error rendering page ${pageNum}:`, err);
            // On error, allow retrying?
            wrapper.removeAttribute('data-rendered');
        }
    };

    const scrollToPage = (pageNum: number) => {
        if (!pagesContainerRef.current) return;
        const pageElement = pagesContainerRef.current.querySelector(`[data-page-number="${pageNum}"]`) as HTMLElement;
        if (pageElement) {
            pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const debouncedSaveProgress = () => {
        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
        }
        saveTimerRef.current = setTimeout(() => {
            saveProgress();
        }, 2000);
    };

    const saveProgress = async () => {
        if (!id || !currentPage) return;
        try {
            // Only save last_page during auto-save, not bookmarks
            // Bookmarks are saved immediately when toggled
            await updateReadingProgress(id, {
                last_page: currentPage,
            });
        } catch (err) {
            console.error('Failed to save progress:', err);
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 1) {
            scrollToPage(currentPage - 1);
        }
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            scrollToPage(currentPage + 1);
        }
    };

    const handleZoomIn = () => {
        setScale(prev => Math.min(prev + 0.25, 3));
    };

    const handleZoomOut = () => {
        setScale(prev => Math.max(prev - 0.25, 0.5));
    };

    const toggleBookmark = async () => {
        let updatedBookmarks: number[];

        if (bookmarks.includes(currentPage)) {
            updatedBookmarks = bookmarks.filter(p => p !== currentPage);
            setBookmarks(updatedBookmarks);
            toast.info('Bookmark removed');
        } else {
            updatedBookmarks = [...bookmarks, currentPage].sort((a, b) => a - b);
            setBookmarks(updatedBookmarks);
            toast.success('Page bookmarked');
        }

        // Save bookmarks immediately
        if (id) {
            try {
                await updateReadingProgress(id, {
                    last_page: currentPage,
                    bookmarks: updatedBookmarks,
                });
            } catch (err) {
                console.error('Failed to save bookmark:', err);
                toast.error('Failed to save bookmark');
            }
        }
    };

    const jumpToBookmark = (page: number) => {
        scrollToPage(page);
        setShowBookmarks(false);
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };

    const handleMarkFinished = async () => {
        if (!id) return;
        try {
            await updateReadingProgress(id, {
                status: 'completed',
                last_page: totalPages
            });
            toast.success('Congratulations! You have finished this book.');
            navigate('/dashboard');
        } catch (err) {
            console.error('Failed to mark book as finished:', err);
            toast.error('Failed to update reading status');
        }
    };

    if (loading) {
        return (
            <div className="pdf-loader-overlay">
                <div className="pdf-loader-content">
                    <Loader2 className="spinner-icon" />
                    <p>Loading your book...</p>
                </div>
            </div>
        );
    }

    if (!book) return null;

    const progress = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;

    return (
        <div className={`pdf-application-container ${isFullscreen ? 'is-fullscreen' : ''}`}>
            {/* Header */}
            <header className="pdf-reader-header">
                <div className="header-left">
                    <button onClick={() => navigate(-1)} className="control-btn back-control" title="Back">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="reader-book-meta">
                        <h2 className="reader-title">{book.title}</h2>
                        <span className="reader-author">by {book.author}</span>
                    </div>
                </div>

                <div className="header-right">
                    <button className="control-btn" onClick={handleZoomOut} title="Zoom Out">
                        <ZoomOut size={20} />
                    </button>
                    <span className="zoom-indicator">{Math.round(scale * 100)}%</span>
                    <button className="control-btn" onClick={handleZoomIn} title="Zoom In">
                        <ZoomIn size={20} />
                    </button>
                    <button
                        className={`control-btn ${bookmarks.includes(currentPage) ? 'active' : ''}`}
                        onClick={toggleBookmark}
                        title={bookmarks.includes(currentPage) ? "Remove Bookmark" : "Add Bookmark"}
                    >
                        {bookmarks.includes(currentPage) ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
                    </button>
                    <button
                        className={`control-btn ${showBookmarks ? 'active' : ''}`}
                        onClick={() => setShowBookmarks(!showBookmarks)}
                        title="View Bookmarks"
                    >
                        <List size={20} />
                        {bookmarks.length > 0 && <span className="bookmark-count">{bookmarks.length}</span>}
                    </button>
                    <button className="control-btn" onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
                        {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                    </button>
                    {!isCompleted && (
                        <button
                            className="btn-finish-book"
                            onClick={handleMarkFinished}
                            style={{
                                background: 'var(--success-color)',
                                color: 'white',
                                border: 'none',
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                fontWeight: '700',
                                fontSize: '0.8rem',
                                marginLeft: '1rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <BadgeCheck size={16} />
                            Mark Finished
                        </button>
                    )}
                </div>
            </header>

            {/* Progress Bar */}
            <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                <span className="progress-text">Page {currentPage} of {totalPages} ({Math.round(progress)}%)</span>
            </div>

            {/* Main Content */}
            <div className="main-reader-area">
                {/* Bookmarks Sidebar */}
                {showBookmarks && (
                    <aside className="bookmarks-sidebar reveal-right">
                        <h3>Bookmarks</h3>
                        {bookmarks.length === 0 ? (
                            <p className="no-bookmarks">No bookmarks yet. Click the bookmark icon to save your current page.</p>
                        ) : (
                            <ul className="bookmark-list">
                                {bookmarks.map(page => (
                                    <li key={page} className={page === currentPage ? 'active' : ''}>
                                        <button onClick={() => jumpToBookmark(page)}>
                                            Page {page}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </aside>
                )}

                {/* PDF Canvas */}
                <div className="pdf-canvas-wrapper" ref={containerRef}>
                    {/* Separate container for pages to avoid conflict with React renders */}
                    <div ref={pagesContainerRef} className="pdf-pages-container"></div>

                    {useFallback ? (
                        <iframe
                            src={`${book.pdf_url}#toolbar=0&navpanes=0`}
                            title={book.title}
                            className="pdf-fallback-iframe"
                            style={{
                                width: '100%',
                                height: '100%',
                                border: 'none',
                                borderRadius: '4px'
                            }}
                        />
                    ) : rendering ? (
                        <div className="pdf-rendering-overlay">
                            <div className="pdf-rendering-message">
                                <Loader2 className="spinner-icon" size={40} />
                                <p>Rendering pages...</p>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>

            {/* Navigation Controls */}
            <div className="pdf-navigation-controls">
                <button
                    className="nav-btn"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    title="Previous Page"
                >
                    <ChevronLeft size={24} />
                </button>
                <div className="page-input-group">
                    <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={pageInput}
                        onChange={(e) => {
                            const val = e.target.value;
                            // Allow only numbers
                            if (val === '' || /^\d+$/.test(val)) {
                                setPageInput(val);
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                const page = parseInt(pageInput);
                                if (page >= 1 && page <= totalPages) {
                                    scrollToPage(page);
                                    (e.target as HTMLElement).blur();
                                }
                            }
                        }}
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() => {
                            setIsInputFocused(false);
                            setPageInput(currentPage.toString());
                        }}
                        className="page-input"
                    />
                    <span className="page-total">/ {totalPages}</span>
                </div>
                <button
                    className="nav-btn"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    title="Next Page"
                >
                    <ChevronRight size={24} />
                </button>
            </div>
        </div>
    );
};

export default PDFViewer;
