import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  getAllCourses,
  getCoursesBySemester,
  getCourseStats,
  createCourse,
} from "@/lib/db";

export async function GET(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = parseInt(String(session.user.id));
    const { searchParams } = new URL(request.url);
    const groupBy = searchParams.get("groupBy");
    const stats = searchParams.get("stats");

    if (stats === "true") {
      const courseStats = await getCourseStats(userId);
      return NextResponse.json(courseStats);
    }

    if (groupBy === "semester") {
      const grouped = await getCoursesBySemester(userId);
      return NextResponse.json(grouped);
    }

    const courses = await getAllCourses(userId);
    return NextResponse.json(courses);
  } catch (error) {
    console.error("Error fetching courses:", error);
    const { searchParams } = new URL(request.url);
    const stats = searchParams.get("stats");
    const groupBy = searchParams.get("groupBy");

    // Return empty fallback data instead of error to prevent UI crashes
    if (stats === "true") {
      return NextResponse.json({
        totalCredits: 0,
        totalHp: 0,
        gpa: 0,
        completedCourses: 0,
        inProgressCourses: 0,
        missingCourses: 0,
      });
    }

    if (groupBy === "semester") {
      return NextResponse.json({});
    }

    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = parseInt(String(session.user.id));
    const body = await request.json();
    const { name, credits, grade, hp, session: courseSession } = body;

    if (!name || credits === undefined || !courseSession) {
      return NextResponse.json(
        { error: "Name, credits, and session are required" },
        { status: 400 },
      );
    }

    const course = await createCourse(
      {
        name,
        credits: parseInt(credits),
        grade: grade || null,
        hp: hp ? parseInt(hp) : 0,
        session: courseSession,
      },
      userId,
    );

    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    console.error("Error creating course:", error);
    return NextResponse.json(
      { error: "Failed to create course" },
      { status: 500 },
    );
  }
}
