import React from 'react';
import { PRODUCT_DATA } from '../../config/product';
import styles from './DetailsSection.module.css';

export const DetailsSection: React.FC = () => {
  return (
    <section id="detalhes" className={styles.section} aria-label="Detalhes e acabamentos do calçado">
      <div className="container">
        {/* Cabeçalho Editorial com Composição Assimétrica */}
        <div className={styles.editorialHeader}>
          <div className={styles.headerTag}>
            <span className={styles.tagLine} />
            <span className={styles.tagText}>ANATOMIA & CONSTRUÇÃO</span>
          </div>

          <h2 className={styles.mainTitle}>
            CORPO, ALMA <br />
            <span className={styles.titleItalic}>E BORDÔ PROFUNDO.</span>
          </h2>

          <p className={styles.headerLead}>
            O Nike Air Force 1 Low QS &ldquo;Team Red&rdquo; não pede passagem.
            Ele ocupa o ambiente combinando a proporção arquitetônica consagrada de Bruce Kilgore
            com um cabedal visceral em textura de pelo sintético.
          </p>
        </div>

        {/* Hero Visual Editorial Grande */}
        <div className={styles.heroVisualWrapper}>
          <div className={styles.imageContainer}>
            <img
              src="./frames/desktop/poster-final.webp"
              alt="Detalhe lateral do Nike Air Force 1 Low QS Team Red evidenciando o acabamento em faux pony hair e o solado AIR"
              className={styles.heroImage}
              loading="lazy"
              width={1440}
              height={810}
            />
            <div className={styles.imageOverlay} />
            <div className={styles.imageCaption}>
              <span className={styles.captionSku}>SKU {PRODUCT_DATA.sku}</span>
              <span className={styles.captionDesc}>
                Close-up de perfil &bull; Textura tátil, Swoosh recortado e sola tonal
              </span>
            </div>
          </div>
        </div>

        {/* Citação Editorial */}
        <div className={styles.quoteBlock}>
          <blockquote className={styles.quoteText}>
            &ldquo;{PRODUCT_DATA.editorialText.detailsQuote}&rdquo;
          </blockquote>
          <cite className={styles.quoteCite}>
            &mdash; Caderno Editorial Streetwear &bull; Outubro 2026
          </cite>
        </div>

        {/* Grid Assimétrico de Características Reais */}
        <div className={styles.featuresGrid}>
          {PRODUCT_DATA.features.map((feature, index) => (
            <article
              key={feature.id}
              className={`${styles.featureCard} ${index === 0 ? styles.featureHighlight : ''}`}
            >
              <div className={styles.featureHeader}>
                <span className={styles.featureTag}>{feature.tag}</span>
                <span className={styles.featureIndex}>0{index + 1}</span>
              </div>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDescription}>{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
