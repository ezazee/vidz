export type PipelineStatus = 'idle' | 'pending' | 'processing' | 'completed' | 'failed'
export type RenderMode = 'full' | 'partial'
export type VideoStatus = 'draft' | 'rendered' | 'uploaded'

export type CameraMovement =
  | 'static'
  | 'pan_left'
  | 'pan_right'
  | 'zoom_in'
  | 'zoom_out'
  | 'tilt_up'
  | 'tilt_down'

export type SceneEffect = 'none' | 'light_rays' | 'fog' | 'dust' | 'rain' | 'snow' | 'particles'
export type TransitionType = 'cut' | 'fade' | 'dissolve' | 'wipe'

export interface VisualBible {
  genre: string
  visual_style: string
  image_style: string
  color_palette: string[]
  lighting: string
  emotion: string
  transition: string
}

export interface CharacterBible {
  characters: {
    name: string
    description: string
    clothing: string
    prompt_anchor: string
  }[]
}

export interface EnvironmentBible {
  locations: {
    name: string
    description: string
    prompt_anchor: string
  }[]
  era: string
  geography: string
}

export interface CameraBible {
  default_movement: string
  allowed_movements: string[]
  aspect_ratio: string
  composition_rules: string
}

export interface MotionBible {
  transition_style: string
  effect_palette: string[]
  timing: string
}

export interface ThumbnailBible {
  style: string
  color_scheme: string
  text_style: string
  composition: string
}

export interface DirectorOutput {
  visual_bible: VisualBible
  character_bible: CharacterBible
  environment_bible: EnvironmentBible
  camera_bible: CameraBible
  motion_bible: MotionBible
  thumbnail_bible: ThumbnailBible
  genre: string
  visual_style: string
  emotion: string
  lighting: string
  color_palette: string[]
  thumbnail_style: string
  voice_style: string
  camera_style: string
  transition: string
  image_style: string
}

export interface SceneJSON {
  id: string
  order_index: number
  duration: number
  narration: string
  subtitle: string
  image_prompt: string
  image_url: string
  voice_url: string
  camera: CameraMovement
  effect: SceneEffect
  transition: TransitionType
  emotion: string
}

export interface StoryboardJSON {
  project_id: string
  title: string
  director: DirectorOutput
  scenes: SceneJSON[]
  audio: {
    background_music_url?: string
    background_music_volume: number
  }
}
