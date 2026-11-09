// Công thức theo GDD mục 27. Thuần hàm, dễ kiểm thử.
export const calcDamage = (atk, mult, def) =>
  Math.max(1, Math.round(atk * mult * 100 / (100 + def)));

export const rollCrit = (critRate, cap = 75) => Math.random() * 100 < Math.min(critRate, cap);
export const rollDodge = (dodgeRate, cap = 45) => Math.random() * 100 < Math.min(dodgeRate, cap);
