// Search functionality for classes page
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('classSearch');
    const classesGrid = document.getElementById('classesGrid');
    const noResults = document.getElementById('noResults');
    const classCards = document.querySelectorAll('.class-card');
    const filterButtons = document.querySelectorAll('.filter-btn');

    let currentFilter = 'all';

    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterClasses();
        });
    }

    // Filter functionality
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Update active button
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Update current filter
            currentFilter = this.getAttribute('data-level');
            filterClasses();
        });
    });

    function filterClasses() {
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        let visibleCards = 0;

        classCards.forEach(card => {
            const className = card.getAttribute('data-class').toLowerCase();
            const cardTitle = card.querySelector('h3').textContent.toLowerCase();
            const cardDescription = card.querySelector('p').textContent.toLowerCase();
            const cardLevel = card.getAttribute('data-level');

            // Check search match
            const searchMatch = className.includes(searchTerm) || 
                               cardTitle.includes(searchTerm) || 
                               cardDescription.includes(searchTerm);

            // Check level filter
            const levelMatch = currentFilter === 'all' || cardLevel === currentFilter;

            if (searchMatch && levelMatch) {
                card.style.display = 'block';
                visibleCards++;
            } else {
                card.style.display = 'none';
            }
        });

        // Show/hide no results message
        if (visibleCards === 0 && (searchTerm.trim() !== '' || currentFilter !== 'all')) {
            noResults.style.display = 'block';
            classesGrid.style.display = 'none';
        } else {
            noResults.style.display = 'none';
            classesGrid.style.display = 'grid';
        }
    }

    // Clear search when page loads
    if (searchInput) {
        searchInput.value = '';
    }
});
