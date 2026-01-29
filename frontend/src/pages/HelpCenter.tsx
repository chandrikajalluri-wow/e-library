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
            question: "How do I borrow a book?",
            answer: "Simply navigate to the \"Books\" page, find a book you like, and click the \"Borrow\" button. You must be logged in to borrow books."
        },
        {
            question: "How long can I keep a borrowed book?",
            answer: "Our borrowing period depends on your membership plan, ranging from 7 days (Basic) to 21 days (Premium). You can view your active borrows and their due dates in your Dashboard."
        },
        {
            question: "How do I return a book?",
            answer: "Go to your \"Dashboard\" page and click \"Request Return\". An admin will then confirm your return."
        },
        {
            question: "Can I request a book that isn't in the library?",
            answer: "Yes! You can use the \"Request a Book\" feature in your dashboard to suggest new titles for our collection."
        },
        {
            question: "How do I use the Wishlist?",
            answer: "You can add any book to your wishlist by clicking the heart icon. View your saved books anytime in the \"Wishlist\" section of your dashboard."
        },
        {
            question: "How can I change my profile information?",
            answer: "Navigate to \"Settings\" or \"Profile\" from your dashboard to update your name, email, or password."
        },
        {
            question: "Does the library have a dark mode?",
            answer: "Yes, you can toggle between light and dark modes using the floating theme switch located at the bottom right of the screen."
        },
        {
            question: "What should I do if I forget my password?",
            answer: "Click on \"Forgot Password\" on the login page, enter your email, and we'll send you a link to reset it safely."
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
