import { PrismaClient } from "@prisma/client";
import { toCents } from "@erp/shared";

const prisma = new PrismaClient();

/** Dollars to cents, keeping sub-cent precision (for ingredient unit costs). */
const cents = (dollars: number) => dollars * 100;

// ---- Chart of accounts ----
const ACCOUNTS = [
  { code: "1000", name: "Cash", type: "ASSET" },
  { code: "1010", name: "Card Clearing", type: "ASSET" },
  { code: "1200", name: "Inventory", type: "ASSET" },
  { code: "2000", name: "Tax Payable", type: "LIABILITY" },
  { code: "3000", name: "Owner's Equity", type: "EQUITY" },
  { code: "4000", name: "Sales Revenue", type: "REVENUE" },
  { code: "5000", name: "Cost of Goods Sold", type: "EXPENSE" },
];

async function seedAccounts() {
  for (const a of ACCOUNTS) {
    await prisma.account.upsert({
      where: { code: a.code },
      update: { name: a.name, type: a.type },
      create: a,
    });
  }
  console.log(`✓ ${ACCOUNTS.length} accounts`);
}

// ---- Ingredients ----
async function seedIngredients() {
  const data = [
    { name: "Beef patty", unit: "unit", costPerUnit: cents(1.2), stockQty: "200" },
    { name: "Burger bun", unit: "unit", costPerUnit: cents(0.3), stockQty: "200" },
    { name: "Cheddar slice", unit: "unit", costPerUnit: cents(0.25), stockQty: "300" },
    { name: "Lettuce", unit: "g", costPerUnit: cents(0.01), stockQty: "5000" },
    { name: "Tomato", unit: "g", costPerUnit: cents(0.008), stockQty: "5000" },
    { name: "Potato", unit: "g", costPerUnit: cents(0.004), stockQty: "20000" },
    { name: "Cola syrup", unit: "ml", costPerUnit: cents(0.02), stockQty: "10000" },
  ];
  const map: Record<string, string> = {};
  for (const i of data) {
    const row = await prisma.ingredient.upsert({
      where: { name: i.name },
      update: { unit: i.unit, costPerUnit: i.costPerUnit },
      create: i,
    });
    map[i.name] = row.id;
  }
  console.log(`✓ ${data.length} ingredients`);
  return map;
}

// ---- Menu items + recipes ----
async function seedMenu(ing: Record<string, string>) {
  // Cheeseburger
  const burger = await prisma.menuItem.create({
    data: {
      name: "Cheeseburger",
      category: "Burgers",
      price: toCents(9.5),
      recipe: {
        create: {
          name: "Cheeseburger recipe",
          lines: {
            create: [
              { ingredientId: ing["Beef patty"], quantity: "1" },
              { ingredientId: ing["Burger bun"], quantity: "1" },
              { ingredientId: ing["Cheddar slice"], quantity: "1" },
              { ingredientId: ing["Lettuce"], quantity: "20" },
              { ingredientId: ing["Tomato"], quantity: "30" },
            ],
          },
        },
      },
    },
  });

  // Fries
  await prisma.menuItem.create({
    data: {
      name: "French Fries",
      category: "Sides",
      price: toCents(3.5),
      recipe: {
        create: {
          name: "Fries recipe",
          lines: { create: [{ ingredientId: ing["Potato"], quantity: "200" }] },
        },
      },
    },
  });

  // Cola
  await prisma.menuItem.create({
    data: {
      name: "Cola",
      category: "Drinks",
      price: toCents(2.5),
      recipe: {
        create: {
          name: "Cola recipe",
          lines: { create: [{ ingredientId: ing["Cola syrup"], quantity: "40" }] },
        },
      },
    },
  });

  // A modifier group applied to the burger
  const extras = await prisma.modifierGroup.create({
    data: {
      name: "Extras",
      modifiers: {
        create: [
          { name: "Extra cheese", priceDelta: toCents(1.0) },
          { name: "Bacon", priceDelta: toCents(1.5) },
          { name: "No onions", priceDelta: 0 },
        ],
      },
    },
  });
  await prisma.menuItemModifier.create({
    data: { menuItemId: burger.id, groupId: extras.id },
  });

  console.log("✓ 3 menu items + 1 modifier group");
}

// ---- Tables ----
async function seedTables() {
  for (let n = 1; n <= 8; n++) {
    await prisma.restaurantTable.upsert({
      where: { number: n },
      update: {},
      create: { number: n, area: n <= 4 ? "Main" : "Terrace" },
    });
  }
  console.log("✓ 8 tables");
}

async function main() {
  console.log("Seeding…");
  await seedAccounts();
  const ing = await seedIngredients();
  // Only seed menu if empty, to keep create() idempotent-ish for prototype
  const existing = await prisma.menuItem.count();
  if (existing === 0) {
    await seedMenu(ing);
  } else {
    console.log("• menu already seeded, skipping");
  }
  await seedTables();
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
