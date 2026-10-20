export interface ProductFeature {
  id: string;
  tag: string;
  title: string;
  description: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  caption: string;
  src: string;
  aspectRatio: string;
}

export interface ProductConfig {
  name: string;
  model: string;
  edition: string;
  sku: string;
  colorway: string;
  officialUrl: string;
  officialRetailPriceUSD?: string;
  features: ProductFeature[];
  gallery: GalleryItem[];
  editorialText: {
    heroTitle: string;
    heroSubtitle: string;
    phase1: string;
    phase2: string;
    phase3: string;
    phase4: string;
    detailsIntro: string;
    detailsQuote: string;
  };
}

