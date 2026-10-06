import os
def search_files(directory, search_string):
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith(('.tsx', '.ts', '.js')):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        if search_string in f.read():
                            print(f"Found in {path}")
                except Exception:
                    pass
search_files('src', 'getProxiedUrl')
