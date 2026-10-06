for filename in ["src/components/features/ScheduledPanel.tsx", "src/components/features/SoldPostScheduler.tsx"]:
    try:
        with open(filename, "r", encoding="utf-8") as f:
            c = f.read()
            import re
            for match in re.finditer(r'.{0,30}fetch\(.{0,50}', c):
                print(f"{filename}: {match.group(0).strip()}")
    except Exception as e:
        pass
