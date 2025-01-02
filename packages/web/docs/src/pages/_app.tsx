import { ReactElement } from 'react';
import { AppProps } from 'next/app';
import '@theguild/components/style.css';
import localFont from 'next/font/local';
import '../components/navigation-menu/navbar-global-styles.css';
import '../selection-styles.css';
import '../mermaid.css';

const neueMontreal = localFont({
  src: [
    { path: '../fonts/PPNeueMontreal-Regular.woff2', weight: '400' },
    { path: '../fonts/PPNeueMontreal-Medium.woff2', weight: '500' },
    { path: '../fonts/PPNeueMontreal-Medium.woff2', weight: '600' },
  ],
});

export default function App({ Component, pageProps }: AppProps): ReactElement {
  return (
    <>
      <style jsx global>{`
        :root {
          --font-sans: ${neueMontreal.style.fontFamily};
        }
        ._tracking-tight,
        .nextra-steps :is(h2, h3, h4) {
          letter-spacing: normal;
        }
      `}</style>
      <Component {...pageProps} />
    </>
  );
}
