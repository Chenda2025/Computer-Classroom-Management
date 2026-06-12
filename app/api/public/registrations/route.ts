import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function POST(request: Request) {
  try {
    const {
      name, nameEn, phone, photoUrl, gender, dateOfBirth, nationality,
      wat, kuti, kutiHead, parentName, parentPhone,
      academicYear, educationLevel, grade, notes,
    } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: 'ឈ្មោះសិស្សត្រូវការ' }, { status: 400 });
    }

    const trimmedName = name.trim();
    const trimmedNameEn = nameEn?.trim() || null;
    const trimmedPhone = phone?.trim() || null;
    const genderVal = gender || null;

    const duplicateCondition = {
      name: trimmedName,
      nameEn: trimmedNameEn,
      gender: genderVal,
      phone: trimmedPhone,
    };

    // Check for duplicate in existing students
    const existingStudent = await prisma.student.findFirst({
      where: duplicateCondition
    });
    if (existingStudent) {
      return NextResponse.json({ error: 'សិស្សដែលមានព័ត៌មានដូចគ្នានេះមានរួចហើយនៅក្នុងប្រព័ន្ធ' }, { status: 400 });
    }

    // Check for duplicate in pending registrations
    const existingRegistration = await prisma.studentRegistration.findFirst({
      where: { ...duplicateCondition, status: 'PENDING' }
    });
    if (existingRegistration) {
      return NextResponse.json({ error: 'សិស្សដែលមានព័ត៌មានដូចគ្នានេះកំពុងរង់ចាំការអនុម័តរួចហើយ' }, { status: 400 });
    }

    const registration = await prisma.studentRegistration.create({
      data: {
        name: trimmedName,
        nameEn: nameEn?.trim() || null,
        phone: phone?.trim() || null,
        photoUrl: photoUrl || null,
        gender: gender || null,
        dateOfBirth: dateOfBirth || null,
        nationality: nationality?.trim() || null,
        wat: wat || null,
        kuti: kuti || null,
        kutiHead: kutiHead || null,
        parentName: parentName?.trim() || null,
        parentPhone: parentPhone?.trim() || null,
        academicYear: academicYear || null,
        educationLevel: educationLevel || null,
        grade: grade || null,
        notes: notes?.trim() || null,
        status: 'PENDING',
      },
    });

    return NextResponse.json({ id: registration.id }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'មានបញ្ហាក្នុងការបញ្ជូនទម្រង់' }, { status: 500 });
  }
}
