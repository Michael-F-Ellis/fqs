#!/usr/bin/env python
import re

def update(html_file, reference_file, output_file):
    """
    Wraps the the reference file in a script tag and appends it to the html file.
    """
    with open(html_file, 'rb') as f:
        content = f.read().decode('utf-8')

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

if __name__ == "__main__":
    err = update('pre-fqs.html', 'reference.fqs', 'fqs.html')
    if err is not None:
        print(err)
        exit(1)
    else:
        print("fqs.html updated successfully.")