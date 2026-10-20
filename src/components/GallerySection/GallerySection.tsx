import React, { useState, useEffect } from 'react';
import { Maximize2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { PRODUCT_DATA } from '../../config/product';
import { GalleryItem } from '../../types/product';
import styles from './GallerySection.module.css';

export const GallerySection: React.FC = () => {
  const [activeItem, setActiveItem] = useState<GalleryItem | null>(null);

  // Fechar lightbox no Esc e navegar com setas
  useEffect(() => {
    if (!activeItem) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveItem(null);
      } else if (e.key === 'ArrowRight') {
        navigateGallery(1);
      } else if (e.key === 'ArrowLeft') {
        navigateGallery(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [activeItem]);

  const navigateGallery = (direction: number) => {
    if (!activeItem) return;
    const currentIndex = PRODUCT_DATA.gallery.findIndex((g) => g.id === activeItem.id);
    if (currentIndex === -1) return;

    const nextIndex = (currentIndex + direction + PRODUCT_DATA.gallery.length) % PRODUCT_DATA.gallery.length;
    setActiveItem(PRODUCT_DATA.gallery[nextIndex]);
  };

  return (
    <section id="galeria" className={styles.section} aria-label="Galeria visual de detalhes">
      <div className="container">
        {/* Cabeçalho da Galeria */}
        <div className={styles.galleryHeader}>
          <div className={styles.tagWrapper}>
            <span className={styles.tagNumber}>03</span>
            <span className={styles.tagTitle}>ENQUADRAMENTOS EM ALTA DEFINIÇÃO</span>
          </div>
          <h2 className={styles.sectionTitle}>
            ESTUDO VISUAL &bull; <span className={styles.accentText}>TEAM RED</span>
          </h2>
          <p className={styles.sectionSubtitle}>
            Três perspectivas da experiência: a caminhada noturna na névoa urbana,
            o impacto cinético da pisada e o macro revelando a textura tátil única.
          </p>
        </div>

        {/* Grid Editorial com Dimensões Reservadas */}
        <div className={styles.galleryGrid}>
          {PRODUCT_DATA.gallery.map((item, index) => (
            <figure
              key={item.id}
              className={`${styles.galleryCard} ${index === 2 ? styles.galleryCardFeatured : ''}`}
            >
              <div className={styles.imageWrapper}>
                <img
                  src={item.src}
                  alt={`${item.title} - ${item.caption}`}
                  className={styles.image}
                  loading="lazy"
                  width={1440}
                  height={810}
                />
                <button
                  type="button"
                  className={styles.zoomButton}
                  onClick={() => setActiveItem(item)}
                  aria-label={`Ampliar imagem: ${item.title}`}
                >
                  <Maximize2 size={18} aria-hidden="true" />
                  <span className={styles.zoomText}>Ampliar</span>
                </button>
              </div>

              <figcaption className={styles.caption}>
                <div className={styles.captionMeta}>
                  <span className={styles.captionIndex}>PRANCHA 0{index + 1}</span>
                  <h3 className={styles.captionTitle}>{item.title}</h3>
                </div>
                <p className={styles.captionDescription}>{item.caption}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      {/* Lightbox / Modal Acessível */}
      {activeItem && (
        <div
          className={styles.lightboxBackdrop}
          onClick={() => setActiveItem(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Visualização ampliada: ${activeItem.title}`}
        >
          <div
            className={styles.lightboxContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.lightboxMedia}>
              <img
                src={activeItem.src}
                alt={activeItem.title}
                className={styles.lightboxImage}
              />
            </div>

            <div className={styles.lightboxInfo}>
              <div>
                <h3 className={styles.lightboxTitle}>{activeItem.title}</h3>
                <p className={styles.lightboxCaption}>{activeItem.caption}</p>
              </div>

              <div className={styles.lightboxControls}>
                <button
                  type="button"
                  onClick={() => navigateGallery(-1)}
                  className={styles.controlBtn}
                  aria-label="Imagem anterior"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  onClick={() => navigateGallery(1)}
                  className={styles.controlBtn}
                  aria-label="Próxima imagem"
                >
                  <ChevronRight size={20} />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveItem(null)}
                  className={styles.closeBtn}
                  aria-label="Fechar visualização ampliada"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
