export default async function decorate(block) {
    // 1. Create the main carousel structure
    const brandsContainerWrapper = document.createElement('div');
    brandsContainerWrapper.classList.add('brands-container-wrapper');

    const heading = document.createElement('h2');
    heading.textContent = 'Our Premium Brands';
    brandsContainerWrapper.append(heading);

    const brandsCarousel = document.createElement('div');
    brandsCarousel.classList.add('brands-carousel');
    brandsContainerWrapper.append(brandsCarousel);

    const carouselTrack = document.createElement('div');
    carouselTrack.classList.add('carousel-track');
    brandsCarousel.append(carouselTrack);

    // --- REVISED LOGIC FOR EXTRACTING BRAND ITEMS ---
    const brandData = [];
    Array.from(block.children).forEach(rowDiv => {
        if (rowDiv.children.length >= 2) {
            const linkColumn = rowDiv.children[0];
            const imageColumn = rowDiv.children[1];

            const linkPathP = linkColumn.querySelector('p');
            const pictureElement = imageColumn.querySelector('picture');

            if (linkPathP && pictureElement) {
                const linkHref = linkPathP.textContent.trim();
                const imgElement = pictureElement.querySelector('img');

                if (linkHref && imgElement) {
                    const brandLink = document.createElement('a');
                    brandLink.href = linkHref;
                    brandLink.classList.add('brand-logo-item');

                    const clonedPicture = pictureElement.cloneNode(true);
                    const clonedImg = clonedPicture.querySelector('img');
                    if (!clonedImg.alt) {
                        const brandName = linkHref.split('/').pop().replace(/([A-Z])/g, ' $1').trim();
                        clonedImg.alt = `${brandName} Logo`;
                    }
                    brandLink.append(clonedPicture);

                    brandData.push(brandLink);
                }
            }
        }
    });

    block.innerHTML = ''; // Clear original content after extraction

    if (brandData.length > 0) {
        brandData.forEach(item => carouselTrack.append(item));
    } else {
        console.warn('No brand items found in the block to populate the carousel.');
        brandsCarousel.style.display = 'none';
        heading.textContent = 'No Brands Available';
        brandsContainerWrapper.append(document.createElement('p').textContent = 'Please add brand content to this block.');
        block.append(brandsContainerWrapper);
        return; // Exit early if no items
    }

    // 3. Create navigation buttons directly appended to brandsContainerWrapper
    //    The 'carousel-buttons' div is no longer needed if we're positioning individually.
    //    Removing its creation simplifies the DOM and CSS.

    const prevButton = document.createElement('button');
    prevButton.classList.add('carousel-button', 'prev-button');
    prevButton.setAttribute('aria-label', 'Previous Brand');
    prevButton.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-chevron-left"><polyline points="15 18 9 12 15 6"></polyline></svg>';
    brandsContainerWrapper.append(prevButton); // Append directly here

    const nextButton = document.createElement('button');
    nextButton.classList.add('carousel-button', 'next-button');
    nextButton.setAttribute('aria-label', 'Next Brand');
    nextButton.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-chevron-right"><polyline points="9 18 15 12 9 6"></polyline></svg>';
    brandsContainerWrapper.append(nextButton); // Append directly here

    block.append(brandsContainerWrapper); // Append the fully constructed wrapper

    // --- Carousel Interaction Logic ---
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
        return brandsCarousel.clientWidth;
    }

    function calculateItemsPerPage() {
        if (items.length === 0) return 1;
        const containerWidth = getCarouselVisibleWidth();
        const firstItem = items[0];
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
        const targetItemMarginLeft = parseFloat(getComputedStyle(targetItem).marginLeft);
        let targetX = targetItemOffsetLeft - targetItemMarginLeft;

        let totalTrackWidth = 0;
        items.forEach(item => {
            totalTrackWidth += item.offsetWidth +
                               parseFloat(getComputedStyle(item).marginLeft) +
                               parseFloat(getComputedStyle(item).marginRight);
        });

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

        const atBeginning = Math.abs(currentTranslate) < 5;
        const maxScrollTranslate = Math.max(0, totalTrackWidth - containerWidth);
        const atEnd = (Math.abs(currentTranslate) >= maxScrollTranslate - 5);

        prevButton.disabled = !canScroll || atBeginning;
        nextButton.disabled = !canScroll || atEnd;

        prevButton.classList.toggle('disabled', prevButton.disabled);
        nextButton.classList.toggle('disabled', nextButton.disabled);

        if (!canScroll) {
            prevButton.style.display = 'none';
            nextButton.style.display = 'none';
        } else {
            prevButton.style.display = '';
            nextButton.style.display = '';
        }
    }

    // --- Drag/Swipe Functionality ---
    function getPositionX(event) {
        return event.type.includes('mouse') ? event.pageX : event.touches[0].clientX;
    }

    function touchStart(event) {
        if (event.type === 'mousedown' && event.button !== 0) return;
        isDragging = true;
        brandsCarousel.classList.add('is-dragging');
        startPos = getPositionX(event);
        carouselTrack.style.transition = 'none';
        animationId = requestAnimationFrame(animation);
        prevTranslate = currentTranslate;
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

        const minTranslate = -(totalTrackWidth - containerWidth);
        const maxTranslate = 0;

        currentTranslate = Math.max(minTranslate, Math.min(maxTranslate, newTranslate));
    }

    function touchEnd() {
        cancelAnimationFrame(animationId);
        isDragging = false;
        brandsCarousel.classList.remove('is-dragging');

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

        slideTo(closestFirstVisibleItemIndex);

        carouselTrack.querySelectorAll('.brand-logo-item').forEach(item => {
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
    carouselTrack.addEventListener('mouseleave', touchEnd);
    carouselTrack.addEventListener('mousemove', touchMove);

    carouselTrack.addEventListener('touchstart', touchStart, { passive: true });
    carouselTrack.addEventListener('touchend', touchEnd);
    carouselTrack.addEventListener('touchmove', touchMove, { passive: true });

    carouselTrack.addEventListener('click', (e) => {
        if (Math.abs(currentTranslate - prevTranslate) > 5) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, true);

    // --- Click Behavior for Arrows ---
    prevButton.addEventListener('click', () => {
        slideTo(currentIndex - itemsPerPage);
    });
    nextButton.addEventListener('click', () => {
        slideTo(currentIndex + itemsPerPage);
    });

    const initializeCarousel = () => {
        itemsPerPage = calculateItemsPerPage();
        carouselTrack.style.transform = 'translateX(0px)';
        currentTranslate = 0;
        prevTranslate = 0;
        currentIndex = 0;
        slideTo(currentIndex);
        updateButtonStates();
    };

    window.addEventListener('resize', initializeCarousel);

    const allImages = carouselTrack.querySelectorAll('img');
    const loadPromises = Array.from(allImages).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
            img.addEventListener('load', resolve);
            img.addEventListener('error', resolve);
        });
    });

    Promise.all(loadPromises).then(() => {
        initializeCarousel();
    }).catch(() => {
        console.warn('Some brand images failed to load, initializing carousel anyway.');
        initializeCarousel();
    });
}