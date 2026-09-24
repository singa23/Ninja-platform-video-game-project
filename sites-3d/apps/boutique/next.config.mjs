/** Export statique, chemins relatifs (servable depuis n'importe quel dossier). */
const nextConfig = {
  output: "export",
  assetPrefix: "./",
  images: { unoptimized: true },
  reactStrictMode: true,
  transpilePackages: ["three"],
};
export default nextConfig;
