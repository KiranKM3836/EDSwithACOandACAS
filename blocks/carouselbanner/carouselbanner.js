import { createOptimizedPicture } from '../../scripts/aem.js';


export default async function decorate(block) {

    const slides = [...block.children];
    const carouselContainer = document.createElement('div');
    carouselContainer.classList.add('carousel-container');

    const carouselWrapper = document.createElement('div');
    carouselWrapper.classList.add('carousel-wrapper');

    const paginationContainer = document.createElement('div');
    paginationContainer.classList.add('carousel-pagination');

    slides.forEach((slide, index) => {
        const linkElement = slide.children[0].querySelector('p'); // Get the <p> element with the URL
        const imageUrlElement = slide.children[1].querySelector('picture'); // Get the <picture> element

        if (linkElement && imageUrlElement) {
            const link = linkElement.textContent.trim();
            const originalPicture = imageUrlElement;

            // Create a new div for each slide
            const slideDiv = document.createElement('div');
            slideDiv.classList.add('carousel-slide');
            if (index === 0) {
                slideDiv.classList.add('active'); // Set the first slide as active
            }

            // Create an anchor tag for the entire slide to be clickable
            const anchor = document.createElement('a');
            anchor.href = link;
            anchor.ariaLabel = `Go to ${link}`;

            // Clone and append the picture element to the anchor
            const newPicture = createOptimizedPicture(
                originalPicture.querySelector('img').src,
                originalPicture.querySelector('img').alt || "Banner",
                index === 0, // Eager load the first image
                [{ width: '1920' }] // Optimizing for the banner size
            );
            anchor.appendChild(newPicture);
            slideDiv.appendChild(anchor);
            carouselWrapper.appendChild(slideDiv);

            // Create pagination dot
            const dot = document.createElement('button');
            dot.classList.add('pagination-dot');
            if (index === 0) {
                dot.classList.add('active');
            }
            dot.addEventListener('click', () => {
                showSlide(index);
            });
            paginationContainer.appendChild(dot);
        }
    });

    const prevButton = document.createElement('button');
    prevButton.classList.add('carousel-button', 'prev');
    prevButton.innerHTML = '&#10094;'; // Left arrow
    prevButton.addEventListener('click', () => {
        navigateSlides(-1);
    });

    const nextButton = document.createElement('button');
    nextButton.classList.add('carousel-button', 'next');
    nextButton.innerHTML = '&#10095;'; // Right arrow
    nextButton.addEventListener('click', () => {
        navigateSlides(1);
    });

    carouselContainer.appendChild(prevButton);
    carouselContainer.appendChild(carouselWrapper);
    carouselContainer.appendChild(nextButton);
    carouselContainer.appendChild(paginationContainer);

    block.innerHTML = ''; // Clear the existing block content
    block.appendChild(carouselContainer);

    let currentSlideIndex = 0;
    const slidesElements = Array.from(carouselWrapper.children);
    const dotsElements = Array.from(paginationContainer.children);

    function showSlide(index) {
        slidesElements.forEach((slide, i) => {
            slide.classList.toggle('active', i === index);
        });
        dotsElements.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
        currentSlideIndex = index;
    }

    function navigateSlides(direction) {
        let newIndex = currentSlideIndex + direction;
        if (newIndex < 0) {
            newIndex = slidesElements.length - 1;
        } else if (newIndex >= slidesElements.length) {
            newIndex = 0;
        }
        showSlide(newIndex);
    }

    // Optional: Auto-play carousel
    let autoPlayInterval = setInterval(() => {
        navigateSlides(1);
    }, 5000); // Change slide every 5 seconds

    // Pause auto-play on hover
    carouselContainer.addEventListener('mouseenter', () => {
        clearInterval(autoPlayInterval);
    });
    carouselContainer.addEventListener('mouseleave', () => {
        autoPlayInterval = setInterval(() => {
            navigateSlides(1);
        }, 5000);
    });

    // console.log(fetchSKUsByCategory(),"products")
}