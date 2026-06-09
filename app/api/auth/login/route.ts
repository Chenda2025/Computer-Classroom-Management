import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import bcrypt from 'bcrypt';
import { createToken } from '../../../../lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // For first time setup: if no user exists, create an admin user based on default input
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      if (email === 'admin@school.edu' && password === 'admin') {
        const hashedPassword = await bcrypt.hash('admin', 10);
        const newUser = await prisma.user.create({
          data: {
            email: 'admin@school.edu',
            password: hashedPassword,
            name: 'System Admin',
            role: 'ADMIN'
          }
        });
        const token = await createToken({ id: newUser.id, role: newUser.role, name: newUser.name, email: newUser.email });
        const cookieStore = await cookies();
        cookieStore.set('auth_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 8 });
        return NextResponse.json({ success: true, role: newUser.role });
      }
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = await createToken({ id: user.id, role: user.role, name: user.name, email: user.email });
    const cookieStore = await cookies();
    cookieStore.set('auth_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 });

    return NextResponse.json({ success: true, role: user.role });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
