/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  PORTFOLIO CONTENT CONFIG
 *  Everything personal lives here. Edit the values below and the whole
 *  factory (hub text, crates, stations, HUD, metadata) updates.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type SocialKind = "github" | "linkedin" | "email" | "website" | "resume";

export interface SocialLink {
  kind: SocialKind;
  label: string;
  href: string;
}

export interface Project {
  id: string;
  title: string;
  /** One-line hook shown under the title. */
  tagline: string;
  description: string;
  /** Optional bullet points shown under the description. */
  highlights?: string[];
  tech: string[];
  /** Optional links — omit or leave empty to hide the button. */
  liveUrl?: string;
  githubUrl?: string;
  /** Short status chip, e.g. "SHIPPED", "PILOT", "CLIENT WORK". */
  status?: string;
  year?: string;
}

export interface ExperienceItem {
  id: string;
  role: string;
  company: string;
  location?: string;
  start: string;
  end: string; // use "PRESENT" for current roles
  summary: string;
  highlights: string[];
  tech?: string[];
}

export interface EducationItem {
  id: string;
  school: string;
  credential: string;
  location?: string;
  start: string;
  end: string;
  /** Highlights the entry as in progress. */
  current?: boolean;
  notes?: string[];
}

export interface SkillGroup {
  id: string;
  label: string;
  /**
   * `level` (0–100) is optional. When set, the skill gets a segmented
   * telemetry bar; when omitted, it is listed without a rating.
   */
  skills: { name: string; level?: number }[];
}

export interface LabItem {
  name: string;
  detail: string;
}

export interface PortfolioData {
  name: string;
  /** Short initials or callsign shown in the top bar. */
  callsign: string;
  title: string;
  location: string;
  availability: string;
  bio: string;
  socials: SocialLink[];
  projects: Project[];
  experience: ExperienceItem[];
  education: EducationItem[];
  skillGroups: SkillGroup[];
  /** Heading for the table under the skills matrix on station 03. */
  labTitle: string;
  lab: LabItem[];
  contact: {
    email: string;
    /** Headline shown on the contact station. */
    headline: string;
    blurb: string;
    /**
     * Optional form backend (e.g. a Formspree / Basin / Getform endpoint URL).
     * When empty, the form opens the visitor's mail client with a prefilled
     * message instead, so it works with zero backend.
     */
    formEndpoint: string;
  };
  seo: {
    siteTitle: string;
    description: string;
  };
}

