const fs = require('fs');
const file = 'app/studio/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add Plus icon
content = content.replace('Swords\n} from \'lucide-react\'', 'Swords,\n  Plus\n} from \'lucide-react\'');

// 2. Add resetStudio function
const resetStudioCode = `
  const resetStudio = () => {
    setTopic('')
    setRunning(false)
    setProjectId(null)
    setStoryboard(null)
    setRenderJobId(null)
    setRenderStatus('idle')
    setRenderLog('')
    setVideoUrl(null)
    setStages(buildStages())
    localStorage.removeItem('activeProjectId')
  }

`;
content = content.replace('const hasStarted = stages.some((s: Stage) => s.status !== \'idle\')', resetStudioCode + '  const hasStarted = stages.some((s: Stage) => s.status !== \'idle\')');

// 3. Extract parts of JSX
const inputCardStart = '{/* input card */}';
const pipelineProgressStart = '{/* pipeline progress */}';
const videoResultStart = '{/* video result */}';
const storyboardScenesStart = '{/* storyboard scenes */}';
const mainEnd = '</main>';

const inputCard = content.substring(content.indexOf(inputCardStart), content.indexOf(pipelineProgressStart));
const pipelineProgress = content.substring(content.indexOf(pipelineProgressStart), content.indexOf(videoResultStart));
let videoResult = content.substring(content.indexOf(videoResultStart), content.indexOf(storyboardScenesStart));

// Modifikasi Video Result untuk tambahkan tombol Bikin Video Baru
videoResult = videoResult.replace('</div>\n              </div>\n            )}', `</div>
                  <button
                    onClick={resetStudio}
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-5 py-3 text-sm font-bold transition-all border border-indigo-200 shadow-sm"
                  >
                    <Plus className="size-4" /> Bikin Video Topik Baru
                  </button>
              </div>
            )}`);

const storyboardScenes = content.substring(content.indexOf(storyboardScenesStart), content.indexOf(mainEnd));

// Build new main content
const newMainContent = `
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Kiri: Form & Storyboard */}
            <div className="lg:col-span-7 space-y-6">
              ${inputCard}
              ${storyboardScenes}
            </div>
            
            {/* Kanan: Progress & Result (Sticky) */}
            <div className="lg:col-span-5 space-y-6 sticky top-6">
              ${videoResult}
              ${pipelineProgress}
            </div>
          </div>
        </main>
`;

// Replace old main content
const oldMainStart = '<main className="flex-1 overflow-y-auto p-6 md:p-8">';
const oldMainEnd = '</main>';
const beforeMain = content.substring(0, content.indexOf(oldMainStart));
const afterMain = content.substring(content.indexOf(oldMainEnd) + oldMainEnd.length);

fs.writeFileSync(file, beforeMain + newMainContent + afterMain);
console.log('Refactor complete.');
