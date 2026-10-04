import type { Composition, UnitCategory, Vec2, VyuhaId } from "../../../../shared/types";

export interface Slot {
  pos: Vec2;
  category: UnitCategory;
  role: "front" | "rear" | "wing" | "center" | "guard" | "point" | "lane";
}

function polar(r: number, a: number): Vec2 {
  return { x: Math.cos(a) * r, z: Math.sin(a) * r };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function categoryForIndex(i: number, counts: Record<UnitCategory, number>): UnitCategory {
  const order: UnitCategory[] = ["infantry", "archer", "cavalry", "elephant", "chariot", "elite"];
  let acc = 0;
  for (const c of order) {
    acc += counts[c];
    if (i < acc) return c;
  }
  return "infantry";
}

function groupCounts(composition: Composition, groupSize: number): Record<UnitCategory, number> {
  const cats: UnitCategory[] = ["infantry", "archers", "cavalry", "elephants", "chariots", "elite"] as unknown as UnitCategory[];
  const map: Record<UnitCategory, number> = {
    infantry: Math.max(1, Math.round(composition.infantry / groupSize)),
    archer: Math.max(1, Math.round(composition.archers / groupSize)),
    cavalry: Math.max(1, Math.round(composition.cavalry / groupSize)),
    elephant: Math.max(1, Math.round(composition.elephants / Math.max(groupSize * 2, 80))),
    chariot: Math.max(1, Math.round(composition.chariots / Math.max(groupSize * 1.5, 60))),
    elite: Math.max(1, Math.round(composition.elite / Math.max(groupSize * 0.7, 40))),
  };
  void cats;
  return map;
}

export function generateFormation(
  vyuha: VyuhaId,
  composition: Composition,
  armySize: number,
  facing: 1 | -1,
): Slot[] {
  const groupSize = armySize > 7500 ? 280 : armySize > 4000 ? 200 : 140;
  const counts = groupCounts(composition, groupSize);
  const totalGroups = Object.values(counts).reduce((a, b) => a + b, 0);
  const slots: Slot[] = [];

  const layout = layouts[vyuha](totalGroups);
  for (let i = 0; i < layout.length; i++) {
    const p = layout[i]!;
    const cat = preferCategory(i, layout.length, counts, vyuha);
    slots.push({
      pos: { x: p.x, z: p.z * facing },
      category: cat,
      role: roleFor(cat, p, vyuha),
    });
  }

  const used: Record<UnitCategory, number> = {
    infantry: 0,
    archer: 0,
    cavalry: 0,
    elephant: 0,
    chariot: 0,
    elite: 0,
  };
  for (const s of slots) used[s.category]++;
  const overflow = slots.filter((s) => {
    if (used[s.category] > counts[s.category]) {
      used[s.category]--;
      const fallback = (Object.keys(counts) as UnitCategory[]).find((c) => used[c] < counts[c]);
      if (fallback) {
        s.category = fallback;
        used[fallback]++;
      }
      return true;
    }
    return false;
  });
  void overflow;
  void categoryForIndex;
  void lerp;
  return slots;
}

function preferCategory(i: number, n: number, counts: Record<UnitCategory, number>, vyuha: VyuhaId): UnitCategory {
  const t = i / Math.max(1, n - 1);
  if (vyuha === "kurma") {
    if (t < 0.55) return pickAvail(["infantry", "elite"], counts);
    if (t < 0.75) return pickAvail(["archer", "infantry"], counts);
    return pickAvail(["cavalry", "chariot", "elephant"], counts);
  }
  if (vyuha === "garuda") {
    if (t < 0.35) return pickAvail(["infantry", "elephant", "elite"], counts);
    if (t < 0.8) return pickAvail(["cavalry", "chariot"], counts);
    return pickAvail(["archer", "infantry"], counts);
  }
  if (vyuha === "krauncha") {
    if (t < 0.2) return pickAvail(["elite", "elephant", "cavalry"], counts);
    if (t < 0.7) return pickAvail(["infantry", "chariot"], counts);
    return pickAvail(["archer", "infantry"], counts);
  }
  if (vyuha === "makara") {
    if (t < 0.4) return pickAvail(["elephant", "infantry", "elite"], counts);
    return pickAvail(["infantry", "archer", "chariot", "cavalry"], counts);
  }
  if (vyuha === "ardhachandra") {
    if (t < 0.45) return pickAvail(["cavalry", "chariot"], counts);
    if (t < 0.75) return pickAvail(["infantry", "elite"], counts);
    return pickAvail(["archer", "infantry"], counts);
  }
  if (vyuha === "chakravyuha") {
    const layer = Math.floor(t * 4);
    if (layer === 0) return pickAvail(["elite", "infantry"], counts);
    if (layer === 3) return pickAvail(["archer", "chariot"], counts);
    return pickAvail(["infantry", "cavalry"], counts);
  }
  if (t < 0.45) return pickAvail(["infantry", "elephant"], counts);
  if (t < 0.7) return pickAvail(["cavalry", "chariot", "elite"], counts);
  return pickAvail(["archer", "infantry"], counts);
}

function pickAvail(pref: UnitCategory[], counts: Record<UnitCategory, number>): UnitCategory {
  for (const p of pref) if (counts[p] > 0) return p;
  return (Object.keys(counts) as UnitCategory[]).find((c) => counts[c] > 0) ?? "infantry";
}

function roleFor(cat: UnitCategory, p: Vec2, _v: VyuhaId): Slot["role"] {
  if (cat === "archer") return "rear";
  if (cat === "cavalry") return "wing";
  if (cat === "elite") return Math.abs(p.x) < 4 ? "guard" : "point";
  if (cat === "elephant") return "center";
  if (cat === "chariot") return "lane";
  return Math.abs(p.x) > 10 ? "wing" : "front";
}

const layouts: Record<VyuhaId, (n: number) => Vec2[]> = {
  padma: (n) => {
    const pts: Vec2[] = [];
    let left = n;
    let ring = 0;
    while (left > 0) {
      const count = Math.min(left, 6 + ring * 5);
      const r = 3 + ring * 3.2;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + ring * 0.2;
        const petal = 1 + 0.18 * Math.sin(a * 6);
        pts.push(polar(r * petal, a));
      }
      left -= count;
      ring++;
    }
    return pts;
  },
  garuda: (n) => {
    const pts: Vec2[] = [];
    const body = Math.floor(n * 0.4);
    const wing = Math.floor(n * 0.25);
    const tail = n - body - wing * 2;
    for (let i = 0; i < body; i++) {
      pts.push({ x: ((i % 5) - 2) * 2.2, z: Math.floor(i / 5) * 2.4 });
    }
    for (let i = 0; i < wing; i++) {
      pts.push({ x: 8 + (i % 4) * 2.4, z: 4 + Math.floor(i / 4) * 2.1 + i * 0.15 });
      pts.push({ x: -(8 + (i % 4) * 2.4), z: 4 + Math.floor(i / 4) * 2.1 + i * 0.15 });
    }
    for (let i = 0; i < tail; i++) {
      pts.push({ x: ((i % 3) - 1) * 1.8, z: -4 - Math.floor(i / 3) * 2.2 });
    }
    return pts.slice(0, n);
  },
  krauncha: (n) => {
    const pts: Vec2[] = [];
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const z = lerp(14, -10, t);
      const width = lerp(2, 16, t * t);
      const col = i % Math.max(3, Math.floor(width / 2));
      const cols = Math.max(3, Math.floor(width / 2));
      pts.push({ x: (col - (cols - 1) / 2) * 2.3, z });
    }
    return pts;
  },
  makara: (n) => {
    const pts: Vec2[] = [];
    const jaws = Math.floor(n * 0.28);
    for (let i = 0; i < jaws; i++) {
      pts.push({ x: ((i % 8) - 3.5) * 2.1, z: 10 - Math.floor(i / 8) * 2 });
    }
    for (let i = jaws; i < n; i++) {
      const k = i - jaws;
      pts.push({ x: ((k % 5) - 2) * 2.4, z: 4 - Math.floor(k / 5) * 2.3 });
    }
    return pts;
  },
  shakata: (n) => {
    const cols = 8;
    const pts: Vec2[] = [];
    for (let i = 0; i < n; i++) {
      const c = i % cols;
      const r = Math.floor(i / cols);
      pts.push({ x: (c - (cols - 1) / 2) * 2.6, z: 8 - r * 2.4 });
    }
    return pts;
  },
  kurma: (n) => {
    const pts: Vec2[] = [];
    let left = n;
    let ring = 0;
    while (left > 0) {
      const count = Math.min(left, ring === 0 ? 1 : 8 + ring * 4);
      const r = ring === 0 ? 0 : 2.4 + ring * 2.6;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        pts.push(polar(r, a));
      }
      left -= count;
      ring++;
    }
    return pts;
  },
  ardhachandra: (n) => {
    const pts: Vec2[] = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1 || 1);
      const a = lerp(-Math.PI * 0.72, Math.PI * 0.72, t);
      const r = 12;
      const p = polar(r, a);
      const layer = i % 3;
      pts.push({ x: p.x * (1 + layer * 0.12), z: p.z + 4 - layer * 2.2 });
    }
    return pts;
  },
  chakravyuha: (n) => {
    const pts: Vec2[] = [];
    for (let i = 0; i < n; i++) {
      const a = i * 0.55;
      const r = 1.4 + i * 0.38;
      pts.push(polar(Math.min(r, 16), a));
    }
    return pts;
  },
};

export function commanderOffset(vyuha: VyuhaId): Vec2 {
  if (vyuha === "kurma" || vyuha === "padma" || vyuha === "chakravyuha") return { x: 0, z: 0 };
  if (vyuha === "krauncha") return { x: 0, z: 8 };
  if (vyuha === "makara") return { x: 0, z: 6 };
  return { x: 0, z: -2 };
}
