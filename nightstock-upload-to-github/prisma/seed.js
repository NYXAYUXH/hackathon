const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(",").map(v => v.trim());
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = values[i];
    });
    return obj;
  });
}

async function main() {
  console.log("🦇 Fast-seeding Supabase database via Prisma Client...");

  const dataDir = path.join(__dirname, "..", "data");
  const invPath = path.join(dataDir, "real_store_inventory.csv");
  const consPath = path.join(dataDir, "real_consumption_history.csv");

  if (!fs.existsSync(invPath)) {
    console.warn("⚠️ Inventory CSV not found:", invPath);
    return;
  }

  // Clear existing records cleanly
  await prisma.scheduledShipment.deleteMany({});
  await prisma.alert.deleteMany({});
  await prisma.consumptionLog.deleteMany({});
  await prisma.product.deleteMany({});

  const inventory = parseCSV(invPath);
  console.log(`Found ${inventory.length} inventory products in CSV.`);

  const skuToId = {};

  for (const item of inventory) {
    if (!item.sku) continue;
    const created = await prisma.product.create({
      data: {
        sku: item.sku,
        name: item.name,
        category: item.category,
        unit: item.unit || "Vials",
        currentStock: parseFloat(item.current_stock || "0"),
        minStockLevel: parseFloat(item.min_stock_level || "10"),
        maxStockCapacity: parseFloat(item.max_stock_capacity || "100"),
        unitPrice: parseFloat(item.unit_price || "0"),
        leadTimeDays: parseInt(item.lead_time_days || "3", 10),
        supplier: item.supplier || "Coven Unknown",
        spookinessLevel: parseInt(item.spookiness_level || "3", 10),
        notes: item.notes || ""
      }
    });
    skuToId[item.sku] = created.id;
  }
  console.log(`✅ Inserted ${Object.keys(skuToId).length} products into Supabase.`);

  if (fs.existsSync(consPath)) {
    const logs = parseCSV(consPath);
    const logBatch = [];
    for (const log of logs) {
      const prodId = skuToId[log.sku];
      if (!prodId) continue;
      logBatch.push({
        productId: prodId,
        date: log.date || new Date().toISOString().split("T")[0],
        quantity: parseFloat(log.quantity || "1"),
        loggedBy: log.logged_by || "High Necromancer",
        reason: log.reason || "Midnight Demand",
        isAnomaly: log.is_anomaly === "1" || log.is_anomaly === "true"
      });
    }

    if (logBatch.length > 0) {
      const result = await prisma.consumptionLog.createMany({
        data: logBatch,
        skipDuplicates: true
      });
      console.log(`✅ Batch-inserted ${result.count} consumption logs into Supabase.`);
    }
  }

  // Create initial demo calendar shipments for depleted stocks
  const sampleProducts = await prisma.product.findMany({ take: 3 });
  const shipmentBatch = sampleProducts.map(p => ({
    productId: p.id,
    expectedDeliveryDate: new Date(Date.now() + 4 * 24 * 3600 * 1000).toISOString().split("T")[0],
    daysUntilArrival: 4,
    quantity: 25.0,
    daysUntilStockout: 2.5,
    status: "PENDING",
    supplier: p.supplier,
    notes: "Urgent hackathon replenishment shipment"
  }));

  if (shipmentBatch.length > 0) {
    const sResult = await prisma.scheduledShipment.createMany({
      data: shipmentBatch
    });
    console.log(`✅ Seeded ${sResult.count} scheduled shipments into Supabase calendar.`);
  }

  console.log("🎉 All data successfully seeded into Supabase Postgres database!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
