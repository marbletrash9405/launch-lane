// Sample listings so the site has something to show.
// Replace with real, guardian-approved listings (or a database) before launch.
// type: "offering" = a student offering a service
// type: "job"      = a neighbor posting a job students can apply for
// Newest first: the home page shows the first few.

export const categories = [
  "Bin cleaning",
  "Lawn care",
  "Babysitting",
  "Pet care",
  "Digital support",
  "Hauling",
  "Tutoring",
  "Others",
];

export const listings = [
  {
    id: "1",
    type: "offering",
    title: "Trash & Recycling Bin Cleanup",
    category: "Bin cleaning",
    description: "Weekly bin cleaning after pickup. Email to discuss availability and pricing.",
    name: "Sample Student",
    email: "student1@example.com",
    rating: 0,
    reviews: 0,
  },
  {
    id: "2",
    type: "job",
    title: "Weekly Lawn Mowing",
    category: "Lawn care",
    description: "Small front and back yard. Flexible on the day of the week.",
    timing: "Weekly, any day",
    pay: "$25 per visit",
    name: "Alex Taylor",
    email: "alex.taylor@example.com",
    street: "Sample Lane",
  },
  {
    id: "3",
    type: "offering",
    title: "Social Media Content for Small Businesses",
    category: "Digital support",
    description: "Short videos, photos and captions for your shop or side business. Happy to share past examples.",
    name: "Sample Student",
    email: "student2@example.com",
    rating: 0,
    reviews: 0,
  },
  {
    id: "4",
    type: "offering",
    title: "After-School Babysitting",
    category: "Babysitting",
    description: "Available weekday afternoons. Happy to help with homework and snacks.",
    name: "Sample Student",
    email: "student3@example.com",
    rating: 0,
    reviews: 0,
  },
  {
    id: "5",
    type: "job",
    title: "Help Moving Boxes to Garage",
    category: "Hauling",
    description: "About 20 boxes, roughly two hours of work.",
    timing: "One Saturday morning",
    pay: "$40 total",
    name: "Sample Resident",
    email: "resident2@example.com",
    street: "Sample Court",
  },
  {
    id: "6",
    type: "offering",
    title: "Dog Walking & Pet Sitting",
    category: "Pet care",
    description: "Daily walks or drop-in visits while you're away. Comfortable with dogs and cats.",
    name: "Sample Student",
    email: "student4@example.com",
    rating: 0,
    reviews: 0,
  },
];
