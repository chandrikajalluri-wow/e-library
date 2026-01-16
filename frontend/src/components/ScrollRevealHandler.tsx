import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollRevealHandler: React.FC = () => {
    const location = useLocation();

    useEffect(() => {
        // Function to reveal all elements that should be visible
        const triggerReveals = () => {
            const reveals = document.querySelectorAll('.saas-reveal');
            reveals.forEach(el => {
                const rect = el.getBoundingClientRect();
                // If the element is in or near the viewport, or we're at the top of a new page
                if (rect.top < window.innerHeight + 100) {
                    el.classList.add('active');
                }
            });
        };

        // Mutation Observer to detect when new elements are added to the DOM (e.g. after loading)
        const mutationObserver = new MutationObserver((mutations) => {
            let shouldTrigger = false;
            mutations.forEach(mutation => {
                if (mutation.addedNodes.length > 0) {
                    shouldTrigger = true;
                }
            });
            if (shouldTrigger) triggerReveals();
        });

        // Intersection Observer for scroll-based reveals
        const intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                }
            });
        }, { threshold: 0.1 });

        const setupObservers = () => {
            const reveals = document.querySelectorAll('.saas-reveal');
            reveals.forEach(reveal => intersectionObserver.observe(reveal));
            mutationObserver.observe(document.body, { childList: true, subtree: true });
        };

        // Initial setup
        window.scrollTo(0, 0);
        setupObservers();

        // Multiple triggers to catch various loading stages
        const timers = [
            setTimeout(triggerReveals, 100),
            setTimeout(triggerReveals, 500),
            setTimeout(triggerReveals, 1000),
            setTimeout(triggerReveals, 2000)
        ];

        return () => {
            mutationObserver.disconnect();
            intersectionObserver.disconnect();
            timers.forEach(clearTimeout);
        };
    }, [location.pathname]);

    return null;
};

export default ScrollRevealHandler;
