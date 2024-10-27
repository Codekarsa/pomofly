'use client'
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from 'lucide-react';
import Header from './Header';
import Footer from './Footer';
import AutoBacklink from './Autobacklink';
import { Switch } from "@/components/ui/switch";

export default function Pricing() {
  const [isYearly, setIsYearly] = useState(false);

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
      buttonText: "Current Plan"
    },
    {
      name: "Premium Plan",
      description: "For power users",
      price: { monthly: 2.99, yearly: 29.99 },
      features: [
        "Unlimited tasks",
        "Unlimited projects",
        "Unlimited AI Task Breakdowns"
      ],
      buttonText: "Upgrade to Premium"
    }
  ];

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
            />
            <span className={`ml-2 ${isYearly ? 'font-bold' : ''}`}>Yearly</span>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {plans.map((plan, index) => (
              <Card key={index}>
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
                        <Check className="mr-2 h-4 w-4" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full">{plan.buttonText}</Button>
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
