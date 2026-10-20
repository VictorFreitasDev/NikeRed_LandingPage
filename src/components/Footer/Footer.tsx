import React from 'react';
import { ExternalLink, ArrowUp } from 'lucide-react';
import { PRODUCT_DATA } from '../../config/product';
import styles from './Footer.module.css';

export const Footer: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className={styles.footer} role="contentinfo">
      <div className="container">
        {/* Topo do Rodapé com Identidade e Retorno ao Topo */}
        <div className={styles.footerTop}>
          <div className={styles.brandBlock}>
            <span className={styles.brandTitle}>TEAM RED</span>
            <span className={styles.brandSubtitle}>NIKE AIR FORCE 1 LOW QS &bull; IR1940-600</span>
          </div>

          <button
            type="button"
            onClick={scrollToTop}
            className={styles.backToTopBtn}
            aria-label="Voltar ao início da página"
          >
            <span>Voltar ao Início</span>
            <ArrowUp size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Links Reais de Navegação e Recursos */}
        <div className={styles.footerGrid}>
          <div className={styles.footerCol}>
            <span className={styles.colTitle}>Navegação</span>
            <ul className={styles.linkList}>
              <li>
                <a href="#experiencia" className={styles.footerLink}>
                  Experiência Interativa
                </a>
              </li>
              <li>
                <a href="#detalhes" className={styles.footerLink}>
                  Anatomia & Detalhes
                </a>
              </li>
              <li>
                <a href="#galeria" className={styles.footerLink}>
                  Estudo Visual
                </a>
              </li>
              <li>
                <a href="#produto" className={styles.footerLink}>
                  Ficha Técnica
                </a>
              </li>
            </ul>
          </div>

          <div className={styles.footerCol}>
            <span className={styles.colTitle}>Canais Oficiais</span>
            <ul className={styles.linkList}>
              <li>
                <a
                  href={PRODUCT_DATA.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.footerLink}
                >
                  <span>Nike Brasil SNKRS</span>
                  <ExternalLink size={12} aria-hidden="true" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.nike.com.br"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.footerLink}
                >
                  <span>Nike.com.br</span>
                  <ExternalLink size={12} aria-hidden="true" />
                </a>
              </li>
            </ul>
          </div>

          <div className={styles.footerCol}>
            <span className={styles.colTitle}>Sobre a Edição</span>
            <p className={styles.aboutText}>
              Projeto de design de interface e engenharia web focado na experiência cinematográfica
              do modelo Nike Air Force 1 Low QS &ldquo;Team Red&rdquo;.
            </p>
          </div>
        </div>

        {/* Nota Legal e Créditos */}
        <div className={styles.footerBottom}>
          <p className={styles.disclaimer}>
            <strong>Aviso de Independência:</strong> Esta landing page é um projeto conceitual independente
            de design e engenharia front-end. Não possui afiliação oficial, patrocínio ou vínculo comercial
            direto com a Nike, Inc. Todas as marcas, imagens de produto e direitos autorais pertencem aos seus respectivos proprietários.
          </p>

          <p className={styles.copyright}>
            &copy; {new Date().getFullYear()} Desenvolvido por Victor Freitas.
          </p>
        </div>
      </div>
    </footer>
  );
};
