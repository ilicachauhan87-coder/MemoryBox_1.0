import { useState } from 'react';
import { ArrowLeft, Baby, Heart, Calendar, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

interface JourneySelectionPageProps {
  onNavigate: (page: string, journeyType?: string) => void;
  onBack?: () => void;
}

const JOURNEYS = [
  {
    id: 'pregnancy',
    title: 'Pregnancy & New Parents',
    subtitle: 'From pregnancy to baby\'s second birthday',
    description: 'Track your beautiful journey through pregnancy, birth, and your baby\'s first precious years',
    icon: Baby,
    gradient: 'from-pink-100 to-rose-200',
    iconGradient: 'from-pink-500 to-rose-500',
    duration: '27 months',
    memoryCount: '50+ milestones',
    milestones: [
      'Pregnancy Announcement',
      'First Ultrasound',
      'Godh Bharai Ceremony',
      'Baby\'s Birth',
      'Naming Ceremony',
      'First Smile'
    ]
  },
  {
    id: 'couple',
    title: 'Love to Marriage',
    subtitle: 'From courtship to honeymoon',
    description: 'Capture your beautiful love story from the first meeting to your honeymoon and beyond',
    icon: Heart,
    gradient: 'from-purple-100 to-pink-200',
    iconGradient: 'from-purple-500 to-pink-500',
    duration: '12-24 months',
    memoryCount: '40+ milestones',
    milestones: [
      'How We First Met',
      'Meeting the Family',
      'Engagement Ceremony',
      'Mehendi & Sangeet',
      'Wedding Day',
      'Honeymoon'
    ]
  }
];

export function JourneySelectionPage({ onNavigate, onBack }: JourneySelectionPageProps) {
  const [selectedJourney, setSelectedJourney] = useState<string | null>(null);

  const handleJourneyStart = (journeyId: string) => {
    if (journeyId === 'pregnancy') {
      onNavigate('pregnancy-journey');
    } else if (journeyId === 'couple') {
      onNavigate('couple-journey');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet via-violet/90 to-coral text-white px-4 py-8 sm:px-6">
        <div className="max-w-4xl mx-auto">
          {onBack && (
            <Button
              variant="ghost"
              onClick={onBack}
              className="text-white hover:bg-white/10 mb-4 -ml-2 touch-manipulation"
              style={{ minHeight: '44px' }}
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
          )}
          
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-white" style={{ fontSize: '2rem', fontWeight: 600, lineHeight: 1.3 }}>
                Life Journeys
              </h1>
              <p className="text-cream/90 mt-1" style={{ fontSize: '1.125rem' }}>
                Choose your journey and start capturing precious moments
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Journey Cards */}
      <div className="max-w-4xl mx-auto px-3 py-4 sm:px-6 sm:py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {JOURNEYS.map((journey) => {
            const isSelected = selectedJourney === journey.id;
            const Icon = journey.icon;

            return (
              <Card
                key={journey.id}
                className={`overflow-hidden cursor-pointer transition-all duration-300 ${
                  isSelected
                    ? 'ring-4 ring-violet shadow-2xl scale-[1.02]'
                    : 'hover:shadow-xl hover:scale-[1.01]'
                }`}
                onClick={() => setSelectedJourney(journey.id)}
              >
                {/* Card Header with Gradient */}
                <div className={`p-5 sm:p-8 bg-gradient-to-br ${journey.gradient}`}>
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className={`p-3 sm:p-4 rounded-2xl bg-gradient-to-br ${journey.iconGradient} shadow-lg`}>
                      <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                    </div>
                    {isSelected && (
                      <Badge className="bg-violet text-white animate-pulse text-sm sm:text-base">
                        Selected
                      </Badge>
                    )}
                  </div>

                  <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-2">
                    {journey.title}
                  </h2>
                  <p className="text-muted-foreground text-base sm:text-lg mb-3 sm:mb-4">
                    {journey.subtitle}
                  </p>
                  <p className="text-foreground/80 text-sm sm:text-base leading-relaxed">
                    {journey.description}
                  </p>
                </div>

                {/* Card Body */}
                <div className="p-4 sm:p-6 bg-white">
                  {/* Stats */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
                    <Badge variant="outline" className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 text-sm sm:text-base">
                      <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="text-xs sm:text-sm">{journey.duration}</span>
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 text-sm sm:text-base">
                      <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="text-xs sm:text-sm">{journey.memoryCount}</span>
                    </Badge>
                  </div>

                  {/* Milestone Preview */}
                  <div className="mb-4 sm:mb-6">
                    <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground mb-2 sm:mb-3 uppercase tracking-wide">
                      Featured Milestones
                    </h3>
                    <div className="space-y-1.5 sm:space-y-2">
                      {journey.milestones.map((milestone, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 text-sm sm:text-base text-foreground/80"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-violet mt-1.5 shrink-0" />
                          <span className="leading-snug">{milestone}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Start Button */}
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleJourneyStart(journey.id);
                    }}
                    className={`w-full h-12 sm:h-14 text-base sm:text-lg vibrant-button text-white ${
                      isSelected ? 'animate-pulse' : ''
                    }`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      Start This Journey
                      <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    </span>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Info Box */}
        <Card className="mt-6 sm:mt-8 p-4 sm:p-6 bg-gradient-to-br from-aqua/10 to-aqua/5 border-aqua/20">
          <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
            <div className="p-2.5 sm:p-3 bg-aqua/20 rounded-xl shrink-0">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-aqua" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-1.5 sm:mb-2">
                What are Life Journeys?
              </h3>
              <p className="text-sm sm:text-base text-foreground/80 leading-relaxed">
                Life Journeys guide you through important life stages with personalized milestone prompts. 
                Each journey is designed to help you capture memories at the right moments, with cultural 
                context for Indian family traditions. Track your progress, add custom milestones, and 
                never miss a precious moment.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
