#!/usr/bin/env python3
import re
import subprocess

def update(input_file, output_file, version):
    """
    Adds the build number to the input file and writes the result to the
    output file.
    """
    
    build = get_build()

    with open(input_file, 'rb') as f:
        content = f.read().decode('utf-8')

    # Insert the build into the html content as a <p> element as the first
    # element in the body.
    updated_content = re.sub(r'<body>', f'<body>\n<p>Version: {version} Build: {build}</p>', content)

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

import sys

if __name__ == "__main__":
    # If an argument is provided, use it as the version number.
    if len(sys.argv) > 1:
        version = sys.argv[1]
    else:
        version = "unversioned"
    print(version)
    err = update('pre-fqs.html', 'fqs.html', version)
    if err is not None:
        print(err)
        exit(1)
    else:
        print("fqs.html updated successfully.")
        # If version does not exist as a tag in the repo,
        # ask the user to if s/he wants to create it.
        if version == "unversioned":
            exit(0)
        if version not in subprocess.check_output(['git', 'tag']).decode('utf-8').splitlines():
            # Commit the changes to the HTML file.
            subprocess.run(['git', 'add', 'fqs.html'])
            subprocess.run(['git', 'commit', '-m', f'Update fqs.html with version {version}'])
            subprocess.run(['git', 'push'])
            create_tag = input(f"Version {version} does not exist as a tag in the repo. Do you want to create one? (y/n) ")
            if create_tag.lower() == 'y':
                subprocess.run(['git', 'tag', version])
                subprocess.run(['git', 'push', 'origin', version])
            else:
                print("Version not created.")
                exit(1)

