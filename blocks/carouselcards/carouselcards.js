import { fetchPlaceholders } from '../../scripts/aem.js';

function updateActiveSlide(slide) {
  const block = slide.closest('.carouselcards');
  const slideIndex = parseInt(slide.dataset.slideIndex, 10);
  block.dataset.activeSlide = slideIndex;

  const slides = block.querySelectorAll('.carouselcards-slide');

  slides.forEach((aSlide, idx) => {
    aSlide.setAttribute('aria-hidden', idx !== slideIndex);
    aSlide.querySelectorAll('a').forEach((link) => {
      if (idx !== slideIndex) {
        link.setAttribute('tabindex', '-1');
      } else {
        link.removeAttribute('tabindex');
      }
    });
  });

  const allElements = document.querySelectorAll('.carouselcards-slide-indicator button:disabled');
  if (allElements.length !== 0) {
    allElements.forEach((data) => {
      data.removeAttribute('disabled');
    });
  }
  if (slideIndex % 4 === 0) {
    const selector = `.carouselcards-slide-indicator[data-target-slide="${slideIndex}"]`;
    const targetElement = document.querySelector(selector).querySelector('button');
    targetElement.setAttribute('disabled', 'true');
  }
  // const indicators = block.querySelectorAll('.carouselcards-slide-indicator ');
  // indicators.forEach((indicator, idx) => {
  //   if (idx !== slideIndex) {
  //     indicator.querySelector('button').removeAttribute('disabled');
  //   } else {
  //     indicator.querySelector('button').setAttribute('disabled', 'true');
  //   }
  // });
}

function showSlide(block, slideIndex = 0) {
  const slides = block.querySelectorAll('.carouselcards-slide');
  let realSlideIndex = slideIndex < 0 ? slides.length - 1 : slideIndex;
  if (slideIndex >= slides.length) realSlideIndex = 0;
  const activeSlide = slides[realSlideIndex];

  activeSlide.querySelectorAll('a').forEach((link) => link.removeAttribute('tabindex'));
  block.querySelector('.carouselcards-slides').scrollTo({
    top: 0,
    left: activeSlide.offsetLeft,
    behavior: 'smooth',
  });
}

function bindEvents(block) {
  const slideIndicators = block.querySelector('.carouselcards-slide-indicators');
  if (!slideIndicators) return;

  slideIndicators.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', (e) => {
      const slideIndicator = e.currentTarget.parentElement;
      showSlide(block, parseInt(slideIndicator.dataset.targetSlide, 10));
    });
  });

  block.querySelector('.slide-prev').addEventListener('click', () => {
    showSlide(block, parseInt(block.dataset.activeSlide, 10) - 1);
  });
  block.querySelector('.slide-next').addEventListener('click', () => {
    showSlide(block, parseInt(block.dataset.activeSlide, 10) + 1);
  });

  const slideObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) updateActiveSlide(entry.target);
    });
  }, { threshold: 0.5 });
  block.querySelectorAll('.carouselcards-slide').forEach((slide) => {
    slideObserver.observe(slide);
  });
}
function createSlide(row, slideIndex, carouselId) {
  const slide = document.createElement('li');
  slide.dataset.slideIndex = slideIndex;
  slide.setAttribute('id', `carouselcards-${carouselId}-slide-${slideIndex}`);
  slide.classList.add('carouselcards-slide');

  // Create card content dynamically based on JSON data
  const card = document.createElement('div');
  card.classList.add('carouselcards-card');

  const img = document.createElement('img');
  img.src = row.image; // Set the image URL
  img.alt = row.title; // Set the alt text for accessibility
  img.classList.add('carouselcards-card-image');
  img.addEventListener('click', () => {
    window.location.href = row.path;
  });
  const content = document.createElement('div');
  content.classList.add('carouselcards-card-content');

  const title = document.createElement('h6');
  title.textContent = row.title; // Set the title
  title.addEventListener('click', () => {
    window.location.href = row.path;
  });
  const description = document.createElement('p');
  description.textContent = row.price; // Set the description

  const btn = document.createElement('a');
  btn.href = row.path;
  btn.classList.add('button');
  btn.textContent = 'ADD TO CART';
  content.append(title, description, btn);
  card.append(img, content);
  slide.append(card);

  return slide;
}

let carouselId = 0;
export default async function decorate(block) {
  carouselId += 1;
  block.setAttribute('id', `carouselcards-${carouselId}`);
  const response = await fetch('/query-index.json');
  const content = await response.json();
  const jsonData = content.data.filter((data) => data.price);
  const isSingleSlide = jsonData.length < 2;
  const placeholders = await fetchPlaceholders();

  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', placeholders.carousel || 'Carousel');

  const container = document.createElement('div');
  container.classList.add('carouselcards-slides-container');

  const slidesWrapper = document.createElement('ul');
  slidesWrapper.classList.add('carouselcards-slides');
  block.prepend(slidesWrapper);

  let slideIndicators;
  if (!isSingleSlide) {
    const slideIndicatorsNav = document.createElement('nav');
    slideIndicatorsNav.setAttribute('aria-label', placeholders.carouselSlideControls || 'Carousel Slide Controls');
    slideIndicators = document.createElement('ol');
    slideIndicators.classList.add('carouselcards-slide-indicators');
    slideIndicatorsNav.append(slideIndicators);
    block.append(slideIndicatorsNav);
  }

  // Add slides based on the JSON data
  jsonData.forEach((row, idx) => {
    const slide = createSlide(row, idx, carouselId);
    slidesWrapper.append(slide);

    if (idx % 4 === 0 && slideIndicators) {
      const indicator = document.createElement('li');
      indicator.classList.add('carouselcards-slide-indicator');
      indicator.dataset.targetSlide = idx;
      indicator.innerHTML = `<button type="button" aria-label="${placeholders.showSlide || 'Show Slide'} ${idx + 1} ${placeholders.of || 'of'} ${jsonData.length}"></button>`;
      slideIndicators.append(indicator);
    }
  });

  const slideNavButtons = document.createElement('div');
  slideNavButtons.classList.add('carouselcards-navigation-buttons');
  slideNavButtons.innerHTML = `
    <button type="button" class="slide-prev" aria-label="${placeholders.previousSlide || 'Previous Slide'}"></button>
    <button type="button" class="slide-next" aria-label="${placeholders.nextSlide || 'Next Slide'}"></button>
  `;
  container.append(slideNavButtons);

  container.append(slidesWrapper);
  block.prepend(container);

  if (!isSingleSlide) {
    bindEvents(block);
  }
}
