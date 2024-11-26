// import { NextResponse } from 'next/server';
// import { getLemonSqueezy } from '@/lib/lemonsqueezy';

// export async function GET() {
//   try {
//     const lemonSqueezy = getLemonSqueezy();
    
//     const monthlyVariantId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_MONTHLY_VARIANT_ID!;
//     const yearlyVariantId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_YEARLY_VARIANT_ID!;

//     // Fetch variants in parallel
//     const [monthlyVariant, yearlyVariant] = await Promise.all([
//       lemonSqueezy.get(monthlyVariantId),
//       lemonSqueezy.getVariant(yearlyVariantId)
//     ]);

//     return NextResponse.json({
//       monthly: monthlyVariant.data.attributes.price / 100, // Convert cents to dollars
//       yearly: yearlyVariant.data.attributes.price / 100
//     });
//   } catch (error) {
//     console.error('Error fetching prices:', error);
//     return NextResponse.json(
//       { error: 'Failed to fetch prices' },
//       { status: 500 }
//     );
//   }
// }

