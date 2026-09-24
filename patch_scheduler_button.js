const fs = require('fs');
let code = fs.readFileSync('src/components/features/PostScheduler.tsx', 'utf8');

const target = `                                    <Button
                                        onClick={() => handleOpenModal(post)}
                                        size="sm"
                                        className="h-8 !bg-indigo-600 hover:!bg-indigo-700 !text-white font-bold px-4"
                                    >
                                        Agendar
                                    </Button>`;
// we'll replace the exact string, keeping the spaces (if it matches exactly).
// If not, we'll strip spaces and compare.

const replacement = `<Button
                                        onClick={() => handleUploadStory(post)}
                                        size="sm"
                                        variant="outline"
                                        disabled={isUploadingStory[post.id]}
                                        className="h-8 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 px-3 flex gap-2 items-center"
                                        title="Subir imagem para o campo Stories no ClickUp"
                                    >
                                        {isUploadingStory[post.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                        <span className="hidden sm:inline">Story</span>
                                    </Button>
                                    <Button
                                        onClick={() => handleOpenModal(post)}
                                        size="sm"
                                        className="h-8 !bg-indigo-600 hover:!bg-indigo-700 !text-white font-bold px-4"
                                    >
                                        Agendar
                                    </Button>`;

const searchRegex = /<Button\s+onClick=\{\(\) => handleOpenModal\(post\)\}\s+size=\"sm\"\s+className=\"h-8 !bg-indigo-600 hover:!bg-indigo-700 !text-white font-bold px-4\"\s*>\s*Agendar\s*<\/Button>/;

if (!code.includes('handleUploadStory(post)')) {
    code = code.replace(searchRegex, replacement);
    fs.writeFileSync('src/components/features/PostScheduler.tsx', code);
    console.log("Replaced successfully!");
} else {
    console.log("Already replaced.");
}
