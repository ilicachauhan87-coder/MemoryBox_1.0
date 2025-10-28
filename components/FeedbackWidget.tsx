import React, { useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { MessageCircle, Heart, Send, CheckCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

/**
 * FeedbackWidget - Elder-friendly emotional feedback collection for MVP validation
 * 
 * Features:
 * - Emotional questions (would recommend, liked most, feel connected)
 * - Elder-friendly UI (48px touch targets, clear text)
 * - Saves to Supabase database for MVP tracking
 * - Optional questions (can skip some fields)
 * 
 * Usage: Add to App.tsx layout (always visible)
 */

export const FeedbackWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Form state - Emotional questions
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [likedMost, setLikedMost] = useState('');
  const [frustrating, setFrustrating] = useState('');
  const [improvements, setImprovements] = useState('');
  const [feelConnected, setFeelConnected] = useState<number>(0);
  const [hoveredHeart, setHoveredHeart] = useState<number>(0);
  const [inviteFamily, setInviteFamily] = useState<string>('');
  const [momentToPreserve, setMomentToPreserve] = useState('');

  const handleSubmit = async () => {
    // Validation - Only require recommend and feel connected
    if (wouldRecommend === null) {
      toast.error('Please let us know if you would recommend MemoryBox');
      return;
    }

    if (feelConnected === 0) {
      toast.error('Please rate how connected you felt (1-5 hearts)');
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current user ID
      const currentUserId = localStorage.getItem('current_user_id');
      if (!currentUserId) {
        toast.error('Please sign in to submit feedback');
        setIsSubmitting(false);
        return;
      }

      // Get user profile for context
      const userProfile = localStorage.getItem(`user:${currentUserId}:profile`);
      const userData = userProfile ? JSON.parse(userProfile) : null;

      // Prepare emotional feedback data
      const feedbackData = {
        user_id: currentUserId,
        would_recommend: wouldRecommend,
        liked_most: likedMost.trim() || null,
        frustrating: frustrating.trim() || null,
        improvements: improvements.trim() || null,
        feel_connected: feelConnected,
        invite_family: inviteFamily || null,
        moment_to_preserve: momentToPreserve.trim() || null,
        user_name: userData?.name || 'Anonymous',
        user_email: userData?.email || null,
        page_url: window.location.pathname,
        user_agent: navigator.userAgent,
        batch_no: 1, // You can set this manually for each batch
        submitted_at: new Date().toISOString()
      };

      // Save to database
      const { DatabaseService } = await import('../utils/supabase/persistent-database');
      await DatabaseService.saveFeedback(feedbackData);

      // Also save to localStorage for backup
      const existingFeedback = JSON.parse(localStorage.getItem('app_feedback') || '[]');
      existingFeedback.push(feedbackData);
      localStorage.setItem('app_feedback', JSON.stringify(existingFeedback));

      console.log('✅ Emotional feedback submitted:', feedbackData);

      // Show success state
      setIsSubmitted(true);
      toast.success('Thank you for sharing your heart! ❤️');

      // Reset form after 2 seconds
      setTimeout(() => {
        setIsOpen(false);
        setIsSubmitted(false);
        setWouldRecommend(null);
        setLikedMost('');
        setFrustrating('');
        setImprovements('');
        setFeelConnected(0);
        setInviteFamily('');
        setMomentToPreserve('');
      }, 2000);

    } catch (error) {
      console.error('❌ Feedback submission error:', error);
      
      // Fallback: save to localStorage only
      const feedbackData = {
        user_id: localStorage.getItem('current_user_id'),
        would_recommend: wouldRecommend,
        liked_most: likedMost.trim() || null,
        frustrating: frustrating.trim() || null,
        improvements: improvements.trim() || null,
        feel_connected: feelConnected,
        invite_family: inviteFamily || null,
        moment_to_preserve: momentToPreserve.trim() || null,
        submitted_at: new Date().toISOString(),
        saved_locally: true
      };
      
      const existingFeedback = JSON.parse(localStorage.getItem('app_feedback') || '[]');
      existingFeedback.push(feedbackData);
      localStorage.setItem('app_feedback', JSON.stringify(existingFeedback));
      
      toast.success('Feedback saved! (Will sync when online)');
      
      setTimeout(() => {
        setIsOpen(false);
        setWouldRecommend(null);
        setLikedMost('');
        setFrustrating('');
        setImprovements('');
        setFeelConnected(0);
        setInviteFamily('');
        setMomentToPreserve('');
      }, 1500);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Feedback Button - Bottom Right */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 sm:bottom-28 right-4 sm:right-6 z-[60] w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-xl bg-aqua hover:bg-aqua/90 text-white transition-transform active:scale-95"
        style={{ minWidth: '48px', minHeight: '48px' }}
        aria-label="Share Your Experience"
      >
        <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
      </Button>

      {/* Emotional Feedback Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pr-8">
            <DialogTitle className="text-xl sm:text-2xl">Share Your Experience</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Your feedback helps us make MemoryBox more meaningful for families ❤️
            </DialogDescription>
          </DialogHeader>

          {!isSubmitted ? (
            <div className="space-y-4 sm:space-y-5 py-2 sm:py-4">
              
              {/* 1. Would you recommend? */}
              <div className="space-y-2 sm:space-y-3">
                <Label className="text-sm sm:text-base">
                  🫶 Would you recommend MemoryBox to your family?
                </Label>
                <div className="flex gap-2 sm:gap-3">
                  <Button
                    type="button"
                    onClick={() => setWouldRecommend(true)}
                    variant={wouldRecommend === true ? "default" : "outline"}
                    className={`flex-1 h-12 sm:h-14 text-sm sm:text-base ${
                      wouldRecommend === true 
                        ? 'bg-aqua hover:bg-aqua/90 text-white' 
                        : 'border-2'
                    }`}
                    style={{ minHeight: '48px' }}
                  >
                    ✅ Yes
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setWouldRecommend(false)}
                    variant={wouldRecommend === false ? "default" : "outline"}
                    className={`flex-1 h-12 sm:h-14 text-sm sm:text-base ${
                      wouldRecommend === false 
                        ? 'bg-gray-500 hover:bg-gray-600 text-white' 
                        : 'border-2'
                    }`}
                    style={{ minHeight: '48px' }}
                  >
                    ⏸️ Not yet
                  </Button>
                </div>
              </div>

              {/* 2. Feel Connected Rating (Hearts) */}
              <div className="space-y-2 sm:space-y-3">
                <Label className="text-sm sm:text-base">
                  🌿 How connected did you feel while using MemoryBox?
                </Label>
                <div className="flex gap-1 sm:gap-2 justify-center py-2">
                  {[1, 2, 3, 4, 5].map((heart) => (
                    <button
                      key={heart}
                      type="button"
                      onClick={() => setFeelConnected(heart)}
                      onMouseEnter={() => setHoveredHeart(heart)}
                      onMouseLeave={() => setHoveredHeart(0)}
                      onTouchStart={() => setHoveredHeart(heart)}
                      onTouchEnd={() => setHoveredHeart(0)}
                      className="focus:outline-none focus:ring-2 focus:ring-aqua rounded-full p-0.5 sm:p-1 transition-transform active:scale-95 hover:scale-110"
                      style={{ minWidth: '48px', minHeight: '48px' }}
                      aria-label={`${heart} heart${heart > 1 ? 's' : ''} - ${
                        heart === 1 ? 'Not at all' :
                        heart === 2 ? 'Slightly' :
                        heart === 3 ? 'Moderately' :
                        heart === 4 ? 'Very' :
                        'Deeply connected'
                      }`}
                    >
                      <Heart
                        className={`w-8 h-8 sm:w-10 sm:h-10 transition-colors ${
                          (hoveredHeart || feelConnected) >= heart
                            ? 'fill-red-500 text-red-500'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {feelConnected > 0 && (
                  <p className="text-center text-xs sm:text-sm text-muted-foreground">
                    {feelConnected === 5 && '❤️ Deeply connected!'}
                    {feelConnected === 4 && '💗 Very connected'}
                    {feelConnected === 3 && '💖 Moderately connected'}
                    {feelConnected === 2 && '💓 Slightly connected'}
                    {feelConnected === 1 && '🤍 Not much connection'}
                  </p>
                )}
              </div>

              {/* 3. What did you like most? */}
              <div className="space-y-2">
                <Label htmlFor="liked_most" className="text-sm sm:text-base">
                  💖 What did you like most about MemoryBox?{' '}
                  <span className="text-muted-foreground text-xs sm:text-sm">(optional)</span>
                </Label>
                <Textarea
                  id="liked_most"
                  placeholder="Share what made you smile..."
                  value={likedMost}
                  onChange={(e) => setLikedMost(e.target.value)}
                  maxLength={300}
                  rows={2}
                  className="text-sm sm:text-base resize-none min-h-[60px] sm:min-h-[72px]"
                />
              </div>

              {/* 4. Was anything frustrating? */}
              <div className="space-y-2">
                <Label htmlFor="frustrating" className="text-sm sm:text-base">
                  😕 Was there anything confusing or frustrating?{' '}
                  <span className="text-muted-foreground text-xs sm:text-sm">(optional)</span>
                </Label>
                <Textarea
                  id="frustrating"
                  placeholder="Help us understand what was difficult..."
                  value={frustrating}
                  onChange={(e) => setFrustrating(e.target.value)}
                  maxLength={300}
                  rows={2}
                  className="text-sm sm:text-base resize-none min-h-[60px] sm:min-h-[72px]"
                />
              </div>

              {/* 5. One improvement suggestion */}
              <div className="space-y-2">
                <Label htmlFor="improvements" className="text-sm sm:text-base">
                  💡 What's one thing we can improve?{' '}
                  <span className="text-muted-foreground text-xs sm:text-sm">(optional)</span>
                </Label>
                <Textarea
                  id="improvements"
                  placeholder="Your suggestion for making MemoryBox better..."
                  value={improvements}
                  onChange={(e) => setImprovements(e.target.value)}
                  maxLength={300}
                  rows={2}
                  className="text-sm sm:text-base resize-none min-h-[60px] sm:min-h-[72px]"
                />
              </div>

              {/* 6. Invite family? */}
              <div className="space-y-2">
                <Label htmlFor="invite_family" className="text-sm sm:text-base">
                  👨‍👩‍👧 Would you like to invite your family members?{' '}
                  <span className="text-muted-foreground text-xs sm:text-sm">(optional)</span>
                </Label>
                <Select value={inviteFamily} onValueChange={setInviteFamily}>
                  <SelectTrigger id="invite_family" className="h-12 sm:h-12 text-sm sm:text-base">
                    <SelectValue placeholder="Choose an option" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    <SelectItem value="yes" className="text-sm sm:text-base py-2 sm:py-3">
                      ✅ Yes, definitely
                    </SelectItem>
                    <SelectItem value="maybe" className="text-sm sm:text-base py-2 sm:py-3">
                      🤔 Maybe later
                    </SelectItem>
                    <SelectItem value="no" className="text-sm sm:text-base py-2 sm:py-3">
                      ⏸️ Not right now
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 7. One memory to preserve */}
              <div className="space-y-2">
                <Label htmlFor="moment" className="text-sm sm:text-base">
                  ✨ If you could preserve one memory right now, what would it be?{' '}
                  <span className="text-muted-foreground text-xs sm:text-sm">(optional)</span>
                </Label>
                <Textarea
                  id="moment"
                  placeholder="Share your precious moment..."
                  value={momentToPreserve}
                  onChange={(e) => setMomentToPreserve(e.target.value)}
                  maxLength={300}
                  rows={2}
                  className="text-sm sm:text-base resize-none min-h-[60px] sm:min-h-[72px]"
                />
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || wouldRecommend === null || feelConnected === 0}
                className="w-full h-12 sm:h-12 text-sm sm:text-base bg-aqua hover:bg-aqua/90"
                style={{ minHeight: '48px' }}
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    <span className="text-sm sm:text-base">Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    <span className="text-sm sm:text-base">Share Feedback</span>
                  </>
                )}
              </Button>
            </div>
          ) : (
            // Success State
            <div className="py-6 sm:py-8 text-center space-y-3 sm:space-y-4">
              <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-green-500 mx-auto" />
              <h3 className="text-lg sm:text-xl font-semibold">Thank You! ❤️</h3>
              <p className="text-sm sm:text-base text-muted-foreground px-2">
                Every bit of feedback helps us make MemoryBox a more meaningful space for families.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
