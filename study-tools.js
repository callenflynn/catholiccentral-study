// Mobile Navigation and Keyword Search Functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize dark mode
    initializeDarkMode();
    
    // Mobile Navigation Toggle
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }
    
    // Dark Mode Toggle
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', function() {
            toggleDarkMode();
        });
    }
    
    // Keyword Search Functionality
    const keywordSearch = document.getElementById('keywordSearch');
    const studyContent = document.querySelector('.study-notes');
    const searchInfo = document.getElementById('searchInfo');
    const noResults = document.getElementById('noResults');
    
    if (keywordSearch && studyContent) {
        // Store original content
        const originalContent = studyContent.innerHTML;
        
        keywordSearch.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase().trim();
            
            if (searchTerm === '') {
                // Restore original content
                studyContent.innerHTML = originalContent;
                updateSearchInfo('');
                hideNoResults();
                return;
            }
            
            // Search and highlight
            const results = searchAndHighlight(originalContent, searchTerm);
            
            if (results.found) {
                studyContent.innerHTML = results.content;
                updateSearchInfo(`Found "${searchTerm}" in ${results.count} location(s)`);
                hideNoResults();
                
                // Scroll to first result
                const firstHighlight = document.querySelector('.highlight');
                if (firstHighlight) {
                    firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            } else {
                studyContent.innerHTML = originalContent;
                updateSearchInfo(`No results found for "${searchTerm}"`);
                showNoResults();
            }
        });
    }
    
    function searchAndHighlight(content, searchTerm) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        
        let count = 0;
        let found = false;
        
        // Function to highlight text in text nodes
        function highlightInNode(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent;
                const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
                
                if (regex.test(text)) {
                    const highlightedText = text.replace(regex, '<span class="highlight">$1</span>');
                    const wrapper = document.createElement('span');
                    wrapper.innerHTML = highlightedText;
                    
                    // Count occurrences
                    const matches = text.match(regex);
                    if (matches) {
                        count += matches.length;
                        found = true;
                    }
                    
                    node.parentNode.replaceChild(wrapper, node);
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                // Skip script and style elements
                if (node.tagName && ['SCRIPT', 'STYLE'].includes(node.tagName.toUpperCase())) {
                    return;
                }
                
                // Process child nodes (make a copy of the list to avoid modification during iteration)
                const children = Array.from(node.childNodes);
                children.forEach(child => highlightInNode(child));
            }
        }
        
        highlightInNode(tempDiv);
        
        return {
            content: tempDiv.innerHTML,
            count: count,
            found: found
        };
    }
    
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    function updateSearchInfo(message) {
        if (searchInfo) {
            searchInfo.textContent = message;
        }
    }
    
    function showNoResults() {
        if (noResults) {
            noResults.style.display = 'block';
        }
    }
    
    function hideNoResults() {
        if (noResults) {
            noResults.style.display = 'none';
        }
    }
    
    // Dark Mode Functions
    function initializeDarkMode() {
        const darkMode = localStorage.getItem('darkMode');
        if (darkMode === 'enabled') {
            enableDarkMode();
        }
    }
    
    function toggleDarkMode() {
        const darkMode = localStorage.getItem('darkMode');
        if (darkMode !== 'enabled') {
            enableDarkMode();
        } else {
            disableDarkMode();
        }
    }
    
    function enableDarkMode() {
        document.body.classList.add('dark-mode');
        localStorage.setItem('darkMode', 'enabled');
        updateToggleIcon('☀️');
    }
    
    function disableDarkMode() {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('darkMode', null);
        updateToggleIcon('🌙');
    }
    
    function updateToggleIcon(icon) {
        const toggleIcon = document.querySelector('.toggle-icon');
        if (toggleIcon) {
            toggleIcon.textContent = icon;
        }
    }
});