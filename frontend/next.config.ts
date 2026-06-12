import type { NextConfig } from 'next';

// Build estático para GitHub Pages (definido no workflow de deploy).
// Em dev e em hosts com servidor Node, nada muda.
const isStaticExport = process.env.STATIC_EXPORT === '1';

const nextConfig: NextConfig = {
  ...(isStaticExport && {
    output: 'export' as const,
    basePath: process.env.BASE_PATH || '',
  }),
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
