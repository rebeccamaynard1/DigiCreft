export type ProductType =
  | "pet-care-guide"
  | "children-storybook"
  | "daily-planner"
  | "fitness-planner"
  | "budget-planner"
  | "adhd-planner"
  | "pet-planner"
  | "affirmation-cards"
  | "printable-templates"
  | "meal-planner"
  | "daily-journal"
  | "self-care-checklist"
  | "chore-chart"
  | "goal-tracker"
  | "weekly-reflection"
  | "habit-builder"
  | "mindfulness-journal"
  | "study-planner"
  | "meal-prep-guide"
  | "sleep-tracker"
  | "gratitude-journal"
  | "project-planner"
  | "event-planner"
  | "travel-planner"
  | "budget-binder"
  | "home-management-binder";

export interface ProductConfig {
  id: string;
  type: ProductType;
  name: string;
  description: string;
  shortDescription: string;
  price: number;
  icon: string;
  color: string;
  fields: FormField[];
  features: string[];
}

export interface FormField {
  name: string;
  label: string;
  type: "text" | "textarea" | "select" | "number" | "date";
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
}




export const PRODUCT_CATEGORIES = [
  {
    id: "productivity",
    name: "Productivity & Planning",
    description: "Stay organized and on top of your goals with custom planners",
    products: ["daily-planner", "study-planner", "project-planner", "goal-tracker", "habit-builder", "adhd-planner"],
  },
  {
    id: "health-wellness",
    name: "Health & Wellness",
    description: "Personalized plans for fitness, nutrition, and rest",
    products: ["fitness-planner", "meal-planner", "meal-prep-guide", "sleep-tracker", "self-care-checklist"],
  },
  {
    id: "mindfulness",
    name: "Mindfulness & Journaling",
    description: "Guided journals and reflective practices for inner growth",
    products: ["daily-journal", "gratitude-journal", "mindfulness-journal", "weekly-reflection", "affirmation-cards"],
  },
  {
    id: "family-kids",
    name: "Family & Kids",
    description: "Magical stories and helpful tools for the whole family",
    products: ["children-storybook", "chore-chart"],
  },
  {
    id: "pets",
    name: "For Pet Owners",
    description: "Care guides and planners tailored to your furry friend",
    products: ["pet-care-guide", "pet-planner"],
  },
  {
    id: "home-finance",
    name: "Home & Finance",
    description: "Take control of your household, budget, and special events",
    products: ["budget-planner", "budget-binder", "home-management-binder", "event-planner", "travel-planner"],
  },
  {
    id: "printables",
    name: "Printables & Templates",
    description: "Beautiful printable templates for any occasion",
    products: ["printable-templates"],
  },
];

