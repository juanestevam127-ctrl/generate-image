with open("src/components/layout/Sidebar.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if line.startswith('import { Database,') and "lucide-react" not in line:
        line = line.replace('import { Database, ', 'import { ')
    elif "import { Database," in line and "lucide-react" not in line:
        line = line.replace('import { Database,', 'import {')
    new_lines.append(line)

with open("src/components/layout/Sidebar.tsx", "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print("Fixed Sidebar.tsx imports")
