// Frequently asked questions. Edit the wording here and it updates on the FAQ page
// and the short preview on the home page. An answer can be one string or a list of paragraphs.

export const faqGroups = [
  {
    title: "Getting started",
    items: [
      {
        q: "What is Launch Lane?",
        a: "Launch Lane connects students and neighbors in Mercer Crossing. Students can offer services, promote a small business, or apply for jobs. Neighbors can browse student listings or post a request for help.",
      },
      {
        q: "Who can use Launch Lane?",
        a: "Students who are 18 or under and live in Mercer Crossing can offer services or apply for jobs. Residents of Mercer Crossing in Farmers Branch, Texas, can post requests and hire students.",
      },
      {
        q: "What kind of work can I find or offer?",
        a: "Offer a service you're good at or share your business with neighbors. From cat-sitting and lawn care to nail art and social media content, there's room for all kinds of skills and ideas. You can also browse jobs posted by Mercer Crossing neighbors and apply for ones that match your skills or give you a chance to try something new.",
      },
      {
        q: "How do neighbors choose a student?",
        a: "Neighbors can compare listings and applications, look at relevant experience, and read ratings and reviews when available. When you apply, mention work you've done that relates to the job. For example, if you regularly mow your family's lawn, say so when applying for a lawn care job.",
      },
    ],
  },
  {
    title: "Payment and liability",
    items: [
      {
        q: "How much will I get paid, and how does payment work?",
        a: "You and your neighbor negotiate the price or hourly rate, how you'll be paid, and when payment is due. Agree on those details before work starts. Your neighbor pays you directly, and you keep 100% of what you earn.",
      },
      {
        q: "What about insurance or liability?",
        a: [
          "Launch Lane helps students and residents connect. It does not provide insurance for either party or for the work they arrange. Before work begins, the student, their guardian, and the resident should agree on the scope of work, safety requirements, and who is responsible for what, and confirm what insurance coverage applies.",
          "To the extent permitted by applicable law, neither Launch Lane nor any of its founding members can be held accountable or liable for the work agreed between a student and a resident, how it is performed, or any resulting injury, property damage, payment dispute, or other loss.",
        ],
      },
    ],
  },
  {
    title: "Safety and privacy",
    items: [
      {
        q: "Who can see my personal information?",
        a: "Neighbors can see the information you choose to include in your public listing, such as the services you offer and your relevant experience. Your phone number and home address stay off public listings.",
      },
      {
        q: "How does Launch Lane help keep students safe?",
        a: "Launch Lane is limited to Mercer Crossing residents, and guardians review and sign off on student listings and any jobs their student takes through Launch Lane.",
      },
      {
        q: "Why do you ask for my home address?",
        a: "We use the address you provide to check that it falls within Mercer Crossing in Farmers Branch, Texas. Your address stays private.",
      },
      {
        q: "Can I publish a listing without my guardian's approval?",
        a: "Your guardian must review and sign off on your listing before it goes live.",
      },
      {
        q: "Do I need guardian approval for a job posted by a neighbor?",
        a: "Yes. Your guardian must review the job details and sign off before you accept the job or start work. This applies to every job you take through a neighbor's post.",
      },
      {
        q: "How do students and neighbors communicate?",
        a: "Students and neighbors communicate directly by email. A parent or guardian receives a copy of every email sent to their student through Launch Lane.",
      },
      {
        q: "How do I remove my listing?",
        a: "You or your guardian can email us at any time to request that we take down your listing. Please include the listing title or a link so we can find it.",
      },
    ],
  },
];

// Flat list, used for the home page preview.
export const faq = faqGroups.flatMap((g) => g.items);
