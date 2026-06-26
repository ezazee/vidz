import type { StoryboardJSON } from '../pipeline/types'

export const storyboardFixture: StoryboardJSON = {
  project_id: 'demo',
  title: 'StoryZ Demo',
  director: {
    visual_bible: {
      genre: 'documentary',
      visual_style: 'cinematic documentary with natural light',
      image_style: 'photorealistic',
      color_palette: ['teal', 'gold', 'charcoal'],
      lighting: 'soft cinematic lighting',
      emotion: 'curious',
      transition: 'fade',
    },
    character_bible: { characters: [] },
    environment_bible: { locations: [], era: 'modern', geography: 'global' },
    camera_bible: {
      default_movement: 'gentle_zoom',
      allowed_movements: ['static', 'zoom_in', 'pan_left'],
      aspect_ratio: '16:9',
      composition_rules: 'rule of thirds',
    },
    motion_bible: {
      transition_style: 'fade',
      effect_palette: ['none', 'light_rays'],
      timing: 'slow burn',
    },
    thumbnail_bible: {
      style: 'dramatic',
      color_scheme: 'teal and gold',
      text_style: 'bold',
      composition: 'single subject',
    },
    genre: 'documentary',
    visual_style: 'cinematic documentary',
    emotion: 'curious',
    lighting: 'soft cinematic lighting',
    color_palette: ['teal', 'gold', 'charcoal'],
    thumbnail_style: 'dramatic',
    voice_style: 'calm narration',
    camera_style: 'slow movement',
    transition: 'fade',
    image_style: 'photorealistic',
  },
  scenes: [
    {
      id: 'demo-scene-1',
      order_index: 0,
      duration: 5,
      narration: 'StoryZ turns a topic into a structured documentary video pipeline.',
      subtitle: 'From topic to documentary pipeline',
      image_url: '',
      voice_url: '',
      camera: 'zoom_in',
      effect: 'light_rays',
      transition: 'fade',
      emotion: 'curious',
    },
  ],
  audio: {
    background_music_volume: 0.2,
  },
}