export const portfolio: PortfolioData = {
  name: "Shane Hensley",
  callsign: "SH-01",
  title: "Nanotechnology Engineering @ UWaterloo",
  location: "Waterloo, ON",
  availability: "Open to co-op & internship opportunities",
  bio: "First-year Nanotechnology Engineering student at the University of Waterloo and Paul B. Spafford Entrance Scholarship recipient. I like taking ideas all the way to something real, from parametric CAD concepts pitched to executives to Python and Java apps that turn data and live audio into useful feedback. Off the clock, I've spent 6+ years behind a drum kit.",

  socials: [
    { kind: "github", label: "GitHub", href: "https://github.com/SptHensley" },
    { kind: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com/in/shane-hensley289/" },
    { kind: "email", label: "Email", href: "mailto:spthensley@uwaterloo.ca" },
    { kind: "resume", label: "Résumé", href: "/resume.pdf" },
  ],

  projects: [
    {
      id: "cbt-ai-sleep",
      title: "CBT-AI Sleep Analytics App",
      tagline: "Gemini-assisted sleep insights for CBT-I therapy",
      description:
        "A Python web app that processes sleep-tracker CSV exports and clinical survey inputs, then uses the Gemini API to surface sleep trends and help generate personalised Cognitive Behavioral Therapy for Insomnia (CBT-I) insights.",
      highlights: [
        "Piloted with a local psychotherapist, cutting weekly data-analysis time by 88% for ~15% of their clientele.",
        "Built the data pipeline in pandas and the interface in Anvil.",
      ],
      tech: ["Python", "pandas", "Gemini API", "Anvil", "Google Colab"],
      status: "PILOTED",
      year: "2025",
    },
    {
      id: "noteworthy",
      title: "Noteworthy: Interactive Pitch Scoring Game",
      tagline: "Desktop karaoke with real-time pitch scoring",
      description:
        "A Java desktop karaoke game with custom Swing GUI components and dynamic audio visualisers that scores how closely a singer hits each target note.",
      highlights: [
        "Real-time pitch extraction from live microphone input with the Java Sound API, tuned for low latency.",
        "Custom scoring logic and comparison algorithms that measure vocal precision against target frequencies.",
      ],
      tech: ["Java", "Swing", "Java Sound API", "Python"],
      status: "DESKTOP APP",
      year: "2026",
    },
    {
      id: "range-shelter",
      title: "All-Weather Driving Range Shelter",
      tagline: "Structural design concepts for a real client",
      description:
        "Design work from my internship at Shuswap Lake Golf Course: three original shelter concepts (2D schematics and 3D parametric models) built to survive severe seasonal weather on a realistic budget.",
      highlights: [
        "Compared structural stability, material trade-offs and cost for each concept.",
        "Delivered a 20-page engineering report and a 20-minute proposal to executive management.",
      ],
      tech: ["SolidWorks", "2D / 3D CAD", "Structural Design", "Technical Writing"],
      status: "CLIENT WORK",
      year: "2025",
    },
  ],

  experience: [
    {
      id: "shuswap",
      role: "Engineering Design Intern",
      company: "Shuswap Lake Golf Course",
      location: "Blind Bay, B.C. (Remote)",
      start: "Apr 2025",
      end: "Sept 2025",
      summary: "Designed an all-weather driving range shelter, from first concepts to an executive proposal.",
      highlights: [
        "Engineered 3 original CAD concepts (2D schematics and 3D parametric models) for an all-weather driving range shelter.",
        "Evaluated structural stability, material trade-offs and financial budgeting under severe seasonal climate constraints.",
        "Authored a 20-page engineering report and presented a 20-minute proposal to executive management to guide capital improvements.",
      ],
      tech: ["SolidWorks", "CAD", "Technical Writing"],
    },
    {
      id: "deca",
      role: "Director of Entrepreneurship",
      company: "DECA Inc.",
      location: "Whitby, ON",
      start: "Sept 2023",
      end: "June 2026",
      summary: "Led the entrepreneurship cluster of my school's DECA chapter.",
      highlights: [
        "Managed and mentored an executive cluster of 18 competitors, running weekly training sessions on case studies and business strategy.",
        "Spearheaded Grade 9 recruitment, onboarding 24 new members (over 20% of total club membership) while co-leading fundraising that raised $500+.",
        "Earned a Top 10 Exam Score Award out of 60+ competitors at Regionals (score: 79) and qualified for Ontario Provincials (score: 169).",
      ],
    },
    {
      id: "mattomusic",
      role: "Percussionist & Youth Music Mentor",
      company: "Mattomusic",
      location: "Courtice, ON",
      start: "Sept 2018",
      end: "June 2026",
      summary: "Live performer and volunteer instructor.",
      highlights: [
        "Performed as part of a band at local venues and bars for audiences of up to 300 people over 6+ years.",
        "Volunteered at Mattomusic's music camps, teaching youth rhythm fundamentals, kit setup and collaborative songwriting.",
      ],
    },
  ],

  education: [
    {
      id: "uwaterloo",
      school: "University of Waterloo",
      credential: "Bachelor of Applied Science in Nanotechnology Engineering",
      location: "Waterloo, ON",
      start: "Sept 2026",
      end: "May 2031",
      current: true,
      notes: [
        "Recipient of the Paul B. Spafford Entrance Scholarship (1 of 2 recipients) and the Faculty of Engineering Entrance Scholarship.",
      ],
    },
    {
      id: "acvi",
      school: "Anderson Collegiate Vocational Institute",
      credential: "Ontario Secondary School Diploma",
      location: "Whitby, ON",
      start: "Sept 2022",
      end: "June 2026",
    },
  ],

  skillGroups: [
    {
      id: "languages",
      label: "Languages & Libraries",
      skills: [{ name: "Python" }, { name: "Java" }, { name: "pandas" }, { name: "NumPy" }],
    },
    {
      id: "tools",
      label: "Tools & Frameworks",
      skills: [
        { name: "Git" },
        { name: "SolidWorks (2D / 3D CAD)" },
        { name: "IntelliJ IDEA" },
        { name: "VS Code" },
        { name: "Anvil" },
        { name: "Google Colab" },
        { name: "Gemini API" },
      ],
    },
    {
      id: "engineering",
      label: "Engineering Concepts",
      skills: [
        { name: "Structural Design" },
        { name: "Iterative Prototyping" },
        { name: "Material Selection" },
        { name: "Technical Writing" },
        { name: "Data Analysis" },
      ],
    },
  ],

  labTitle: "HONOURS & AWARDS",
  lab: [
    { name: "Paul B. Spafford Entrance Scholarship", detail: "University of Waterloo · 1 of 2 recipients" },
    { name: "Faculty of Engineering Entrance Scholarship", detail: "University of Waterloo" },
    { name: "Top 10 Exam Score Award", detail: "DECA Regionals · 60+ competitors (score: 79)" },
    { name: "Ontario Provincials Qualifier", detail: "DECA · score: 169" },
  ],

  contact: {
    email: "spthensley@uwaterloo.ca",
    headline: "Open a work order",
    blurb:
      "Looking for a co-op student, a teammate for a build, or just want to talk design, code or drums? Send a message and I'll get back to you.",
    formEndpoint: "",
  },

  seo: {
    siteTitle: "Shane Hensley | Nanotechnology Engineering @ UWaterloo",
    description:
      "Interactive portfolio of Shane Hensley, Nanotechnology Engineering student at the University of Waterloo: a 6-axis robot arm routes crates to projects, experience, skills and contact stations.",
  },
};
