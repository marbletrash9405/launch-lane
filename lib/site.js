// Edit this file to change site-wide details in one place.
export const site = {
  name: "Launch Lane",
  tagline: "Helping students earn. Helping neighbors get things done.",
  // Shown once, as "for Mercer Crossing" on the home page. Change here if Launch Lane expands.
  community: "Mercer Crossing",
  location: "Farmers Branch, Texas",
  contactEmail: "hello@launchlane.example", // TODO: replace with the real contact email
  logo: "/logo.png",          // full logo (arrow + "Launch Lane"), used on light backgrounds
  logoMark: "/logo-mark.png", // arrow only, used on dark backgrounds (footer)
};

export const nav = [
  { href: "/explore", label: "Explore" },
  { href: "/students", label: "Students" },
  { href: "/hirers", label: "Hirers" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/our-story", label: "Our story" },
  { href: "/faq", label: "FAQs" },
];

// Shown as a button at the right of the header.
export const navCta = { href: "/login", label: "Log in" };
