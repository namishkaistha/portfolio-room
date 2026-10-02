export const RESUME_URL = "/Kaistha_Namish_Resume.pdf";
export const GITHUB_URL = "https://github.com/namishkaistha";
export const PORTFOLIO_URL = "https://namishkaistha.com";

// Featured projects in display order. `href` is set only when the code is
// public; `phone` marks portrait mobile screenshots.
export const PROJECTS = [
  {
    slug: "pantry-checkin",
    title: "Pantry Check-In",
    year: "2026",
    tech: ["React 19", "TypeScript", "FastAPI", "Neon Postgres", "Vercel"],
    details: [
      { label: "what", text: "A mobile check-in tool for Evanston's food pantry. Guests enter their phone number on their own phone, hand it to a volunteer who long-presses to approve, and each household gets one bag per week." },
      { label: "how", text: "React 19 + TypeScript frontend and a FastAPI backend on Vercel with Neon Postgres. English and Spanish, WCAG 2.1 AA, atomic design, and a test-first backend — 158 tests, 97% backend coverage." },
      { label: "impact", text: "Used by 250+ visitors at the pantry, cutting volunteer time per guest by about 80%." },
    ],
    shots: [
      { src: "/projects/pantry-checkin-1.jpg", alt: "Phone number entry step", phone: true },
      { src: "/projects/pantry-checkin-2.jpg", alt: "Order summary step", phone: true },
      { src: "/projects/pantry-checkin-3.jpg", alt: "Volunteer hold-to-approve step", phone: true },
    ],
    href: "https://github.com/namishkaistha/checkIn",
  },
  {
    slug: "perception",
    title: "Perception",
    year: "2026",
    tech: ["Python", "spaCy", "sentence-transformers", "pandas", "matplotlib"],
    details: [
      { label: "what", text: "A personal NLP project measuring how people perceive me, using free-text descriptions written by friends." },
      { label: "how", text: "A Python pipeline that extracts five perception dimensions — risk, spontaneity, ambition, creativity and reliability — scores every description, and plots z-scores by context (home, Northwestern, Wisconsin, abroad) and years known." },
      { label: "impact", text: "Shows how perception shifts across life stages and circles, and which groups see me most consistently." },
    ],
    shots: [{ src: "/projects/perception-1.jpg", alt: "Perception dimensions chart" }],
    href: "https://github.com/namishkaistha/perception",
  },
  {
    slug: "mystery-shop",
    title: "Mystery Shop",
    year: "2026",
    tech: ["Python", "Bland.ai", "Claude", "SQLite", "Rich"],
    details: [
      { label: "what", text: "Mystery-shops restaurant leads by phone: an AI caller places a staged takeout order, then the call is scored 0–100 with a one-line hook for the sales rep." },
      { label: "how", text: "A Python CLI that places calls through Bland.ai, has Claude Sonnet extract structured fields from each transcript (who answered, order read-back, wait-time quotes, friction points), and runs them through a pure scoring function across reachability, accuracy and service." },
      { label: "impact", text: "Works through a 2,355-restaurant lead list with resumable runs, automatic retries and parallel calls, so every pitch starts from a concrete observation about the restaurant." },
    ],
    shots: [
      { src: "/projects/mystery-shop-1.jpg", alt: "query.py results table with scores and SDR one-liners" },
      { src: "/projects/mystery-shop-2.jpg", alt: "Archived call transcript with extracted signals and score" },
    ],
    href: null,
  },
  {
    slug: "mock-interview",
    title: "Mock Interview",
    year: "2026",
    tech: ["FastAPI", "Claude API", "Next.js", "pdfplumber", "Tavily"],
    details: [
      { label: "what", text: "A personalized 15-minute behavioral interview. Upload a resume, name the role and company, and an AI interviewer runs an intro, STAR-format questions and an open Q&A." },
      { label: "how", text: "A FastAPI backend parses the resume in memory with pdfplumber, pulls company context through Tavily, and drives questions, follow-ups and scoring through the Claude API, with a Next.js frontend. Stateless — nothing is stored." },
      { label: "impact", text: "Interview practice that adapts to your actual experience and the company you're targeting, with feedback at the end." },
    ],
    shots: [{ src: "/projects/mock-interview-1.jpg", alt: "Interview setup screen" }],
    href: "https://github.com/namishkaistha/mock_interview",
  },
  {
    slug: "shoutout",
    title: "Shoutout",
    year: "2025",
    tech: ["Django", "GraphQL", "Ariadne", "Next.js 15", "Apollo Client", "Tailwind"],
    details: [
      { label: "what", text: "A full-stack newsfeed: sign up, write posts, edit or delete your own, and like everyone else's, with a separate view of your own posts for editing." },
      { label: "how", text: "A Django 5 backend exposing a GraphQL API through Ariadne, with session-cookie auth and CSRF/CORS set up for a separate frontend. The Next.js 15 + Apollo Client frontend is styled with Tailwind and organized with atomic design." },
      { label: "impact", text: "Apollo cache updates make new posts, edits and likes show up instantly without refetching the whole feed." },
    ],
    shots: [
      { src: "/projects/shoutout-1.jpg", alt: "Newsfeed with posts and likes" },
      { src: "/projects/shoutout-2.jpg", alt: "Sign-in screen" },
    ],
    href: "https://github.com/namishkaistha/shoutout",
  },
];
