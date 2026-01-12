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

    // Ask AI Widget
    initializeAskAIWidget();

    function initializeAskAIWidget() {
        // Avoid duplicate widgets
        if (document.getElementById('askAiWidget')) return;

        const widget = document.createElement('div');
        widget.id = 'askAiWidget';
        widget.className = 'ask-ai-widget';

        widget.innerHTML = `
            <button class="ask-ai-toggle" aria-label="Ask AI">Ask AI</button>
            <div class="ask-ai-panel">
                <div class="ask-ai-header">
                    <span>Ask AI about this page</span>
                    <button class="ask-ai-close" aria-label="Close">×</button>
                </div>
                <div class="ask-ai-body">
                    <div class="ask-ai-subject-row" id="askAiSubjectRow" style="display:none; margin-bottom:8px;">
                        <label for="askAiSubject" style="display:block; font-size:0.9rem; color:#666; margin-bottom:4px;">Subject</label>
                        <select id="askAiSubject" class="ask-ai-input">
                                <option value="christology">Christology</option>
                                <option value="biology">Biology</option>
                                <option value="ajof">Aerospace Journey of Flight</option>
                                <option value="freshman-revelations">Freshman Revelations</option>
                                <option value="freshman-english">Freshman English</option>
                                <option value="history">History</option>
                        </select>
                    </div>
                    <input type="text" id="aiQuestion" class="ask-ai-input" placeholder="Type your question..." />
                    <button id="askAiSubmit" class="btn btn-primary ask-ai-submit">Ask</button>
                    <div id="aiAnswer" class="ask-ai-answer" aria-live="polite"></div>
                </div>
            </div>
        `;

        document.body.appendChild(widget);

        const toggleBtn = widget.querySelector('.ask-ai-toggle');
        const closeBtn = widget.querySelector('.ask-ai-close');
        const panel = widget.querySelector('.ask-ai-panel');
        const submitBtn = widget.querySelector('#askAiSubmit');

        if (toggleBtn && panel) {
            toggleBtn.addEventListener('click', () => {
                panel.classList.toggle('open');
            });
        }
        if (closeBtn && panel) {
            closeBtn.addEventListener('click', () => {
                panel.classList.remove('open');
            });
        }
        if (submitBtn) {
            submitBtn.addEventListener('click', askAI);
        }

        // Pre-populate subject if detectable
        const subjectRow = widget.querySelector('#askAiSubjectRow');
        if (subjectRow) {
            subjectRow.style.display = 'none'; // Site-wide mode: hide subject selector
        }
    }

    async function askAI() {
        const questionInput = document.getElementById('aiQuestion');
        const answerEl = document.getElementById('aiAnswer');

        if (!questionInput || !answerEl) return;

        const question = questionInput.value.trim();
        if (!question) {
            answerEl.textContent = 'Please enter a question.';
            return;
        }

        const pageText = getPageText();
        const subject = 'all'; // Site-wide aggregation on server

        answerEl.textContent = 'Thinking…';

        try {
            const res = await fetch('/api/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question, pageText, subject })
            });

            if (!res.ok) throw new Error('Server error');
            const data = await res.json();
            answerEl.textContent = (data && data.answer) ? data.answer : 'No response';
        } catch (err) {
            answerEl.textContent = 'Error: unable to get an answer right now.';
        }
    }

    function getPageText() {
        // Prefer explicit study content container if present
        const idContent = document.getElementById('study-content');
        if (idContent) return idContent.innerText.trim();

        const classContent = document.querySelector('.study-content');
        if (classContent) return classContent.innerText.trim();

        const main = document.querySelector('main');
        if (main) return main.innerText.trim();

        return document.body.innerText.trim();
    }

    // Subject detection disabled in site-wide mode
});