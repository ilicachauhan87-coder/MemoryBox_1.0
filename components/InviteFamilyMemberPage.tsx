import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { 
  UserPlus, 
  Search, 
  MessageCircle, 
  Mail, 
  Phone, 
  Send,
  Users,
  ArrowLeft,
  CheckCircle,
  Sparkles,
  TreePine,
  Heart,
  Crown,
  Baby
} from 'lucide-react';
import { DatabaseService } from '../utils/supabase/persistent-database';

interface FamilyMember {
  id: string;
  name: string;
  avatar: string;
  relationship: string;
  generation: number;
  isOnApp: boolean;
  phoneNumber?: string;
  email?: string;
}

interface InviteFamilyMemberPageProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function InviteFamilyMemberPage({ onBack, onSuccess }: InviteFamilyMemberPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [step, setStep] = useState<'select' | 'invite'>('select');
  const [allFamilyMembers, setAllFamilyMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>('Your Family Member');

  // Load family members from database
  useEffect(() => {
    const loadFamilyMembers = async () => {
      try {
        setIsLoading(true);

        // Get current user ID
        const userId = localStorage.getItem('current_user_id');
        if (!userId) {
          console.error('❌ No current user ID found');
          setIsLoading(false);
          return;
        }

        setCurrentUserId(userId);

        // Get user profile to find familyId
        const userProfile = localStorage.getItem(`user:${userId}:profile`);
        if (!userProfile) {
          console.error('❌ No user profile found');
          setIsLoading(false);
          return;
        }

        const userData = JSON.parse(userProfile);
        const familyId = userData.familyId || userData.family_id || userId;
        
        // Set current user's name for personalized invites
        const userName = userData.name || userData.firstName || 'Your Family Member';
        setCurrentUserName(userName);

        console.log('🔍 Loading family tree for invite page:', { userId, familyId, userName });

        // Load family tree from database
        const treeData = await DatabaseService.getFamilyTree(familyId);
        
        if (!treeData) {
          console.log('⚠️ No tree data found');
          setAllFamilyMembers([]);
          setIsLoading(false);
          return;
        }

        // Extract people from tree data (handle both array and object formats)
        const people = Array.isArray(treeData) ? treeData : treeData.people || [];
        
        console.log('✅ Family tree loaded:', { peopleCount: people.length });

        // Transform tree people to FamilyMember format
        const members: FamilyMember[] = people.map((person: any) => ({
          id: person.id,
          name: person.name || `${person.firstName || ''} ${person.lastName || ''}`.trim() || 'Unknown',
          avatar: person.photo || person.photoUrl || '', // ✅ Only show user-uploaded photos, no demo images
          relationship: person.relationship || person.relationshipToUser || 'Family',
          generation: person.generation || 0,
          isOnApp: person.isOnApp || false,
          phoneNumber: person.phone || person.phoneNumber,
          email: person.email
        }));

        setAllFamilyMembers(members);
        setIsLoading(false);
      } catch (error) {
        console.error('❌ Error loading family members:', error);
        setAllFamilyMembers([]);
        setIsLoading(false);
      }
    };

    loadFamilyMembers();
  }, []);

  // Filter out current user and those already on app, plus pets for invitations
  const invitableMembers = allFamilyMembers.filter(member => 
    member.id !== currentUserId && 
    !member.isOnApp && 
    member.relationship !== 'Pet' &&
    member.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedMemberDetails = allFamilyMembers.filter(member => 
    selectedMembers.includes(member.id)
  );

  const getGenerationIcon = (generation: number) => {
    if (generation > 1) return Crown;
    if (generation === 1) return Heart;
    if (generation === 0) return Users;
    if (generation < 0) return Baby;
    return Users;
  };

  const getGenerationColor = (generation: number) => {
    if (generation > 1) return 'text-amber-600 bg-amber-100';
    if (generation === 1) return 'text-emerald-600 bg-emerald-100';
    if (generation === 0) return 'text-blue-600 bg-blue-100';
    if (generation < 0) return 'text-pink-600 bg-pink-100';
    return 'text-gray-600 bg-gray-100';
  };

  const handleMemberToggle = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleInvite = (method: 'whatsapp' | 'email' | 'sms') => {
    const memberNames = selectedMemberDetails.map(m => m.name).join(', ');
    const inviteMessage = `Hi! 👋\n\nI've been building our family's digital sanctuary on MemoryBox - a special space where we can preserve and share our precious memories together.\n\nJoin us to:\n✨ View family photos and videos\n🎙️ Listen to voice messages from loved ones\n📝 Write private journal entries with mood tracking\n🌳 Connect with our family tree\n💑 Track Life Journeys (couple milestones, pregnancy, etc.)\n⏰ Create time capsules for future memories\n📱 Share memories with chosen family members\n\nDownload MemoryBox and join our family!\n\nWith love,\n${currentUserName} ❤️`;
    
    switch (method) {
      case 'whatsapp':
        alert(`WhatsApp invitations sent to:\n${memberNames}\n\nMessage: "${inviteMessage}"`);
        break;
      case 'email':
        alert(`Email invitations sent to:\n${memberNames}\n\nSubject: "Join our MemoryBox family"\nMessage: "${inviteMessage}"`);
        break;
      case 'sms':
        alert(`SMS invitations sent to:\n${memberNames}\n\nMessage: "${inviteMessage}"`);
        break;
    }
    
    onSuccess();
  };

  if (step === 'invite') {
    return (
      <div className="min-h-screen bg-background vibrant-texture pb-28">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="text-center space-y-2 sm:space-y-3">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Send className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
              <h1 className="text-xl sm:text-2xl lg:text-3xl text-primary">Send Invitations</h1>
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-aqua flex-shrink-0" />
            </div>
            <p className="text-sm sm:text-base text-muted-foreground px-2">
              Invite {selectedMemberDetails.length} family member{selectedMemberDetails.length > 1 ? 's' : ''} to join MemoryBox
            </p>
          </div>

          {/* Selected Members Preview */}
          <Card className="memory-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-aqua flex-shrink-0" />
                <span className="truncate">Selected Family Members</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedMemberDetails.map((member) => {
                const GenerationIcon = getGenerationIcon(member.generation);
                return (
                  <div key={member.id} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-muted/30 rounded-lg">
                    <Avatar className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm sm:text-base truncate">{member.name}</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{member.relationship}</p>
                      {member.phoneNumber && (
                        <p className="text-xs text-muted-foreground truncate">{member.phoneNumber}</p>
                      )}
                    </div>
                    <div className={`p-1.5 sm:p-2 rounded-full flex-shrink-0 ${getGenerationColor(member.generation)}`}>
                      <GenerationIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Invitation Methods */}
          <Card className="memory-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Choose how to invite them:</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Select your preferred method to send the invitation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => handleInvite('whatsapp')}
                className="w-full flex items-center justify-between gap-2 bg-green-500 hover:bg-green-600 text-white min-h-[52px] sm:h-12 px-3 sm:px-4"
              >
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="text-sm sm:text-base">WhatsApp</span>
                </div>
                <Badge className="bg-green-600 text-white text-xs whitespace-nowrap">Most Popular</Badge>
              </Button>
              
              <Button
                onClick={() => handleInvite('email')}
                className="w-full flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white min-h-[52px] sm:h-12 px-3 sm:px-4"
              >
                <Mail className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="text-sm sm:text-base">Email</span>
              </Button>
              
              <Button
                onClick={() => handleInvite('sms')}
                className="w-full flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white min-h-[52px] sm:h-12 px-3 sm:px-4"
              >
                <Phone className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="text-sm sm:text-base">SMS</span>
              </Button>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 sm:gap-4">
            <Button variant="outline" onClick={() => setStep('select')} className="flex-1 min-h-[52px] sm:h-auto">
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="text-sm sm:text-base">Back</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background vibrant-texture pb-28">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Header with Back Button */}
        <div className="space-y-3 sm:space-y-4">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="gap-2 px-2 sm:px-3 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-sm sm:text-base">Back</span>
          </Button>

          <div className="text-center space-y-2 sm:space-y-3">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
              <h1 className="text-xl sm:text-2xl lg:text-3xl text-primary">Invite Family Members</h1>
              <TreePine className="w-5 h-5 sm:w-6 sm:h-6 text-aqua flex-shrink-0" />
            </div>
            <p className="text-sm sm:text-base text-muted-foreground px-2">
              Invite family members who aren't on the app yet
            </p>
          </div>
        </div>

        {/* Search */}
        <Card className="memory-card">
          <CardContent className="p-3 sm:p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search family members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-sm sm:text-base"
              />
            </div>
          </CardContent>
        </Card>

        {/* Selected Count Badge */}
        {selectedMembers.length > 0 && (
          <div className="text-center">
            <Badge className="bg-primary text-primary-foreground px-3 sm:px-4 py-2 text-sm sm:text-base">
              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
              {selectedMembers.length} member{selectedMembers.length > 1 ? 's' : ''} selected
            </Badge>
          </div>
        )}

        {/* Family Members List */}
        <Card className="memory-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-aqua flex-shrink-0" />
              <span className="truncate">Family Members Not on App</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {invitableMembers.length} family member{invitableMembers.length !== 1 ? 's' : ''} haven't joined yet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3">
            {isLoading ? (
              <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
                  <p className="text-sm sm:text-base text-muted-foreground">Loading family members...</p>
              </div>
            ) : invitableMembers.length === 0 ? (
              <div className="text-center py-8">
                  <Users className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm sm:text-base text-muted-foreground px-4">
                    {searchQuery ? 'No family members found matching your search.' : allFamilyMembers.length === 0 ? 'Add family members to your tree first to invite them!' : 'All your family members are already on the app! 🎉'}
                  </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:gap-3">
                {invitableMembers.map((member) => {
                  const isSelected = selectedMembers.includes(member.id);
                  const GenerationIcon = getGenerationIcon(member.generation);
                  
                  return (
                    <div
                      key={member.id}
                      className={`flex items-center gap-2 sm:gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-primary bg-primary/10 ring-2 ring-primary/20' 
                          : 'border-border hover:border-primary/50 hover:bg-muted/30'
                      }`}
                      onClick={() => handleMemberToggle(member.id)}
                    >
                      <Avatar className="w-11 h-11 sm:w-12 sm:h-12 flex-shrink-0">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback className="text-sm">{member.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm sm:text-base truncate">{member.name}</h4>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">{member.relationship}</p>
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-1">
                          <Badge variant="outline" className="text-xs whitespace-nowrap">
                            Gen {member.generation === 0 ? '0' : member.generation > 0 ? `+${member.generation}` : member.generation}
                          </Badge>
                          {member.phoneNumber && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 whitespace-nowrap">
                              📱
                            </Badge>
                          )}
                          {member.email && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 whitespace-nowrap">
                              ✉️
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className={`p-1.5 sm:p-2 rounded-full ${getGenerationColor(member.generation)}`}>
                          <GenerationIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                        </div>
                        {isSelected && (
                          <CheckCircle className="w-5 h-5 text-primary" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fixed Bottom Invite Button - Only show when members are selected */}
        {selectedMembers.length > 0 && (
          <div className="fixed bottom-20 left-0 right-0 p-3 sm:p-4 bg-background/95 backdrop-blur-sm border-t border-border shadow-lg z-40">
            <div className="max-w-4xl mx-auto">
              <Button 
                onClick={() => setStep('invite')}
                disabled={selectedMembers.length === 0}
                className="w-full vibrant-button text-primary-foreground min-h-[56px] sm:h-14 text-base sm:text-lg font-semibold shadow-lg"
              >
                <Send className="w-5 h-5 mr-2" />
                Invite {selectedMembers.length} Member{selectedMembers.length > 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