export const PRODUCTS: Record<string, ProductConfig> = {
  "daily-planner": {
    id: "daily-planner",
    type: "daily-planner",
    name: "Daily Planner",
    description: "A personalized daily planner designed around your schedule, goals, and habits. AI generates custom sections, layouts, and motivational quotes.",
    shortDescription: "Personalized daily planning system",
    price: 7.99,
    icon: "📅",
    color: "primary",
    features: ["Custom schedule blocks", "Goal tracking sections", "Habit tracker", "Daily affirmations", "Printable PDF"],
    fields: [
      { name: "name", label: "Your Name", type: "text", placeholder: "Enter your name", required: true },
      { name: "wakeTime", label: "Usual Wake Time", type: "text", placeholder: "e.g., 6:30 AM", required: true },
      { name: "goals", label: "Top 3 Goals", type: "textarea", placeholder: "What are your main goals?", required: true },
      { name: "habits", label: "Habits to Track", type: "textarea", placeholder: "List habits you want to build" },
      { name: "style", label: "Design Style", type: "select", required: true, options: [
        { label: "Minimalist", value: "minimalist" },
        { label: "Colorful", value: "colorful" },
        { label: "Professional", value: "professional" },
        { label: "Cute & Fun", value: "cute" },
      ]},
    ],
  },
  "fitness-planner": {
    id: "fitness-planner",
    type: "fitness-planner",
    name: "Fitness Planner",
    description: "A custom fitness planner with workout schedules, meal planning sections, and progress tracking tailored to your fitness level.",
    shortDescription: "Custom workout & meal planning",
    price: 8,
    icon: "💪",
    color: "warm",
    features: ["Workout schedules", "Meal planning", "Progress tracker", "Body measurements log", "Printable PDF"],
    fields: [
      { name: "name", label: "Your Name", type: "text", placeholder: "Enter your name", required: true },
      { name: "fitnessLevel", label: "Fitness Level", type: "select", required: true, options: [
        { label: "Beginner", value: "beginner" },
        { label: "Intermediate", value: "intermediate" },
        { label: "Advanced", value: "advanced" },
      ]},
      { name: "goals", label: "Fitness Goals", type: "textarea", placeholder: "e.g., Lose weight, build muscle", required: true },
      { name: "workoutStyle", label: "Preferred Workout Style", type: "select", required: true, options: [
        { label: "Gym", value: "gym" },
        { label: "Home Workouts", value: "home" },
        { label: "Walking / Cardio", value: "walking" },
        { label: "Strength Training", value: "strength" },
      ]},
    ],
  },
  "budget-planner": {
    id: "budget-planner",
    type: "budget-planner",
    name: "Budget Planner",
    description: "Take control of your finances with a personalized budget planner featuring custom categories and savings goals.",
    shortDescription: "Personal finance tracking system",
    price: 9,
    icon: "💰",
    color: "accent",
    features: ["Custom budget categories", "Savings goals tracker", "Expense log", "Monthly overview", "Printable PDF"],
    fields: [
      { name: "name", label: "Your Name", type: "text", placeholder: "Enter your name", required: true },
      { name: "income", label: "Income Range", type: "select", required: true, options: [
        { label: "Under $2,000", value: "under-2k" },
        { label: "$2,000 - $5,000", value: "2k-5k" },
        { label: "$5,000 - $10,000", value: "5k-10k" },
        { label: "Over $10,000", value: "over-10k" },
      ]},
      { name: "savingsGoals", label: "Savings Goals", type: "textarea", placeholder: "e.g., Emergency fund, vacation, debt payoff", required: true },
      { name: "priorities", label: "Financial Priorities", type: "textarea", placeholder: "e.g., Reduce spending, invest more, pay off loans" },
    ],
  },
  "adhd-planner": {
    id: "adhd-planner",
    type: "adhd-planner",
    name: "ADHD Planner",
    description: "Designed specifically for ADHD minds — with visual cues, time blocking, brain dumps, and dopamine-friendly layouts.",
    shortDescription: "ADHD-friendly organization system",
    price: 8.99,
    icon: "🧠",
    color: "rose",
    features: ["Time blocking", "Brain dump pages", "Visual priority system", "Dopamine menu", "Printable PDF"],
    fields: [
      { name: "name", label: "Your Name", type: "text", placeholder: "Enter your name", required: true },
      { name: "challenges", label: "Biggest Challenges", type: "textarea", placeholder: "e.g., Time management, focus, starting tasks", required: true },
      { name: "interests", label: "Current Interests/Hobbies", type: "textarea", placeholder: "For your dopamine menu" },
      { name: "style", label: "Visual Style", type: "select", required: true, options: [
        { label: "Calming & Minimal", value: "calm" },
        { label: "Bright & Stimulating", value: "bright" },
        { label: "Color-Coded", value: "color-coded" },
      ]},
    ],
  },
  "pet-planner": {
    id: "pet-planner",
    type: "pet-planner",
    name: "Pet Care Planner",
    description: "Keep track of your pet's health, grooming, feeding, and activities with a planner customized for your furry friend.",
    shortDescription: "Complete pet care organization",
    price: 7,
    icon: "🐾",
    color: "warm",
    features: ["Vet visit tracker", "Feeding schedule", "Grooming log", "Activity tracker", "Printable PDF"],
    fields: [
      { name: "petName", label: "Pet's Name", type: "text", placeholder: "Enter pet's name", required: true },
      { name: "petType", label: "Species", type: "select", required: true, options: [
        { label: "Dog", value: "dog" },
        { label: "Cat", value: "cat" },
        { label: "Bird", value: "bird" },
        { label: "Other", value: "other" },
      ]},
      { name: "age", label: "Age", type: "text", placeholder: "e.g., 3 years", required: true },
      { name: "healthConcerns", label: "Health Concerns", type: "textarea", placeholder: "e.g., Allergies, joint issues, weight management" },
      { name: "dailyRoutine", label: "Daily Routine", type: "textarea", placeholder: "e.g., Morning walk, feeding times, play schedule" },
    ],
  },
  "pet-care-guide": {
    id: "pet-care-guide",
    type: "pet-care-guide",
    name: "Custom Pet Care Guide",
    description: "A comprehensive, personalized guide covering nutrition, health, training, and care tips specific to your pet.",
    shortDescription: "Personalized pet health & care guide",
    price: 9.99,
    icon: "🐕",
    color: "accent",
    features: ["Breed-specific advice", "Nutrition guide", "Training tips", "Health checklist", "Printable PDF"],
    fields: [
      { name: "petName", label: "Pet's Name", type: "text", placeholder: "Enter pet's name", required: true },
      { name: "petType", label: "Type of Pet", type: "select", required: true, options: [
        { label: "Dog", value: "dog" },
        { label: "Cat", value: "cat" },
        { label: "Bird", value: "bird" },
        { label: "Rabbit", value: "rabbit" },
        { label: "Other", value: "other" },
      ]},
      { name: "breed", label: "Breed", type: "text", placeholder: "e.g., Labrador" },
      { name: "age", label: "Age", type: "text", placeholder: "e.g., 2 years" },
      { name: "concerns", label: "Any Health Concerns?", type: "textarea", placeholder: "e.g., Allergies, weight management" },
    ],
  },
  "children-storybook": {
    id: "children-storybook",
    type: "children-storybook",
    name: "Custom Children's Storybook",
    description: "A magical, personalized storybook featuring your child as the main character. AI writes and illustrates a unique adventure.",
    shortDescription: "Personalized storybook for your child",
    price: 12.99,
    icon: "📚",
    color: "rose",
    features: ["Child as main character", "AI-generated story", "Beautiful illustrations", "Custom themes", "Printable PDF"],
    fields: [
      { name: "childName", label: "Child's Name", type: "text", placeholder: "Enter child's name", required: true },
      { name: "age", label: "Child's Age", type: "number", placeholder: "e.g., 5", required: true },
      { name: "theme", label: "Story Theme", type: "select", required: true, options: [
        { label: "Adventure", value: "adventure" },
        { label: "Friendship", value: "friendship" },
        { label: "Space Exploration", value: "space" },
        { label: "Underwater World", value: "underwater" },
        { label: "Fairy Tale", value: "fairy-tale" },
      ]},
      { name: "interests", label: "Child's Interests", type: "textarea", placeholder: "e.g., Dinosaurs, princesses, robots" },
      { name: "lesson", label: "Lesson/Moral", type: "text", placeholder: "e.g., Be brave, kindness matters" },
    ],
  },
  "affirmation-cards": {
    id: "affirmation-cards",
    type: "affirmation-cards",
    name: "Custom Affirmation Cards",
    description: "Beautiful, personalized affirmation cards designed to inspire and motivate you every day.",
    shortDescription: "Daily inspiration cards",
    price: 5.99,
    icon: "✨",
    color: "primary",
    features: ["30 unique cards", "Personalized themes", "Beautiful designs", "Print & cut ready", "Printable PDF"],
    fields: [
      { name: "name", label: "Your Name", type: "text", placeholder: "Enter your name", required: true },
      { name: "focus", label: "Focus Areas", type: "select", required: true, options: [
        { label: "Self-Love", value: "self-love" },
        { label: "Career & Success", value: "career" },
        { label: "Health & Wellness", value: "health" },
        { label: "Relationships", value: "relationships" },
        { label: "General Positivity", value: "general" },
      ]},
      { name: "tone", label: "Tone", type: "select", required: true, options: [
        { label: "Gentle & Calm", value: "gentle" },
        { label: "Bold & Empowering", value: "bold" },
        { label: "Spiritual", value: "spiritual" },
      ]},
      { name: "style", label: "Card Style", type: "select", required: true, options: [
        { label: "Watercolor", value: "watercolor" },
        { label: "Minimalist", value: "minimalist" },
        { label: "Floral", value: "floral" },
        { label: "Geometric", value: "geometric" },
      ]},
    ],
  },
  "printable-templates": {
    id: "printable-templates",
    type: "printable-templates",
    name: "Custom Printable Templates",
    description: "Custom printable templates for to-do lists, meal plans, habit trackers, and more — designed to match your style.",
    shortDescription: "Beautiful custom printable pages",
    price: 4.99,
    icon: "🖨️",
    color: "sky",
    features: ["Multiple template types", "Custom styling", "A4 & Letter sizes", "Color & B/W options", "Printable PDF"],
    fields: [
      { name: "name", label: "Your Name", type: "text", placeholder: "Enter your name" },
      { name: "templateType", label: "Template Type", type: "select", required: true, options: [
        { label: "To-Do List", value: "todo" },
        { label: "Weekly Meal Plan", value: "meal-plan" },
        { label: "Habit Tracker", value: "habit-tracker" },
        { label: "Gratitude Journal", value: "gratitude" },
        { label: "Goal Setting", value: "goals" },
      ]},
      { name: "style", label: "Design Style", type: "select", required: true, options: [
        { label: "Minimalist", value: "minimalist" },
        { label: "Floral", value: "floral" },
        { label: "Modern", value: "modern" },
        { label: "Vintage", value: "vintage" },
      ]},
      { name: "colorScheme", label: "Color Preference", type: "select", options: [
        { label: "Pastels", value: "pastels" },
        { label: "Earth Tones", value: "earth" },
        { label: "Black & White", value: "bw" },
        { label: "Bright Colors", value: "bright" },
      ]},
    ],
  },
  "meal-planner": {
    id: "meal-planner",
    type: "meal-planner",
    name: "Meal Planner",
    description: "A personalized weekly meal planner built around your dietary preferences, goals, and allergies. AI generates custom recipes and grocery lists.",
    shortDescription: "Custom meal planning system",
    price: 7,
    icon: "🍽️",
    color: "accent",
    features: ["Personalized meal plans", "Custom recipes", "Grocery list", "Allergy-safe options", "Nutritional guidance", "Printable PDF"],
    fields: [
      { name: "name", label: "Your Name", type: "text", placeholder: "Enter your name", required: true },
      { name: "dietaryPreferences", label: "Dietary Preferences", type: "select", required: true, options: [
        { label: "No restrictions", value: "none" },
        { label: "Vegetarian", value: "vegetarian" },
        { label: "Vegan", value: "vegan" },
        { label: "Keto", value: "keto" },
        { label: "Paleo", value: "paleo" },
        { label: "Gluten-Free", value: "gluten-free" },
      ]},
      { name: "goals", label: "Goals", type: "textarea", placeholder: "e.g., Lose weight, eat healthier, save time cooking", required: true },
      { name: "allergies", label: "Allergies", type: "textarea", placeholder: "e.g., Peanuts, dairy, shellfish (leave blank if none)" },
    ],
  },
  "daily-journal": {
    id: "daily-journal",
    type: "daily-journal",
    name: "Daily Journal",
    description: "A beautifully crafted daily journal with guided prompts, reflection spaces, and inspiration tailored to your personal tone and focus.",
    shortDescription: "Guided daily journaling prompts",
    price: 5,
    icon: "📓",
    color: "rose",
    features: ["30 days of guided prompts", "Personalized focus areas", "Reflection sections", "Gratitude exercises", "Mood tracking", "Printable PDF"],
    fields: [
      { name: "name", label: "Your Name", type: "text", placeholder: "Enter your name", required: true },
      { name: "focusAreas", label: "Focus Areas", type: "textarea", placeholder: "e.g., Gratitude, self-growth, mindfulness, creativity", required: true },
      { name: "tone", label: "Preferred Tone", type: "select", required: true, options: [
        { label: "Motivational", value: "motivational" },
        { label: "Reflective", value: "reflective" },
        { label: "Spiritual", value: "spiritual" },
      ]},
    ],
  },
  "self-care-checklist": {
    id: "self-care-checklist",
    type: "self-care-checklist",
    name: "Self-Care Checklist",
    description: "A personalized self-care checklist tailored to your routine, stress level, and preferred style. AI creates daily and weekly rituals just for you.",
    shortDescription: "Personalized self-care routines",
    price: 4,
    icon: "🧘",
    color: "rose",
    features: ["Daily self-care rituals", "Stress-level tips", "Personalized activities", "Weekly reset checklist", "Mood boosters", "Printable PDF"],
    fields: [
      { name: "name", label: "Your Name", type: "text", placeholder: "Enter your name", required: true },
      { name: "dailyRoutine", label: "Daily Routine", type: "textarea", placeholder: "Describe your typical day (work hours, free time, etc.)", required: true },
      { name: "stressLevel", label: "Stress Level", type: "select", required: true, options: [
        { label: "Low", value: "low" },
        { label: "Moderate", value: "moderate" },
        { label: "High", value: "high" },
        { label: "Very High", value: "very-high" },
      ]},
      { name: "style", label: "Preferred Self-Care Style", type: "select", required: true, options: [
        { label: "Quiet (reading, baths, meditation)", value: "quiet" },
        { label: "Active (exercise, dancing, walks)", value: "active" },
        { label: "Creative (art, writing, music)", value: "creative" },
      ]},
    ],
  },
  "chore-chart": {
    id: "chore-chart",
    type: "chore-chart",
    name: "Chore Chart",
    description: "A fun, personalized chore chart for kids with age-appropriate tasks, a reward system, and weekly tracking — designed to make helping out exciting.",
    shortDescription: "Fun chore tracking for kids",
    price: 3,
    icon: "🧹",
    color: "sky",
    features: ["Age-appropriate chores", "Custom reward system", "Weekly tracker", "Fun design", "Progress tracking", "Printable PDF"],
    fields: [
      { name: "childName", label: "Child's Name", type: "text", placeholder: "Enter child's name", required: true },
      { name: "age", label: "Child's Age", type: "number", placeholder: "e.g., 7", required: true },
      { name: "priorities", label: "Household Priorities", type: "textarea", placeholder: "e.g., Making bed, dishes, tidying room, feeding pets", required: true },
      { name: "rewardStyle", label: "Reward Style", type: "select", required: true, options: [
        { label: "Points System", value: "points" },
        { label: "Stickers", value: "stickers" },
        { label: "Privileges (screen time, treats)", value: "privileges" },
      ]},
    ],
  },
  "goal-tracker": {
    id: "goal-tracker",
    type: "goal-tracker",
    name: "Goal Tracker",
    description: "A personalized goal tracker to help you set, plan, and achieve your top goals with structured milestones and motivation tailored to your style.",
    shortDescription: "Track and achieve your goals",
    price: 6,
    icon: "🎯",
    color: "primary",
    features: ["Top 3 goal breakdown", "Milestone tracking", "Progress visualization", "Motivation prompts", "Weekly check-ins", "Printable PDF"],
    fields: [
      { name: "name", label: "Your Name", type: "text", placeholder: "Enter your name", required: true },
      { name: "goals", label: "Top 3 Goals", type: "textarea", placeholder: "List your top 3 goals, one per line", required: true },
      { name: "timeframe", label: "Timeframe", type: "select", required: true, options: [
        { label: "30 Days", value: "30-days" },
        { label: "90 Days", value: "90-days" },
        { label: "6 Months", value: "6-months" },
        { label: "1 Year", value: "1-year" },
      ]},
      { name: "motivationStyle", label: "Motivation Style", type: "select", required: true, options: [
        { label: "Visual (charts, progress bars)", value: "visual" },
        { label: "Written (journaling, reflections)", value: "written" },
        { label: "Checklist (step-by-step tasks)", value: "checklist" },
      ]},
    ],
  },
  "weekly-reflection": {
    id: "weekly-reflection",
    type: "weekly-reflection",
    name: "Weekly Reflection Workbook",
    description: "A guided weekly reflection workbook to help you review your focus areas, celebrate wins, process challenges, and plan ahead with clarity.",
    shortDescription: "Guided weekly reflection prompts",
    price: 6,
    icon: "📝",
    color: "accent",
    features: ["Weekly reflection prompts", "Wins & gratitude sections", "Challenge processing", "Focus area tracking", "Action planning", "Printable PDF"],
    fields: [
      { name: "name", label: "Your Name", type: "text", placeholder: "Enter your name", required: true },
      { name: "focusAreas", label: "Focus Areas", type: "textarea", placeholder: "e.g., Career growth, health, relationships, creativity", required: true },
      { name: "challenges", label: "Current Challenges", type: "textarea", placeholder: "What challenges are you working through?", required: true },
      { name: "wins", label: "Recent Wins", type: "textarea", placeholder: "What went well this past week?" },
    ],
  },
  "habit-builder": {
    id: "habit-builder",
    type: "habit-builder",
    name: "Habit Builder",
    description: "A personalized habit-building guide with daily tracking, streak motivation, and accountability strategies tailored to your preferred style.",
    shortDescription: "Build lasting habits with structure",
    price: 6,
    icon: "🔄",
    color: "primary",
    features: ["Custom habit plans", "Daily tracking sheets", "Streak motivation", "Accountability strategies", "Difficulty-based progression", "Printable PDF"],
    fields: [
      { name: "name", label: "Your Name", type: "text", placeholder: "Enter your name", required: true },
      { name: "habits", label: "Top Habits to Build", type: "textarea", placeholder: "e.g., Exercise daily, read 30 min, meditate, drink more water", required: true },
      { name: "difficultyLevel", label: "Difficulty Level", type: "select", required: true, options: [
        { label: "Easy (small changes)", value: "easy" },
        { label: "Medium (moderate effort)", value: "medium" },
        { label: "Hard (major lifestyle shifts)", value: "hard" },
      ]},
      { name: "accountabilityStyle", label: "Preferred Accountability Style", type: "select", required: true, options: [
        { label: "Self-tracking (journals, checklists)", value: "self-tracking" },
        { label: "Reward-based (treat yourself milestones)", value: "reward-based" },
        { label: "Social (share with a friend or group)", value: "social" },
      ]},
    ],
  },
  "mindfulness-journal": {
    id: "mindfulness-journal",
    type: "mindfulness-journal",
    name: "Mindfulness Journal",
    description: "A guided mindfulness journal with breathing exercises, grounding techniques, and gratitude prompts personalized to your stress level and preferred style.",
    shortDescription: "Guided mindfulness & calm",
    price: 6,
    icon: "🧘‍♀️",
    color: "accent",
    features: ["Daily mindfulness prompts", "Breathing exercises", "Grounding techniques", "Gratitude sections", "Stress-relief activities", "Printable PDF"],
    fields: [
      { name: "name", label: "Your Name", type: "text", placeholder: "Enter your name", required: true },
      { name: "stressLevel", label: "Stress Level", type: "select", required: true, options: [
        { label: "Low", value: "low" },
        { label: "Moderate", value: "moderate" },
        { label: "High", value: "high" },
        { label: "Very High", value: "very-high" },
      ]},
      { name: "mindfulnessStyle", label: "Preferred Mindfulness Style", type: "select", required: true, options: [
        { label: "Breathing Exercises", value: "breathing" },
        { label: "Grounding Techniques", value: "grounding" },
        { label: "Gratitude Practice", value: "gratitude" },
      ]},
    ],
  },
  "study-planner": {
    id: "study-planner",
    type: "study-planner",
    name: "Study Planner",
    description: "A personalized study planner with subject-focused schedules, goal tracking, and learning strategies tailored to your preferred style.",
    shortDescription: "Smart study planning system",
    price: 5,
    icon: "📖",
    color: "sky",
    features: ["Subject-based scheduling", "Study goal tracking", "Learning style tips", "Exam prep sections", "Progress tracker", "Printable PDF"],
    fields: [
      { name: "name", label: "Your Name", type: "text", placeholder: "Enter your name", required: true },
      { name: "subjects", label: "Subject Focus", type: "textarea", placeholder: "e.g., Math, Biology, History", required: true },
      { name: "goals", label: "Study Goals", type: "textarea", placeholder: "e.g., Pass final exams, improve GPA, learn a new topic", required: true },
      { name: "learningStyle", label: "Preferred Learning Style", type: "select", required: true, options: [
        { label: "Visual (diagrams, charts, colors)", value: "visual" },
        { label: "Auditory (lectures, discussions, podcasts)", value: "auditory" },
        { label: "Hands-On (practice, experiments, projects)", value: "hands-on" },
      ]},
    ],
  },
  "meal-prep-guide": {
    id: "meal-prep-guide",
    type: "meal-prep-guide",
    name: "Meal Prep Guide",
    description: "A personalized meal prep guide with batch-cooking plans, recipes matched to your skill level, and a weekly schedule that fits your lifestyle.",
    shortDescription: "Weekly meal prep made easy",
    price: 7,
    icon: "🥗",
    color: "warm",
    features: ["Batch-cooking plans", "Skill-level recipes", "Weekly prep schedule", "Grocery lists", "Storage tips", "Printable PDF"],
    fields: [
      { name: "name", label: "Your Name", type: "text", placeholder: "Enter your name", required: true },
      { name: "dietaryStyle", label: "Dietary Style", type: "select", required: true, options: [
        { label: "No restrictions", value: "none" },
        { label: "Vegetarian", value: "vegetarian" },
        { label: "Vegan", value: "vegan" },
        { label: "Keto / Low-Carb", value: "keto" },
        { label: "High Protein", value: "high-protein" },
      ]},
      { name: "weeklySchedule", label: "Weekly Schedule", type: "textarea", placeholder: "e.g., Busy weekdays, free on Sundays for batch cooking", required: true },
      { name: "cookingSkill", label: "Cooking Skill Level", type: "select", required: true, options: [
        { label: "Beginner", value: "beginner" },
        { label: "Intermediate", value: "intermediate" },
        { label: "Advanced", value: "advanced" },
      ]},
    ],
  },
  "sleep-tracker": {
    id: "sleep-tracker",
    type: "sleep-tracker",
    name: "Sleep Tracker",
    description: "A personalized sleep tracker with bedtime routines, sleep quality logs, and wake-up strategies tailored to your challenges and goals.",
    shortDescription: "Better sleep, better mornings",
    price: 5,
    icon: "🌙",
    color: "primary",
    features: ["Sleep quality log", "Bedtime routine builder", "Wake-up strategies", "Sleep hygiene tips", "Progress tracking", "Printable PDF"],
    fields: [
      { name: "name", label: "Your Name", type: "text", placeholder: "Enter your name", required: true },
      { name: "sleepChallenges", label: "Sleep Challenges", type: "textarea", placeholder: "e.g., Trouble falling asleep, waking up at night, feeling tired", required: true },
      { name: "bedtimeRoutine", label: "Current Bedtime Routine", type: "textarea", placeholder: "e.g., Screen time, reading, no routine at all", required: true },
      { name: "wakeUpGoals", label: "Wake-Up Goals", type: "textarea", placeholder: "e.g., Wake at 6 AM feeling rested, stop snoozing", required: true },
    ],
  },
  "gratitude-journal": {
    id: "gratitude-journal",
    type: "gratitude-journal",
    name: "Gratitude Journal",
    description: "A personalized gratitude journal with daily prompts, reflection exercises, and positivity practices matched to your preferred style.",
    shortDescription: "Daily gratitude & positivity",
    price: 5,
    icon: "🙏",
    color: "warm",
    features: ["30 days of gratitude prompts", "Personalized focus areas", "Reflection exercises", "Positivity boosters", "Weekly reviews", "Printable PDF"],
    fields: [
      { name: "name", label: "Your Name", type: "text", placeholder: "Enter your name", required: true },
      { name: "gratitudeFocus", label: "Gratitude Focus", type: "textarea", placeholder: "e.g., Relationships, health, career, everyday moments", required: true },
      { name: "reflectionStyle", label: "Preferred Reflection Style", type: "select", required: true, options: [
        { label: "Lists (quick bullet points)", value: "lists" },
        { label: "Prompts (guided questions)", value: "prompts" },
        { label: "Free-Write (open journaling)", value: "free-write" },
      ]},
    ],
  },
  "project-planner": {
    id: "project-planner",
    type: "project-planner",
    name: "Project Planner",
    description: "A comprehensive project planner with milestone tracking, deadline management, and task breakdowns tailored to your specific project.",
    shortDescription: "Organized project management",
    price: 8,
    icon: "📋",
    color: "accent",
    features: ["Milestone tracking", "Deadline management", "Task breakdowns", "Progress overview", "Risk planning", "Printable PDF"],
    fields: [
      { name: "name", label: "Your Name", type: "text", placeholder: "Enter your name", required: true },
      { name: "projectType", label: "Project Type", type: "select", required: true, options: [
        { label: "Business / Startup", value: "business" },
        { label: "Creative / Design", value: "creative" },
        { label: "Academic / Research", value: "academic" },
        { label: "Home Renovation", value: "home" },
        { label: "Event Planning", value: "event" },
        { label: "Other", value: "other" },
      ]},
      { name: "deadline", label: "Project Deadline", type: "text", placeholder: "e.g., September 30, 2026", required: true },
      { name: "milestones", label: "Key Milestones", type: "textarea", placeholder: "e.g., Research phase, design draft, launch day", required: true },
    ],
  },
  "event-planner": {
    id: "event-planner",
    type: "event-planner",
    name: "Event Planner",
    description: "A personalized event planner with timelines, vendor checklists, budget tracking, and day-of schedules tailored to your event.",
    shortDescription: "Stress-free event planning",
    price: 7,
    icon: "🎉",
    color: "warm",
    features: ["Event timeline", "Vendor checklist", "Budget tracker", "Guest list organizer", "Day-of schedule", "Printable PDF"],
    fields: [
      { name: "eventType", label: "Event Type", type: "select", required: true, options: [
        { label: "Wedding", value: "wedding" },
        { label: "Birthday Party", value: "birthday" },
        { label: "Corporate Event", value: "corporate" },
        { label: "Baby Shower", value: "baby-shower" },
        { label: "Holiday Gathering", value: "holiday" },
        { label: "Other", value: "other" },
      ]},
      { name: "eventDate", label: "Event Date", type: "text", placeholder: "e.g., August 15, 2026", required: true },
      { name: "budgetRange", label: "Budget Range", type: "select", required: true, options: [
        { label: "Under $500", value: "under-500" },
        { label: "$500 – $2,000", value: "500-2k" },
        { label: "$2,000 – $10,000", value: "2k-10k" },
        { label: "Over $10,000", value: "over-10k" },
      ]},
      { name: "priorities", label: "Key Priorities", type: "textarea", placeholder: "e.g., Venue, catering, decorations, entertainment", required: true },
    ],
  },
  "travel-planner": {
    id: "travel-planner",
    type: "travel-planner",
    name: "Travel Planner",
    description: "A personalized travel planner with day-by-day itineraries, packing lists, budget breakdowns, and local tips tailored to your destination and style.",
    shortDescription: "Custom trip planning guide",
    price: 8,
    icon: "✈️",
    color: "sky",
    features: ["Day-by-day itinerary", "Packing checklist", "Budget tracker", "Local tips & recommendations", "Emergency info", "Printable PDF"],
    fields: [
      { name: "destination", label: "Destination", type: "text", placeholder: "e.g., Tokyo, Japan", required: true },
      { name: "travelDates", label: "Travel Dates", type: "text", placeholder: "e.g., July 10–20, 2026", required: true },
      { name: "budget", label: "Budget Range", type: "select", required: true, options: [
        { label: "Budget-friendly (under $1,000)", value: "budget" },
        { label: "Mid-range ($1,000–$3,000)", value: "mid-range" },
        { label: "Luxury ($3,000+)", value: "luxury" },
      ]},
      { name: "priorities", label: "Trip Priorities", type: "select", required: true, options: [
        { label: "Relaxation", value: "relaxation" },
        { label: "Adventure", value: "adventure" },
        { label: "Family-friendly", value: "family" },
        { label: "Work / Digital Nomad", value: "work" },
      ]},
    ],
  },
  "budget-binder": {
    id: "budget-binder",
    type: "budget-binder",
    name: "Budget Binder",
    description: "A comprehensive budget binder with income tracking, expense categories, savings goal pages, and debt payoff plans matched to your budgeting cycle.",
    shortDescription: "Complete financial binder system",
    price: 9,
    icon: "💵",
    color: "accent",
    features: ["Income & expense tracker", "Savings goal pages", "Debt payoff planner", "Cash envelope system", "Financial calendar", "Printable PDF"],
    fields: [
      { name: "incomeRange", label: "Income Range", type: "select", required: true, options: [
        { label: "Under $2,000/mo", value: "under-2k" },
        { label: "$2,000 – $5,000/mo", value: "2k-5k" },
        { label: "$5,000 – $10,000/mo", value: "5k-10k" },
        { label: "Over $10,000/mo", value: "over-10k" },
      ]},
      { name: "savingsGoals", label: "Savings Goals", type: "textarea", placeholder: "e.g., Emergency fund, vacation, new car, debt payoff", required: true },
      { name: "budgetingStyle", label: "Budgeting Style", type: "select", required: true, options: [
        { label: "Weekly", value: "weekly" },
        { label: "Bi-weekly", value: "bi-weekly" },
        { label: "Monthly", value: "monthly" },
      ]},
    ],
  },
  "home-management-binder": {
    id: "home-management-binder",
    type: "home-management-binder",
    name: "Home Management Binder",
    description: "An all-in-one home management binder with cleaning schedules, meal planning, household budgeting, and family coordination tailored to your household.",
    shortDescription: "All-in-one household organizer",
    price: 9,
    icon: "🏠",
    color: "warm",
    features: ["Cleaning schedules", "Meal planning pages", "Household budget tracker", "Family calendar", "Maintenance logs", "Printable PDF"],
    fields: [
      { name: "householdSize", label: "Household Size", type: "select", required: true, options: [
        { label: "1 person", value: "1" },
        { label: "2 people", value: "2" },
        { label: "3–4 people", value: "3-4" },
        { label: "5+ people", value: "5-plus" },
      ]},
      { name: "priorities", label: "Top Priorities", type: "select", required: true, options: [
        { label: "Cleaning & Organization", value: "cleaning" },
        { label: "Meals & Grocery Planning", value: "meals" },
        { label: "Budgeting & Bills", value: "budgeting" },
        { label: "All of the Above", value: "all" },
      ]},
      { name: "weeklySchedule", label: "Weekly Schedule", type: "textarea", placeholder: "e.g., Work Mon–Fri 9–5, kids' activities on weekends", required: true },
    ],
  },
};
