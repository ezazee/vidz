import { Composition } from 'remotion'
import { StoryZVideo } from '@/lib/remotion/StoryZVideo'
import { storyboardFixture } from '@/lib/remotion/storyboard-fixture'

const fps = 30
const durationInFrames = storyboardFixture.scenes.reduce(
  (total, scene) => total + Math.max(1, Math.round(scene.duration * fps)),
  0,
)

export function RemotionRoot() {
  return (
    <Composition
      id="StoryZVideo"
      component={StoryZVideo}
      durationInFrames={durationInFrames}
      fps={fps}
      width={1920}
      height={1080}
      defaultProps={{ storyboard: storyboardFixture }}
    />
  )
}
