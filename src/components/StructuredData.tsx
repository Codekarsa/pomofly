export default function StructuredData() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Pomofly",
    "description": "An elegant and minimal Pomodoro timer for productive focus sessions with task management and AI-powered task breakdown.",
    "url": process.env.NEXT_PUBLIC_BASE_URL || "https://pomofly.com",
    "applicationCategory": "ProductivityApplication",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "creator": {
      "@type": "Organization",
      "name": "Pomofly Team"
    },
    "featureList": [
      "Pomodoro Timer",
      "Task Management", 
      "Project Organization",
      "AI-Powered Task Breakdown",
      "Progress Tracking",
      "Focus Sessions"
    ],
    "softwareVersion": "1.0.0",
    "datePublished": "2024-01-01",
    "inLanguage": "en-US"
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}