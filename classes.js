// Search functionality for classes page
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('classSearch');
    const classesGrid = document.getElementById('classesGrid');
    const noResults = document.getElementById('noResults');
    const classCards = document.querySelectorAll('.class-card');

    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            let visibleCards = 0;

            classCards.forEach(card => {
                const className = card.getAttribute('data-class').toLowerCase();
                const cardTitle = card.querySelector('h3').textContent.toLowerCase();
                const cardDescription = card.querySelector('p').textContent.toLowerCase();

                if (className.includes(searchTerm) || 
                    cardTitle.includes(searchTerm) || 
                    cardDescription.includes(searchTerm)) {
                    card.style.display = 'block';
                    visibleCards++;
                } else {
                    card.style.display = 'none';
                }
            });

            // Show/hide no results message
            if (visibleCards === 0 && searchTerm.trim() !== '') {
                noResults.style.display = 'block';
                classesGrid.style.display = 'none';
            } else {
                noResults.style.display = 'none';
                classesGrid.style.display = 'grid';
            }
        });
    }

    // Clear search when page loads
    if (searchInput) {
        searchInput.value = '';
    }
});
