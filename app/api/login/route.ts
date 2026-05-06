import { NextResponse } from "next/server";

type LoginBody = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody;
    const email = body.email?.trim() ?? "";
    const password = body.password?.trim() ?? "";

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required." },
        { status: 400 },
      );
    }

    // Sample backend credentials for development.
    const sampleUser = {
      email: "admin@coredesk.com",
      password: "Coredesk@123",
      name: "Coredesk Admin",
    };

    if (email !== sampleUser.email || password !== sampleUser.password) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password." },
        { status: 401 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Login successful.",
        user: { email: sampleUser.email, name: sampleUser.name },
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request body." },
      { status: 400 },
    );
  }
}
