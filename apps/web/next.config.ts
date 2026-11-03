import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const createConfig = (phase: string): NextConfig => ({
  output: 'export',
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '',
  images: { unoptimized: true },
  turbopack: {
    root: __dirname,
    resolveAlias: {
      'jsonwebtoken': './lib/empty-module.ts',
      '@cloudbase/signature-nodejs': './lib/empty-module.ts',
    },
  },
  ...(phase === PHASE_DEVELOPMENT_SERVER
    ? {
        async rewrites() {
          return [
            {
              source: '/api/:path*',
              destination: 'https://task-manager-d0glrvuo63bfe338e-1258107074.tcloudbaseapp.com/api/:path*',
            },
          ];
        },
      }
    : {}),
});

export default createConfig;
