with open("src/app/actions/estoque.ts", "r", encoding="utf-8") as f:
    c = f.read()

import re

new_map = """        const vehicles = results.map((v: any) => {
            const pictures = Array.isArray(v.photos) ? v.photos.map((p: any, index: number) => ({
                Link: p.photo,
                Principal: index === 0 ? "true" : "false"
            })) : [];
            const optionals = Array.isArray(v.optionals) ? v.optionals.map((o: any) => o.name) : [];

            return {
                vehicleExternalKey: v.ad_id?.toString() || crypto.randomUUID(),
                markName: v.manufacturer?.name || "N/A",
                modelName: v.model?.name || "N/A",
                versionName: v.version?.name || v.version_site || "N/A",
                year: (v.make_year && v.model_year) ? `${v.make_year}/${v.model_year}` : (v.model_year || v.make_year || ""),
                km: parseInt(v.km || "0") || 0,
                saleValue: parseFloat(v.price || "0") || 0,
                color: v.color?.name || "N/A",
                transmissionName: v.transmission?.name || "N/A",
                fuelName: v.fuel?.name || "N/A",
                plate: v.license_plate || "N/A",
                finalPlate: v.license_plate ? v.license_plate.slice(-1) : "",
                subCategoryName: v.category?.name || "N/A",
                description: v.description || "",
                itemJs: JSON.stringify(optionals),
                pictureJs: JSON.stringify(pictures),
            };
        });"""

c = re.sub(r'const vehicles = results\.map\(\(v: any\) => \{.*?\};\s*\}\);', new_map, c, flags=re.DOTALL)

with open("src/app/actions/estoque.ts", "w", encoding="utf-8") as f:
    f.write(c)
