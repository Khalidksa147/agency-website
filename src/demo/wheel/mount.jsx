import { createRoot } from 'react-dom/client';
import HeroWheel from './HeroWheel.jsx';

const el = document.getElementById('hero-wheel-root');
if (el) {
  createRoot(el).render(<HeroWheel />);
}
