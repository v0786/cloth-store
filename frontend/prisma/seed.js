const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@store.com";
  const adminPassword = "admin@123";

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN" },
    create: {
      email: adminEmail,
      role: "ADMIN",
      passwordHash: await bcrypt.hash(adminPassword, 10),
      name: "Admin",
      notifyEmail: true,
      notifySms: false,
      notifyApp: true,
    },
  });

  const categories = [
    { name: "T-Shirts", slug: "t-shirts" },
    { name: "Shirts", slug: "shirts" },
    { name: "Jeans", slug: "jeans" },
    { name: "Dresses", slug: "dresses" },
  ];

  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name },
      create: c,
    });
  }

  const tshirts = await prisma.category.findUnique({ where: { slug: "t-shirts" } });

  const sampleProducts = [
    {
      title: "Everyday Cotton Tee",
      slug: "everyday-cotton-tee",
      description: "Soft cotton t-shirt for daily wear. Comfortable fit with breathable fabric.",
      categoryId: tshirts?.id,
      images: [
        "https://images.unsplash.com/photo-1520975958225-1900b0f0f24b?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1200&auto=format&fit=crop",
      ],
      variants: [
        { size: "S", color: "Black", pricePaise: 49900, stock: 15 },
        { size: "M", color: "Black", pricePaise: 49900, stock: 12 },
        { size: "L", color: "Black", pricePaise: 49900, stock: 10 },
        { size: "M", color: "White", pricePaise: 49900, stock: 8 },
      ],
    },
    {
      title: "Oversized Graphic Tee",
      slug: "oversized-graphic-tee",
      description: "Street-style oversized t-shirt with a bold print. Perfect for casual outfits.",
      categoryId: tshirts?.id,
      images: [
        "https://images.unsplash.com/photo-1520975916090-3105956dac38?q=80&w=1200&auto=format&fit=crop",
      ],
      variants: [
        { size: "M", color: "Navy", pricePaise: 69900, stock: 9 },
        { size: "L", color: "Navy", pricePaise: 69900, stock: 7 },
        { size: "XL", color: "Navy", pricePaise: 69900, stock: 6 },
      ],
    },
  ];

  for (const p of sampleProducts) {
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        title: p.title,
        description: p.description,
        categoryId: p.categoryId,
        active: true,
      },
      create: {
        title: p.title,
        slug: p.slug,
        description: p.description,
        categoryId: p.categoryId,
        active: true,
      },
    });

    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    for (let i = 0; i < p.images.length; i++) {
      await prisma.productImage.create({
        data: { productId: product.id, url: p.images[i], sortOrder: i },
      });
    }

    await prisma.productVariant.deleteMany({ where: { productId: product.id } });
    for (const v of p.variants) {
      await prisma.productVariant.create({
        data: {
          productId: product.id,
          sku: `${product.slug}-${v.size}-${v.color}`.toLowerCase().replace(/\s+/g, "-"),
          size: v.size,
          color: v.color,
          pricePaise: v.pricePaise,
          stock: v.stock,
        },
      });
    }
  }

  console.log("Seed complete");
  console.log("Admin login:", adminEmail, adminPassword);
  console.log("Admin id:", admin.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

