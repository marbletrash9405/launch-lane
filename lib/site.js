// Edit this file to change site-wide details in one place.
export const site = {
  name: "Launch Lane",
  tagline: "Helping students earn. Helping neighbors get things done.",
  // Shown as "for Mercer Crossing" under the name. Change here if Launch Lane expands.
  community: "Mercer Crossing",
  contactEmail: "hello@launchlane.example", // TODO: replace with the real contact email
  logo: "/logo.png",          // full logo (arrow + "Launch Lane"), used on light backgrounds
  logoMark: "/logo-mark.png", // arrow only, used on dark backgrounds (footer)
};

export const nav = [
  { href: "/listings", label: "Browse" },
  { href: "/request", label: "Post a request" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/about", label: "About us" },
];

// Primary call to action shown as a button in the header.
export const navCta = { href: "/apply", label: "Offer a service" };
