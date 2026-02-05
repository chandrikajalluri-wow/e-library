import React, { useState } from 'react';


import { ChevronDown, ChevronUp } from 'lucide-react';
import '../styles/StaticPages.css';
import '../styles/HelpCenter.css';

interface FAQItemProps {
    question: string;
    answer: string;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className={`faq-item ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(!isOpen)}>
            <div className="faq-question">
                <h3>{question}</h3>
                <div className="faq-icon">
                    {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
            </div>
            <div className="faq-answer">
                <p>{answer}</p>
            </div>
        </div>
    );
};

const HelpCenter: React.FC = () => {
    const faqs = [
        {
            question: "How do I borrow or buy a book?",
            answer: "Browse the Books catalog, click 'Add to Cart' on any book you like, then proceed to your Cart. Review your items, accept the Terms & Conditions, and complete checkout by providing your delivery address. You'll receive email updates on your order status."
        },
        {
            question: "How long can I keep a borrowed book?",
            answer: "Borrowing periods depend on your membership: Basic (7 days), Premium (21 days). You can view due dates in your Dashboard under 'My Library'. Premium members also get priority delivery within 24 hours."
        },
        {
            question: "How do I read books online?",
            answer: "Once you've borrowed a book, go to 'My Library' in your Dashboard and click 'Read'. Our PDF viewer lets you read online, bookmark pages, track progress, and even mark books as finished when you're done."
        },
        {
            question: "What happens if I mark a book as finished?",
            answer: "Marking a book as 'Finished' automatically updates your 'Books Read' count in your profile and moves it to the 'Completed' tab. You can still re-read it anytime before your borrow period expires using 'Read Again'."
        },
        {
            question: "How do I upgrade to Premium?",
            answer: "Visit the Membership Plans page from the navigation menu. Premium membership offers unlimited genres, higher borrow limits (10 books/month), longer borrow periods (21 days), priority delivery, and personalized AI recommendations."
        },
        {
            question: "Can I set reading goals?",
            answer: "Yes! In your Profile settings, you can set a yearly reading target. Your progress is automatically tracked based on books you've finished, and you'll see a visual progress bar in your profile."
        },
        {
            question: "How do I manage my favorite genres?",
            answer: "Premium members can select up to 3 favorite genres in their Profile settings. This helps us provide personalized book recommendations tailored to your interests."
        },
        {
            question: "How do I use the Wishlist?",
            answer: "Click the heart icon on any book to add it to your Wishlist. Access your saved books anytime from your Dashboard to easily find and borrow them later."
        },
        {
            question: "How can I track my orders?",
            answer: "Go to your Dashboard and click 'My Orders'. You can see all your orders with statuses: Processing → Shipped → Delivered. You'll also receive email notifications at each stage."
        },
        {
            question: "What if I need to return a book early?",
            answer: "In your Dashboard under 'My Library', click 'Request Return' on the book. An admin will review and approve your return request. You'll be notified via email once it's processed."
        },
        {
            question: "How do I filter and search for books?",
            answer: "Use the Books page filters to browse by category (Business, Fantasy, Finance, etc.) or language (English, Spanish, French, German). You can also sort by newest, oldest, title, or rating."
        },
        {
            question: "Does the library have a dark mode?",
            answer: "Yes! Toggle between light and dark modes using the theme switch in the navigation bar or the floating button at the bottom right of the screen."
        },
        {
            question: "How do I update my profile information?",
            answer: "Navigate to your Profile from the dashboard. You can update your name, phone number, profile picture, reading target, and favorite genres (Premium only)."
        },
        {
            question: "What should I do if I forget my password?",
            answer: "Click 'Forgot Password' on the login page, enter your email, and we'll send you a secure reset link to create a new password."
        },
        {
            question: "How do I contact support?",
            answer: "For any questions or issues, email us at chandrika6300@gmail.com. We're here to help with account issues, technical problems, or general inquiries."
        }
    ];

    return (
        <div className="static-page-container">

            <div className="static-content-wrapper help-center-wrapper">
                <div className="static-hero saas-reveal">
                    <h1 className="static-title-h1">Help Center</h1>
                    <p className="static-subtitle">
                        Welcome to the E-Library Help Center. Here you can find answers to common questions and guides on how to use our platform.
                    </p>
                </div>

                <div className="faq-section saas-reveal">
                    <h2 className="faq-title">Frequently Asked Questions</h2>
                    <div className="faq-list">
                        {faqs.map((faq, index) => (
                            <FAQItem key={index} question={faq.question} answer={faq.answer} />
                        ))}
                    </div>
                </div>
            </div>

        </div>
    );
};

export default HelpCenter;
