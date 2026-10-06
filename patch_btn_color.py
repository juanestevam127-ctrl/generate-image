with open("src/components/features/EstoqueManager.tsx", "r", encoding="utf-8") as f:
    c = f.read()

target = 'className="bg-indigo-600 hover:bg-indigo-700 text-white w-full md:w-auto h-10"'
replacement = 'className="!bg-indigo-600 hover:!bg-indigo-700 !text-white w-full md:w-auto h-10"'

c = c.replace(target, replacement)
with open("src/components/features/EstoqueManager.tsx", "w", encoding="utf-8") as f:
    f.write(c)
print("Updated button class")
