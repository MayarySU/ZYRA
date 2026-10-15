import { NextResponse } from "next/server";
import { getPresignedDownloadUrl } from "@/lib/r2";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { key } = body;

    if (!key) {
      return NextResponse.json({ error: "key es requerido" }, { status: 400 });
    }

    const url = await getPresignedDownloadUrl(key);
    return NextResponse.json({ url }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
