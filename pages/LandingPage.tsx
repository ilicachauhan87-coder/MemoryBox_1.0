import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Heart, TreePine, Camera, Mic, Users, Shield, Clock, Star, ArrowRight, Gift, BookOpen, Sparkles, Lock, Smartphone, Share, MapPin, Video, PlayCircle, Crown } from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

const LandingPage = () => {
  const navigate = useNavigate();
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const onGetStarted = () => {
    navigate('/signup');
  };

  const onSignIn = () => {
    navigate('/signin');
  };

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  // Benefits Array (6 items)
  const benefits = [
    {
      icon: Shield,
      title: 'Sacred & Private',
      description: 'Your memories are safe in a secure, invite-only vault — away from social media noise and unwanted exposure.',
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      icon: Heart,
      title: 'Simple for Everyone',
      description: 'From grandparents to grandchildren — an experience designed to feel natural for all ages.',
      color: 'text-coral',
      bgColor: 'bg-coral/10'
    },
    {
      icon: Smartphone,
      title: 'Your Data, Download Anytime',
      description: 'Your memories are always yours — export and keep them safely, no matter where life takes you.',
      color: 'text-violet',
      bgColor: 'bg-violet/10'
    },
    {
      icon: Mic,
      title: 'Voices That Never Fade',
      description: 'Preserve the voices, blessings, and stories of loved ones forever — as if they were spoken just yesterday.',
      color: 'text-aqua',
      bgColor: 'bg-aqua/10'
    },
    {
      icon: Share,
      title: 'Share Moments Your Way',
      description: 'You decide who sees each memory — private by default, but share special moments instantly to WhatsApp or social media when you wish.',
      color: 'text-secondary',
      bgColor: 'bg-secondary/10'
    },
    {
      icon: TreePine,
      title: 'Your Story, Beautifully Woven',
      description: 'Every photo, video, and voice note connects into your family tree, creating a living story for generations.',
      color: 'text-ink',
      bgColor: 'bg-ink/10'
    }
  ];

  // Testimonials Array (3 items)
  const testimonials = [
    {
      name: 'Sita Devi',
      age: '78 years',
      relation: 'Grandmother',
      text: 'Finally, a place where I can share my stories with my grandchildren. They live so far away, but now they hear my voice every day.',
      avatar: 'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=100&h=100&fit=crop&crop=face',
      location: 'Jaipur, Rajasthan'
    },
    {
      name: 'Priya Sharma',
      age: '45 years',
      relation: 'Mother',
      text: 'I can finally organize our family recipes and traditions in one place. My daughter will never lose our family heritage.',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b77c?w=100&h=100&fit=crop&crop=face',
      location: 'Mumbai, Maharashtra'
    },
    {
      name: 'Rahul Gupta',
      age: '32 years',
      relation: 'Son',
      text: "This app helped me record my father's last conversations. Now my children will know their grandfather through his own words.",
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
      location: 'Bangalore, Karnataka'
    }
  ];

  // Stats Array (4 items)
  const stats = [
    { number: '50,000+', label: 'Families Connected', icon: Users, color: 'text-aqua' },
    { number: '2M+', label: 'Memories Preserved', icon: Heart, color: 'text-coral' },
    { number: '15+', label: 'Countries', icon: TreePine, color: 'text-primary' },
    { number: '4.9★', label: 'App Rating', icon: Star, color: 'text-secondary' }
  ];

  return (
    <div className="min-h-screen bg-background vibrant-texture">
      {/* SECTION 1: HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-coral/5 to-aqua/10 pt-16 pb-20">
        {/* Background Image Layer */}
        <div className="absolute inset-0 opacity-20">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&h=600&fit=crop&crop=center"
            alt="Family together"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Content Layer */}
        <div className="relative z-10 px-4 text-center space-y-8">
          {/* Logo & Branding Section */}
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="flex items-center space-x-4">
                <div className="p-4 bg-primary/20 rounded-full hero-float">
                  <Heart className="w-16 h-16 text-primary" />
                </div>
                <span className="text-primary text-4xl font-semibold tracking-wide">MemoryBox</span>
              </div>
            </div>
            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl text-primary max-w-4xl mx-auto text-[36px]">
                Your Family's Sacred Digital Memory Vault
              </h1>
              <p className="text-2xl text-muted-foreground max-w-3xl mx-auto text-[20px]">
                Preserve precious moments, stories, and wisdom for generations. 
                A private space where your family's heritage lives forever.
              </p>
            </div>
          </div>

          {/* CTA Buttons Section */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              onClick={onGetStarted}
              className="vibrant-button text-primary-foreground text-xl px-6 sm:px-8 py-4 h-auto w-full sm:w-auto"
            >
              <Sparkles className="w-6 h-6 mr-2 flex-shrink-0" />
              <span className="whitespace-normal text-center">Start Your Family Vault - Free</span>
            </Button>
            <Button 
              onClick={onSignIn}
              variant="outline"
              className="border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground text-xl px-6 sm:px-8 py-4 h-auto w-full sm:w-auto"
            >
              <span className="whitespace-normal text-center">Already Have an Account? Sign In</span>
            </Button>
          </div>

          {/* Feature Pills Section */}
          <div className="flex items-center justify-center space-x-6 pt-8 flex-wrap gap-y-4">
            <div className="text-center">
              <p className="text-3xl font-semibold text-primary">Free Starter</p>
              <p className="text-muted-foreground">Access</p>
            </div>
            <div className="w-px h-12 bg-border hidden sm:block"></div>
            <div className="text-center">
              <p className="text-3xl font-semibold text-coral">Private</p>
              <p className="text-muted-foreground">& Secure</p>
            </div>
            <div className="w-px h-12 bg-border hidden sm:block"></div>
            <div className="text-center">
              <p className="text-3xl font-semibold text-aqua">Elder</p>
              <p className="text-muted-foreground">Friendly</p>
            </div>
            <div className="w-px h-12 bg-border hidden sm:block"></div>
            <div className="text-center">
              <p className="text-3xl font-semibold text-violet">Your Data</p>
              <p className="text-muted-foreground">Download Anytime</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: SIGNATURE FEATURES (6 Feature Cards) */}
      <section className="py-16 px-4 bg-gradient-to-br from-background to-muted/20">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Section Header */}
          <div className="text-center space-y-4">
            <h2 className="text-4xl text-primary">Signature Features That Make Memory Vault Special</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Built for Families, Designed for Generations
            </p>
          </div>

          {/* Feature Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1: Elders' Voices */}
            <Card 
              className="memory-card hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 cursor-pointer"
              onClick={onGetStarted}
            >
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center">
                  <Mic className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-medium text-primary mb-2">🎙 Elders' Voices</h3>
                  <p className="text-lg text-amber-700 mb-3">Hear blessings anytime</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Record voice messages from elders. Their blessings and stories live forever.
                  </p>
                </div>
                <div className="bg-amber-100 rounded-lg p-3">
                  <p className="text-xs text-amber-800 italic">
                    "Papa's advice" • "Nani's lullabies"
                  </p>
                </div>
                <Button 
                  onClick={onGetStarted}
                  variant="outline" 
                  size="sm"
                  className="border-amber-400 text-amber-700 hover:bg-amber-400 hover:text-white"
                >
                  Start Recording
                </Button>
              </CardContent>
            </Card>

            {/* Feature 2: Family Tree */}
            <Card 
              className="memory-card hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 cursor-pointer"
              onClick={onGetStarted}
            >
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center">
                  <TreePine className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-medium text-primary mb-2">🌳 Family Tree</h3>
                  <p className="text-lg text-emerald-700 mb-3">Your family, beautifully connected</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Interactive family tree with memories attached to each person.
                  </p>
                </div>
                <div className="bg-emerald-100 rounded-lg p-3">
                  <p className="text-xs text-emerald-800 italic">
                    "Grandpa's wedding photos" • "Dad's stories"
                  </p>
                </div>
                <Button 
                  onClick={onGetStarted}
                  variant="outline" 
                  size="sm"
                  className="border-emerald-400 text-emerald-700 hover:bg-emerald-400 hover:text-white"
                >
                  Build Tree
                </Button>
              </CardContent>
            </Card>

            {/* Feature 3: Time Capsule */}
            <Card 
              className="memory-card hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 cursor-pointer"
              onClick={onGetStarted}
            >
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center">
                  <Clock className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-medium text-primary mb-2">🕰 Time Capsule</h3>
                  <p className="text-lg text-purple-700 mb-3">Unlock surprises on special dates</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Schedule messages to unlock on birthdays and anniversaries.
                  </p>
                </div>
                <div className="bg-purple-100 rounded-lg p-3">
                  <p className="text-xs text-purple-800 italic">
                    "Dad's 18th birthday message" • "Anniversary surprise"
                  </p>
                </div>
                <Button 
                  onClick={onGetStarted}
                  variant="outline" 
                  size="sm"
                  className="border-purple-400 text-purple-700 hover:bg-purple-400 hover:text-white"
                >
                  Create Capsule
                </Button>
              </CardContent>
            </Card>

            {/* Feature 4: Cultural Heritage Hub */}
            <Card 
              className="memory-card hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden bg-gradient-to-br from-red-50 to-orange-50 border-red-200 cursor-pointer"
              onClick={onGetStarted}
            >
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-red-600 to-orange-600 rounded-2xl flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-medium text-primary mb-2">🌏 Cultural Heritage Hub</h3>
                  <p className="text-lg text-red-700 mb-3">Preserve traditions, pass them on</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Organize family traditions, cultural rituals, and festivals in one place.
                  </p>
                </div>
                <div className="bg-red-100 rounded-lg p-3">
                  <p className="text-xs text-red-800 italic">
                    "Diwali recipes" • "Christmas traditions"
                  </p>
                </div>
                <Button 
                  onClick={onGetStarted}
                  variant="outline" 
                  size="sm"
                  className="border-red-400 text-red-700 hover:bg-red-400 hover:text-white"
                >
                  Start Heritage
                </Button>
              </CardContent>
            </Card>

            {/* Feature 5: Festival & Milestone Reminders */}
            <Card 
              className="memory-card hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-200 cursor-pointer"
              onClick={onGetStarted}
            >
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center">
                  <Gift className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-medium text-primary mb-2">🎉 Festival & Milestone Reminders</h3>
                  <p className="text-lg text-cyan-700 mb-3">Never miss a family moment</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Track birthdays, anniversaries, and festivals with smart reminders.
                  </p>
                </div>
                <div className="bg-cyan-100 rounded-lg p-3">
                  <p className="text-xs text-cyan-800 italic">
                    "Papa's birthday" • "Diwali celebration"
                  </p>
                </div>
                <Button 
                  onClick={onGetStarted}
                  variant="outline" 
                  size="sm"
                  className="border-cyan-400 text-cyan-700 hover:bg-cyan-400 hover:text-white"
                >
                  Set Reminders
                </Button>
              </CardContent>
            </Card>

            {/* Feature 6: Memory Journeys */}
            <Card 
              className="memory-card hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden bg-gradient-to-br from-rose-50 to-pink-50 border-rose-200 cursor-pointer"
              onClick={onGetStarted}
            >
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-rose-500 to-pink-500 rounded-2xl flex items-center justify-center">
                  <MapPin className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-medium text-primary mb-2">📖 Memory Journeys</h3>
                  <p className="text-lg text-rose-700 mb-3">Stories told over time</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Create timeline stories combining memories across years into journeys.
                  </p>
                </div>
                <div className="bg-rose-100 rounded-lg p-3">
                  <p className="text-xs text-rose-800 italic">
                    "Aarav's childhood" • "Our Diwali years"
                  </p>
                </div>
                <Button 
                  onClick={onGetStarted}
                  variant="outline" 
                  size="sm"
                  className="border-rose-400 text-rose-700 hover:bg-rose-400 hover:text-white"
                >
                  Create Journey
                </Button>
              </CardContent>
            </Card>

            {/* Feature 7: Personal Journal */}
            <Card 
              className="memory-card hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200 cursor-pointer"
              onClick={onGetStarted}
            >
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-medium text-primary mb-2">📔 Personal Journal</h3>
                  <p className="text-lg text-indigo-700 mb-3">Your thoughts, your way</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Daily reflections with mood tracking, tags, and the option to share entries with loved ones.
                  </p>
                </div>
                <div className="bg-indigo-100 rounded-lg p-3">
                  <p className="text-xs text-indigo-800 italic">
                    "Today's blessings" • "Weekly gratitude"
                  </p>
                </div>
                <Button 
                  onClick={onGetStarted}
                  variant="outline" 
                  size="sm"
                  className="border-indigo-400 text-indigo-700 hover:bg-indigo-400 hover:text-white"
                >
                  Start Journaling
                </Button>
              </CardContent>
            </Card>

            {/* Feature 8: Life Journey */}
            <Card 
              className="memory-card hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden bg-gradient-to-br from-fuchsia-50 to-purple-50 border-fuchsia-200 cursor-pointer"
              onClick={onGetStarted}
            >
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-fuchsia-500 to-purple-600 rounded-2xl flex items-center justify-center">
                  <Heart className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-medium text-primary mb-2">💝 Life Journey</h3>
                  <p className="text-lg text-fuchsia-700 mb-3">Guided milestone experiences</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Special journeys for pregnancy, marriage, and life's beautiful chapters.
                  </p>
                </div>
                <div className="bg-fuchsia-100 rounded-lg p-3">
                  <p className="text-xs text-fuchsia-800 italic">
                    "Pregnancy journey" • "Love to marriage"
                  </p>
                </div>
                <Button 
                  onClick={onGetStarted}
                  variant="outline" 
                  size="sm"
                  className="border-fuchsia-400 text-fuchsia-700 hover:bg-fuchsia-400 hover:text-white"
                >
                  Begin Journey
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Post-Features CTA */}
          <div className="text-center pt-8">
            <Button 
              onClick={onGetStarted}
              className="vibrant-button text-primary-foreground text-xl px-6 sm:px-8 py-4 h-auto w-full sm:w-auto max-w-md mx-auto"
            >
              <Sparkles className="w-6 h-6 mr-2 flex-shrink-0" />
              <span className="whitespace-normal">Try All Features Free</span>
            </Button>
          </div>
        </div>
      </section>

      {/* SECTION 3: INTERACTIVE FAMILY TREE PREVIEW */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto text-center space-y-12">
          {/* Section Header */}
          <div className="space-y-4">
            <h2 className="text-4xl text-primary">See Your Family Tree Come to Life</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Watch how your family connections grow and memories multiply across generations
            </p>
          </div>

          {/* Tree Visualization Card */}
          <Card className="memory-card p-4 md:p-8 bg-gradient-to-br from-cream to-background relative overflow-visible">
            {/* SVG Connection Lines - DESKTOP VIEW */}
            <svg className="hidden md:block absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
              <defs>
                <linearGradient id="coupleLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(255, 105, 135, 0.8)" />
                  <stop offset="50%" stopColor="rgba(255, 20, 147, 1)" />
                  <stop offset="100%" stopColor="rgba(255, 105, 135, 0.8)" />
                </linearGradient>
              </defs>
              
              {/* COUPLE CONNECTIONS (RED/PINK) - Horizontal lines */}
              {/* Dada ━━━ Dadi (Paternal Grandparents) */}
              <line x1="12.5%" y1="8%" x2="37.5%" y2="8%" stroke="url(#coupleLineGradient)" strokeWidth="3" />
              
              {/* Nana ━━━ Nani (Maternal Grandparents) */}
              <line x1="62.5%" y1="8%" x2="87.5%" y2="8%" stroke="url(#coupleLineGradient)" strokeWidth="3" />
              
              {/* Papa ━━━ Mummy (Parents) */}
              <line x1="40%" y1="45%" x2="60%" y2="45%" stroke="url(#coupleLineGradient)" strokeWidth="3" />
              
              {/* You ━━━ Partner */}
              <line x1="37.5%" y1="72%" x2="62.5%" y2="72%" stroke="url(#coupleLineGradient)" strokeWidth="3" />
              
              {/* T-SHAPED PARENT-CHILD CONNECTIONS (BLACK) */}
              {/* Dada-Dadi couple → Papa */}
              <line x1="25%" y1="8%" x2="25%" y2="30%" stroke="rgba(34, 34, 59, 0.9)" strokeWidth="3" />
              <line x1="25%" y1="30%" x2="45%" y2="30%" stroke="rgba(34, 34, 59, 0.9)" strokeWidth="3" />
              <line x1="45%" y1="30%" x2="45%" y2="40%" stroke="rgba(34, 34, 59, 0.9)" strokeWidth="3" />
              
              {/* Nana-Nani couple → Mummy */}
              <line x1="75%" y1="8%" x2="75%" y2="30%" stroke="rgba(34, 34, 59, 0.9)" strokeWidth="3" />
              <line x1="75%" y1="30%" x2="55%" y2="30%" stroke="rgba(34, 34, 59, 0.9)" strokeWidth="3" />
              <line x1="55%" y1="30%" x2="55%" y2="40%" stroke="rgba(34, 34, 59, 0.9)" strokeWidth="3" />
              
              {/* Papa-Mummy couple → You */}
              <line x1="50%" y1="45%" x2="50%" y2="67%" stroke="rgba(34, 34, 59, 0.9)" strokeWidth="3" />
              
              {/* You-Partner couple → Child */}
              <line x1="50%" y1="72%" x2="50%" y2="88%" stroke="rgba(34, 34, 59, 0.9)" strokeWidth="3" />
            </svg>

            {/* SVG Connection Lines - MOBILE VIEW (1×4 layout) */}
            <svg className="md:hidden absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
              <defs>
                <linearGradient id="coupleLineGradientMobile" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(255, 105, 135, 0.8)" />
                  <stop offset="50%" stopColor="rgba(255, 20, 147, 1)" />
                  <stop offset="100%" stopColor="rgba(255, 105, 135, 0.8)" />
                </linearGradient>
              </defs>
              
              {/* COUPLE CONNECTIONS (RED/PINK) - Mobile 1×4 layout (same as desktop) */}
              {/* Dada ━━━ Dadi */}
              <line x1="12.5%" y1="8%" x2="37.5%" y2="8%" stroke="url(#coupleLineGradientMobile)" strokeWidth="2" />
              
              {/* Nana ━━━ Nani */}
              <line x1="62.5%" y1="8%" x2="87.5%" y2="8%" stroke="url(#coupleLineGradientMobile)" strokeWidth="2" />
              
              {/* Papa ━━━ Mummy (Parents) */}
              <line x1="30%" y1="35%" x2="70%" y2="35%" stroke="url(#coupleLineGradientMobile)" strokeWidth="2" />
              
              {/* You ━━━ Partner */}
              <line x1="25%" y1="61%" x2="75%" y2="61%" stroke="url(#coupleLineGradientMobile)" strokeWidth="2" />
              
              {/* T-SHAPED PARENT-CHILD CONNECTIONS (BLACK) - Mobile 1×4 layout */}
              {/* Dada-Dadi → Papa */}
              <line x1="25%" y1="8%" x2="25%" y2="22%" stroke="rgba(34, 34, 59, 0.8)" strokeWidth="2" />
              <line x1="25%" y1="22%" x2="40%" y2="22%" stroke="rgba(34, 34, 59, 0.8)" strokeWidth="2" />
              <line x1="40%" y1="22%" x2="40%" y2="31%" stroke="rgba(34, 34, 59, 0.8)" strokeWidth="2" />
              
              {/* Nana-Nani → Mummy */}
              <line x1="75%" y1="8%" x2="75%" y2="22%" stroke="rgba(34, 34, 59, 0.8)" strokeWidth="2" />
              <line x1="75%" y1="22%" x2="60%" y2="22%" stroke="rgba(34, 34, 59, 0.8)" strokeWidth="2" />
              <line x1="60%" y1="22%" x2="60%" y2="31%" stroke="rgba(34, 34, 59, 0.8)" strokeWidth="2" />
              
              {/* Papa-Mummy → You */}
              <line x1="50%" y1="35%" x2="50%" y2="56%" stroke="rgba(34, 34, 59, 0.8)" strokeWidth="2" />
              
              {/* You-Partner → Child */}
              <line x1="50%" y1="61%" x2="50%" y2="78%" stroke="rgba(34, 34, 59, 0.8)" strokeWidth="2" />
            </svg>

            {/* TREE LAYOUT - Responsive Grid */}
            <div className="relative z-10 space-y-4 md:space-y-6">
              
              {/* Grandparents Section - Single row with 4 columns for both mobile & desktop */}
              <div className="grid grid-cols-4 gap-2 md:gap-8 items-start relative">
                  {/* Grandfather (Paternal) */}
                  <div className="flex flex-col items-center space-y-2">
                    <div 
                      className="relative group cursor-pointer transform hover:scale-110 transition-all duration-300"
                      onClick={() => {
                        const popup = document.getElementById('grandpa-popup');
                        if (popup) popup.classList.toggle('hidden');
                      }}
                    >
                      <Avatar className="w-12 h-12 md:w-16 md:h-16 border-2 md:border-4 border-primary/30 hover:border-primary transition-all">
                        <AvatarImage src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face" />
                        <AvatarFallback>GF</AvatarFallback>
                      </Avatar>
                      <Badge className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground text-xs">23</Badge>
                      
                      {/* Grandpa Interactive Popup */}
                      <div id="grandpa-popup" className="hidden absolute -top-40 left-1/2 transform -translate-x-1/2 z-50">
                        <Card className="memory-card w-64 p-4 shadow-xl">
                          <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                              <Camera className="w-4 h-4 text-primary" />
                              <span className="text-sm font-medium">Wedding Photo, 1960</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Mic className="w-4 h-4 text-coral" />
                              <div className="flex-1 bg-coral/10 rounded-full h-2">
                                <div className="bg-coral h-2 rounded-full w-3/4 animate-pulse"></div>
                              </div>
                              <PlayCircle className="w-4 h-4 text-coral cursor-pointer" />
                            </div>
                          </div>
                        </Card>
                      </div>
                    </div>
                    <p className="text-primary font-medium text-xs md:text-base">Dada</p>
                    <p className="text-[10px] md:text-sm text-muted-foreground">23 memories</p>
                  </div>
                  
                  {/* Heart Icon between Paternal Grandparents */}
                  <div className="absolute left-[25%] transform -translate-x-1/2 top-[8%] -translate-y-1/2 z-20">
                    <div className="bg-white rounded-full p-1 md:p-1.5 shadow-md border-2 border-pink-300">
                      <Heart className="w-3 h-3 md:w-4 md:h-4 text-pink-500 fill-pink-500" />
                    </div>
                  </div>
                  
                  {/* Grandmother (Paternal) */}
                  <div className="flex flex-col items-center space-y-2">
                    <div 
                      className="relative group cursor-pointer transform hover:scale-110 transition-all duration-300"
                      onClick={() => {
                        const popup = document.getElementById('grandma-popup');
                        if (popup) popup.classList.toggle('hidden');
                      }}
                    >
                      <Avatar className="w-12 h-12 md:w-16 md:h-16 border-2 md:border-4 border-primary/30 hover:border-primary transition-all">
                        <AvatarImage src="https://images.unsplash.com/photo-1554151228-14d9def656e4?w=100&h=100&fit=crop&crop=face" />
                        <AvatarFallback>GM</AvatarFallback>
                      </Avatar>
                      <Badge className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground text-xs">31</Badge>
                      
                      {/* Grandma Interactive Popup */}
                      <div id="grandma-popup" className="hidden absolute -top-32 left-1/2 transform -translate-x-1/2 z-50">
                        <Card className="memory-card w-56 p-4 shadow-xl">
                          <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                              <Mic className="w-4 h-4 text-aqua" />
                              <span className="text-sm font-medium">Family Recipe Story</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="flex-1 bg-aqua/10 rounded-full h-2">
                                <div className="bg-aqua h-2 rounded-full w-1/2"></div>
                              </div>
                              <span className="text-xs text-muted-foreground">2:34</span>
                            </div>
                          </div>
                        </Card>
                      </div>
                    </div>
                    <p className="text-primary font-medium text-xs md:text-base">Dadi</p>
                    <p className="text-[10px] md:text-sm text-muted-foreground">31 memories</p>
                  </div>

                  {/* Grandfather (Maternal) */}
                  <div className="flex flex-col items-center space-y-2">
                    <div className="relative">
                      <Avatar className="w-12 h-12 md:w-16 md:h-16 border-2 md:border-4 border-primary/30 hover:border-primary transition-all cursor-pointer transform hover:scale-110 duration-300">
                        <AvatarImage src="https://images.unsplash.com/photo-1463453091185-61582044d556?w=100&h=100&fit=crop&crop=face" />
                        <AvatarFallback>GF</AvatarFallback>
                      </Avatar>
                      <Badge className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground text-xs">18</Badge>
                    </div>
                    <p className="text-primary font-medium text-xs md:text-base">Nana</p>
                    <p className="text-[10px] md:text-sm text-muted-foreground">18 memories</p>
                  </div>

                  {/* Heart Icon between Maternal Grandparents */}
                  <div className="absolute left-[75%] transform -translate-x-1/2 top-[8%] -translate-y-1/2 z-20">
                    <div className="bg-white rounded-full p-1 md:p-1.5 shadow-md border-2 border-pink-300">
                      <Heart className="w-3 h-3 md:w-4 md:h-4 text-pink-500 fill-pink-500" />
                    </div>
                  </div>

                  {/* Grandmother (Maternal) */}
                  <div className="flex flex-col items-center space-y-2">
                    <div className="relative">
                      <Avatar className="w-12 h-12 md:w-16 md:h-16 border-2 md:border-4 border-primary/30 hover:border-primary transition-all cursor-pointer transform hover:scale-110 duration-300">
                        <AvatarImage src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face" />
                        <AvatarFallback>GM</AvatarFallback>
                      </Avatar>
                      <Badge className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground text-xs">27</Badge>
                    </div>
                    <p className="text-primary font-medium text-xs md:text-base">Nani</p>
                    <p className="text-xs md:text-sm text-muted-foreground">27 memories</p>
                  </div>
                </div>

              {/* Connector Line - Mobile only */}
              <div className="md:hidden flex justify-center py-2">
                <div className="w-px h-6 bg-gradient-to-b from-primary/30 via-coral/50 to-aqua/30"></div>
              </div>

              {/* Parents Section - Centered */}
              <div className="flex justify-center">
                <div className="grid grid-cols-2 gap-6 md:gap-12 items-start max-w-md relative">
                  {/* Father */}
                  <div className="flex flex-col items-center space-y-2">
                    <div 
                      className="relative group cursor-pointer transform hover:scale-110 transition-all duration-300"
                      onClick={() => {
                        const popup = document.getElementById('father-popup');
                        if (popup) popup.classList.toggle('hidden');
                      }}
                    >
                      <Avatar className="w-16 h-16 md:w-20 md:h-20 border-4 border-coral/30 hover:border-coral transition-all">
                        <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face" />
                        <AvatarFallback>F</AvatarFallback>
                      </Avatar>
                      <Badge className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-coral text-white text-xs">42</Badge>
                      
                      {/* Father Interactive Popup */}
                      <div id="father-popup" className="hidden absolute -top-36 left-1/2 transform -translate-x-1/2 z-50">
                        <Card className="memory-card w-60 p-4 shadow-xl">
                          <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                              <Video className="w-4 h-4 text-coral" />
                              <span className="text-sm font-medium">Career Journey</span>
                            </div>
                            <ImageWithFallback
                              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=120&fit=crop&crop=face"
                              alt="Career moment"
                              className="w-full h-20 object-cover rounded"
                            />
                            <p className="text-xs text-muted-foreground">From engineer to entrepreneur</p>
                          </div>
                        </Card>
                      </div>
                    </div>
                    <p className="text-coral font-medium text-sm md:text-base">Papa</p>
                    <p className="text-xs md:text-sm text-muted-foreground">42 memories</p>
                  </div>
                  
                  {/* Heart Icon between Parents - On the pink line */}
                  <div className="absolute left-1/2 transform -translate-x-1/2 top-[35%] md:top-[45%] -translate-y-1/2 z-20">
                    <div className="bg-white rounded-full p-1.5 md:p-2 shadow-md border-2 border-pink-300">
                      <Heart className="w-4 h-4 md:w-5 md:h-5 text-pink-500 fill-pink-500 animate-pulse" />
                    </div>
                  </div>
                  
                  {/* Mother */}
                  <div className="flex flex-col items-center space-y-2">
                    <div 
                      className="relative group cursor-pointer transform hover:scale-110 transition-all duration-300"
                      onClick={() => {
                        const popup = document.getElementById('mother-popup');
                        if (popup) popup.classList.toggle('hidden');
                      }}
                    >
                      <Avatar className="w-16 h-16 md:w-20 md:h-20 border-4 border-coral/30 hover:border-coral transition-all">
                        <AvatarImage src="https://images.unsplash.com/photo-1494790108755-2616b612b77c?w=100&h=100&fit=crop&crop=face" />
                        <AvatarFallback>M</AvatarFallback>
                      </Avatar>
                      <Badge className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-coral text-white text-xs">38</Badge>
                    </div>
                    <p className="text-coral font-medium text-sm md:text-base">Mummy</p>
                    <p className="text-xs md:text-sm text-muted-foreground">38 memories</p>
                  </div>
                </div>
              </div>

              {/* Connector Line - Mobile only */}
              <div className="md:hidden flex justify-center py-2">
                <div className="w-px h-6 bg-gradient-to-b from-coral/50 to-aqua/50"></div>
              </div>

              {/* Your Generation Section (SPECIAL STYLING) - Centered */}
              <div className="flex justify-center">
                <div className="grid grid-cols-2 gap-8 md:gap-16 items-start max-w-lg relative">
                  {/* YOU - Special Node with Crown */}
                  <div className="flex flex-col items-center space-y-2">
                    <div 
                      className="relative group cursor-pointer transform hover:scale-110 transition-all duration-300"
                      onClick={onGetStarted}
                    >
                      <Avatar className="w-20 h-20 md:w-24 md:h-24 border-4 border-aqua/50 hover:border-aqua transition-all ring-4 ring-aqua/20">
                        <AvatarImage src="https://images.unsplash.com/photo-1494790108755-2616b612b77c?w=100&h=100&fit=crop&crop=face" />
                        <AvatarFallback>You</AvatarFallback>
                      </Avatar>
                      <Badge className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-aqua text-white text-sm">89</Badge>
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-gradient-to-r from-primary to-coral text-white text-xs animate-pulse">
                          <Crown className="w-3 h-3 mr-1" />
                          You
                        </Badge>
                      </div>
                    </div>
                    <p className="text-aqua font-medium text-sm md:text-base mt-3">You</p>
                    <p className="text-xs md:text-sm text-muted-foreground">89 memories</p>
                  </div>
                  
                  {/* Heart Icon between You & Partner - On the pink line */}
                  <div className="absolute left-1/2 transform -translate-x-1/2 top-[61%] md:top-[72%] -translate-y-1/2 z-20">
                    <div className="bg-white rounded-full p-2 md:p-2.5 shadow-lg border-2 border-pink-400">
                      <Heart className="w-5 h-5 md:w-6 md:h-6 text-pink-500 fill-pink-500 animate-pulse" />
                    </div>
                  </div>
                  
                  {/* Partner */}
                  <div className="flex flex-col items-center space-y-2">
                    <div 
                      className="relative group cursor-pointer transform hover:scale-110 transition-all duration-300"
                      onClick={onGetStarted}
                    >
                      <Avatar className="w-20 h-20 md:w-24 md:h-24 border-4 border-aqua/30 hover:border-aqua transition-all">
                        <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face" />
                        <AvatarFallback>P</AvatarFallback>
                      </Avatar>
                      <Badge className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-aqua text-white text-xs">67</Badge>
                    </div>
                    <p className="text-aqua font-medium text-sm md:text-base">Partner</p>
                    <p className="text-xs md:text-sm text-muted-foreground">67 memories</p>
                  </div>
                </div>
              </div>

              {/* Connector Line - Mobile only */}
              <div className="md:hidden flex justify-center py-2">
                <div className="w-px h-6 bg-gradient-to-b from-aqua/50 to-secondary/50"></div>
              </div>

              {/* Children Section - Centered */}
              <div className="flex justify-center">
                <div className="flex flex-col items-center space-y-2">
                  <div 
                    className="relative group cursor-pointer transform hover:scale-110 transition-all duration-300"
                    onClick={onGetStarted}
                  >
                    <Avatar className="w-16 h-16 md:w-20 md:h-20 border-4 border-secondary/30 hover:border-secondary transition-all">
                      <AvatarImage src="https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=100&h=100&fit=crop&crop=face" />
                      <AvatarFallback>C</AvatarFallback>
                    </Avatar>
                    <Badge className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-secondary text-white text-xs">12</Badge>
                  </div>
                  <p className="text-secondary font-medium text-sm md:text-base">Child</p>
                  <p className="text-xs md:text-sm text-muted-foreground">12 memories</p>
                </div>
              </div>

              {/* Tree CTA Button */}
              <div className="mt-6 md:mt-8 text-center">
                <Button 
                  onClick={onGetStarted}
                  className="vibrant-button text-primary-foreground text-lg px-5 sm:px-6 py-3 h-auto w-full sm:w-auto max-w-xs mx-auto"
                >
                  <TreePine className="w-5 h-5 mr-2 flex-shrink-0" />
                  <span className="whitespace-normal">Start Building Your Tree</span>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* SECTION 4: WHY CHOOSE FAMILY MEMORY VAULT */}
      <section className="py-16 px-4 bg-gradient-to-br from-muted/20 to-background">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Section Header */}
          <div className="text-center space-y-4">
            <h2 className="text-4xl text-primary">Why Choose Family Memory Vault?</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Unlike social media or cloud storage, we're built specifically for family memories
            </p>
          </div>

          {/* Benefits Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <Card 
                key={index} 
                className="memory-card p-6 hover:scale-105 transition-all duration-300 group cursor-pointer"
                onClick={onGetStarted}
              >
                <div className="space-y-4">
                  <div className={`p-4 rounded-2xl ${benefit.bgColor} w-fit group-hover:scale-110 transition-transform`}>
                    <benefit.icon className={`w-8 h-8 ${benefit.color}`} />
                  </div>
                  <div>
                    <h3 className="text-xl font-medium text-primary mb-2">{benefit.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{benefit.description}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Learn More
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5: REAL FAMILIES, REAL STORIES (Testimonials) */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Section Header */}
          <div className="text-center space-y-4">
            <h2 className="text-4xl text-primary">Real Families, Real Stories</h2>
            <p className="text-xl text-muted-foreground">
              See how families across India are preserving their heritage
            </p>
          </div>

          {/* Testimonial Card */}
          <Card 
            className="memory-card p-8 relative overflow-hidden cursor-pointer"
            onClick={nextTestimonial}
          >
            <div className="relative z-10">
              <div className="text-center space-y-6">
                <Avatar className="w-20 h-20 mx-auto border-4 border-primary/20">
                  <AvatarImage src={testimonials[currentTestimonial].avatar} />
                  <AvatarFallback>
                    {testimonials[currentTestimonial].name.split(' ').map(n => n.charAt(0)).join('')}
                  </AvatarFallback>
                </Avatar>
                
                <div className="space-y-3">
                  <p className="text-2xl text-primary italic leading-relaxed">
                    "{testimonials[currentTestimonial].text}"
                  </p>
                  <div className="space-y-1">
                    <p className="font-medium text-lg">{testimonials[currentTestimonial].name}</p>
                    <p className="text-muted-foreground">
                      {testimonials[currentTestimonial].age} • {testimonials[currentTestimonial].relation}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center justify-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      {testimonials[currentTestimonial].location}
                    </p>
                  </div>
                </div>

                {/* Dot Indicators */}
                <div className="flex justify-center space-x-2">
                  {testimonials.map((_, index) => (
                    <div
                      key={index}
                      className={`w-3 h-3 rounded-full transition-all ${
                        index === currentTestimonial ? 'bg-primary' : 'bg-primary/20'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            {/* Decorative Quotation Marks */}
            <div className="absolute top-4 right-4 text-6xl text-primary/10">"</div>
            <div className="absolute bottom-4 left-4 text-6xl text-primary/10 rotate-180">"</div>
          </Card>

          {/* Testimonials CTA Button */}
          <div className="text-center">
            <Button 
              onClick={onGetStarted}
              className="vibrant-button text-primary-foreground text-xl px-6 sm:px-8 py-4 h-auto w-full sm:w-auto max-w-md mx-auto"
            >
              <Heart className="w-6 h-6 mr-2 flex-shrink-0" />
              <span className="whitespace-normal">Join These Families Today</span>
            </Button>
          </div>
        </div>
      </section>

      {/* SECTION 6: TRUSTED BY FAMILIES WORLDWIDE (Stats) */}
      <section className="py-16 px-4 bg-gradient-to-br from-primary/5 to-aqua/5">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Section Header */}
          <div className="text-center space-y-4">
            <h2 className="text-4xl text-primary">Trusted by Families Worldwide</h2>
            <p className="text-xl text-muted-foreground">
              Growing community of families preserving their heritage
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <Card key={index} className="memory-card p-6 text-center group hover:scale-105 transition-all duration-300">
                <div className="space-y-3">
                  <div className="p-3 rounded-2xl bg-background w-fit mx-auto group-hover:scale-110 transition-transform">
                    <stat.icon className={`w-8 h-8 ${stat.color}`} />
                  </div>
                  <div>
                    <p className={`text-3xl font-semibold ${stat.color}`}>{stat.number}</p>
                    <p className="text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 7: FINAL CALL TO ACTION */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary/10 via-coral/5 to-aqua/10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Final CTA Header */}
          <div className="space-y-4">
            <h2 className="text-5xl text-primary font-[Inter]">Ready to Preserve Your Family Legacy?</h2>
            <p className="text-2xl text-muted-foreground">
              Start your free family vault today. No credit card required.
            </p>
          </div>

          {/* Final CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              onClick={onGetStarted}
              className="vibrant-button text-primary-foreground text-xl sm:text-2xl px-8 sm:px-12 py-5 sm:py-6 h-auto w-full sm:w-auto"
            >
              <Sparkles className="w-7 sm:w-8 h-7 sm:h-8 mr-2 sm:mr-3 flex-shrink-0" />
              <span className="whitespace-normal text-center">Start Your Family Vault - Free</span>
            </Button>
            <Button 
              onClick={onSignIn}
              variant="outline"
              className="border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground text-lg sm:text-xl px-6 sm:px-8 py-4 h-auto w-full sm:w-auto"
            >
              <span className="whitespace-normal text-center">Already Have an Account? Sign In</span>
            </Button>
          </div>

          {/* Trust Badges */}
          <div className="pt-8 space-y-4">
            <div className="flex items-center justify-center space-x-8 flex-wrap gap-y-2">
              <div className="flex items-center space-x-2 text-primary">
                <Shield className="w-5 h-5" />
                <span>100% Private</span>
              </div>
              <div className="flex items-center space-x-2 text-coral">
                <Heart className="w-5 h-5" />
                <span>Free to Start</span>
              </div>
              <div className="flex items-center space-x-2 text-aqua">
                <Lock className="w-5 h-5" />
                <span>Secure Forever</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-[16px]">
              Join thousands of families who trust us with their most precious memories
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export { LandingPage };
export default LandingPage;
