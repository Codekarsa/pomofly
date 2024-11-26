import { useState } from 'react';
import { Button } from "@/components/ui/button";
import axios from "axios";

interface PurchaseButtonProps {
  isYearly?: boolean;
  className?: string;
  disabled?: boolean;
}

export function PurchaseButton({ isYearly = false, className }: PurchaseButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handlePurchase = async () => {
    setIsLoading(true);
    try {
      const productId = isYearly 
        ? process.env.NEXT_PUBLIC_LEMON_SQUEEZY_YEARLY_VARIANT_ID 
        : process.env.NEXT_PUBLIC_LEMON_SQUEEZY_MONTHLY_VARIANT_ID;

      const response = await axios.post("/api/lemonsqueezy", {
        productId: productId,
      });

      if (response.data && response.data.checkoutUrl) {
        window.open(response.data.checkoutUrl, "_blank");
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error('Purchase error:', error);
      alert(`Failed to initiate ${isYearly ? 'yearly' : 'monthly'} purchase`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handlePurchase} 
      disabled={isLoading}
      className={className}
    >
      {isLoading ? 'Processing...' : `Buy ${isYearly ? 'Yearly' : 'Monthly'} Plan`}
    </Button>
  );
}
