import { Composition, CalculateMetadataFunction } from 'remotion'
import { StoryZVideo } from '../lib/remotion/StoryZVideo'
import { storyboardFixture } from '../lib/remotion/storyboard-fixture'

const fps = 30

const calculateMetadata: CalculateMetadataFunction<any> = async ({ props }) => {
  const storyboard = props.storyboard ?? storyboardFixture
  const durationInFrames = storyboard.scenes.reduce(
    (total: number, scene: any) => total + Math.max(1, Math.round(scene.duration * fps)),
    0,
  )
  return {
    durationInFrames,
  }
}

export function RemotionRoot() {
  return (
    <Composition
      id="StoryZVideo"
      component={StoryZVideo}
      fps={fps}
      width={1920}
      height={1080}
      defaultProps={{ storyboard: storyboardFixture }}
      calculateMetadata={calculateMetadata}
    />
  )
}
