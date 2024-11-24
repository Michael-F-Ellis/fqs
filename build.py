#!/usr/bin/env python
import re
import subprocess

def update(input_file, output_file):
    """
    Adds the build number to the input file and writes the result to the
    output file.
    """
    
    build = get_build()

    with open(input_file, 'rb') as f:
        content = f.read().decode('utf-8')

    # Insert the build into the html content as a <p> element as the first
    # element in the body.
    updated_content = re.sub(r'<body>', f'<body>\n<p>Build: {build}</p>', content)

    with open(output_file, 'w') as f:
       f.write(updated_content)
    return None # No error

def get_build():
    """
    Compute build number based on current branch and latest commit.
    Returns build string in format: branch-commithash with 'dirty'
    appended if there are uncommitted changes.
    """
    try:
        # Get current branch name
        branch = subprocess.check_output(
            ['git', 'rev-parse', '--abbrev-ref', 'HEAD']
        ).decode('utf-8').strip()
        
        # Get latest commit hash (short version)
        commit = subprocess.check_output(
            ['git', 'rev-parse', '--short', 'HEAD']
        ).decode('utf-8').strip()

        # Check for uncommitted changes
        status = subprocess.check_output(
          ['git', 'status', '--porcelain']
        ).decode('utf-8').strip()
              
        #Append 'dirty' if there are uncommitted changes
        if status:
          return f"{branch}-{commit}-dirty"
        else:
            return f"{branch}-{commit}"

    except subprocess.CalledProcessError:
        return "unknown-version" 

if __name__ == "__main__":
    print(get_build())
    err = update('pre-fqs.html', 'fqs.html')
    if err is not None:
        print(err)
        exit(1)
    else:
        print("fqs.html updated successfully.")