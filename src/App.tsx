import React from 'react';
import { Header } from './components/Header/Header';
import { HeroCanvas } from './components/HeroCanvas/HeroCanvas';
import { DetailsSection } from './components/DetailsSection/DetailsSection';
import { GallerySection } from './components/GallerySection/GallerySection';
import { ProductSection } from './components/ProductSection/ProductSection';
import { Footer } from './components/Footer/Footer';

export const App: React.FC = () => {
  return (
    <div className="landing-app">
      {/* Link de Pular para o Conteúdo (Acessibilidade WCAG) */}
      <a href="#conteudo-principal" className="sr-only focus:not-sr-only">
        Pular para o conteúdo principal
      </a>

      <Header />

      <main id="conteudo-principal">
        <HeroCanvas />
        <DetailsSection />
        <GallerySection />
        <ProductSection />
      </main>

      <Footer />
    </div>
  );
};

export default App;

