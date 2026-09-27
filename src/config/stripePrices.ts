/**
 * Mapping of product id -> Stripe Price ID (LIVE mode).
 *
 * These prices are pre-created in Stripe so they appear under
 * Products & Prices in the Stripe Dashboard, and so each charge is
 * tied to a real Price object (not a one-off `price_data` line).
 */
export const STRIPE_PRICE_IDS: Record<string, string> = {
  "daily-planner": "price_1TjXnjCn19AGQAKowiC1uv71",
  "fitness-planner": "price_1TjXnkCn19AGQAKoP3zQiowF",
  "budget-planner": "price_1TjXnlCn19AGQAKo9CeLOgw0",
  "adhd-planner": "price_1TjXnmCn19AGQAKo1eD2DSwl",
  "pet-planner": "price_1TjXnnCn19AGQAKokYMHeiJn",
  "pet-care-guide": "price_1TjXnnCn19AGQAKo1It3fyUE",
  "children-storybook": "price_1TjXnpCn19AGQAKom68XIqtc",
  "affirmation-cards": "price_1TjXnpCn19AGQAKopOxKa7mf",
  "printable-templates": "price_1TjXnqCn19AGQAKo1hKYuqw2",
  "meal-planner": "price_1TjXnrCn19AGQAKoBamDzvOL",
  "daily-journal": "price_1TjXnsCn19AGQAKosqWxdqmq",
  "self-care-checklist": "price_1TjXntCn19AGQAKo6m7GSjsS",
  "chore-chart": "price_1TjXnuCn19AGQAKoxQOV6Yog",
  "goal-tracker": "price_1TjXnvCn19AGQAKoztetqp4o",
  "weekly-reflection": "price_1TjXnvCn19AGQAKorg6ePeOj",
  "habit-builder": "price_1TjXnwCn19AGQAKoA3gYT9UT",
  "mindfulness-journal": "price_1TjXnxCn19AGQAKoznlLswWS",
  "study-planner": "price_1TjXnyCn19AGQAKo9iYHxacA",
  "meal-prep-guide": "price_1TjXnzCn19AGQAKo663QMIOF",
  "sleep-tracker": "price_1TjXo0Cn19AGQAKoCgsBfRmA",
  "gratitude-journal": "price_1TjXo1Cn19AGQAKoiZ1TSxbp",
  "project-planner": "price_1TjXo1Cn19AGQAKoPCKODmKo",
  "event-planner": "price_1TjXo2Cn19AGQAKosqrUARdT",
  "travel-planner": "price_1TjXo3Cn19AGQAKooxUjCB0c",
  "budget-binder": "price_1TjXo4Cn19AGQAKobTH0cHEF",
  "home-management-binder": "price_1TjXo5Cn19AGQAKosXOGQtsa",
};
