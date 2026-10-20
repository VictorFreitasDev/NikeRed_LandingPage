import React, { useState, useEffect } from 'react';
import { Menu, X, ExternalLink } from 'lucide-react';
import { PRODUCT_DATA } from '../../config/product';
import styles from './Header.module.css';

export const Header: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fechar menu mobile ao teclar Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  // Prevenir rolagem do body quando menu mobile estiver aberto
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [isMobileMenuOpen]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className={`${styles.header} ${isScrolled ? styles.headerScrolled : ''}`}>
      <div className={styles.headerContainer}>
        {/* Identidade Tipográfica */}
        <a href="#experiencia" className={styles.brand} aria-label="Ir para o topo da página">
          <span className={styles.brandAccent}>TEAM</span>
          <span className={styles.brandMain}>RED</span>
          <span className={styles.brandSub}>AF1 &bull; QS</span>
        </a>

        {/* Navegação Desktop */}
        <nav className={styles.navDesktop} aria-label="Navegação principal">
          <ul className={styles.navList}>
            <li>
              <a href="#experiencia" className={styles.navLink}>
                Experiência
              </a>
            </li>
            <li>
              <a href="#detalhes" className={styles.navLink}>
                Detalhes
              </a>
            </li>
            <li>
              <a href="#galeria" className={styles.navLink}>
                Galeria
              </a>
            </li>
            <li>
              <a href="#produto" className={styles.navLink}>
                Especificações
              </a>
            </li>
          </ul>
        </nav>

        {/* CTA Discreto e Botão Hambúrguer Mobile */}
        <div className={styles.headerActions}>
          <a
            href={PRODUCT_DATA.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.headerCta}
            aria-label="Ver produto na Nike Brasil (abre em nova aba)"
          >
            <span>Ver na Nike</span>
            <ExternalLink size={14} aria-hidden="true" />
          </a>

          <button
            type="button"
            className={styles.menuToggle}
            onClick={toggleMobileMenu}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-nav"
            aria-label={isMobileMenuOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Menu Mobile Dropdown com Trap de Foco e Acessibilidade */}
      <div
        id="mobile-nav"
        className={`${styles.mobileDrawer} ${isMobileMenuOpen ? styles.mobileDrawerOpen : ''}`}
        aria-hidden={!isMobileMenuOpen}
      >
        <nav className={styles.mobileNav} aria-label="Navegação móvel">
          <ul className={styles.mobileNavList}>
            <li>
              <a href="#experiencia" onClick={closeMobileMenu} className={styles.mobileNavLink}>
                <span className={styles.mobileNavNumber}>01</span>
                <span>Experiência</span>
              </a>
            </li>
            <li>
              <a href="#detalhes" onClick={closeMobileMenu} className={styles.mobileNavLink}>
                <span className={styles.mobileNavNumber}>02</span>
                <span>Detalhes</span>
              </a>
            </li>
            <li>
              <a href="#galeria" onClick={closeMobileMenu} className={styles.mobileNavLink}>
                <span className={styles.mobileNavNumber}>03</span>
                <span>Galeria</span>
              </a>
            </li>
            <li>
              <a href="#produto" onClick={closeMobileMenu} className={styles.mobileNavLink}>
                <span className={styles.mobileNavNumber}>04</span>
                <span>Especificações</span>
              </a>
            </li>
          </ul>

          <div className={styles.mobileNavFooter}>
            <a
              href={PRODUCT_DATA.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.mobileCta}
              onClick={closeMobileMenu}
            >
              <span>Ver disponibilidade oficial na Nike</span>
              <ExternalLink size={16} aria-hidden="true" />
            </a>
            <p className={styles.mobileSkuNotice}>SKU: {PRODUCT_DATA.sku}</p>
          </div>
        </nav>
      </div>
    </header>
  );
};
