import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function seed() {
  try {
    let currentPage = 1;
    let totalPages = 1;
    const allDistricts = [];

    console.log('Fetching MEF API data...');

    while (currentPage <= totalPages) {
      const url = `https://data.mef.gov.kh/api/v1/public-datasets/pd_66a8603800604c000123e145/json?page=${currentPage}&page_size=10`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch page ${currentPage}`);
      }
      
      const data = await response.json();
      
      if (currentPage === 1 && data.total_pages) {
        totalPages = data.total_pages;
      }
      
      if (data.items && Array.isArray(data.items)) {
        const formattedItems = data.items.map((item) => ({
          provinceCode: item.province_code,
          districtCode: item.district_code,
          districtKh: item.district_kh,
          districtEn: item.district_en,
        }));
        allDistricts.push(...formattedItems);
      }
      
      console.log(`Fetched page ${currentPage}/${totalPages}...`);
      currentPage++;
    }

    console.log(`Total districts fetched: ${allDistricts.length}. Inserting into database...`);

    const result = await prisma.district.createMany({
      data: allDistricts,
      skipDuplicates: true,
    });

    console.log(`✅ Successfully inserted ${result.count} districts!`);
  } catch (error) {
    console.error('❌ Error during seeding:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
