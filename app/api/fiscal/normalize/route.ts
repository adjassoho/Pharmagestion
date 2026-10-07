import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase/client";

function errorResponse(message: string, status: number, code: string, retryable = false) {
  return NextResponse.json({ success: false, error: message, code, retryable }, { status });
}

export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return errorResponse("La synchronisation cloud n'est pas configurée.", 503, "SUPABASE_NOT_CONFIGURED", true);
    }

    const authorization = req.headers.get("authorization");
    const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!accessToken) {
      return errorResponse("Session Supabase requise.", 401, "AUTH_REQUIRED");
    }

    const body = await req.json();
    const { saleId, totalCents, taxAmountCents, items, organizationId, ifu, operatorName } = body;
    if (
      typeof saleId !== "string" ||
      !saleId ||
      !Number.isInteger(totalCents) ||
      totalCents <= 0 ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return errorResponse("Données de facture e-MECeF invalides.", 400, "INVALID_INVOICE");
    }

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: "Bearer " + accessToken } },
      },
    );

    const { data: authData, error: authError } = await userClient.auth.getUser(accessToken);
    if (authError || !authData.user) {
      return errorResponse("Session Supabase invalide ou expirée.", 401, "AUTH_INVALID");
    }

    const { data: profile, error: profileError } = await userClient
      .from("profiles")
      .select("organization_id, is_active")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (profileError || !profile || profile.is_active === false) {
      return errorResponse("Profil utilisateur non autorisé.", 403, "PROFILE_INVALID");
    }
    if (organizationId && organizationId !== profile.organization_id) {
      return errorResponse("La facture appartient à une autre organisation.", 403, "ORG_MISMATCH");
    }

    const apiUrl = process.env.MECEF_API_URL?.trim();
    const apiToken = process.env.MECEF_API_TOKEN?.trim();
    const nim = process.env.MECEF_NIM?.trim();
    const ifuNumber = (ifu || process.env.MECEF_IFU)?.trim();

    if (!apiUrl || !apiToken || !nim || !ifuNumber) {
      return errorResponse(
        "Les paramètres e-MECeF DGI ne sont pas configurés. La facture reste provisoire.",
        503,
        "MECEF_NOT_CONFIGURED",
        true,
      );
    }

    let dgiResponse: Response;
    try {
      dgiResponse = await fetch(apiUrl.replace(/\/$/, "") + "/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + apiToken,
        },
        body: JSON.stringify({
          ifu: ifuNumber,
          nim,
          type: "FV",
          operatorName: operatorName || authData.user.email || "Caissier PharmaPlus",
          total: totalCents,
          taxAmount: taxAmountCents,
          items: items.map((item: Record<string, unknown>) => ({
            name: item.product_name || item.name,
            price: item.unit_price_cents || item.price,
            quantity: item.quantity || item.qty,
            taxGroup: item.tax_group || "B",
          })),
        }),
      });
    } catch (err) {
      return errorResponse(
        err instanceof Error ? err.message : "Service e-MECeF indisponible.",
        503,
        "MECEF_NETWORK_ERROR",
        true,
      );
    }

    const dgiData = await dgiResponse.json().catch(() => null);
    if (!dgiResponse.ok) {
      return errorResponse(
        dgiData?.message || dgiData?.error || ("Réponse DGI HTTP " + dgiResponse.status + "."),
        dgiResponse.status >= 500 ? 503 : 422,
        "MECEF_DGI_REJECTED",
        dgiResponse.status >= 500,
      );
    }

    const result = {
      nim: dgiData?.nim || nim,
      counters: dgiData?.counters,
      dateTime: dgiData?.dateTime,
      signature: dgiData?.signature,
      qrCode: dgiData?.qrCodeData || dgiData?.qrCode,
    };
    if (!result.counters || !result.dateTime || !result.signature || !result.qrCode) {
      return errorResponse("Réponse DGI incomplète.", 502, "MECEF_INVALID_RESPONSE", true);
    }

    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error("[MECEF NORMALIZE API ERROR]", err);
    return errorResponse(
      err instanceof Error ? err.message : "Erreur interne de normalisation fiscale.",
      500,
      "MECEF_INTERNAL_ERROR",
      true,
    );
  }
}
