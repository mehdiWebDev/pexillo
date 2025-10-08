import { ThemeSwitcher } from "@/src/components/theme-switcher";
import HeroBanner from "@/src/components/hero-banner";
import FeaturedProducts from "@/src/components/featured-products";
import ProductCategories from "@/src/components/product-categories";
import ValuePropsBar from "@/src/components/value-props-bar";
import NewsLetter from "@/src/components/news-letter";
import About from "@/src/components/about";
import Footer from "@/src/components/footer";




export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <main className="w-full">
          <HeroBanner />
          <ValuePropsBar />
          <ProductCategories />
          <FeaturedProducts />
          <NewsLetter />
          <About />
        </main>
        <Footer />
      </div>
    </main>
  );
}
