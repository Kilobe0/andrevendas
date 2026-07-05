import type { NextConfig } from 'next';

// Build estático para GitHub Pages (definido no workflow de deploy).
// Em dev e em hosts com servidor Node, nada muda.
const isStaticExport = process.env.STATIC_EXPORT === '1';
const basePath = isStaticExport ? process.env.BASE_PATH || '' : '';

const nextConfig: NextConfig = {
  ...(isStaticExport && {
    output: 'export' as const,
    basePath,
  }),
  env: {
    // next/image nao prefixa o basePath no src automaticamente (ver docs de basePath);
    // exposto aqui para as paginas montarem o caminho de imagens do /public
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  images: {
    // GitHub Pages não tem o servidor de otimização de imagens do Next
    unoptimized: isStaticExport,
    // Next 16: qualities além de 75 precisam ser declaradas
    qualities: [75, 90, 95],
    // Permite otimizar imagens servidas pelo backend local em dev
    dangerouslyAllowLocalIP: process.env.NODE_ENV === 'development',
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '3001', pathname: '/uploads/**' },
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;
