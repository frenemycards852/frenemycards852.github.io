// Rarity roll from weighted odds (data/config.json → rarity). No DOM access.

export function rollRarity(rules, rand = Math.random) {
  const total = rules.order.reduce((sum, key) => sum + rules.odds[key], 0);
  let roll = rand() * total;
  for (const key of rules.order) {
    roll -= rules.odds[key];
    if (roll < 0) return key;
  }
  return rules.order[0];
}

export function isRarity(rules, value) {
  return rules.order.includes(value);
}
