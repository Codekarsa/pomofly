# Notification Sounds

This directory contains audio files for timer completion notifications.

## Sound Files Required

The following audio files are needed for the notification system:

### Work Session Completion Sounds
- `success.mp3` - Upbeat success tone for completed work sessions
- `bell.mp3` - Classic bell sound
- `ding.mp3` - Simple ding notification

### Break Session Completion Sounds  
- `peaceful.mp3` - Calm, gentle tone for break reminders
- `chime.mp3` - Soft chime sound
- `notification.mp3` - Modern notification tone

## Audio Specifications

### Format Requirements
- **Format**: MP3 or WAV
- **Bitrate**: 128kbps or higher
- **Sample Rate**: 44.1kHz recommended
- **Duration**: 1-4 seconds optimal
- **Volume**: Normalized to prevent clipping

### File Size
- Keep files under 100KB each for fast loading
- Optimize for web delivery

### Accessibility
- Ensure sounds are distinct enough for users with hearing difficulties
- Provide visual fallbacks in the UI
- Support different volume levels

## Adding Custom Sounds

Users can upload custom notification sounds through the settings panel. Supported formats:
- MP3
- WAV  
- OGG
- M4A

## Browser Support

The notification system provides multiple fallback mechanisms:
1. **Web Audio API** (preferred) - Modern browsers
2. **HTML5 Audio** (fallback) - Older browsers
3. **Browser Notifications** (last resort) - When audio fails

## Implementation Notes

- Sounds are cached for performance
- Respects browser autoplay policies
- Provides volume controls
- Supports mute functionality
- Works offline once cached

## Sound Sources

For production, consider these royalty-free sound sources:
- Freesound.org
- Zapsplat
- BBC Sound Effects Library
- Creative Commons audio
- Generate with tools like Audacity

## Testing

Use the settings panel to:
- Preview all notification sounds
- Test volume levels
- Verify browser compatibility
- Check fallback mechanisms