import { NextRequest, NextResponse } from "next/server";
import { lemonSqueezyApiInstance } from "@/lib/axios";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    
    const reqData = await req.json();

    if (!reqData.productId) {
      console.error("Product ID is missing");
      return NextResponse.json({ message: "Product ID is required" }, { status: 400 });
    }
    // Log sebelum request API LemonSqueezy
   
    const response = await lemonSqueezyApiInstance.post("/checkouts", {
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            custom: {
              user_id: "123",
            },
          },
        },
        relationships: {
          store: {
            data: {
              type: "stores",
              id: process.env.LEMON_SQUEEZY_STORE_ID?.toString(),
            },
          },
          variant: {
            data: {
              type: "variants",
              id: reqData.productId.toString(),
            },
          },
        },
      },
    });

    const checkoutUrl = response.data.data.attributes.url;
    console.log(response.data);
    return NextResponse.json({ checkoutUrl });
  } catch (error) {
    console.error("Error in POST /api/lemonsqueezy:", error);
    return NextResponse.json({ message: "An error occured" }, { status: 500 });
  }
}