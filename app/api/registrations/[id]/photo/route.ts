import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { getSession } from '../../../../../lib/auth';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new NextResponse('Unauthorized', { status: 401 });

  try {
    const { id } = await params;
    const registration = await prisma.studentRegistration.findUnique({
      where: { id },
      select: { photoUrl: true }
    });

    if (!registration || !registration.photoUrl || !registration.photoUrl.startsWith('data:image')) {
      return new NextResponse('Not Found', { status: 404 });
    }

    // Extract base64 data
    const matches = registration.photoUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!matches) return new NextResponse('Invalid Image Data', { status: 400 });

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch (error) {
    console.error(error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
