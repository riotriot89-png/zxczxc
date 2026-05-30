import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getUserByUsername, createUser } from '@/lib/store';
import { signToken } from '@/lib/auth';
import { User } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Vui lòng nhập đầy đủ thông tin' }, { status: 400 });
    }

    if (username.length < 3 || username.length > 20) {
      return NextResponse.json({ error: 'Tên đăng nhập phải từ 3-20 ký tự' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Mật khẩu phải ít nhất 6 ký tự' }, { status: 400 });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json({ error: 'Tên đăng nhập chỉ được dùng chữ, số và dấu gạch dưới' }, { status: 400 });
    }

    const existing = getUserByUsername(username);
    if (existing) {
      return NextResponse.json({ error: 'Tên đăng nhập đã tồn tại' }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user: User = {
      id: uuidv4(),
      username,
      password: hashed,
      isAdmin: false,
      createdAt: Date.now(),
      wins: 0,
      gamesPlayed: 0,
    };

    createUser(user);

    const token = signToken({ id: user.id, username: user.username, isAdmin: user.isAdmin });

    const res = NextResponse.json({ 
      user: { id: user.id, username: user.username, isAdmin: user.isAdmin },
      token 
    });

    res.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
