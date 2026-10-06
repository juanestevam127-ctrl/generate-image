with open("src/components/features/EstoqueManager.tsx", "r", encoding="utf-8") as f:
    c = f.read()

target = """    const parsePictures = (pictureJs: string) => {
        try {
            return JSON.parse(pictureJs);
        } catch (e) {
            return [];
        }
    };"""

replacement = """    const parsePictures = (pictureJs: string) => {
        if (!pictureJs) return [];
        try {
            const parsed = JSON.parse(pictureJs);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    };"""

c = c.replace(target, replacement)
with open("src/components/features/EstoqueManager.tsx", "w", encoding="utf-8") as f:
    f.write(c)
print("Fixed parsePictures")
