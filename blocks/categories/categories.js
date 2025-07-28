// categories.js
export default async function decorate(block) {
    // 1. Create the main categories carousel structure
    const categoriesContainerWrapper = document.createElement('div');
    categoriesContainerWrapper.classList.add('categories-container-wrapper');

    // Add a heading for the section
    const heading = document.createElement('h2');
    heading.textContent = 'Explore Our Top Categories'; // Customize this heading as needed
    categoriesContainerWrapper.append(heading);

    const categoriesCarousel = document.createElement('div');
    categoriesCarousel.classList.add('categories-carousel');
    categoriesContainerWrapper.append(categoriesCarousel);

    const carouselTrack = document.createElement('div');
    carouselTrack.classList.add('carousel-track');
    categoriesCarousel.append(carouselTrack);

    // --- Logic for Extracting Category Items from the provided HTML structure ---
    const categoryData = [];
    // Iterate over the direct children of the 'block' (each represents a category row)
    Array.from(block.children).forEach(categoryRowDiv => {
        // Each category row div contains two divs: one for link, one for picture
        const linkDiv = categoryRowDiv.children[0];
        const imageDiv = categoryRowDiv.children[1];

        const linkPathP = linkDiv ? linkDiv.querySelector('p') : null;
        const pictureElement = imageDiv ? imageDiv.querySelector('picture') : null;

        if (linkPathP && pictureElement) {
            const linkHref = linkPathP.textContent.trim();
            const imgElement = pictureElement.querySelector('img');

            if (linkHref && imgElement) {
                const categoryLink = document.createElement('a');
                categoryLink.href = linkHref;
                categoryLink.classList.add('category-item');

                const clonedPicture = pictureElement.cloneNode(true);
                const clonedImg = clonedPicture.querySelector('img');
                // Set alt text if not present, using the link path
                if (!clonedImg.alt) {
                    const categoryNameFromLink = linkHref.split('/').filter(part => part).pop();
                    if (categoryNameFromLink) {
                        clonedImg.alt = `${categoryNameFromLink.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase())} Category`;
                    } else {
                        clonedImg.alt = 'Category Image';
                    }
                }
                categoryLink.append(clonedPicture);

                // Add a descriptive text below the image derived from the link
                const categoryNameText = document.createElement('p');
                const nameParts = linkHref.split('/').filter(part => part !== '');
                let displayCategoryName = nameParts.pop(); // Get the last part of the path
                // Capitalize first letter of each word and replace hyphens
                if (displayCategoryName) {
                    displayCategoryName = displayCategoryName.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
                } else {
                    displayCategoryName = 'Category'; // Fallback
                }
                categoryNameText.textContent = displayCategoryName;
                categoryLink.append(categoryNameText);

                categoryData.push(categoryLink);
            }
        }
    });

    block.innerHTML = ''; // Clear original content after extraction

    if (categoryData.length > 0) {
        categoryData.forEach(item => carouselTrack.append(item));
    } else {
        console.warn('No category items found in the block to populate the carousel.');
        categoriesCarousel.style.display = 'none';
        heading.textContent = 'No Categories Available';
        categoriesContainerWrapper.append(document.createElement('p').textContent = 'Please add category content to this block.');
        block.append(categoriesContainerWrapper);
        return; // Exit early if no items
    }

    // 3. Create navigation buttons
    const prevButton = document.createElement('button');
    prevButton.classList.add('carousel-button', 'prev-button');
    prevButton.setAttribute('aria-label', 'Previous Category');
    prevButton.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-chevron-left"><polyline points="15 18 9 12 15 6"></polyline></svg>';
    categoriesContainerWrapper.append(prevButton);

    const nextButton = document.createElement('button');
    nextButton.classList.add('carousel-button', 'next-button');
    nextButton.setAttribute('aria-label', 'Next Category');
    nextButton.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-chevron-right"><polyline points="9 18 15 12 9 6"></polyline></svg>';
    categoriesContainerWrapper.append(nextButton);

    block.append(categoriesContainerWrapper); // Append the fully constructed wrapper

    // --- Carousel Interaction Logic (Adapted for categories) ---
    const items = Array.from(carouselTrack.children);
    let currentIndex = 0;
    let isDragging = false;
    let startPos = 0;
    let currentTranslate = 0;
    let prevTranslate = 0;
    let animationId = null;
    let itemsPerPage = 1;

    if (items.length === 0) {
        prevButton.style.display = 'none';
        nextButton.style.display = 'none';
        return;
    }

    function getCarouselVisibleWidth() {
        return categoriesCarousel.clientWidth;
    }

    function calculateItemsPerPage() {
        if (items.length === 0) return 1;
        const containerWidth = getCarouselVisibleWidth();
        const firstItem = items[0];
        // Ensure to account for margins when calculating item width
        const itemWidth = firstItem.offsetWidth +
                          parseFloat(getComputedStyle(firstItem).marginLeft) +
                          parseFloat(getComputedStyle(firstItem).marginRight);
        return Math.max(1, Math.floor(containerWidth / itemWidth));
    }

    function calculateScrollPosition(index) {
        if (items.length === 0) return 0;
        const containerWidth = getCarouselVisibleWidth();
        const targetItem = items[index];
        const targetItemOffsetLeft = targetItem.offsetLeft;
        // Adjust for item margin to ensure it aligns correctly at the start of the visible area
        const targetItemMarginLeft = parseFloat(getComputedStyle(targetItem).marginLeft);
        let targetX = targetItemOffsetLeft - targetItemMarginLeft;

        let totalTrackWidth = 0;
        items.forEach(item => {
            totalTrackWidth += item.offsetWidth +
                               parseFloat(getComputedStyle(item).marginLeft) +
                               parseFloat(getComputedStyle(item).marginRight);
        });

        // Ensure we don't scroll past the end of the track
        const maxScroll = Math.max(0, totalTrackWidth - containerWidth);
        return Math.min(targetX, maxScroll);
    }

    function setSliderTransform(translate, animate = false) {
        if (animate) {
            carouselTrack.style.transition = 'transform 0.5s ease-in-out';
        } else {
            carouselTrack.style.transition = 'none';
        }
        carouselTrack.style.transform = `translateX(${translate}px)`;
    }

    function slideTo(index) {
        // Clamp index to valid range
        currentIndex = Math.max(0, Math.min(index, items.length - itemsPerPage));
        const targetScrollX = calculateScrollPosition(currentIndex);
        currentTranslate = -targetScrollX;
        setSliderTransform(currentTranslate, true);
        updateButtonStates();
    }

    function updateButtonStates() {
        const containerWidth = getCarouselVisibleWidth();
        let totalTrackWidth = 0;
        items.forEach(item => {
            totalTrackWidth += item.offsetWidth +
                               parseFloat(getComputedStyle(item).marginLeft) +
                               parseFloat(getComputedStyle(item).marginRight);
        });

        const canScroll = totalTrackWidth > containerWidth;

        // Check if at the very beginning (within a small tolerance)
        const atBeginning = Math.abs(currentTranslate) < 5;
        // Calculate the maximum possible scroll amount
        const maxScrollTranslate = Math.max(0, totalTrackWidth - containerWidth);
        // Check if at the very end (within a small tolerance)
        const atEnd = (Math.abs(currentTranslate) >= maxScrollTranslate - 5);

        prevButton.disabled = !canScroll || atBeginning;
        nextButton.disabled = !canScroll || atEnd;

        // Add/remove disabled class for CSS styling
        prevButton.classList.toggle('disabled', prevButton.disabled);
        nextButton.classList.toggle('disabled', nextButton.disabled);

        // Hide buttons if no scrolling is needed
        if (!canScroll) {
            prevButton.style.display = 'none';
            nextButton.style.display = 'none';
        } else {
            prevButton.style.display = ''; // Ensure they are visible if scrollable
            nextButton.style.display = '';
        }
    }

    // --- Drag/Swipe Functionality ---
    function getPositionX(event) {
        return event.type.includes('mouse') ? event.pageX : event.touches[0].clientX;
    }

    function touchStart(event) {
        if (event.type === 'mousedown' && event.button !== 0) return; // Only left click for mouse
        isDragging = true;
        categoriesCarousel.classList.add('is-dragging'); // Add dragging class for cursor style
        startPos = getPositionX(event);
        carouselTrack.style.transition = 'none'; // Disable transition during drag
        animationId = requestAnimationFrame(animation);
        prevTranslate = currentTranslate; // Store initial translate to calculate new position
    }

    function touchMove(event) {
        if (!isDragging) return;
        const currentPosition = getPositionX(event);
        let newTranslate = prevTranslate + (currentPosition - startPos);

        const containerWidth = getCarouselVisibleWidth();
        let totalTrackWidth = 0;
        items.forEach(item => {
            totalTrackWidth += item.offsetWidth +
                               parseFloat(getComputedStyle(item).marginLeft) +
                               parseFloat(getComputedStyle(item).marginRight);
        });

        // Define bounds for dragging
        const minTranslate = -(totalTrackWidth - containerWidth);
        const maxTranslate = 0;

        currentTranslate = Math.max(minTranslate, Math.min(maxTranslate, newTranslate));
    }

    function touchEnd() {
        cancelAnimationFrame(animationId);
        isDragging = false;
        categoriesCarousel.classList.remove('is-dragging');

        // Determine which item is closest to the beginning of the visible carousel
        let closestFirstVisibleItemIndex = 0;
        let minOffset = Infinity;
        const currentScrollOffset = Math.abs(currentTranslate);

        items.forEach((item, index) => {
            const itemLeft = item.offsetLeft + parseFloat(getComputedStyle(item).marginLeft);
            const diff = Math.abs(itemLeft - currentScrollOffset);
            if (diff < minOffset) {
                minOffset = diff;
                closestFirstVisibleItemIndex = index;
            }
        });

        // Slide to the determined closest item
        slideTo(closestFirstVisibleItemIndex);

        // Re-enable pointer events for links
        carouselTrack.querySelectorAll('.category-item').forEach(item => {
            item.style.pointerEvents = '';
        });
    }

    function animation() {
        setSliderTransform(currentTranslate);
        if (isDragging) {
            requestAnimationFrame(animation);
        }
    }

    // Attach drag events
    carouselTrack.addEventListener('mousedown', touchStart);
    carouselTrack.addEventListener('mouseup', touchEnd);
    carouselTrack.addEventListener('mouseleave', touchEnd); // If mouse leaves while dragging
    carouselTrack.addEventListener('mousemove', touchMove);

    carouselTrack.addEventListener('touchstart', touchStart, { passive: true });
    carouselTrack.addEventListener('touchend', touchEnd);
    carouselTrack.addEventListener('touchmove', touchMove, { passive: true });

    // Prevent click event when dragging
    carouselTrack.addEventListener('click', (e) => {
        if (Math.abs(currentTranslate - prevTranslate) > 5) { // If there was significant movement
            e.preventDefault();
            e.stopPropagation();
        }
    }, true); // Use capture phase to prevent default behavior before link is followed

    // --- Click Behavior for Arrows ---
    prevButton.addEventListener('click', () => {
        slideTo(currentIndex - itemsPerPage);
    });
    nextButton.addEventListener('click', () => {
        slideTo(currentIndex + itemsPerPage);
    });

    // Initialize carousel on load and resize
    const initializeCarousel = () => {
        itemsPerPage = calculateItemsPerPage();
        carouselTrack.style.transform = 'translateX(0px)'; // Reset transform
        currentTranslate = 0;
        prevTranslate = 0;
        currentIndex = 0;
        slideTo(currentIndex); // Slide to initial position
        updateButtonStates();
    };

    window.addEventListener('resize', initializeCarousel);

    // Wait for all images to load before initializing to get correct dimensions
    const allImages = carouselTrack.querySelectorAll('img');
    const loadPromises = Array.from(allImages).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
            img.addEventListener('load', resolve);
            img.addEventListener('error', resolve); // Also resolve on error to not block
        });
    });

    Promise.all(loadPromises).then(() => {
        initializeCarousel();
    }).catch(() => {
        console.warn('Some category images failed to load, initializing carousel anyway.');
        initializeCarousel(); // Still initialize even if some images fail
    });
}