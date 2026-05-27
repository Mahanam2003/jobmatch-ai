const PROFILE = {
  // Basic
  first_name: "Mahan",
  last_name: "Amiri",
  full_name: "Mahan Amiri",
  email: "mamiri2@uw.edu",
  email_personal: "juve.mahan18@gmail.com",
  phone: "4254355377",
  phone_formatted: "425-435-5377",
  location: "Seattle, WA",
  city: "Seattle",
  state: "WA",
  zip: "98105",

  // Links
  linkedin: "www.linkedin.com/in/mahan-amiri-719213230",
  github: "github.com/Mahanam2003",
  website: "github.com/Mahanam2003",

  // Work authorization
  authorized_to_work: "Yes",
  needs_sponsorship: "No",
  us_citizen: "Yes",

  // Summary
  summary: "I'm a third-year Informatics student at the University of Washington with experience in UX research, product strategy, qualitative analysis, and using user research and data to guide product decisions. My background includes analyzing user behavior, identifying friction points, conducting usability and A/B tests, and using qualitative data to uncover patterns and translate findings into actionable insights. I use these insights to develop design recommendations, improve usability, and support product decisions that align with user needs and project goals.",

  // Cover letter — fill manually per job
  cover_letter: "",

  // Education
  education: [
    {
      school: "University of Washington",
      degree: "Bachelor's degree",
      field: "Informatics",
      gpa: "3.7",
      start: "2024-08",
      start_month: "08",
      start_year: "2024",
      end: "2027-06",
      end_month: "06",
      end_year: "2027",
      current: true
    },
    {
      school: "Cascadia College",
      degree: "Associate of Science",
      field: "Computer Science",
      start: "2022-09",
      start_month: "09",
      start_year: "2022",
      end: "2024-07",
      end_month: "07",
      end_year: "2024",
      current: false
    },
    {
      school: "North Creek High School",
      degree: "High School Diploma",
      field: "",
      start: "2017-09",
      start_month: "09",
      start_year: "2017",
      end: "2022-07",
      end_month: "07",
      end_year: "2022",
      current: false
    }
  ],

  // Work experience
  experience: [
    {
      company: "University of Washington",
      title: "Research Assistant - UX Research & Product Strategy",
      start: "2025-10",
      start_month: "10",
      start_year: "2025",
      end: "Present",
      end_month: "",
      end_year: "",
      current: true,
      location: "Seattle, WA",
      description: "Ran usability tests with 15 students on the UW registration site to find where users were getting stuck, mapped out the full user journey and flagged a 42% drop-off in the onboarding flow as the biggest problem. Built 3 Figma prototypes to test different fixes for the onboarding drop-off, ran A/B tests to compare them, and the winning version brought drop-off down from 42% to 27%, included in the team's Q2 roadmap. Wrote up a feature proposal with a prototype and supporting data, then presented it to faculty."
    },
    {
      company: "UW Foster School of Business",
      title: "Research Assistant - Organizational Behavior & Team Communication",
      start: "2025-06",
      start_month: "06",
      start_year: "2025",
      end: "Present",
      end_month: "",
      end_year: "",
      current: true,
      location: "Seattle, WA",
      description: "Built a coding rubric from scratch for a study on communication in multicultural teams (259 participants, 64 teams), so that 3 researchers could all analyze the same transcripts consistently, reducing coding disagreements by 40% and cutting the average review time per transcript from 25 to 15 minutes. Noticed halfway through that 30+ transcripts were being coded under the wrong categories, flagged it to faculty leads, helped redesign the process, and recovered without having to redo any major work, keeping the project on schedule."
    },
    {
      company: "Thruline Coffee Roasters",
      title: "Social Media and Analytics Manager",
      start: "2021-01",
      start_month: "01",
      start_year: "2021",
      end: "2024-04",
      end_month: "04",
      end_year: "2024",
      current: false,
      location: "Kirkland, WA",
      description: "Tracked weekly sales and social engagement for a cafe doing 2,800+ coffees per week, found that behind-the-scenes content got 3.1x more saves than product posts, and reworked the content strategy around that finding. Grew Instagram engagement from 1.2% to 3.8% over 8 months by testing different content formats, cutting what wasn't working, and doubling down on what was."
    }
  ],

  // Projects
  projects: [
    {
      title: "JobMatch AI",
      description: "Built a Chrome extension + local AI API that reduced resume tailoring time from 30 minutes per application to under 60 seconds. Analyzes any job posting against my resume in real time, identifies missing ATS keywords, and rewrites specific bullet points to match the role — powered by Claude AI and a FastAPI backend built from scratch in Python.",
      url: "github.com/Mahanam2003/jobmatch-ai",
      technologies: "Python, FastAPI, Claude API, JavaScript, Chrome Extension"
    },
    {
      title: "Serie A Predictive Analytics Model",
      description: "Built a model from scratch to predict how many points each Serie A team would finish the season with, went through 5 versions testing different approaches, and got the prediction error (MAE) down from 3.54 to 2.58 points. Tested the final model on 2 seasons it had never seen before, held up with an average MAE of 2.66, and outperformed Understat's own expected points metric.",
      url: "github.com/Mahanam2003",
      technologies: "R, Statistical Modeling, Predictive Analytics"
    }
  ],

  // Skills
  skills: [
    "Python", "R", "SQL", "JavaScript", "Java", "C++", "HTML",
    "Figma", "Google Analytics", "Excel", "Statistical Modeling",
    "Data Science", "User Research", "Usability Testing",
    "A/B Testing", "Journey Mapping", "Agile",
    "Product Strategy", "Feature Scoping"
  ],

  // Languages
  languages: [
    { language: "English",  proficiency: "Native or bilingual" },
    { language: "Persian",  proficiency: "Native or bilingual" },
    { language: "Turkish",  proficiency: "Elementary" },
    { language: "Arabic",   proficiency: "Elementary" }
  ],

  // Honors
  honors: [
    { title: "Dean's List",                  year: "2025", org: "University of Washington" },
    { title: "Valedictorian",                year: "2022", org: "North Creek High School" },
    { title: "Top 10% Academic Distinction", year: "2024", org: "Cascadia College" }
  ],

  hear_about: "LinkedIn"
};
