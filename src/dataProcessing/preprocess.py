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



def processFile(filePath):
    obj = None
    with open(filePath, 'r') as file:
        obj = json.load(file)
    
    for buildName in obj:
        

        build = obj[buildName]
        prompt = build['prompt']
        levels = build['blueprint']['levels']
        
        for level in levels:
            
            placement = level['placement']
            
            for i in range(len(placement)):
                for j in range(len(placement[i])):
                    if placement[i][j]['name'] == 'air':
                        placement[i][j] = {}
                
        
        output = {}
        output['input'] = prompt
        output['output'] = levels
        return output
            
    

def parse(source, output):
    
    
    for file in list_files_recursively(source):
        
        result = processFile(file)
        
        
        source = os.path.normpath(source)
        relative_path = os.path.relpath(file, source)
        outputPath = os.path.join(output, relative_path)
        
        folder = os.path.dirname(outputPath)
        os.makedirs(folder, exist_ok=True)
        with open(outputPath, 'w') as openFile:
            openFile.write(json.dumps(result, indent=2))
    




if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("-s", type=str, required=True)
    parser.add_argument("-o", type=str, required=True)
    args = parser.parse_args()
    parse(args.s, args.o)