import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { 
  HelpCircle, 
  Search, 
  Phone, 
  Mail, 
  MessageCircle, 
  BookOpen, 
  Camera, 
  Users, 
  Shield, 
  ChevronRight,
  Clock,
  Video,
  Heart,
  TreePine,
  Database,
  Target
} from 'lucide-react';

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const quickHelp = [
    {
      title: 'Getting Started',
      description: 'Learn the basics of using MemoryBox',
      icon: BookOpen,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      articles: 4,
      searchTerm: 'Getting Started'
    },
    {
      title: 'Adding Memories',
      description: 'How to upload photos, videos, and voice notes',
      icon: Camera,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      articles: 4,
      searchTerm: 'Adding Memories'
    },
    {
      title: 'Family Tree',
      description: 'Building and managing your family connections',
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      articles: 4,
      searchTerm: 'Family Tree'
    },
    {
      title: 'Privacy & Security',
      description: 'Keeping your memories safe and private',
      icon: Shield,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      articles: 4,
      searchTerm: 'Privacy'
    }
  ];

  const faqs = [
    {
      category: 'Getting Started',
      questions: [
        {
          question: 'How do I create my first family memory?',
          answer: 'To create your first memory, tap the "Add Memory" button on your home screen, choose the type of memory (photo, video, voice, or story), upload your content, and add details like title, date, and family members involved. It\'s that simple!'
        },
        {
          question: 'How do I invite family members to join?',
          answer: 'Go to your Family Tree page and tap "Add Family Member". You can send invitations via WhatsApp, email, or SMS. Once they join, they\'ll be able to see and contribute to your shared family vault.'
        },
        {
          question: 'Is there a limit to how many memories I can store?',
          answer: 'No! MemoryBox offers unlimited storage for your precious family moments. Store as many photos, videos, voice recordings, and stories as your heart desires - all completely free.'
        },
        {
          question: 'How do I navigate the app?',
          answer: 'Use the bottom navigation bar to access Home, Memory Vault, Add Memory, Family Tree, and Profile. Each section is designed to be easy to find and use, with clear icons and labels.'
        }
      ]
    },
    {
      category: 'Adding Memories',
      questions: [
        {
          question: 'What types of memories can I upload?',
          answer: 'You can upload photos, videos, voice recordings, and written stories. Each type helps preserve different aspects of your family moments - visual memories, spoken words, and written narratives.'
        },
        {
          question: 'How do I upload a photo or video?',
          answer: 'Tap the "Add Memory" button, select "Photo" or "Video", choose from your phone\'s gallery or take a new one, add a title and description, tag family members, and tap "Save". Your memory is instantly preserved!'
        },
        {
          question: 'Can I add memories from the past?',
          answer: 'Absolutely! You can backdate memories by selecting a custom date when uploading. This is perfect for preserving old photos, videos, and stories from years ago.'
        },
        {
          question: 'How do I tag family members in a memory?',
          answer: 'While uploading or editing a memory, tap "Tag Family Members" and select who appears in or is related to this memory. Tagged members will see it highlighted in their Memory Vault.'
        }
      ]
    },
    {
      category: 'Family Tree',
      questions: [
        {
          question: 'How do I build my family tree?',
          answer: 'Start by adding yourself as the root. Then use the "Add Family Member" button to add parents, siblings, spouse, and children. You can also use our quick templates to add entire family branches at once.'
        },
        {
          question: 'Can I add multiple generations to my tree?',
          answer: 'Yes! MemoryBox supports up to 5 generations - from great-grandparents to great-grandchildren. You can build a comprehensive family tree spanning over 150 years of family history.'
        },
        {
          question: 'How do I connect family members with relationships?',
          answer: 'When adding a person, select their relationship to you or to another family member. The app automatically creates the correct connections, ensuring your family tree maintains accurate relationships.'
        },
        {
          question: 'Can I edit or remove family members?',
          answer: 'Yes, tap on any family member card in the tree, then select "Edit" to update their information or "Remove" to delete them. Note: removing someone also removes all their connections.'
        }
      ]
    },
    {
      category: 'Privacy & Security',
      questions: [
        {
          question: 'Who can see my family memories?',
          answer: 'Only the family members you invite can see your memories. We never share your content with third parties or use it for advertising. Your memories remain completely private to your family circle.'
        },
        {
          question: 'How secure is my data?',
          answer: 'We use bank-level encryption to protect your memories. All data is stored securely in the cloud with multiple backups. Your memories are safer here than on your phone or computer.'
        },
        {
          question: 'Can I delete memories if needed?',
          answer: 'Yes, you have complete control. You can delete any memory you\'ve added at any time. However, please note that once deleted, memories cannot be recovered.'
        },
        {
          question: 'Can I control who sees specific memories?',
          answer: 'Yes! When uploading a memory, you can choose to share it with all family members or only specific people. This gives you complete control over privacy within your family circle.'
        }
      ]
    },
    {
      category: 'Technical Support',
      questions: [
        {
          question: 'The app is running slowly. What should I do?',
          answer: 'Try closing and reopening the app first. If that doesn\'t help, restart your phone. For persistent issues, clear the app cache or contact our support team for assistance.'
        },
        {
          question: 'I forgot my password. How do I reset it?',
          answer: 'On the sign-in page, tap "Forgot Password" and enter your email or phone number. We\'ll send you a secure link to create a new password. You can also use OTP login as an alternative.'
        },
        {
          question: 'My upload is stuck. What should I do?',
          answer: 'Check your internet connection first. If connected, try closing the upload screen and starting again. Large videos may take a few minutes - please be patient. If the problem persists, contact support.'
        }
      ]
    }
  ];

  const videoTutorials = [
    {
      title: 'Getting Started with MemoryBox',
      duration: '3:45',
      description: 'A complete walkthrough for new users'
    },
    {
      title: 'Adding Your First Memory',
      duration: '2:30',
      description: 'Step-by-step guide to uploading memories'
    },
    {
      title: 'Building Your Family Tree',
      duration: '4:15',
      description: 'How to connect your family members'
    }
  ];

  const filteredFaqs = faqs.map(category => ({
    ...category,
    questions: category.questions.filter(q => 
      searchQuery === '' || 
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <ScrollArea className="h-[90vh]">
          <div className="p-6 space-y-6">
            {/* Header */}
            <DialogHeader>
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-primary/20 rounded-full">
                  <HelpCircle className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-3xl">Help & Support</DialogTitle>
                  <DialogDescription className="text-lg text-muted-foreground">
                    We're here to help you preserve your family memories
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search for help topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 pl-10 text-lg bg-input-background border-border/50"
              />
            </div>

            {/* Quick Help Categories */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-primary">Quick Help</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {quickHelp.map((item, index) => {
                  const ItemIcon = item.icon;
                  return (
                    <div 
                      key={index} 
                      className="memory-card p-4 hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                      onClick={() => {
                        // Set search query to filter FAQs by this category
                        setSearchQuery(item.searchTerm || item.title);
                        // Scroll to FAQ section
                        setTimeout(() => {
                          const faqSection = document.getElementById('faq-section');
                          if (faqSection) {
                            faqSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                        }, 100);
                      }}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 ${item.bgColor} rounded-lg flex-shrink-0`}>
                          <ItemIcon className={`w-5 h-5 ${item.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-primary mb-1">{item.title}</h4>
                          <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                          <Badge variant="secondary" className="text-xs">
                            {item.articles} articles
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Video Tutorials */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-primary">Video Tutorials</h3>
              <div className="grid sm:grid-cols-3 gap-3">
                {videoTutorials.map((video, index) => (
                  <div key={index} className="memory-card p-4 hover:shadow-lg transition-all duration-200 cursor-pointer">
                    <div className="flex items-center justify-center mb-3 p-6 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg">
                      <Video className="w-8 h-8 text-primary" />
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        {video.duration}
                      </Badge>
                    </div>
                    <h4 className="font-medium text-primary mb-1 text-sm">{video.title}</h4>
                    <p className="text-xs text-muted-foreground">{video.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQ Section */}
            <div className="space-y-4" id="faq-section">
              <h3 className="text-xl font-semibold text-primary">Frequently Asked Questions</h3>
              
              {filteredFaqs.length === 0 ? (
                <div className="memory-card p-8 text-center">
                  <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <h4 className="text-lg text-primary mb-2">No results found</h4>
                  <p className="text-muted-foreground text-sm">
                    Try different search terms or browse our help categories above
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredFaqs.map((category, categoryIndex) => (
                    <div key={categoryIndex} className="memory-card p-4">
                      <h4 className="font-semibold text-primary mb-3">{category.category}</h4>
                      <Accordion type="single" collapsible className="space-y-2">
                        {category.questions.map((faq, faqIndex) => (
                          <AccordionItem 
                            key={faqIndex} 
                            value={`${categoryIndex}-${faqIndex}`}
                            className="border rounded-lg px-3"
                          >
                            <AccordionTrigger className="text-left text-sm text-primary hover:no-underline">
                              {faq.question}
                            </AccordionTrigger>
                            <AccordionContent className="text-sm text-muted-foreground pt-3">
                              {faq.answer}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Contact Support */}
            <div className="memory-card bg-gradient-to-br from-primary/10 to-secondary/10 p-6">
              <h3 className="text-xl font-semibold text-primary text-center mb-2">Still Need Help?</h3>
              <p className="text-center text-muted-foreground mb-6">
                Our support team is here to help you every step of the way
              </p>
              
              <div className="grid sm:grid-cols-3 gap-3">
                <Button 
                  variant="outline" 
                  className="h-auto py-4 border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white flex flex-col items-center space-y-2"
                  onClick={() => window.open('https://wa.me/919876500000', '_blank')}
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-sm">WhatsApp</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-auto py-4 border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white flex flex-col items-center space-y-2"
                  onClick={() => window.open('tel:+919876500000')}
                >
                  <Phone className="w-5 h-5" />
                  <span className="text-sm">Call Us</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-auto py-4 border-2 border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white flex flex-col items-center space-y-2"
                  onClick={() => window.open('mailto:support@memorybox.app')}
                >
                  <Mail className="w-5 h-5" />
                  <span className="text-sm">Email</span>
                </Button>
              </div>
              
              <div className="text-center mt-6 space-y-1">
                <p className="font-medium text-primary">Support Hours</p>
                <p className="text-sm text-muted-foreground">Monday - Sunday: 8:00 AM - 8:00 PM IST</p>
                <p className="text-sm text-muted-foreground">Average response time: Under 2 hours</p>
              </div>
            </div>

            {/* Emergency Help */}
            <div className="memory-card border-yellow-200 bg-yellow-50 p-6">
              <div className="flex items-start space-x-4">
                <div className="p-2 bg-yellow-200 rounded-full flex-shrink-0">
                  <Heart className="w-5 h-5 text-yellow-700" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-yellow-800 mb-2">
                    Need Immediate Help with Important Memories?
                  </h4>
                  <p className="text-sm text-yellow-700 mb-4">
                    If you're trying to preserve urgent family memories or having technical difficulties 
                    with important content, our priority support team is available 24/7.
                  </p>
                  <Button 
                    className="bg-yellow-600 hover:bg-yellow-700 text-white"
                    onClick={() => window.open('https://wa.me/919876500000?text=Priority%20Support%20Request', '_blank')}
                  >
                    Contact Priority Support
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
