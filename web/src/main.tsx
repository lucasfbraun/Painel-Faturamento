import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

// Roboto empacotada junto (fonte da identidade visual) — sem depender do
// Google Fonts, que a rede interna pode não alcançar.
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import './estilos/global.css';

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('Elemento #raiz não encontrado no index.html');

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
