// Tag expansion functionality for class cards
document.addEventListener('DOMContentLoaded', function() {
    // Initialize tag containers
    initializeTagContainers();
    
    // Handle more tags click
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('more-tags')) {
            const tagsContainer = e.target.closest('.tags-container');
            tagsContainer.classList.toggle('expanded');
        }
    });
});

function initializeTagContainers() {
    const tagContainers = document.querySelectorAll('.tags-container');
    
    tagContainers.forEach(container => {
        // Skip aerospace class - let tags wrap naturally
        const classCard = container.closest('.class-card');
        if (classCard && classCard.querySelector('h3').textContent.includes('Aerospace')) {
            return;
        }
        
        const allTags = container.querySelectorAll('span:not(.more-tags)');
        const visibleTags = [];
        const hiddenTags = [];
        
        // Separate department tags from level tags
        allTags.forEach((tag, index) => {
            if (tag.classList.contains('department')) {
                // Department tags are always visible
                return;
            }
            
            // Level tags - show first 2, hide the rest
            if (isLevelTag(tag)) {
                if (visibleTags.length < 2) {
                    visibleTags.push(tag);
                    tag.classList.remove('hidden-tag');
                } else {
                    hiddenTags.push(tag);
                    tag.classList.add('hidden-tag');
                }
            }
        });
        
        // Update or create the more-tags indicator
        let moreTags = container.querySelector('.more-tags');
        if (hiddenTags.length > 0) {
            if (!moreTags) {
                moreTags = document.createElement('span');
                moreTags.className = 'more-tags';
                container.appendChild(moreTags);
            }
            moreTags.textContent = `+${hiddenTags.length}`;
            moreTags.title = `Click to see ${hiddenTags.length} more tag${hiddenTags.length > 1 ? 's' : ''}`;
        } else if (moreTags) {
            moreTags.remove();
        }
    });
}

function isLevelTag(tag) {
    return tag.classList.contains('freshman-tag') ||
           tag.classList.contains('sophomore-tag') ||
           tag.classList.contains('junior-tag') ||
           tag.classList.contains('senior-tag');
}