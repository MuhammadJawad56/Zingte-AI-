import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeAuthToken } from "@/lib/auth-tokens";
import { hashPassword } from "@/lib/auth";
import {
  handleRouteError,
  isErrorResponse,
  jsonError,
  parseBody,
} from "@/lib/api-helpers";
import { resetPasswordSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const data = await parseBody(request, resetPasswordSchema);
  if (isErrorResponse(data)) return data;

  try {
    const result = await consumeAuthToken(data.token, "PASSWORD_RESET");
    if (!result) {
      return jsonError("Invalid or expired reset link");
    }

    const passwordHash = await hashPassword(data.password);
    await prisma.user.update({
      where: { id: result.userId },
      data: { passwordHash },
    });

    return NextResponse.json({ message: "Password updated successfully" });
  } catch (error) {
    return handleRouteError(error, "Reset failed");
  }
}
