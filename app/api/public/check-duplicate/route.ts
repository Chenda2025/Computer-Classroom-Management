import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function POST(request: Request) {
  try {
    const { name, nameEn, gender, phone } = await request.json();

    if (!name?.trim() || !nameEn?.trim() || !gender || !phone?.trim()) {
      return NextResponse.json({ duplicate: false });
    }

    const trimmedName = name.trim();
    const trimmedNameEn = nameEn.trim();
    const trimmedPhone = phone.trim();

    const duplicateCondition = {
      name: trimmedName,
      nameEn: trimmedNameEn,
      gender: gender,
      phone: trimmedPhone,
    };

    // Check existing student
    const existingStudent = await prisma.student.findFirst({
      where: duplicateCondition
    });
    if (existingStudent) {
      return NextResponse.json({ duplicate: true, message: 'សិស្សដែលមានព័ត៌មានដូចគ្នានេះមានរួចហើយនៅក្នុងប្រព័ន្ធ' });
    }

    // Check pending registration
    const existingRegistration = await prisma.studentRegistration.findFirst({
      where: { ...duplicateCondition, status: 'PENDING' }
    });
    if (existingRegistration) {
      return NextResponse.json({ duplicate: true, message: 'សិស្សដែលមានព័ត៌មានដូចគ្នានេះកំពុងរង់ចាំការអនុម័តរួចហើយ' });
    }

    return NextResponse.json({ duplicate: false });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'មានបញ្ហា' }, { status: 500 });
  }
}
