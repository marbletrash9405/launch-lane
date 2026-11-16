/** @type {import('next').NextConfig} */
const nextConfig = {
  // Old page addresses keep working after the redesign.
  async redirects() {
    return [
      { source: "/listings", destination: "/explore", permanent: false },
      { source: "/apply", destination: "/students#apply", permanent: false },
      { source: "/request", destination: "/hirers#post-a-job", permanent: false },
      { source: "/about", destination: "/our-story", permanent: false },
    ];
  },
};
export default nextConfig;
