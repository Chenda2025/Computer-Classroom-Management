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

    const registration = await prisma.studentRegistration.create({
      data: {
        name: name.trim(),
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
