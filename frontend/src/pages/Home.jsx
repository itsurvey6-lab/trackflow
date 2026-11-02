
import Navbar from "../components/HomeComponents/Navbar";
import Hero from "../components/HomeComponents/Hero";
import StatsCard from "../components/HomeComponents/StatsCard";
import Features from "../components/HomeComponents/Features";
import HowItWorks from "../components/HomeComponents/HowItWorks";
import TrackingPreview from "../components/HomeComponents/TrackingPreview";
import About from "../components/HomeComponents/About";
import CTA from "../components/HomeComponents/CTA";
import Footer from "../components/HomeComponents/Footer";

function Home() {
  return (
    <>
      <Navbar />

      <main>
        <Hero />
        <StatsCard />
        <Features />
        <HowItWorks />
        <TrackingPreview />
        <About />
        <CTA />
      </main>

      <Footer />
    </>
  );
}

export default Home;
