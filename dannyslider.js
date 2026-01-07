(function(window, document) {
  'use strict';

  // Namespace check - prevents conflicts
  if (window.DannySliderLib) {
    console.warn('DannySliderLib already initialized');
    return;
  }

  // Global gallery manager - singleton pattern
  const GalleryManager = {
    overlay: null,
    zoomTrack: null,
    zoomPrev: null,
    zoomNext: null,
    zoomClose: null,
    currentImages: [],
    currentIndex: 0,
    isOpen: false,
    initialized: false,

    init() {
      if (this.initialized) return;

      const overlayHTML = `
        <div class="danny-zoom-overlay" role="dialog" aria-modal="true" aria-label="Image gallery">
          <div class="danny-zoom-track"></div>
          <button class="danny-zoom-prev" aria-label="Previous">&#10094;</button>
          <button class="danny-zoom-next" aria-label="Next">&#10095;</button>
          <button class="danny-zoom-close" aria-label="Close">&times;</button>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', overlayHTML);

      this.overlay = document.querySelector('.danny-zoom-overlay');
      this.zoomTrack = this.overlay.querySelector('.danny-zoom-track');
      this.zoomPrev = this.overlay.querySelector('.danny-zoom-prev');
      this.zoomNext = this.overlay.querySelector('.danny-zoom-next');
      this.zoomClose = this.overlay.querySelector('.danny-zoom-close');

      this.bindEvents();
      this.initialized = true;
    },

    bindEvents() {
      this.zoomNext.addEventListener('click', () => this.next());
      this.zoomPrev.addEventListener('click', () => this.prev());
      this.zoomClose.addEventListener('click', () => this.close());
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) this.close();
      });

      document.addEventListener('keydown', (e) => {
        if (!this.isOpen) return;
        if (e.key === 'Escape') this.close();
        else if (e.key === 'ArrowRight') this.next();
        else if (e.key === 'ArrowLeft') this.prev();
      });

      let startX = 0;
      this.overlay.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
      }, { passive: true });

      this.overlay.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].clientX - startX;
        if (dx < -50) this.next();
        else if (dx > 50) this.prev();
      });
    },

    open(images, startIndex) {
      if (!images || images.length === 0) return;
      
      this.currentImages = images;
      this.currentIndex = Math.max(0, Math.min(startIndex || 0, images.length - 1));
      this.render();
      this.overlay.classList.add('active');
      this.isOpen = true;
      document.body.style.overflow = 'hidden';
    },

    close() {
      this.overlay.classList.remove('active');
      this.isOpen = false;
      document.body.style.overflow = '';
      this.currentImages = [];
    },

    next() {
      if (this.currentImages.length === 0) return;
      this.currentIndex = (this.currentIndex + 1) % this.currentImages.length;
      this.render();
    },
    
    /*next() {
      const pages = this.getPageCount();
      const maxIndex = Math.max(0, this.state.total - this.state.visible);

      if (this.config.transition === 'fade') {
        // Fade mode: navigate by pages
        if (this.state.index < pages - 1) {
          this.state.index++;
        } else if (this.config.loop) {
          this.state.index = 0;
        }
      } else {
        // Slide mode: navigate by visible items
        if (this.state.index < maxIndex) {
          this.state.index++;
        } else if (this.config.loop) {
          this.state.index = 0;
        }
      }
      this.update();
    },*/

    prev() {
      if (this.currentImages.length === 0) return;
      this.currentIndex = (this.currentIndex - 1 + this.currentImages.length) % this.currentImages.length;
      this.render();
    },

    render() {
      if (!this.currentImages.length) return;
      
      this.zoomTrack.innerHTML = this.currentImages
        .map(src => `<img src="${src}" alt="">`)
        .join('');
      
      this.zoomTrack.style.transform = `translateX(-${this.currentIndex * 100}%)`;
    }
  };

  // Main Slider class
  class DannySlider {
    constructor(element) {
      if (element._dannySlider) return element._dannySlider;
      element._dannySlider = this;

      this.slider = element;
      this.track = element.querySelector('.danny-slider-track');
      this.items = Array.from(element.querySelectorAll('.danny-slider-item'));
      this.prevBtn = element.querySelector('.danny-slider-prev');
      this.nextBtn = element.querySelector('.danny-slider-next');
      this.dotsBox = element.querySelector('.danny-slider-dots');
      this.thumbsBox = element.querySelector('.danny-slider-thumbs');

      // Parse configuration
      const d = element.dataset;
      this.config = {
        autoplay: d.autoplay === 'true',
        autoplayResume: d.autoplayResume === 'true',
        speed: Number(d.speed) || 3000,
        loop: d.loop === 'true',
        swipe: d.swipe === 'true',
        hoverPause: d.hoverPause === 'true',
        keyboard: d.keyboard === 'true',
        ease: d.ease || 'ease',
        transition: d.transition === 'fade' ? 'fade' : 'slide',
        showArrows: d.arrows !== 'false',
        showDots: d.dots !== 'false',
        showThumbs: d.thumbnails === 'true',
        thumbsItems: Number(d.thumbsItems) || 4,
        thumbsItemsTablet: Number(d.thumbsItemsTablet) || Number(d.thumbsItems) || 3,
        thumbsItemsMobile: Number(d.thumbsItemsMobile) || Number(d.thumbsItemsTablet) || Number(d.thumbsItems) || 2,
        thumbsGap: Number(d.thumbsGap) || 10,
        gallery: d.gallery === 'true',
        itemsDesktop: Number(d.itemsDesktop) || 1,
        itemsTablet: Number(d.itemsTablet) || Number(d.itemsDesktop) || 1,
        itemsMobile: Number(d.itemsMobile) || Number(d.itemsTablet) || Number(d.itemsDesktop) || 1,
        itemsMobile: Number(d.itemsMobile) || Number(d.itemsTablet) || Number(d.itemsDesktop) || 1,
        gap: Number(d.gap) || 0,
        thumbsOrientation: d.thumbsOrientation || 'horizontal'
      };

      this.state = {
        index: 0,
        timer: null,
        visible: 1,
        thumbsVisible: this.config.thumbsItems, // Initialize
        total: this.items.length,
        thumbStart: 0 // Index of the first visible thumbnail
      };

      this.init();
    }

    init() {
      if (this.track) {
        this.track.style.setProperty('--danny-ease', this.config.ease);
        this.track.style.setProperty('--danny-gap', `${this.config.gap}px`);
      }

      this.createDots();
      this.createThumbs();
      this.updateResponsive();
      
      if (this.config.gallery) {
        GalleryManager.init();
        this.initGallery();
      }
      
      this.bindEvents();
      this.update();
      
      if (this.config.autoplay) this.play();
    }

    updateResponsive() {
      const width = window.innerWidth;
      let visible = this.config.itemsDesktop;
      
      if (width < 768) visible = this.config.itemsMobile;
      else if (width < 1024) visible = this.config.itemsTablet;

      if (this.config.transition === 'fade') visible = 1;
      // Do not clamp to total items. Allow strict grid sizing (e.g. 1 item takes 1/3 width if visible=3).
      this.state.visible = Math.max(1, visible);
      
      // Correct item width calculation using calc to account for gap
        const gap = this.config.gap;
        const v = this.state.visible;
        // width = (100% - totalGap) / visible
        const widthExpression = `calc((100% - ${gap * (v - 1)}px) / ${v})`;

        this.items.forEach(el => {
            el.style.setProperty('--danny-item-width', widthExpression);
        });


      // Calculate item width considering gap
      /*if (this.config.transition === 'slide' && this.state.visible > 1) {
        const totalGap = this.config.gap * (this.state.visible - 1);
        const availableWidth = 100 - (totalGap / this.slider.offsetWidth * 100);
        const itemWidth = availableWidth / this.state.visible;
        
        this.items.forEach(el => {
          el.style.setProperty('--danny-item-width', `${itemWidth}%`);
        });
      } else {
        const basis = 100 / this.state.visible;
        this.items.forEach(el => {
          el.style.setProperty('--danny-item-width', `${basis}%`);
        });
      }*/

      const pages = this.getPageCount();
      if (this.state.index >= pages) {
        this.state.index = Math.max(0, pages - 1);
      }

      // --- Thumbs Responsive Logic ---
      if (this.config.showThumbs && this.thumbsTrack) {
          let tVisible = this.config.thumbsItems;
          if (width < 768) tVisible = this.config.thumbsItemsMobile;
          else if (width < 1024) tVisible = this.config.thumbsItemsTablet;
          
          this.state.thumbsVisible = tVisible;
          
          // Check actual orientation based on screen width
          const isVertical = this.config.thumbsOrientation === 'vertical' && width >= 768;

          const tGap = this.config.thumbsGap;
          
          if (isVertical) {
             // Height logic
             // thumbHeight = (100% - totalGap) / visible
             const tHeightExpression = `calc((100% - ${tGap * (tVisible - 1)}px) / ${tVisible})`;
             
             Array.from(this.thumbsTrack.children).forEach(thumb => {
                thumb.style.width = '100%'; 
                thumb.style.height = tHeightExpression;
                thumb.style.flex = `0 0 ${tHeightExpression}`;
             });
             
             // Ensure track has height? 
             // In vertical, viewport usually has fixed height, track grows.
             // We don't necessarily need to set track height if items force it, but flex column needs care.
             
          } else {
             // Horizontal logic
             const tWidthExpression = `calc((100% - ${tGap * (tVisible - 1)}px) / ${tVisible})`;
             
             Array.from(this.thumbsTrack.children).forEach(thumb => {
                 thumb.style.width = tWidthExpression;
                 thumb.style.height = 'auto'; // Reset
                 thumb.style.flex = `0 0 ${tWidthExpression}`;
                 // thumb.style.setProperty('--danny-thumb-width', tWidthExpression); // Cleanup old var approach for direct style
             });
          }

          // Re-clamp thumbStart if needed
          const maxStart = Math.max(0, this.state.total - this.state.thumbsVisible);
          this.state.thumbStart = Math.min(this.state.thumbStart, maxStart);
          
          // Re-render thumbs position
          this.updateThumbs(); 
      }
    }

    getPageCount() {
        return this.state.total; // one dot per item
    }

    update() {
      if (!this.track) return;

      if (this.config.transition === 'fade') {
        const start = this.state.index * this.state.visible;
        const end = Math.min(start + this.state.visible, this.state.total);
        this.items.forEach((el, i) => {
          el.classList.toggle('active', i >= start && i < end);
        });
      } else {
        // Calculate transform considering gap using consistent calc formula
        // Move amount = index * (100% + gap) / visible
        // (100% + gap) / visible represents exactly one item width + one gap
        const gap = this.config.gap;
        const visible = this.state.visible;
        this.track.style.transform = `translateX(calc(-${this.state.index} * (100% + ${gap}px) / ${visible}))`;
      }

      this.updateDots();
      this.ensureThumbVisible();
      this.updateThumbs();
      this.updateButtons();
    }

    updateButtons() {
      if (!this.config.showArrows) return;
      
      const pages = this.getPageCount();
      
      if (this.prevBtn) {
        this.prevBtn.disabled = !this.config.loop && this.state.index === 0;
      }
      
      if (this.nextBtn) {
        this.nextBtn.disabled = !this.config.loop && this.state.index === pages - 1;
      }
    }

    next() {
      const lastPage = this.getPageCount() - 1;
      if (this.state.index < lastPage) {
        this.state.index++;
      } else if (this.config.loop) {
        this.state.index = 0;
      }
      this.update();
    }

    prev() {
      if (this.state.index > 0) {
        this.state.index--;
      } else if (this.config.loop) {
        this.state.index = this.getPageCount() - 1;
      }
      this.update();
    }

    play() {
      this.stop();
      if (this.config.speed > 0) {
        this.state.timer = setInterval(() => this.next(), this.config.speed);
      }
    }

    stop() {
      if (this.state.timer) {
        clearInterval(this.state.timer);
        this.state.timer = null;
      }
    }

    createDots() {
        if (!this.dotsBox || !this.config.showDots) return;
        this.dotsBox.innerHTML = '';
        
        for (let i = 0; i < this.state.total; i++) {
            const dot = document.createElement('button');
            dot.className = 'danny-slider-dot';
            dot.type = 'button';
            dot.setAttribute('aria-label', `Go to item ${i + 1}`);
            dot.addEventListener('click', () => {
            this.state.index = i; // Map directly to item index
            this.update();
            if (this.config.autoplay) this.play();
            });
            this.dotsBox.appendChild(dot);
        }
    }

    updateDots() {
      if (!this.dotsBox || !this.config.showDots) return;
      
      const pages = this.getPageCount();
      if (this.dotsBox.children.length !== pages) {
        this.createDots();
      }
      
      const start = this.state.index;
      // We want to highlight 'visible' number of dots starting from index
      // But we need to handle the case where we are at the end
      
      Array.from(this.dotsBox.children).forEach((dot, i) => {
        // Check if this dot index falls within the visible range [index, index + visible - 1]
        // Note: This logic assumes simple sliding. 
        // If we want to strictly follow "active 3 dot", we highlight i, i+1, i+2.
        
        let isActive = (i >= start && i < start + this.state.visible);
        
        // Optional: Handle wrapping visual logic if strictly desired, 
        // but typically standard sliders just highlight the current page's dots or the current lead dot.
        // User asked: "active 3 dot for desktop and 2 for tablet"
        
        dot.classList.toggle('active', isActive);
      });
    }

    /* updateDots() {
        if (!this.dotsBox || !this.config.showDots) return;

        const start = this.state.index * this.state.visible;
        const end = Math.min(start + this.state.visible, this.state.total);

        Array.from(this.dotsBox.children).forEach((dot, i) => {
            dot.classList.toggle('active', i >= start && i < end);
        });
    } */

    createThumbs() {
      if (!this.thumbsBox || !this.config.showThumbs) return;
      
      this.thumbsBox.innerHTML = `
        <button class="danny-thumbs-btn danny-thumbs-prev" aria-label="Previous thumbnails">&#10094;</button>
        <div class="danny-thumbs-viewport">
            <div class="danny-thumbs-track"></div>
        </div>
        <button class="danny-thumbs-btn danny-thumbs-next" aria-label="Next thumbnails">&#10095;</button>
      `;

      this.thumbsTrack = this.thumbsBox.querySelector('.danny-thumbs-track');
      this.thumbsPrevBtn = this.thumbsBox.querySelector('.danny-thumbs-prev');
      this.thumbsNextBtn = this.thumbsBox.querySelector('.danny-thumbs-next');

      // Set styles for calculation
      const gap = this.config.thumbsGap;
      // We'll set initial width in updateResponsive, but safe to set default here
      this.thumbsTrack.style.setProperty('--danny-thumbs-gap', `${gap}px`);

      this.items.forEach((item, i) => {
        const img = item.querySelector('img');
        if (!img) return;
        
        const thumbItem = document.createElement('div');
        thumbItem.className = 'danny-thumb-item';
        // Width will be set by updateResponsive

        
        const thumbImg = img.cloneNode();
        thumbImg.removeAttribute('srcset');
        thumbImg.removeAttribute('class'); // clear responsive classes
        thumbImg.alt = `Thumbnail ${i + 1}`;
        
        thumbItem.appendChild(thumbImg);
        
        thumbItem.addEventListener('click', () => {
          this.state.index = i; // Map directly to item index
          this.update();
          if (this.config.autoplay) this.play();
        });
        
        this.thumbsTrack.appendChild(thumbItem);
      });

      // Bind thumb navigation
      this.thumbsPrevBtn.addEventListener('click', () => this.prevThumb());
      this.thumbsNextBtn.addEventListener('click', () => this.nextThumb());
    }

    prevThumb() {
        const visible = this.state.thumbsVisible || this.config.thumbsItems;
        const maxStart = Math.max(0, this.state.total - visible);
        const jump = visible;
        
        if (this.state.thumbStart > 0) {
            this.state.thumbStart = Math.max(0, this.state.thumbStart - jump);
        }
        // No loop to end
        this.updateThumbs();
    }

    nextThumb() {
        const visible = this.state.thumbsVisible || this.config.thumbsItems;
        const maxStart = Math.max(0, this.state.total - visible);
        const jump = visible;

        if (this.state.thumbStart < maxStart) {
            this.state.thumbStart = Math.min(maxStart, this.state.thumbStart + jump);
        }
        // No loop to start
        this.updateThumbs();
    }

    updateThumbs() {
      if (!this.thumbsBox || !this.config.showThumbs || !this.thumbsTrack) return;
      
      // Update active state
      Array.from(this.thumbsTrack.children).forEach((thumb, i) => {
          thumb.classList.toggle('active', i === this.state.index);
      });

      // Clamp logic
      const visible = this.state.thumbsVisible || this.config.thumbsItems;
      const maxStart = Math.max(0, this.state.total - visible);
      this.state.thumbStart = Math.max(0, Math.min(this.state.thumbStart, maxStart));
      
      // Move track
      const gap = this.config.thumbsGap;
      const width = window.innerWidth;
      const isVertical = this.config.thumbsOrientation === 'vertical' && width >= 768;

      if (isVertical) {
          this.thumbsTrack.style.transform = `translateY(calc(-${this.state.thumbStart} * (100% + ${gap}px) / ${visible}))`;
      } else {
          this.thumbsTrack.style.transform = `translateX(calc(-${this.state.thumbStart} * (100% + ${gap}px) / ${visible}))`;
      }

      // Update button states - Disabled logic
      if (this.thumbsPrevBtn) {
          this.thumbsPrevBtn.disabled = (this.state.thumbStart <= 0);
      }
      if (this.thumbsNextBtn) {
          this.thumbsNextBtn.disabled = (this.state.thumbStart >= maxStart);
      }
    }

    ensureThumbVisible() {
        if (!this.config.showThumbs) return;
        
        const visible = this.state.thumbsVisible || this.config.thumbsItems;
        
        // If active thumb is < thumbStart, scroll back.
        if (this.state.index < this.state.thumbStart) {
            this.state.thumbStart = this.state.index;
        }
        // If active thumb is >= thumbStart + thumbsItems, scroll forward.
        if (this.state.index >= this.state.thumbStart + visible) {
            this.state.thumbStart = this.state.index - visible + 1;
        }
    }

    bindEvents() {
      if (this.config.showArrows) {
        if (this.nextBtn) {
          this.nextBtn.addEventListener('click', () => {
            this.next();
            if (this.config.autoplay) this.play();
          });
        }
        if (this.prevBtn) {
          this.prevBtn.addEventListener('click', () => {
            this.prev();
            if (this.config.autoplay) this.play();
          });
        }
      }

      if (this.config.keyboard) {
        this.slider.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowRight') {
            this.next();
            if (this.config.autoplay) this.play();
          } else if (e.key === 'ArrowLeft') {
            this.prev();
            if (this.config.autoplay) this.play();
          }
        });
      }

      if (this.config.hoverPause) {
        this.slider.addEventListener('mouseenter', () => this.stop());
        this.slider.addEventListener('mouseleave', () => {
          if (this.config.autoplay && this.config.autoplayResume) this.play();
        });
      }

      if (this.config.swipe) this.enableSwipe();

      let resizeTimer;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          const prevPages = this.getPageCount();
          this.updateResponsive();
          const newPages = this.getPageCount();
          if (newPages !== prevPages) this.createDots();
          this.update();
        }, 250);
      });
    }

    enableSwipe() {
      let startX = 0;
      let isDragging = false;
      const threshold = 50;

      this.slider.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        isDragging = true;
      }, { passive: true });

      this.slider.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;
        
        const endX = e.changedTouches[0].clientX;
        const diff = endX - startX;
        
        if (Math.abs(diff) > threshold) {
          if (diff < 0) this.next();
          else this.prev();
          
          if (this.config.autoplay) this.play();
        }
      });
    }

    initGallery() {
      const galleryImages = this.items
        .map(item => item.querySelector('img'))
        .filter(Boolean)
        .map(img => img.src);

      this.items.forEach((item, i) => {
        const img = item.querySelector('img');
        if (!img) return;

        img.style.cursor = 'pointer';
        img.addEventListener('click', () => {
          GalleryManager.open(galleryImages, i);
        });
      });
    }

    destroy() {
      this.stop();
      if (this.slider._dannySlider) {
        delete this.slider._dannySlider;
      }
    }
  }

  // Auto-initialize
  function initSliders() {
    document.querySelectorAll('.danny-slider').forEach(slider => {
      try {
        new DannySlider(slider);
      } catch (error) {
        console.error('DannySlider initialization error:', error);
      }
    });
  }

  // DOM ready check
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSliders);
  } else {
    initSliders();
  }

  // Export to global namespace (namespaced to avoid conflicts)
  window.DannySliderLib = {
    version: '1.0.0',
    init: initSliders,
    Slider: DannySlider,
    Gallery: GalleryManager
  };

})(window, document);
