import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST() {
  try {
    let currentPage = 1;
    let totalPages = 1; // Will update after first request
    const allDistricts = [];

    // Loop through all pages
    while (currentPage <= totalPages) {
      const url = `https://data.mef.gov.kh/api/v1/public-datasets/pd_66a8603800604c000123e145/json?page=${currentPage}&page_size=10`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch page ${currentPage}`);
      }
      
      const data = await response.json();
      
      // Update total pages on first iteration
      if (currentPage === 1 && data.total_pages) {
        totalPages = data.total_pages;
      }
      
      if (data.items && Array.isArray(data.items)) {
        // Map MEF API fields to Prisma model fields
        const formattedItems = data.items.map((item: any) => ({
          provinceCode: item.province_code,
          districtCode: item.district_code,
          districtKh: item.district_kh,
          districtEn: item.district_en,
        }));
        
        allDistricts.push(...formattedItems);
      }
      
      currentPage++;
    }

    // Insert all districts into the database efficiently using createMany
    // skipDuplicates: true ensures we don't crash if we run this twice
    const result = await prisma.district.createMany({
      data: allDistricts,
      skipDuplicates: true, 
    });

    return NextResponse.json({ 
      success: true, 
      message: `Successfully seeded ${result.count} districts out of ${allDistricts.length} fetched.` 
    });

  } catch (error) {
    console.error('Seeding error:', error);
    return NextResponse.json({ success: false, error: 'Failed to seed data' }, { status: 500 });
  }
}
