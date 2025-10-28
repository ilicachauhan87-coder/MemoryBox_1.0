import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, X, Star, Camera, Heart, Calendar, BookOpen, Gift, Sparkles } from 'lucide-react';
import { Card } from './ui/card';

interface CustomMilestoneDialogProps {
  onAddMilestone: (milestone: any) => void;
  journeyType: 'pregnancy-newborn' | 'couple-journey';
  phases: Array<{ id: string; name: string; icon: string }>;
}

interface CustomMilestone {
  id: string;
  title: string;
  description: string;
  phase: string;
  timing: string;
  isCompleted: boolean;
  isActive: boolean;
  icon: string;
  prompts: string[];
  memoryTypes: string[];
  culturalNote?: string;
  isCustom: true;
}

const defaultIcons = ['⭐', '💖', '🎉', '🌟', '✨', '🎊', '💝', '🌸', '🎨', '📷', '🎵', '🏆', '🌈', '💐', '🦋', '🕊️'];

const defaultMemoryTypes = [
  'Photo', 'Video', 'Voice Note', 'Journal Entry', 
  'Audio Recording', 'Letter', 'Certificate', 'Ticket',
  'Document', 'Artwork', 'Screenshot', 'Location Photo'
];

export function CustomMilestoneDialog({ onAddMilestone, journeyType, phases }: CustomMilestoneDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    phase: phases[0]?.id || '',
    timing: '',
    icon: '⭐',
    culturalNote: ''
  });
  const [prompts, setPrompts] = useState<string[]>(['']);
  const [selectedMemoryTypes, setSelectedMemoryTypes] = useState<string[]>([]);
  const [newPrompt, setNewPrompt] = useState('');
  const [newMemoryType, setNewMemoryType] = useState('');

  const handleAddPrompt = () => {
    if (newPrompt.trim()) {
      setPrompts([...prompts, newPrompt.trim()]);
      setNewPrompt('');
    }
  };

  const handleRemovePrompt = (index: number) => {
    setPrompts(prompts.filter((_, i) => i !== index));
  };

  const handleAddMemoryType = (type: string) => {
    if (!selectedMemoryTypes.includes(type)) {
      setSelectedMemoryTypes([...selectedMemoryTypes, type]);
    }
  };

  const handleRemoveMemoryType = (type: string) => {
    setSelectedMemoryTypes(selectedMemoryTypes.filter(t => t !== type));
  };

  const handleAddCustomMemoryType = () => {
    if (newMemoryType.trim() && !selectedMemoryTypes.includes(newMemoryType.trim())) {
      setSelectedMemoryTypes([...selectedMemoryTypes, newMemoryType.trim()]);
      setNewMemoryType('');
    }
  };

  const handleSubmit = () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      return;
    }

    const customMilestone: CustomMilestone = {
      id: `custom-${Date.now()}`,
      title: formData.title.trim(),
      description: formData.description.trim(),
      phase: formData.phase,
      timing: formData.timing.trim() || 'Custom timing',
      isCompleted: false,
      isActive: false,
      icon: formData.icon,
      prompts: prompts.filter(p => p.trim()),
      memoryTypes: selectedMemoryTypes,
      culturalNote: formData.culturalNote.trim() || undefined,
      isCustom: true
    };

    onAddMilestone(customMilestone);
    
    // Reset form
    setFormData({
      title: '',
      description: '',
      phase: phases[0]?.id || '',
      timing: '',
      icon: '⭐',
      culturalNote: ''
    });
    setPrompts(['']);
    setSelectedMemoryTypes([]);
    setNewPrompt('');
    setNewMemoryType('');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="vibrant-button text-lg py-3 px-6 w-full"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Custom Milestone
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-foreground flex items-center">
            <Sparkles className="w-6 h-6 mr-2 text-violet" />
            Create Your Custom Milestone
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Basic Information */}
          <Card className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200">
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center">
              <BookOpen className="w-5 h-5 mr-2" />
              Basic Information
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-lg font-medium">Milestone Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., First Family Vacation"
                  className="text-lg mt-2"
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-lg font-medium">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe this special milestone..."
                  className="text-lg mt-2 min-h-20"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phase" className="text-lg font-medium">Journey Phase</Label>
                  <Select value={formData.phase} onValueChange={(value) => setFormData({ ...formData, phase: value })}>
                    <SelectTrigger className="text-lg mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {phases.map((phase) => (
                        <SelectItem key={phase.id} value={phase.id} className="text-lg">
                          <span className="mr-2">{phase.icon}</span>
                          {phase.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="timing" className="text-lg font-medium">Timing</Label>
                  <Input
                    id="timing"
                    value={formData.timing}
                    onChange={(e) => setFormData({ ...formData, timing: e.target.value })}
                    placeholder="e.g., 6 months, Summer 2024"
                    className="text-lg mt-2"
                  />
                </div>
              </div>

              <div>
                <Label className="text-lg font-medium mb-2 block">Choose an Icon</Label>
                <div className="grid grid-cols-8 gap-2">
                  {defaultIcons.map((icon) => (
                    <Button
                      key={icon}
                      variant={formData.icon === icon ? "default" : "outline"}
                      onClick={() => setFormData({ ...formData, icon })}
                      className={`text-2xl h-12 w-12 p-0 ${formData.icon === icon ? 'vibrant-button' : ''}`}
                    >
                      {icon}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Memory Prompts */}
          <Card className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200">
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center">
              <Heart className="w-5 h-5 mr-2" />
              Memory Prompts
            </h3>
            
            <div className="space-y-3">
              {prompts.map((prompt, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    value={prompt}
                    onChange={(e) => {
                      const newPrompts = [...prompts];
                      newPrompts[index] = e.target.value;
                      setPrompts(newPrompts);
                    }}
                    placeholder="Enter a memory prompt question..."
                    className="text-lg flex-1"
                  />
                  {prompts.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemovePrompt(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              
              <div className="flex items-center space-x-2">
                <Input
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  placeholder="Add another prompt question..."
                  className="text-lg flex-1"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddPrompt()}
                />
                <Button
                  onClick={handleAddPrompt}
                  variant="outline"
                  size="sm"
                  disabled={!newPrompt.trim()}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>

          {/* Memory Types */}
          <Card className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center">
              <Camera className="w-5 h-5 mr-2" />
              Suggested Memory Types
            </h3>
            
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {defaultMemoryTypes.map((type) => (
                  <Badge
                    key={type}
                    variant={selectedMemoryTypes.includes(type) ? "default" : "outline"}
                    className={`cursor-pointer text-sm ${
                      selectedMemoryTypes.includes(type) ? 'bg-violet text-white' : ''
                    }`}
                    onClick={() => 
                      selectedMemoryTypes.includes(type) 
                        ? handleRemoveMemoryType(type)
                        : handleAddMemoryType(type)
                    }
                  >
                    {type}
                  </Badge>
                ))}
              </div>
              
              <div className="flex items-center space-x-2">
                <Input
                  value={newMemoryType}
                  onChange={(e) => setNewMemoryType(e.target.value)}
                  placeholder="Add custom memory type..."
                  className="text-lg flex-1"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCustomMemoryType()}
                />
                <Button
                  onClick={handleAddCustomMemoryType}
                  variant="outline"
                  size="sm"
                  disabled={!newMemoryType.trim()}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {selectedMemoryTypes.length > 0 && (
                <div className="pt-2">
                  <Label className="text-base font-medium">Selected Types:</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedMemoryTypes.map((type) => (
                      <Badge key={type} variant="default" className="bg-violet text-white">
                        {type}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMemoryType(type)}
                          className="ml-1 p-0 h-auto text-white hover:text-red-200"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Cultural Note (Optional) */}
          {journeyType === 'couple-journey' && (
            <Card className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
              <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center">
                <Star className="w-5 h-5 mr-2" />
                Cultural Note (Optional)
              </h3>
              
              <Textarea
                value={formData.culturalNote}
                onChange={(e) => setFormData({ ...formData, culturalNote: e.target.value })}
                placeholder="Add any cultural significance or family traditions related to this milestone..."
                className="text-lg min-h-16"
              />
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="text-lg py-2 px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.title.trim() || !formData.description.trim()}
              className="vibrant-button text-lg py-2 px-6"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Milestone
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}