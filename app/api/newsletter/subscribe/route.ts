import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Settings from "@/models/Settings";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    await dbConnect();

    // Store subscribers as a Settings entry (array of emails)
    const existing = await Settings.findOne({ key: "newsletter_subscribers" });

    if (existing) {
      const subscribers = (existing.value as string[]) || [];
      if (subscribers.includes(email.toLowerCase())) {
        return NextResponse.json({ message: "Already subscribed" }, { status: 200 });
      }
      subscribers.push(email.toLowerCase());
      existing.value = subscribers;
      await existing.save();
    } else {
      await Settings.create({
        key: "newsletter_subscribers",
        value: [email.toLowerCase()],
        category: "marketing",
        description: "Newsletter subscriber email list",
        isPublic: false,
      });
    }

    return NextResponse.json({ message: "Subscribed successfully" }, { status: 200 });
  } catch (error) {
    console.error("Newsletter subscribe error:", error);
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }
}
