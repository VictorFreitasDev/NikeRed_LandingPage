import React from 'react';
import { ExternalLink, ShieldCheck, CheckCircle2, Info } from 'lucide-react';
import { PRODUCT_DATA } from '../../config/product';
import styles from './ProductSection.module.css';

export const ProductSection: React.FC = () => {
  return (
    <section id="produto" className={styles.section} aria-label="Ficha de especificações e disponibilidade">
      <div className="container">
        <div className={styles.productCard}>
          {/* Coluna Visual */}
          <div className={styles.visualCol}>
            <div className={styles.imageWrapper}>
              <img
                src="./frames/desktop/poster-final.webp"
                alt="Nike Air Force 1 Low QS Team Red em vista de perfil completo"
                className={styles.productImage}
                loading="lazy"
                width={1440}
                height={810}
              />
              <span className={styles.badgeEdition}>QUICKSTRIKE LIMITED</span>
            </div>

            <div className={styles.productMetaList}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>SILHUETA ORIGINAL</span>
                <span className={styles.metaValue}>1982 &bull; Bruce Kilgore</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>AMORTECIMENTO</span>
                <span className={styles.metaValue}>Nike Air Encapsulado</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>SOLADO</span>
                <span className={styles.metaValue}>Borracha com Pontos de Giro</span>
              </div>
            </div>
          </div>

          {/* Coluna de Informações e Chamada Oficial */}
          <div className={styles.infoCol}>
            <div className={styles.infoBadge}>
              <span className={styles.dot} />
              <span>FICHA DE LANÇAMENTO OFICIAL</span>
            </div>

            <h2 className={styles.productName}>{PRODUCT_DATA.name}</h2>
            <p className={styles.productEdition}>Edição: {PRODUCT_DATA.edition}</p>

            <div className={styles.specsTable}>
              <div className={styles.specRow}>
                <span className={styles.specKey}>SKU Oficial:</span>
                <span className={styles.specValSku}>{PRODUCT_DATA.sku}</span>
              </div>
              <div className={styles.specRow}>
                <span className={styles.specKey}>Tonalidade:</span>
                <span className={styles.specVal}>{PRODUCT_DATA.colorway}</span>
              </div>
              <div className={styles.specRow}>
                <span className={styles.specKey}>Material do Cabedal:</span>
                <span className={styles.specVal}>Pelo Sintético Premium (Faux Pony Hair)</span>
              </div>
              <div className={styles.specRow}>
                <span className={styles.specKey}>Perfil do Cano:</span>
                <span className={styles.specVal}>Low-top (Cano Baixo)</span>
              </div>
              {PRODUCT_DATA.officialRetailPriceUSD && (
                <div className={styles.specRow}>
                  <span className={styles.specKey}>Preço Sugerido (EUA):</span>
                  <span className={styles.specVal}>{PRODUCT_DATA.officialRetailPriceUSD}</span>
                </div>
              )}
            </div>

            {/* Aviso de Transparência */}
            <div className={styles.transparencyNotice}>
              <Info size={18} className={styles.noticeIcon} aria-hidden="true" />
              <p className={styles.noticeText}>
                Este modelo faz parte de lançamentos com tiragem especial (*Quickstrike*).
                Preços locais em Reais e estoque variam de acordo com o calendário da plataforma SNKRS e distribuidores autorizados.
              </p>
            </div>

            {/* Botão de Redirecionamento Oficial */}
            <div className={styles.actionArea}>
              <a
                href={PRODUCT_DATA.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.officialBtn}
                aria-label="Verificar disponibilidade na Nike Brasil (abre em nova aba)"
              >
                <span>Ver disponibilidade na Nike</span>
                <ExternalLink size={18} aria-hidden="true" />
              </a>

              <div className={styles.assuranceList}>
                <div className={styles.assuranceItem}>
                  <ShieldCheck size={16} className={styles.assuranceIcon} />
                  <span>Destino seguro para a plataforma oficial da Nike</span>
                </div>
                <div className={styles.assuranceItem}>
                  <CheckCircle2 size={16} className={styles.assuranceIcon} />
                  <span>Código de produto autêntico confirmado (IR1940-600)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
