/** @type {import('next').NextConfig} */
const nextConfig = {
  // Old page addresses keep working after the redesign.
  async redirects() {
    return [
      { source: "/listings", destination: "/explore", permanent: false },
      { source: "/apply", destination: "/students#apply", permanent: false },
      { source: "/request", destination: "/residents#post-a-job", permanent: false },
      { source: "/hirers", destination: "/residents", permanent: false },
      { source: "/our-story", destination: "/about", permanent: false },
    ];
  },
};
export default nextConfig;
