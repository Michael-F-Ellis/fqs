#!/usr/bin/env python
import re
import subprocess

def update(html_file, reference_file, output_file):
    """
    Wraps the the reference file in a script tag and appends it to the fqs.html file.
    """
    
    build = get_build()

    with open(html_file, 'rb') as f:
        content = f.read().decode('utf-8')

    # Insert the build into the html content as a <p> element as the first
    # element in the body.
    content = re.sub(r'<body>', f'<body>\n<p>Build: {build}</p>', content)

    with open(reference_file, 'r') as f:
        reference_content = f.read()

    warn = '<!-- This file is auto-generated. Do not edit it manually. -->' 
    tag = '<script type="text/javascript">'
    cmt = '// This is the reference score that documents FQS usage'
    end = '</script>\n</body>\n</html>'

    updated_content = f"{warn}\n{content}\n{tag}\n{cmt}\nfqsReference=`{reference_content}`\n{end}" 

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
    err = update('pre-fqs.html', 'reference.fqs', 'fqs.html')
    if err is not None:
        print(err)
        exit(1)
    else:
        print("fqs.html updated successfully.")