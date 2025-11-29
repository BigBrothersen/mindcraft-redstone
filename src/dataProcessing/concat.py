import argparse
import os
import json


from pathlib import Path

def list_files_recursively(folder_path):
    path = Path(folder_path)
    output = []
    for file_path in path.rglob('*.json'):
        if file_path.is_file():
            output.append(file_path)
    return output


            
    

def parse(source, output):
    
    out = []
    
    for file in list_files_recursively(source):
        
        with open(file, 'r') as f:
            obj = json.load(f)
            out.append(obj)
        
    with open(output, 'w') as openFile:
        openFile.write(json.dumps(out, indent=2))
    




if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("-s", type=str, required=True)
    parser.add_argument("-o", type=str, required=True)
    args = parser.parse_args()
    parse(args.s, args.o)