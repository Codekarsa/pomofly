'use client'
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from 'lucide-react';
import Header from './Header';
import Footer from './Footer';
import AutoBacklink from './Autobacklink';
import { Switch } from "@/components/ui/switch";
import { useSubscription } from '@/hooks/useSubscription';
import { initiateUpgrade } from '@/lib/upgrade';
import { useToast } from '@/hooks/use-toast';

export default function Pricing() {
  const [isYearly, setIsYearly] = useState(false);
  const { subscription, isPremium } = useSubscription();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const plans = [
    {
      name: "Free Plan",
      description: "Great for getting started",
      price: { monthly: 0, yearly: 0 },
      features: [
        "Unlimited tasks",
        "Unlimited projects",
        "5 AI Task Breakdowns per month"
      ],
      buttonText: "Current Plan",
      type: "free"
    },
    {
      name: "Premium Plan",
      description: "For power users",
      price: { 
        monthly: 2.99,
        yearly: 29.99
      },
      features: [
        "Unlimited tasks",
        "Unlimited projects",
        "Unlimited AI Task Breakdowns"
      ],
      buttonText: "Upgrade to Premium",
      type: "premium"
    }
  ];

  const handleUpgrade = async () => {
    if (!subscription) {
      toast({
        title: "Error",
        description: "Please sign in to upgrade your plan",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await initiateUpgrade(isYearly);
    } catch (error) {
      console.error('Error during upgrade:', error);
      toast({
        title: "Error",
        description: "Failed to initiate upgrade. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonProps = (plan: typeof plans[0]) => {
    if (plan.type === "free") {
      return {
        onClick: undefined,
        disabled: true,
        children: isPremium() ? "Free Plan" : "Current Plan"
      };
    }

    return {
      onClick: handleUpgrade,
      disabled: isPremium() || isLoading,
      children: isLoading 
        ? "Processing..." 
        : isPremium() 
          ? "Current Plan" 
          : plan.buttonText
    };
  };

  return (
    <>
      <div className="flex flex-col min-h-screen">
        <Header/>
        <main className="flex-grow container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-8 text-center">Choose Your Plan</h1>
          
          <div className="flex justify-center items-center mb-8">
            <span className={`mr-2 ${!isYearly ? 'font-bold' : ''}`}>Monthly</span>
            <Switch
              checked={isYearly}
              onCheckedChange={setIsYearly}
              disabled={isLoading}
            />
            <span className={`ml-2 ${isYearly ? 'font-bold' : ''}`}>Yearly</span>
            {isYearly && (
              <span className="ml-4 text-sm text-green-600">
                Save {Math.round((1 - plans[1].price.yearly / (plans[1].price.monthly * 12)) * 100)}%
              </span>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {plans.map((plan, index) => (
              <Card key={index} className={isPremium() && plan.type === "premium" ? "border-primary" : ""}>
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <span className="text-3xl font-bold">
                      ${isYearly ? plan.price.yearly : plan.price.monthly}
                    </span>
                    {plan.price.monthly > 0 && (
                      <span className="text-muted-foreground">
                        /{isYearly ? 'year' : 'month'}
                      </span>
                    )}
                  </div>
                  <ul className="space-y-2">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <Check className="mr-2 h-4 w-4 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full"
                    {...getButtonProps(plan)}
                  >
                    {getButtonProps(plan).children}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </main>
        <Footer />
      </div>
      <AutoBacklink />
    </>
  );
}
