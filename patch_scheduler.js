const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/features/PostScheduler.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Imports
if (!content.includes('findClickupTaskForVehicleAction')) {
    content = content.replace(
        'import { updateCaptionAction',
        'import { uploadStoryToClickupAction, findClickupTaskForVehicleAction } from "@/app/actions/clickup";\nimport { updateCaptionAction'
    );
}

if (!content.includes('Upload')) {
    content = content.replace(
        'import { Loader2, CalendarIcon, ChevronLeft, ChevronRight, Play, Edit3, Save, Check } from "lucide-react";',
        'import { Loader2, CalendarIcon, ChevronLeft, ChevronRight, Play, Edit3, Save, Check, Upload } from "lucide-react";'
    );
}

// Add state for uploading story
if (!content.includes('isUploadingStory')) {
    content = content.replace(
        'const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");',
        'const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");\n    const [isUploadingStory, setIsUploadingStory] = useState<Record<string, boolean>>({});'
    );
}

// Add handleUploadStory function
const handleUploadCode = `
    const handleUploadStory = async (post: any) => {
        if (post.images.length > 1) {
            alert("Exclua as artes extras deste veículo. O campo Stories no ClickUp aceita apenas 1 imagem (Arte Principal).");
            return;
        }
        
        setIsUploadingStory(prev => ({ ...prev, [post.id]: true }));
        try {
            // 1. Find Task ID
            const findRes = await findClickupTaskForVehicleAction(client.id, post.veiculo_gerado);
            if (!findRes.success || !findRes.clickupTaskId) {
                alert("Não foi possível encontrar a tarefa deste veículo no ClickUp. Certifique-se de que ele foi importado do ClickUp.");
                setIsUploadingStory(prev => ({ ...prev, [post.id]: false }));
                return;
            }

            // 2. Upload
            const uploadRes = await uploadStoryToClickupAction(findRes.clickupTaskId, post.images[0].imagem);
            if (uploadRes.success) {
                alert("Story anexado com sucesso no ClickUp!");
            } else {
                alert("Erro ao subir Story: " + uploadRes.error);
            }
        } catch (e: any) {
            alert("Erro: " + e.message);
        } finally {
            setIsUploadingStory(prev => ({ ...prev, [post.id]: false }));
        }
    };
`;

if (!content.includes('handleUploadStory')) {
    // Insert before handleSchedule
    content = content.replace(
        'const handleSchedule = async (isInstant: boolean = false) => {',
        handleUploadCode + '\n    const handleSchedule = async (isInstant: boolean = false) => {'
    );
}

// Add Button to UI
const oldButtonHtml = `                                    <Button
                                        onClick={() => handleOpenModal(post)}
                                        size="sm"
                                        className="h-8 !bg-indigo-600 hover:!bg-indigo-700 !text-white font-bold px-4"
                                    >
                                        Agendar
                                    </Button>`;

const newButtonHtml = `                                    <Button
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

if (content.includes(oldButtonHtml) && !content.includes('handleUploadStory(post)')) {
    content = content.replace(oldButtonHtml, newButtonHtml);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("Patched PostScheduler");
