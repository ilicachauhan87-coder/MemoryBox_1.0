import { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  Heart, 
  Sparkles, 
  Calendar, 
  Gift, 
  Award,
  ArrowRight,
  Star
} from 'lucide-react';

interface HomeHeaderMockupsProps {
  userName?: string;
  userType: 'new' | 'returning';
}

export function HomeHeaderMockups({ userName = 'Sarah', userType = 'new' }: HomeHeaderMockupsProps) {
  const [greeting, setGreeting] = useState('Good Morning');
  const [emoji, setEmoji] = useState('☀️');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Good Morning');
      setEmoji('☀️');
    } else if (hour < 17) {
      setGreeting('Good Afternoon');
      setEmoji('🌤️');
    } else {
      setGreeting('Good Evening');
      setEmoji('🌙');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream via-white to-cream/50 p-4 sm:p-8 space-y-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl mb-2" style={{ fontWeight: 600 }}>
            Home Page Header Options
          </h1>
          <p className="text-muted-foreground">
            Compare different header designs for {userType === 'new' ? 'New Users' : 'Returning Users'}
          </p>
        </div>

        <div className="grid lg:grid-cols-1 gap-6">
          {/* Option 1: Clean & Minimal */}
          <Card className="memory-card border-2 border-violet/30 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-br from-violet/90 via-coral/80 to-aqua/90 text-white px-6 py-8 sm:py-10 relative overflow-hidden">
              {/* Decorative background */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/20 to-transparent"></div>
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
              </div>
              
              <div className="max-w-4xl mx-auto relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-full">
                    <Sparkles className="w-7 h-7 sm:w-8 sm:h-8" />
                  </div>
                  <div>
                    <h2 className="text-white text-2xl sm:text-3xl md:text-4xl" style={{ fontWeight: 600 }}>
                      {greeting}, {userName} {emoji}
                    </h2>
                    <p className="text-white/90 text-base sm:text-lg md:text-xl mt-1">
                      {userType === 'new' 
                        ? 'Welcome to your Family Vault 🌸'
                        : 'Building your family legacy, one memory at a time'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <CardContent className="p-6 bg-gradient-to-br from-violet/5 to-coral/5">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-violet/10 rounded-lg">
                  <Star className="w-5 h-5 text-violet" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg mb-1" style={{ fontWeight: 600 }}>
                    Option 1: Clean & Minimal
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Simple, elegant greeting with an inspiring tagline. No stats to overwhelm users.
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="border-violet/30">
                      ✓ Less cluttered
                    </Badge>
                    <Badge variant="outline" className="border-violet/30">
                      ✓ Calming
                    </Badge>
                    <Badge variant="outline" className="border-violet/30">
                      ✓ Elder-friendly
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Option 2: Upcoming Event Focus */}
          <Card className="memory-card border-2 border-aqua/30 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-br from-violet/90 via-coral/80 to-aqua/90 text-white px-6 py-8 sm:py-10 relative overflow-hidden">
              {/* Decorative background */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/20 to-transparent"></div>
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
              </div>
              
              <div className="max-w-4xl mx-auto relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-full">
                    <Heart className="w-7 h-7 sm:w-8 sm:h-8" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-white text-2xl sm:text-3xl md:text-4xl" style={{ fontWeight: 600 }}>
                      {greeting}, {userName} {emoji}
                    </h2>
                    <p className="text-white/90 text-base sm:text-lg md:text-xl mt-1">
                      {userType === 'new' 
                        ? 'Start capturing your family\'s precious moments today'
                        : 'Mom\'s birthday is in 5 days 🎂'}
                    </p>
                  </div>
                </div>

                {/* Upcoming Event Card */}
                {userType === 'returning' && (
                  <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-lg mt-4">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-coral/20 to-orange/20 rounded-lg">
                        <Gift className="w-6 h-6 text-coral" />
                      </div>
                      <div className="flex-1">
                        <p className="text-ink text-sm sm:text-base" style={{ fontWeight: 600 }}>
                          Upcoming: Mom's Birthday
                        </p>
                        <p className="text-muted-foreground text-xs sm:text-sm">
                          Friday, October 19 • 5 days away
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        className="bg-gradient-to-br from-coral to-orange-500 text-white hover:opacity-90"
                      >
                        Add Memory
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
            
            <CardContent className="p-6 bg-gradient-to-br from-aqua/5 to-blue/5">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-aqua/10 rounded-lg">
                  <Calendar className="w-5 h-5 text-aqua" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg mb-1" style={{ fontWeight: 600 }}>
                    Option 2: Upcoming Event Focus
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Shows next important family event (birthday/anniversary) with quick action. Creates urgency and emotional connection.
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="border-aqua/30">
                      ✓ Actionable
                    </Badge>
                    <Badge variant="outline" className="border-aqua/30">
                      ✓ Emotional reminder
                    </Badge>
                    <Badge variant="outline" className="border-aqua/30">
                      ✓ Contextual
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Option 3: Weekly Goal/Challenge */}
          <Card className="memory-card border-2 border-purple/30 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-br from-violet/90 via-coral/80 to-aqua/90 text-white px-6 py-8 sm:py-10 relative overflow-hidden">
              {/* Decorative background */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/20 to-transparent"></div>
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
              </div>
              
              <div className="max-w-4xl mx-auto relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-full">
                    <Award className="w-7 h-7 sm:w-8 sm:h-8" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-white text-2xl sm:text-3xl md:text-4xl" style={{ fontWeight: 600 }}>
                      {greeting}, {userName} {emoji}
                    </h2>
                    <p className="text-white/90 text-base sm:text-lg md:text-xl mt-1">
                      {userType === 'new' 
                        ? 'Let\'s build your family tree together'
                        : 'You\'re on a 3-day streak! 🔥'}
                    </p>
                  </div>
                </div>

                {/* Weekly Challenge Card */}
                <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg">
                        <Star className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-ink text-sm sm:text-base mb-1" style={{ fontWeight: 600 }}>
                          {userType === 'new' 
                            ? '🎯 Your Goal: Add 3 family members this week'
                            : '📸 This Week\'s Challenge: Share a childhood memory'}
                        </p>
                        <p className="text-muted-foreground text-xs sm:text-sm">
                          {userType === 'new'
                            ? '0 of 3 completed • Start with your parents or siblings'
                            : '2 of 3 memories shared • Keep going!'}
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        className="bg-gradient-to-br from-purple-600 to-pink-600 text-white hover:opacity-90"
                      >
                        {userType === 'new' ? 'Add Now' : 'Share'}
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            <CardContent className="p-6 bg-gradient-to-br from-purple-50 to-pink-50">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Award className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg mb-1" style={{ fontWeight: 600 }}>
                    Option 3: Weekly Goal/Challenge
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Gamified approach with weekly goals and progress tracking. Encourages ongoing engagement without overwhelming stats.
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="border-purple/30">
                      ✓ Motivating
                    </Badge>
                    <Badge variant="outline" className="border-purple/30">
                      ✓ Clear target
                    </Badge>
                    <Badge variant="outline" className="border-purple/30">
                      ✓ Progress shown
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recommendation Section */}
        <Card className="memory-card border-2 border-violet/20 shadow-xl mt-8">
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gradient-to-br from-violet/10 to-coral/10 rounded-full flex-shrink-0">
                <Sparkles className="w-6 h-6 text-violet" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl mb-3" style={{ fontWeight: 600 }}>
                  💡 My Recommendation
                </h3>
                <div className="space-y-3 text-sm sm:text-base">
                  <div className="p-4 bg-violet/5 rounded-lg border border-violet/20">
                    <p className="mb-2" style={{ fontWeight: 600 }}>
                      For New Users: <span className="text-violet">Option 1 - Clean & Minimal</span>
                    </p>
                    <p className="text-muted-foreground">
                      Keep it simple and welcoming. New users shouldn't be overwhelmed with stats when they haven't started yet. 
                      The inspiring tagline sets a positive tone.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-aqua/5 rounded-lg border border-aqua/20">
                    <p className="mb-2" style={{ fontWeight: 600 }}>
                      For Returning Users: <span className="text-aqua">Option 2 - Upcoming Event Focus</span>
                    </p>
                    <p className="text-muted-foreground">
                      Creates emotional connection by reminding users of important family events. The actionable "Add Memory" button 
                      provides clear next steps. Falls back to Option 1 when no events are upcoming.
                    </p>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-lg border border-purple/20">
                    <p className="mb-2" style={{ fontWeight: 600 }}>
                      Alternative: <span className="text-purple-700">Option 3 - Weekly Challenge</span>
                    </p>
                    <p className="text-muted-foreground">
                      Great for users who like gamification, but might feel too task-oriented for a family memory app. 
                      Better suited for younger, tech-savvy users.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
